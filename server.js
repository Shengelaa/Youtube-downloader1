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
  if (!allowedFormats.includes(format))
    return res.status(400).send("Invalid format");

  const outputTemplate = path.join(
    __dirname,
    `download_%(title)s_${Date.now()}.%(ext)s`
  );

  try {
    if (format === "mp3") {
      await ytdlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputTemplate,
      });
    } else {
      await ytdlp(url, {
        format: "best",
        output: outputTemplate,
      });
    }

    const downloadedFiles = fs
      .readdirSync(__dirname)
      .filter((file) => file.startsWith(`download_`) && file.endsWith(format));
    if (downloadedFiles.length === 0) {
      return res.status(500).send("Download failed: file not found");
    }
    const downloadedFile = downloadedFiles[0];
    const filePath = path.join(__dirname, downloadedFile);

    res.download(filePath, downloadedFile, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) res.status(500).send("Download failed");
      }
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