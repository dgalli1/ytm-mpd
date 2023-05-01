import mpdapi, { MPDApi } from 'mpd-api';
import { MpdPlayer } from './player/MpdPlayer.js';
import { MpdStatus } from './player/MpdStatus.js';


const YTCR_BASE_PORT = 3000;




export class MpdEventListener {
    player: MpdPlayer;
    client!: MPDApi.ClientAPI;


    public constructor(MpdPlayer: MpdPlayer, api: MPDApi.ClientAPI) {
        this.player = MpdPlayer;
        this.client = api;


        this.client.on('system', async name => {
            if(name == 'player') {
                const status = await this.client.api.status.get<MpdStatus>();
                if(status.state !== this.player.currentPlayStatus) {
                    this.player.currentPlayStatus = status.state;
                    console.log("Status changed to " + status.state +" from " + this.player.lastPlayBackCommand );
                    if(status.state == 'stop' && this.player.lastPlayBackCommand == 'PLAY') {
                        console.log("Play Next");
                        await this.player.next();
                    }
                }
            }
        })
    }

}