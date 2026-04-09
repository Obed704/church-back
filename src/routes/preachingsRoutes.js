import express from "express";
import mongoose from "mongoose";
import DailyPreaching from "../models/dailyPreachings.js";

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* -------------------- CRUD -------------------- */

// CREATE (this is what your frontend POST needs)
router.post("/", async (req, res) => {
  try {
    const { day, date, preacher, verses, description } = req.body;

    // basic validation (keep light)
    if (!day || !date || !preacher || !description) {
      return res.status(400).json({
        message: "Missing required fields: day, date, preacher, description",
      });
    }

    const created = await DailyPreaching.create({
      day: String(day).trim(),
      date: new Date(date),
      preacher: String(preacher).trim(),
      verses: Array.isArray(verses)
        ? verses.map((v) => String(v).trim()).filter(Boolean)
        : [],
      description: String(description).trim(),
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const items = await DailyPreaching.find().sort({ date: -1, createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const item = await DailyPreaching.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Preaching not found" });

    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const item = await DailyPreaching.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Preaching not found" });

    const { day, date, preacher, verses, description } = req.body;

    // update only provided fields
    if (day !== undefined) item.day = String(day).trim();
    if (date !== undefined) item.date = new Date(date);
    if (preacher !== undefined) item.preacher = String(preacher).trim();
    if (description !== undefined) item.description = String(description).trim();

    if (verses !== undefined) {
      item.verses = Array.isArray(verses)
        ? verses.map((v) => String(v).trim()).filter(Boolean)
        : [];
    }

    await item.save();
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const deleted = await DailyPreaching.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Preaching not found" });

    return res.json({ message: "Preaching deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- OPTIONAL: like/favorite/comment/reply -------------------- */

// LIKE / UNLIKE
router.post("/:id/like", async (req, res) => {
  try {
    const { user } = req.body;
    if (!user) return res.status(400).json({ message: "Missing user" });

    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching) return res.status(404).json({ message: "Not found" });

    preaching.likes = preaching.likes || [];

    if (preaching.likes.includes(user)) preaching.likes.pull(user);
    else preaching.likes.push(user);

    await preaching.save();
    return res.json(preaching.likes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// FAVORITE / UNFAVORITE
router.post("/:id/favorite", async (req, res) => {
  try {
    const { user } = req.body;
    if (!user) return res.status(400).json({ message: "Missing user" });

    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching) return res.status(404).json({ message: "Not found" });

    preaching.favorites = preaching.favorites || [];

    if (preaching.favorites.includes(user)) preaching.favorites.pull(user);
    else preaching.favorites.push(user);

    await preaching.save();
    return res.json(preaching.favorites);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ADD COMMENT
router.post("/:id/comment", async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!user || !text) {
      return res.status(400).json({ message: "Missing user or text" });
    }

    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching) return res.status(404).json({ message: "Not found" });

    preaching.comments = preaching.comments || [];
    preaching.comments.push({ user: String(user).trim(), text: String(text).trim() });

    await preaching.save();
    return res.json(preaching.comments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// REPLY TO COMMENT
router.post("/:id/comment/:commentId/reply", async (req, res) => {
  try {
    const { user, text } = req.body;
    if (!user || !text) {
      return res.status(400).json({ message: "Missing user or text" });
    }

    const preaching = await DailyPreaching.findById(req.params.id);
    if (!preaching) return res.status(404).json({ message: "Not found" });

    const comment = preaching.comments?.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies = comment.replies || [];
    comment.replies.push({ user: String(user).trim(), text: String(text).trim() });

    await preaching.save();
    return res.json(comment.replies);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;