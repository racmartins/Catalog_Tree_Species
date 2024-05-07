const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  video_url: { type: String, required: true },
  thumbnail_url: { type: String, required: true }, // Campo adicionado
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
