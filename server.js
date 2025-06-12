const express = require("express");
const path = require("path");
const fs = require("fs");
const ytdlp = require("yt-dlp-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

const cookiesPath = path.join(__dirname, "youtube_cookies.txt");

// On startup, write cookies file if env var exists (base64 decode it first)
if (process.env.YOUTUBE_COOKIES) {
  try {
    const decodedCookies = Buffer.from(
      process.env.YOUTUBE_COOKIES,
      "base64"
    ).toString("utf-8");
    fs.writeFileSync(cookiesPath, decodedCookies);
    console.log("✅ Cookies file written successfully");
  } catch (err) {
    console.error("Failed to write cookies file:", err);
  }
} else {
  console.warn("YOUTUBE_COOKIES env var not set. YouTube downloads may fail.");
}

app.get("/download", async (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.status(400).send("Missing parameters");

  const allowedFormats = ["mp3", "mp4"];
  if (!allowedFormats.includes(format))
    return res.status(400).send("Invalid format");

  // Use a unique filename template with timestamp
  const timestamp = Date.now();
  const outputTemplate = path.join(
    downloadsDir,
    `download_%(title)s_${timestamp}.%(ext)s`
  );

  try {
    console.log(`Starting yt-dlp download for URL: ${url} as ${format}`);

    // Run yt-dlp with correct options
    if (format === "mp3") {
      await ytdlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputTemplate,
        cookies: cookiesPath,
      });
    } else {
      await ytdlp(url, {
        format: "b",
        output: outputTemplate,
        cookies: cookiesPath,
      });
    }

    console.log("Download finished, looking for file...");

    // Find the downloaded file with matching timestamp & extension
    const files = fs.readdirSync(downloadsDir);
    const downloadedFile = files.find(
      (file) => file.includes(timestamp.toString()) && file.endsWith(format)
    );

    if (!downloadedFile) {
      console.error("No downloaded file found");
      return res.status(500).send("Download failed: file not found");
    }

    const filePath = path.join(downloadsDir, downloadedFile);
    console.log("Sending file:", filePath);

    // Stream the file for better compatibility
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadedFile}"`
    );
    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);

    fileStream.on("end", () => {
      // Delete file after sending
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete file:", err);
        else console.log("Deleted file:", downloadedFile);
      });
    });

    fileStream.on("error", (err) => {
      console.error("File stream error:", err);
      if (!res.headersSent) res.status(500).send("Download failed");
    });
  } catch (error) {
    console.error("yt-dlp error:", error);
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
