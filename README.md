# ytm-mpd
Cast from YouTube/Youtube Music app to MPD. Other apps will not work as we're basically using youtube.com/tv for receiving the current songs.  
Mostly inspired by upnpTube https://github.com/mas94uk/upnpTube but without dlna support and instead support for a single mpd instance. 
## Why MPD?

MPD is a greate tool which works on every platform and can output to almost all sound devices. You can output to dlna, fifo or hardware devices.  
Implementing all of this would be a harder then to maintain then simply using mpd. On top of that it also automaticly buffers the stream and handels all of the complex logic. Also integration stuff like snapcast is already documented.


## Road Map

1. Local HTTP Cache

2. Sponsorblock Support

3. Connect to local Music Database and use those instead of youtube if they exists (e.x Local FLAC library)


## Installation

### Docker

```yml
version: '3.8'
services:
  yt-mpd:
    image: ghcr.io/dgalli1/ytm-mpd:main
    # for now it only works with host network, i belive auto discovery doesn't work without it
    network_mode: 'host'
    environment:
      - MPD_HOST=localhost
      - MPD_PORT=6600
      - MPD_PASSWORD=
    depends_on:
      - mpd
  mpd:
    #image: tobi312/rpi-mpd:debian
    image: tobi312/rpi-mpd:alpine
    container_name: mpd
    restart: unless-stopped
    ports:
      - 6600:6600  # MPD Client
      - 8000:8000  # Stream
    volumes:
      - ./mpd-data:/var/lib/mpd/data:rw
      #- ./mpd.conf:/etc/mpd.conf:rw
    devices:
      - "/dev/snd:/dev/snd"
```

### Bare-Metal installation
Install npm and node.js:

    sudo apt install npm yt-dlp youtube-dl ffmpeg
    
Install ytm-mpd:

    git clone https://github.com/dgalli1/ytm-mpd.git
    cd ytm-mpd
    npm install
    npm run build

Run yt-mpd:

    MPD_HOST=localhost MPD_PORT=6600 MPD_PASSWORD=YOUR_PASSWORD  node dist/index.js
