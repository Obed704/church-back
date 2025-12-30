import express from "express";
import Choir from "../models/choir.js";

const router = express.Router();

// GET all choirs
router.get("/", async (req, res) => {
  try {
    const choirs = await Choir.find();
    res.json(choirs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET choir by name
router.get("/:name", async (req, res) => {
  try {
    const choir = await Choir.findOne({ name: req.params.name });
    if (!choir) return res.status(404).json({ error: "Choir not found" });
    res.json(choir);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE a choir by ID (edit only, no delete)
router.put("/:id", async (req, res) => {
  try {
    const choir = await Choir.findById(req.params.id);
    if (!choir) return res.status(404).json({ error: "Choir not found" });

    // Update fields from request body
    choir.name = req.body.name ?? choir.name;
    choir.description = req.body.description ?? choir.description;
    choir.president = req.body.president ?? choir.president;
    choir.vicePresident = req.body.vicePresident ?? choir.vicePresident;
    choir.committee = req.body.committee ?? choir.committee;
    choir.verse = req.body.verse ?? choir.verse;
    choir.about = req.body.about ?? choir.about;
    choir.songs = req.body.songs ?? choir.songs;
    choir.social = req.body.social ?? choir.social;

    await choir.save();
    res.json(choir);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update choir" });
  }
});
export default router;
