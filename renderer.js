const { exec } = require('child_process');
const mpdapi = require('mpd-api')

// TODO: Ideally the author will accept the pull request and re-publish. Otherwise tie it to my fork.
const Ytcr = require('yt-cast-receiver');
const EventEmitter = require('events');

// Use ports 3000, 3001, 3002 etc for successive YTCRs
const YTCR_BASE_PORT = 3000;

// TODO Does this clean up nicely? YTCR instance disappear from the menu in the youtube app? Port freed etc?

/**
 * Class controlling a single upnp media renderer.
 * It implements yt-cast-receiver.Player so that it can receive and translate casts from YouTube.
 */
class Renderer extends Ytcr.Player {
    STALE_TIMEOUT = 300;  // A upnp renderer which has not been seen for 300s is considered to have disappeared
    
    constructor(config)
    {
        // Call the Ytcr.Player constructor
        super();
        this.eventEmitter = new EventEmitter();
        (async () => {
          
            console.log("Creating new renderer: " + config.host);
            this.httpServer = null;
            this.refresh();
            this.eventEmitter = new EventEmitter();
            this.friendlyName = "Snapcast";
            // Instantiate the mediarender client
            this.config = config
            this.client = await mpdapi.connect(config);
            await this.client.api.playback.single('oneshot');
            await this.client.api.playback.consume(0);
            await this.client.api.queue.clear();
            const options = {
                port: YTCR_BASE_PORT,
                friendlyName: 'Snapcast',
                manufacturer: 'Snapcast',
                modelName: 'MPD'
            }; 
            this.currentPlayStatus = 'stopped';
            this.lastPlayBackCommand = 'NOTHING';
            this.client.on('system', async name => {
                if(name == 'player') {
                    const status = await this.client.api.status.get();
                    if(status.state !== this.currentPlayStatus) {
                        this.currentPlayStatus = status.state;
                        console.log("Status changed to " + status.state +" from " + this.lastPlayBackCommand );
                        if(status.state == 'play') {
                            this.notifyPlayed();
                        } else if(status.state == 'stop' && this.lastPlayBackCommand == 'PLAY') {
                            console.log("Play Next");
                            this.requestPlayNext();
                        }
                    }
                }
              })
            this.ytcr = Ytcr.instance(this, options);
            this.ytcr.start();
            this.ytcr.on('connected', () => {
                this.notifyVolumeChanged();
            });
            //this.ytcr.on('disconnected', async () => {
            //    console.log("Disconnected");
            //    await this.ytcr.stop();
            //    this.client.api.connection.close();
            //    this.eventEmitter.emit('restart');
            //});
            // No errors so far
            this.error = false    
        })();
       

    }

    refresh() {
        this.lastSeenTime = Number(process.hrtime.bigint() / 1000000000n);
        console.log("Refreshed renderer " + this.location + " to " + this.lastSeenTime);
    }

    getAudioUrl(videoId) {
        return new Promise((resolve, reject) => {
        
            // Call yt-dlp to get the audio URL
            exec(`yt-dlp -f bestaudio[ext=m4a] --get-url "https://www.youtube.com/watch?v=${videoId}"`, (err, stdout, stderr) => {
                    if (err) {
                        console.log('Unable to get audio URL using yt-dlp. Using youtube-dl but this is slower!');
                        exec(`youtube-dl -f bestaudio[ext=m4a] --get-url "https://www.youtube.com/watch?v=${videoId}"`, function (err, stdout, stderr) {
                            if (err) {
                                console.log(` Error getting URL from youtube-dl:`);
                                reject(err);
                            } else {
                                // Resolve the promise with the retrieved URL
                                const audioUrl = stdout.toString().trim();
                                console.log(`Media URL: ${audioUrl}`);
                                resolve(audioUrl);
                            }
                        });
                    }
                    else {
                        // Resolve the promise with the retrieved URL
                        const audioUrl = stdout.toString().trim();
                        console.log(`[${this.friendlyName}]: Media URL: ${audioUrl}`);
                        resolve(audioUrl);
                    }
                });
        });
        
    }

    /**
     * The methods implementing yt-cast-receiver.Player
     */
    async play(videoId, position = 0) {
        console.log(`[${this.friendlyName}]: Play ${videoId} at position ${position}s`);
        this.lastPlayBackCommand = 'NOTHING';

        const audioUrl = await this.getAudioUrl(videoId);
        await this.client.api.queue.clear();
        await this.client.api.queue.add(audioUrl);
        await this.client.api.playback.play();
        this.lastPlayBackCommand = 'PLAY';
        return;
    }

    async pause() {
        console.log(`[${this.friendlyName}]: Pause`);
        this.lastPlayBackCommand = 'PAUSE';

        await this.client.api.playback.pause();
        this.notifyPaused();
    }

    async resume() {
        console.log(`[${this.friendlyName}]: Resume`);
        this.lastPlayBackCommand = 'PLAY';

        // Play (=resume) the dlna renderer
        await this.client.api.playback.resume();
        this.notifyResumed();
    }

    async stop() {
        console.log(`[${this.friendlyName}]: Stop`);
        this.lastPlayBackCommand = 'STOP';
        // Stop the dlna renderer
        await this.client.api.playback.stop();
    }

    async seek(position, statusBeforeSeek) {
        console.log(`[${this.friendlyName}]: Seek to ${position}s, statusBeforeSeek ${statusBeforeSeek}`);

        // Tell the dlna renderer to seek
        await this.client.api.playback.seekcur(position);
        console.log(statusBeforeSeek);
        this.notifySeeked(statusBeforeSeek);
    }

    async getVolume() {
        console.log(`[${this.friendlyName}]: getVolume`);
        const status = await this.client.api.status.get();
        console.log('Current volume: ' + status.volume);
        return status.volume;
    }

    async setVolume(volume) {
        console.log(`[${this.friendlyName}]: setVolume to ${volume}`);

        // Set the volume on the dlna renderer
        console.log(volume);
        await this.client.api.playback.setvol(volume);
        this.notifyVolumeChanged();

    }

    async getPosition() {
        console.log(`[${this.friendlyName}]: getPosition`);
        const status = await this.client.api.status.get()
        if(typeof status.elapsed === 'undefined') {
            //await for one second
            await new Promise(r => setTimeout(r, 100));
            return "0";
        }
        //mpd has higher precision than lounge api  
        return Math.floor(status.elapsed);
    }

    async getDuration() {
        console.log(`[${this.friendlyName}]: getDuration`);

        //retry status until its not undefined
        const status = await this.client.api.status.get();
        if(typeof status.duration === 'undefined') {
            //await for one second
            return "0";
        }
        //mpd has higher precision than lounge api  
        return Math.floor(status.duration);
    }
}

// TODO Work out how to export only the things we want to export
module.exports = { Renderer };
