const express = require("express");
const path = require("path");
const fs = require("fs");
const ytdlp = require("yt-dlp-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/download", async (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.status(400).send("Missing parameters");

  const allowedFormats = ["mp3", "mp4"];
  if (!allowedFormats.includes(format)) {
    return res.status(400).send("Invalid format");
  }

  const ext = format === "mp3" ? "mp3" : "mp4";
  const contentType = format === "mp3" ? "audio/mpeg" : "video/mp4";
  const filename = `download.${ext}`;

  try {
    // Set response headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);

    // Start yt-dlp process and pipe directly to response
    const ytdlpProcess = ytdlp.exec(url, {
      format: format === "mp3" ? "bestaudio[ext=m4a]/bestaudio" : "bestvideo+bestaudio/best",
      output: "-", // Output to stdout
      audioFormat: format === "mp3" ? "mp3" : undefined,
      extractAudio: format === "mp3",
      quiet: true,
    });

    ytdlpProcess.stdout.pipe(res);

    ytdlpProcess.stderr.on("data", (data) => {
      console.error(`yt-dlp stderr: ${data}`);
    });

    ytdlpProcess.on("error", (err) => {
      console.error("yt-dlp process error:", err);
      if (!res.headersSent) res.status(500).send("Streaming failed");
    });

    ytdlpProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
      }
    });
  } catch (err) {
    console.error("Streaming error:", err);
    res.status(500).send("Download failed");
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
