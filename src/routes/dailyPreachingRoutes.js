import express from "express";
import DailyPreaching from "../models/dailyPreachings.js";

const router = express.Router();

/* ================= GET ALL PREACHINGS ================= */
router.get("/", async (req, res) => {
  try {
    const preachings = await DailyPreaching.find().sort({ date: -1 });
    res.json(preachings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= GET SINGLE PREACHING ================= */
router.get("/:id", async (req, res) => {
  try {
    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching)
      return res.status(404).json({ message: "Preaching not found" });

    res.json(preaching);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= LIKE / UNLIKE ================= */
router.post("/:id/like", async (req, res) => {
  const { user } = req.body;

  try {
    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching)
      return res.status(404).json({ message: "Preaching not found" });

    preaching.likes.includes(user)
      ? preaching.likes.pull(user)
      : preaching.likes.push(user);

    await preaching.save();
    res.json(preaching.likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= FAVORITE / UNFAVORITE ================= */
router.post("/:id/favorite", async (req, res) => {
  const { user } = req.body;

  try {
    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching)
      return res.status(404).json({ message: "Preaching not found" });

    preaching.favorites.includes(user)
      ? preaching.favorites.pull(user)
      : preaching.favorites.push(user);

    await preaching.save();
    res.json(preaching.favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= ADD COMMENT ================= */
router.post("/:id/comment", async (req, res) => {
  const { user, text } = req.body;

  try {
    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching)
      return res.status(404).json({ message: "Preaching not found" });

    preaching.comments.push({ user, text });
    await preaching.save();

    res.json(preaching.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= REPLY TO COMMENT ================= */
router.post("/:id/comment/:commentId/reply", async (req, res) => {
  const { user, text } = req.body;

  try {
    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching)
      return res.status(404).json({ message: "Preaching not found" });

    const comment = preaching.comments.id(req.params.commentId);
    if (!comment)
      return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({ user, text });
    await preaching.save();

    res.json(comment.replies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
