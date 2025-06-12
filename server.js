const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const ytdlp = require("yt-dlp-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Utility to generate a unique temp filename prefix per request
function generateTempPrefix() {
  return `download_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

app.get("/download", async (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.status(400).send("Missing parameters");

  const allowedFormats = ["mp3", "mp4"];
  if (!allowedFormats.includes(format))
    return res.status(400).send("Invalid format");

  const tempDir = os.tmpdir();
  const tempPrefix = generateTempPrefix();

  // Template for output file (will save in temp dir)
  const outputTemplate = path.join(tempDir, `${tempPrefix}.%(ext)s`);

  try {
    // Build options object for yt-dlp
    const options = {
      output: outputTemplate,
    };

    if (format === "mp3") {
      options.extractAudio = true;
      options.audioFormat = "mp3";
      // To force best audio quality
      options.audioQuality = 0;
    } else if (format === "mp4") {
      // For mp4, don’t specify format to allow yt-dlp merging best streams
      // So no format option set here
    }

    // Run yt-dlp
    await ytdlp(url, options);

    // Find the downloaded file that matches the prefix
    const files = fs.readdirSync(tempDir);
    const matchedFiles = files.filter((f) => f.startsWith(tempPrefix));

    if (matchedFiles.length === 0) {
      return res.status(500).send("Download failed: file not found");
    }

    // Usually only one file matches
    const downloadedFile = matchedFiles[0];
    const filePath = path.join(tempDir, downloadedFile);

    // Send file as attachment to client
    res.download(filePath, downloadedFile, (err) => {
      // Delete file after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Failed to delete temp file:", unlinkErr);
      });

      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) res.status(500).send("Download failed");
      }
    });
  } catch (error) {
    console.error("yt-dlp error:", error);
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
