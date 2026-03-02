import express from "express";
import Week from "../models/week.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET all weeks
router.get("/", async (req, res) => {
  try {
    const weeks = await Week.find().sort({ weekNo: 1 });
    res.json(weeks);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err });
  }
});

// GET single week by number
router.get("/:weekNo", async (req, res) => {
  try {
    const week = await Week.findOne({ weekNo: req.params.weekNo });
    if (!week) return res.status(404).json({ message: "Week not found" });
    res.json(week);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err });
  }
});

// POST new week
router.post("/", verifyToken, async (req, res) => {
  try {
    const { weekNo, name, date, theme, verse, purpose, plans } = req.body;
    if (!weekNo || !name) {
      return res.status(400).json({ message: "Week number and name required" });
    }

    const newWeek = new Week({
      weekNo,
      name,
      date,
      theme,
      verse,
      purpose,
      plans,
    });

    const savedWeek = await newWeek.save();
    res.status(201).json(savedWeek);
  } catch (err) {
    res.status(500).json({ message: "Error adding week: " + err });
  }
});

// PUT /:weekNo - edit week
router.put("/:weekNo", verifyToken, async (req, res) => {
  try {
    const week = await Week.findOne({ weekNo: req.params.weekNo });
    if (!week) return res.status(404).json({ message: "Week not found" });

    const { name, date, theme, verse, purpose, plans } = req.body;
    if (name) week.name = name;
    if (date) week.date = date;
    if (theme) week.theme = theme;
    if (verse) week.verse = verse;
    if (purpose) week.purpose = purpose;
    if (plans) week.plans = plans;

    const updatedWeek = await week.save();
    res.json(updatedWeek);
  } catch (err) {
    res.status(500).json({ message: "Error editing week: " + err });
  }
});

// DELETE /:weekNo - delete week
router.delete("/:weekNo", verifyToken, async (req, res) => {
  try {
    const week = await Week.findOne({ weekNo: req.params.weekNo });
    if (!week) return res.status(404).json({ message: "Week not found" });

    await week.deleteOne();
    res.json({ message: "Week deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting week: " + err });
  }
});

export default router;
