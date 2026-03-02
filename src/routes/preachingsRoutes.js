import express from "express";
import Study from "../models/Study.js";

const router = express.Router();

// GET all studies
router.get("/", async (req, res) => {
  try {
    const studies = await Study.find().sort({ createdAt: -1 });
    res.json(studies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single study
router.get("/:id", async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ message: "Study not found" });
    res.json(study);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE study
router.put("/:id", async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ message: "Study not found" });

    Object.assign(study, req.body); // update all fields from body
    await study.save();
    res.json(study);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE study
router.delete("/:id", async (req, res) => {
  try {
    const study = await Study.findByIdAndDelete(req.params.id);
    if (!study) return res.status(404).json({ message: "Study not found" });

    res.json({ message: "Study deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* LIKE / UNLIKE */
router.post("/:id/like", async (req, res) => {
  const { user } = req.body;

  const preaching = await DailyPreaching.findById(req.params.id);
  if (!preaching) return res.status(404).json({ message: "Not found" });

  if (preaching.likes.includes(user)) {
    preaching.likes.pull(user);
  } else {
    preaching.likes.push(user);
  }

  await preaching.save();
  res.json(preaching.likes);
});

/* FAVORITE / UNFAVORITE */
router.post("/:id/favorite", async (req, res) => {
  const { user } = req.body;

  const preaching = await DailyPreaching.findById(req.params.id);
  if (!preaching) return res.status(404).json({ message: "Not found" });

  if (preaching.favorites.includes(user)) {
    preaching.favorites.pull(user);
  } else {
    preaching.favorites.push(user);
  }

  await preaching.save();
  res.json(preaching.favorites);
});

/* ADD COMMENT */
router.post("/:id/comment", async (req, res) => {
  const { user, text } = req.body;

  const preaching = await DailyPreaching.findById(req.params.id);
  if (!preaching) return res.status(404).json({ message: "Not found" });

  preaching.comments.push({ user, text });
  await preaching.save();

  res.json(preaching.comments);
});

/* REPLY TO COMMENT */
router.post("/:id/comment/:commentId/reply", async (req, res) => {
  const { user, text } = req.body;

  const preaching = await DailyPreaching.findById(req.params.id);
  if (!preaching) return res.status(404).json({ message: "Not found" });

  const comment = preaching.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  comment.replies.push({ user, text });
  await preaching.save();

  res.json(comment.replies);
});

export default router;
