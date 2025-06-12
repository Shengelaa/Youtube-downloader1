const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.get("/download", (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.status(400).send("Missing parameters");

  const safeFilename = `download_${Date.now()}.${format}`;
  const filePath = path.join(__dirname, safeFilename);

  const command =
    format === "mp3"
      ? `yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}"`
      : `yt-dlp -f best -o "${filePath}" "${url}"`;

  exec(command, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Download failed");
    }

    res.download(filePath, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(filePath, () => {}); // delete file after download
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
