import express from "express";
import Favorite from "../models/LargeVideoFavorite.js";
import Video from "../models/LargeVideo.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Helper: Extract YouTube ID from various URL formats
const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url?.match(pattern);
    if (match && match[1]) return match[1].substring(0, 11);
  }
  return null;
};

const getYouTubeEmbedUrl = (videoId) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`;

const getYouTubeThumbnail = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

// Always return a frontend-friendly object
const formatVideoResponse = (doc) => {
  const v = { ...doc._doc };

  // Force youtube-only formatting
  v.type = "youtube";
  v.src = getYouTubeEmbedUrl(v.youtubeId);
  v.thumbnail = getYouTubeThumbnail(v.youtubeId);

  // Keep these for UI
  v.isYouTube = true;

  return v;
};

// GET all (youtube-only)
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find({ type: "youtube" }).sort({ createdAt: -1 });
    res.json(videos.map(formatVideoResponse));
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ message: "Error fetching videos" });
  }
});

// GET my favorites (protected)
router.get("/favorites/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // adjust if your verifyToken uses _id
    const favs = await Favorite.find({ userId }).select("videoId");

    const ids = favs.map((f) => f.videoId);
    const videos = await Video.find({ _id: { $in: ids }, type: "youtube" }).sort({ createdAt: -1 });

    res.json(videos.map(formatVideoResponse));
  } catch (err) {
    console.error("Favorites fetch error:", err);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
});

// GET favorite ids (fast) (protected)
router.get("/favorites/ids", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const favs = await Favorite.find({ userId }).select("videoId");
    res.json({ ids: favs.map((f) => String(f.videoId)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch favorite ids" });
  }
});

// POST toggle favorite (protected)
router.post("/:id/favorite/toggle", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const videoId = req.params.id;

    // ensure video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: "Video not found" });

    const existing = await Favorite.findOne({ userId, videoId });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      return res.json({ favorited: false });
    }

    await Favorite.create({ userId, videoId });
    return res.json({ favorited: true });
  } catch (err) {
    // duplicate key means already favorited (race condition)
    if (err?.code === 11000) return res.json({ favorited: true });
    console.error("Toggle favorite error:", err);
    res.status(500).json({ message: "Failed to toggle favorite" });
  }
});

// POST add YouTube video (protected)
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

// PUT edit (protected)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { title, description, youtubeChannel } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (title !== undefined) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (youtubeChannel !== undefined) video.youtubeChannel = youtubeChannel.trim();

    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE (protected)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    await video.deleteOne();
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// POST like (optionally you can protect it; keeping it open like your old code)
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // whatever your middleware sets

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    const alreadyLiked = (video.likedBy || []).some(
      (id) => String(id) === String(userId)
    );

    if (alreadyLiked) {
      return res.status(400).json({ message: "You already liked this video" });
    }

    video.likedBy = video.likedBy || [];
    video.likedBy.push(userId);
    video.likes = (video.likes || 0) + 1;

    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    console.error("Like failed:", err);
    res.status(500).json({ message: "Like failed" });
  }
});

// POST comment (protected)
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment cannot be empty" });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    video.comments.push({
      user: req.user.fullName,
      text: text.trim(),
      replies: [],
    });

    const updated = await video.save();
    res.json(formatVideoResponse(updated));
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ message: "Comment failed" });
  }
});

export default router;