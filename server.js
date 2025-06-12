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

  const safeFilename = `download_${Date.now()}.${format}`;
  const filePath = path.join(__dirname, safeFilename);

  try {
    if (format === "mp3") {
      // Download and extract audio as mp3
      await ytdlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
      });
    } else {
      // Download best video format
      await ytdlp(url, {
        format: "best",
        output: filePath,
      });
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("Download failed");
      }
      // Delete file after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Failed to delete file:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("yt-dlp error:", error);
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
