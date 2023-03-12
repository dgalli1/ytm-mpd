#!/bin/node


const Renderer = require("./renderer").Renderer;


const config = {
    host: "192.168.178.66",
    port: 6600
};
// We did not find a renderer with this location, so create one
let renderer = new Renderer(config);
renderer.eventEmitter.on('restart', () => {
    console.log("restarting mpd connection and renderer")
    renderer = new Renderer(config); 
});