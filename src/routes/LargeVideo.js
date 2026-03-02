import express from "express";
import Video from "../models/LargeVideo.js";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Environment variables
const BASE_URL = process.env.BASE_URL;
const UPLOAD_DIR = process.env.LARGE_VIDEO_UPLOAD_DIR || "public/largeVideo";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper: Extract YouTube ID from various URL formats
const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].substring(0, 11);
    }
  }
  return null;
};

// Helper: Get YouTube embed URL
const getYouTubeEmbedUrl = (videoId) => {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`;
};

// Helper: Get YouTube thumbnail
const getYouTubeThumbnail = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Helper: Format video response with correct src and metadata
const formatVideoResponse = (videoDoc) => {
  const video = { ...videoDoc._doc };

  if (video.type === "uploaded") {
    const filename = path.basename(video.src);
    video.src = `${BASE_URL}/largeVideo/${filename}`;
    video.isYouTube = false;
    delete video.youtubeId;
  } else if (video.type === "youtube") {
    video.src = getYouTubeEmbedUrl(video.youtubeId);
    video.thumbnail = getYouTubeThumbnail(video.youtubeId);
    video.isYouTube = true;
  }

  return video;
};

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_VIDEO_SIZE_MB || "500") * 1024 * 1024 }, // Default 500MB
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|mkv|webm/;
    const extValid = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeValid = allowed.test(file.mimetype);
    if (extValid && mimeValid) cb(null, true);
    else cb(new Error("Only video files (mp4, mov, avi, mkv, webm) are allowed!"));
  },
});

// GET all videos
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    const formattedVideos = videos.map(formatVideoResponse);
    res.json(formattedVideos);
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ message: "Error fetching videos" });
  }
});

// POST upload local video
router.post("/", verifyToken, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No video file uploaded" });

    const newVideo = new Video({
      type: "uploaded",
      title: req.body.title?.trim() || "Untitled Video",
      description: req.body.description?.trim() || "",
      uploader: req.user.fullName,
      src: `/largeVideo/${req.file.filename}`, // Relative path stored in DB
    });

    const saved = await newVideo.save();
    res.json(formatVideoResponse(saved));
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// POST add YouTube video
router.post("/youtube", verifyToken, async (req, res) => {
  try {
    const { url, title = "", description = "", channel = "Unknown Channel" } = req.body;

    if (!url) return res.status(400).json({ message: "YouTube URL is required" });

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) return res.status(400).json({ message: "Invalid YouTube URL" });

    const existing = await Video.findOne({ youtubeId });
    if (existing) return res.status(400).json({ message: "This YouTube video already exists" });

    const newVideo = new Video({
      type: "youtube",
      youtubeId,
      youtubeUrl: url,
      youtubeChannel: channel,
      title: title.trim() || "YouTube Video",
      description: description.trim() || "",
      uploader: req.user.fullName,
    });

    const saved = await newVideo.save();
    res.json(formatVideoResponse(saved));
  } catch (err) {
    console.error("YouTube add error:", err);
    res.status(500).json({ message: "Failed to add YouTube video" });
  }
});

// PUT edit video
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (title !== undefined) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();

    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE video
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (video.type === "uploaded" && video.src) {
      const filename = path.basename(video.src);
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete file:", filePath, err);
      });
    }

    await video.deleteOne();
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// POST like
router.post("/:id/like", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    video.likes += 1;
    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    res.status(500).json({ message: "Like failed" });
  }
});

// POST comment
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment cannot be empty" });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    video.comments.push({
      user: req.user.fullName,
      text: text.trim(),
    });

    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ message: "Comment failed" });
  }
});

export default router;