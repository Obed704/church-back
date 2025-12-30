import express from "express";
import HolidayParticipant from "../models/HolidayParticipants.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import HolidaySettings from "../models/HolidaySetting.js";

const router = express.Router();

/* ---------------------- PUBLIC ROUTES ---------------------- */

// GET holiday settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await HolidaySettings.findOne({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// GET total participant count (public)
router.get("/count", async (req, res) => {
  try {
    const count = await HolidayParticipant.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST join holiday prayer (authenticated users)
router.post("/join", verifyToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone)
      return res.status(400).json({ message: "Name and phone are required" });

    const participant = new HolidayParticipant({
      name,
      phone,
      user: req.user._id,
    });

    await participant.save();
    res
      .status(201)
      .json({ message: "Successfully joined the holiday prayer!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------------- ADMIN ROUTES ---------------------- */

// CREATE new settings (optional, usually only one)
router.post("/settings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const newSettings = new HolidaySettings(req.body);
    await newSettings.save();
    res.status(201).json({ message: "Settings created", settings: newSettings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE current settings (save old version in history)
router.put("/settings/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await HolidaySettings.findById(req.params.id);
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Save current version to history
    const oldVersion = { ...settings.toObject(), _id: undefined, history: undefined };
    settings.history.push(oldVersion);

    // Update fields
    Object.keys(req.body).forEach(key => {
      settings[key] = req.body[key];
    });

    await settings.save();
    res.json({ message: "Settings updated", settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all past versions
router.get("/settings/history/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await HolidaySettings.findById(req.params.id);
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json(settings.history || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE settings
router.delete("/settings/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await HolidaySettings.findByIdAndDelete(req.params.id);
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json({ message: "Settings deleted", settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET all participants (admin only)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const participants = await HolidayParticipant.find()
      .populate("user", "fullName email")
      .sort({ createdAt: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single participant by ID (admin only)
router.get("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const participant = await HolidayParticipant.findById(
      req.params.id
    ).populate("user", "fullName email");
    if (!participant)
      return res.status(404).json({ message: "Participant not found" });
    res.json(participant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE participant by ID (admin only)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const participant = await HolidayParticipant.findById(req.params.id);
    if (!participant)
      return res.status(404).json({ message: "Participant not found" });

    if (name) participant.name = name;
    if (phone) participant.phone = phone;

    await participant.save();
    res.json({ message: "Participant updated successfully", participant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE participant by ID (admin only)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const participant = await HolidayParticipant.findById(req.params.id);
    if (!participant)
      return res.status(404).json({ message: "Participant not found" });

    await participant.remove();
    res.json({ message: "Participant deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
