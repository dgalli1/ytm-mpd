
import { exec } from 'child_process';
import { Player, Video, Volume } from 'yt-cast-receiver';
import { MpdStatus } from './MpdStatus.js';
import mpdapi, { MPDApi } from 'mpd-api';

export class MpdPlayer extends Player {
    httpServer: null;
    config: any;
    client!: MPDApi.ClientAPI;
    currentPlayStatus: string;
    lastPlayBackCommand: string;
    public constructor(config)
    {
        // Call the Ytcr.Player constructor
        super();
        (async () => {
          
            console.log("Creating new renderer: " + config.host);
            this.httpServer = null;
            // Instantiate the mediarender client
            this.config = config
            
            this.client = await mpdapi.connect(config);
            await this.client.api.playback.single('oneshot');
            await this.client.api.playback.consume("0");
            await this.client.api.queue.clear();
            this.currentPlayStatus = 'stopped';
            this.lastPlayBackCommand = 'NOTHING';
        })();
       

    }

    protected async doPlay(video: Video, position: number): Promise<boolean> {
        console.log(`Play ${video.id} at position ${position}s`);
        this.lastPlayBackCommand = 'NOTHING';
        const audioUrl = await this.getAudioUrl(video);
        await this.client.api.queue.clear();
        await this.client.api.queue.add(audioUrl);
        await this.client.api.playback.play();
        await this.client.api.playback.seekcur(position.toString());
        this.lastPlayBackCommand = 'PLAY';
        return true;

    }
    /**
     * Implementations shall pause current playback.
     * @returns Promise that resolves to `true` when playback was paused; `false` otherwise.
     */
    protected async doPause(): Promise<boolean> {
        this.lastPlayBackCommand = 'PAUSE';

        await this.client.api.playback.pause();
        return true;
    }
    /**
     * Implementations shall resume paused playback.
     * @returns Promise that resolves to `true` when playback was resumed; `false` otherwise.
     */
    protected async doResume(): Promise<boolean> {
        this.lastPlayBackCommand = 'PLAY';

        // Play (=resume) the dlna renderer
        await this.client.api.playback.resume();
        return true;
    }
    /**
     * Implementations shall stop current playback or cancel any pending playback (such as when
     * a video is still being loaded).
     * @returns Promise that resolves to `true` when playback was stopped or pending playback was cancelled; `false` otherwise.
     */
    protected async doStop(): Promise<boolean> {
        this.lastPlayBackCommand = 'STOP';
        // Stop the dlna renderer
        await this.client.api.playback.stop();
        return true;
    }
    /**
     * Implementations shall seek to the specified position.
     * @param position The position, in seconds, to seek to.
     * @returns Promise that resolves to `true` if seek operation was successful; `false` otherwise.
     */
    protected async doSeek(position: number): Promise<boolean> {
        await this.client.api.playback.seekcur(position.toString());
        return true;        
    }
    /**
     * Implementations shall set the volume level and muted state to the values specified in the `volume` object param.
     * @param volume (object)
     *   - `level`: (number) volume level between 0-100.
     *   - `muted`: (boolean) muted state.
     * @returns Promise that resolves to `true` when volume was set; `false` otherwise.
     */
    protected async doSetVolume(volume: Volume): Promise<boolean> {
        await this.client.api.playback.setvol(volume.level.toString());
        //@todo implement mute
        return true;
    }
    /**
     * Implementations shall return the current volume level and muted state.
     * @returns Promise that resolves to an object with these properties:
     *   - `level`: (number) volume level between 0-100.
     *   - `muted`: (boolean) muted state.
     */
    protected async doGetVolume(): Promise<Volume> {
        const status = await this.client.api.status.get<MpdStatus>();
        return {
            level: status.volume,
            muted: false
        };

    }
    /**
     * Implementations shall return the current playback position.
     * @returns Promise that resolves to the current playback position (in seconds).
     */
    protected async doGetPosition(): Promise<number> {
        const status = await this.client.api.status.get<MpdStatus>()
        if(typeof status.elapsed === 'undefined') {
            //await for one second as the video is not yet loaded, might be better to wait on the play function?
            await new Promise(r => setTimeout(r, 100));
            return 0;
        }
        //mpd has higher precision than lounge api  
        return Math.floor(status.elapsed);
    }
    /**
     * Implementations shall return the duration of the current video.
     * @returns Promise that resolves to the duration of the current video (in seconds).
     */
    protected async doGetDuration(): Promise<number> {
        const status = await this.client.api.status.get<MpdStatus>();
        if(typeof status.duration === 'undefined') {
            //await for one second
            return 0;
        }
        //mpd has higher precision than lounge api  
        return Math.floor(status.duration);
    }


    private getAudioUrl(video: Video): Promise<string> {
            return new Promise((resolve, reject) => {
            
                // Call yt-dlp to get the audio URL
                exec(`yt-dlp -f bestaudio[ext=m4a] --get-url "https://www.youtube.com/watch?v=${video.id}"`, (err, stdout, stderr) => {
                        if (err) {
                            console.log('Unable to get audio URL using yt-dlp. Using youtube-dl but this is slower!');
                            exec(`youtube-dl -f bestaudio[ext=m4a] --get-url "https://www.youtube.com/watch?v=${video.id}"`, function (err, stdout, stderr) {
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
                            console.log(`Media URL: ${audioUrl}`);
                            resolve(audioUrl);
                        }
                    });
            });       
    }
}