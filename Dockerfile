FROM node:lts-alpine3.18
RUN apk add --no-cache \
    git \
    make \
    g++ \
    yt-dlp \
    youtube-dl

VOLUME /app

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build
ENTRYPOINT [ "node", "/app/dist/index.js" ]
