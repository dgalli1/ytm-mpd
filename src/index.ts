#!/bin/node

import YouTubeCastReceiver from "yt-cast-receiver";
import { MpdPlayer } from "./player/MpdPlayer.js";
import { MpdEventListener } from "./eventListener.js";

const config = {
    host: process.env.MPD_HOST,
    port: process.env.MPD_PORT,
    password: process.env.MPD_PASSWORD
};

// We did not find a renderer with this location, so create one
const player = new MpdPlayer(config);
await player.initialize();

const receiver = new YouTubeCastReceiver(player, {
    'device': {
        'name': 'YT-MPD',
        'screenName': 'YT-MPD',
    }
});

// When a sender connects
receiver.on('senderConnect', (sender) => {
  console.log(`Connected to ${sender.name}`);
});
  
// When a sender disconnects
receiver.on('senderDisconnect', (sender) => {
  console.log(`Disconnected from ${sender.name}.`);

  // `yt-cast-receiver` supports multiple sender connections. Call
  // `getConnectedSenders()` to obtain info about them.
  console.log(`Remaining connected senders: ${receiver.getConnectedSenders().length}`);
});
  
// Start the receiver
try {
  await receiver.start();
}
catch (error) {
  console.log(`Failed to start receiver: ${error.message}`)
}

const eventEmitter = new MpdEventListener(player, player.client);