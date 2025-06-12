# Use official Node.js image as base
FROM node:18

# Install python3 and ffmpeg (needed by yt-dlp)
RUN apt-get update && apt-get install -y python3 ffmpeg

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app code
COPY . .

# Expose port (Railway or your local)
EXPOSE 3000

# Start your app
CMD ["node", "server.js"]
