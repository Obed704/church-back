// src/routes/videoRoute.js
import express from "express";
import mongoose from "mongoose";
import Video from "../models/video.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const extractYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1].substring(0, 11);
  }
  return null;
};

const getYouTubeThumbnail = (id) => (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "");

const formatVideo = (doc) => {
  const o = doc?.toObject ? doc.toObject() : doc;
  const youtubeId = o.youtubeId || extractYouTubeId(o.youtubeUrl);

  return {
    ...o,
    youtubeId,
    likesCount: o.likedBy?.length || 0,
    favoritesCount: o.favoritedBy?.length || 0,
    thumbnail: o.thumbnail || (youtubeId ? getYouTubeThumbnail(youtubeId) : ""),
  };
};

/* ---------------- PUBLIC LIST (ACTIVE ONLY) ---------------- */
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, videos: videos.map(formatVideo) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch videos failed", error: err.message });
  }
});

/* ---------------- VIEWS (PUBLIC) ---------------- */
router.post("/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const video = await Video.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    res.json({ success: true, views: video.views, video: formatVideo(video) });
  } catch (err) {
    res.status(500).json({ success: false, message: "View update failed", error: err.message });
  }
});

/* ---------------- SHARE COUNT (PUBLIC) ---------------- */
router.post("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const video = await Video.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true });
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    res.json({ success: true, shares: video.shares, video: formatVideo(video) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Share update failed", error: err.message });
  }
});

/* ---------------- LIKE TOGGLE (AUTH) ---------------- */
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const userId = String(req.user._id);

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    video.likedBy = Array.isArray(video.likedBy) ? video.likedBy : [];

    const idx = video.likedBy.findIndex((x) => String(x) === userId);
    if (idx >= 0) video.likedBy.splice(idx, 1);
    else video.likedBy.push(req.user._id);

    await video.save();

    res.json({ success: true, video: formatVideo(video) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Like failed", error: err.message });
  }
});

/* ---------------- COMMENT (AUTH) ---------------- */
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!isValidId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    if (!text?.trim()) return res.status(400).json({ success: false, message: "Text is required" });

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    video.comments = Array.isArray(video.comments) ? video.comments : [];

   video.comments.push({
  user: req.user.fullName,        // ✅ REQUIRED by schema
  userId: req.user._id,
  text: text.trim(),
  replies: [],
});

    await video.save();
    res.status(201).json({ success: true, video: formatVideo(video) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Comment failed", error: err.message });
  }
});

/* ---------------- REPLY (AUTH) ---------------- */
router.post("/:id/comment/:commentId/reply", verifyToken, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;

    if (!isValidId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    if (!isValidId(commentId))
      return res.status(400).json({ success: false, message: "Invalid commentId" });
    if (!text?.trim()) return res.status(400).json({ success: false, message: "Text is required" });

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    video.comments = Array.isArray(video.comments) ? video.comments : [];

    const c = video.comments.find((x) => String(x._id) === String(commentId));
    if (!c) return res.status(404).json({ success: false, message: "Comment not found" });

    c.replies = Array.isArray(c.replies) ? c.replies : [];
  c.replies.push({
  user: req.user.fullName,        // ✅ REQUIRED by schema
  userId: req.user._id,
  text: text.trim(),
});

    await video.save();
    res.status(201).json({ success: true, video: formatVideo(video) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Reply failed", error: err.message });
  }
});

export default router;