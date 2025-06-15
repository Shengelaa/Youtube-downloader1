const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const ytdlp = require("yt-dlp-exec");

const app = express();
const PORT = process.env.PORT || 3000;

const COOKIE_FILE_PATH = path.join(os.tmpdir(), "cookies.txt");

// Write cookie data from env var to temp file on startup
if (process.env.COOKIES_DATA) {
  try {
    fs.writeFileSync(COOKIE_FILE_PATH, process.env.COOKIES_DATA);
    console.log(`✅ Cookies written to ${COOKIE_FILE_PATH}`);
  } catch (err) {
    console.error("❌ Failed to write cookies file:", err);
  }
} else {
  console.warn("⚠️ COOKIES_DATA environment variable not set.");
}

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

  try {
    // Get metadata using cookies file
    const metadata = await ytdlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      cookiesFromFile: COOKIE_FILE_PATH,
    });

    const safeTitle = metadata.title
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${safeTitle}.${ext}`;

    // Set response headers
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);

    // Start yt-dlp process and stream output
    const ytdlpProcess = ytdlp.exec(url, {
      format:
        format === "mp3"
          ? "bestaudio[ext=m4a]/bestaudio"
          : "bestvideo+bestaudio/best",
      output: "-",
      audioFormat: format === "mp3" ? "mp3" : undefined,
      extractAudio: format === "mp3",
      quiet: true,
      cookiesFromFile: COOKIE_FILE_PATH,
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
