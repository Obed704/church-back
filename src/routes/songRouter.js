import express from "express";
import Song from "../models/song.js";

const router = express.Router();

// Get all songs
router.get("/", async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Add a new song
router.post("/", async (req, res) => {
  try {
    const { link, description } = req.body;
    const newSong = new Song({ link, description });
    const savedSong = await newSong.save();
    res.status(201).json(savedSong);
  } catch (err) {
    res.status(500).json({ error: "Failed to add song" });
  }
});

export default router;
