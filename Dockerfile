FROM node:18

RUN apt-get update && \
    apt-get install -y python3 ffmpeg curl && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp


WORKDIR /app


COPY package*.json ./


RUN npm install


COPY . .

EXPOSE 3000


CMD ["node", "server.js"]