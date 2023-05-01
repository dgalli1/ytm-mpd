FROM alpine:latest
RUN apk add --no-cache \
    git \
    npm \
    yt-dlp \
    youtube-dl

VOLUME /app

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build
ENTRYPOINT [ "node", "/app/dist/index.js" ]
