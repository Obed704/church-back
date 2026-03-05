// routes/adminVideos.js
import express from "express";
import Video from "../models/video.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Helpers
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

const getYouTubeThumbnail = (id) =>
  `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

// Admin only
// router.use(verifyToken, verifyAdmin);

// READ (list all, including inactive) + search + filter + pagination
router.get("/", async (req, res) => {
  try {
    const { q = "", status = "all", page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [
        { title: rx },
        { description: rx },
        { youtubeChannel: rx },
        { youtubeUrl: rx },
        { youtubeId: rx },
      ];
    }

    const [videos, total] = await Promise.all([
      Video.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Video.countDocuments(filter),
    ]);

    const formatted = videos.map((v) => {
      const o = v.toObject();
      return {
        ...o,
        likesCount: o.likedBy?.length || 0,
        favoritesCount: o.favoritedBy?.length || 0,
        thumbnail: getYouTubeThumbnail(o.youtubeId),
      };
    });

    res.json({
      success: true,
      videos: formatted,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin fetch failed", error: err.message });
  }
});

// CREATE (YouTube link)
router.post("/youtube",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { url, title = "", description = "", channel = "Unknown Channel" } = req.body;

    if (!url) return res.status(400).json({ success: false, message: "YouTube URL is required" });

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) return res.status(400).json({ success: false, message: "Invalid YouTube URL" });

    const exists = await Video.findOne({ youtubeId });
    if (exists) return res.status(400).json({ success: false, message: "Video already exists" });

    const created = await Video.create({
      youtubeId,
      youtubeUrl: url,
      title: title || "YouTube Video",
      description,
      youtubeChannel: channel,
      likedBy: [],
      favoritedBy: [],
      shares: 0,
      views: 0,
      comments: [],
      userId: req.user._id,
      userName: req.user.fullName,
      isActive: true,
    });

    const obj = created.toObject();
    obj.likesCount = 0;
    obj.favoritesCount = 0;
    obj.thumbnail = getYouTubeThumbnail(obj.youtubeId);

    res.status(201).json({ success: true, message: "Created", video: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin create failed", error: err.message });
  }
});

// UPDATE (title/description/channel/url)
router.put("/:id",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { url, title, description, channel, isActive } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    // If url changes, update youtubeId + check uniqueness
    if (url !== undefined && url !== video.youtubeUrl) {
      const youtubeId = extractYouTubeId(url);
      if (!youtubeId) return res.status(400).json({ success: false, message: "Invalid YouTube URL" });

      const exists = await Video.findOne({ youtubeId, _id: { $ne: video._id } });
      if (exists) return res.status(400).json({ success: false, message: "Another video already uses this link" });

      video.youtubeUrl = url;
      video.youtubeId = youtubeId;
    }

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (channel !== undefined) video.youtubeChannel = channel;
    if (isActive !== undefined) video.isActive = !!isActive;

    await video.save();

    const obj = video.toObject();
    obj.likesCount = obj.likedBy?.length || 0;
    obj.favoritesCount = obj.favoritedBy?.length || 0;
    obj.thumbnail = getYouTubeThumbnail(obj.youtubeId);

    res.json({ success: true, message: "Updated", video: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin update failed", error: err.message });
  }
});

// DELETE (soft delete)
router.delete("/:id",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    video.isActive = false;
    await video.save();

    res.json({ success: true, message: "Deleted (soft)" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin delete failed", error: err.message });
  }
});

// RESTORE (bring back inactive)
router.patch("/:id/restore",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found" });

    video.isActive = true;
    await video.save();

    const obj = video.toObject();
    obj.likesCount = obj.likedBy?.length || 0;
    obj.favoritesCount = obj.favoritedBy?.length || 0;
    obj.thumbnail = getYouTubeThumbnail(obj.youtubeId);

    res.json({ success: true, message: "Restored", video: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin restore failed", error: err.message });
  }
});

export default router;