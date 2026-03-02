import express from "express";
import HolidaySettings from "../models/HolidaySetting.js";

const router = express.Router();

// GET holiday settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await HolidaySettings.findOne({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Mock participant count
let participantCount = 142;

router.get("/count", (req, res) => {
  res.json({ count: participantCount });
});

// Join holiday prayer
router.post("/join", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ message: "Missing name or phone" });
  participantCount += 1;
  res.json({ message: "Successfully joined!" });
});

export default router;
