import express from "express";
import Sermon from "../models/sermons.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET all sermons
router.get("/", async (req, res) => {
  try {
    const sermons = await Sermon.find().sort({ createdAt: -1 });
    res.json(sermons);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sermons", error: err });
  }
});

// POST a new comment
// POST a new comment
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    const userId =
      req.user?.id || req.user?._id || req.user?.userId; // <-- robust
    if (!userId) return res.status(401).json({ message: "Invalid token user payload" });

    sermon.comments.push({
      text,
      userId,
      userName: req.user.fullName || req.user.username || "Guest",
    });

    await sermon.save();
    res.json(sermon);
  } catch (err) {
    res.status(500).json({ message: "Error adding comment", error: err.message || err });
  }
});

// POST favorite/unfavorite
router.post("/:id/favorite", verifyToken, async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    const userId = String(req.user?.id || req.user?._id || req.user?.userId);
    if (!userId) return res.status(401).json({ message: "Invalid token user payload" });

    const hasFav = (sermon.favorites || []).some((id) => String(id) === userId);

    sermon.favorites = hasFav
      ? sermon.favorites.filter((id) => String(id) !== userId)
      : [...(sermon.favorites || []), userId];

    await sermon.save();
    res.json(sermon);
  } catch (err) {
    res.status(500).json({ message: "Error updating favorites", error: err.message || err });
  }
});

// POST like/unlike
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    const userId = String(req.user?.id || req.user?._id || req.user?.userId);
    if (!userId) return res.status(401).json({ message: "Invalid token user payload" });

    const hasLike = (sermon.likedBy || []).some((id) => String(id) === userId);

    sermon.likedBy = hasLike
      ? sermon.likedBy.filter((id) => String(id) !== userId)
      : [...(sermon.likedBy || []), userId];

    sermon.likes = sermon.likedBy.length;

    await sermon.save();
    res.json(sermon);
  } catch (err) {
    res.status(500).json({ message: "Error updating likes", error: err.message || err });
  }
});

// POST a new sermon
router.post("/", verifyToken, async (req, res) => {
  try {
    const { verse, description, preacher } = req.body;
    if (!verse || !description || !preacher) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newSermon = new Sermon({ verse, description, preacher });
    await newSermon.save();

    res.status(201).json(newSermon);
  } catch (err) {
    res.status(500).json({ message: "Error uploading sermon", error: err });
  }
});

// PUT /:id - edit sermon
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    const { verse, description, preacher } = req.body;
    if (verse) sermon.verse = verse;
    if (description) sermon.description = description;
    if (preacher) sermon.preacher = preacher;

    const updated = await sermon.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error editing sermon", error: err });
  }
});

// DELETE /:id - delete sermon
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ message: "Sermon not found" });

    await sermon.deleteOne();
    res.json({ message: "Sermon deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting sermon", error: err });
  }
});

export default router;
