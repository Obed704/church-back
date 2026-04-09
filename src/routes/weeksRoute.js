// routes/weeks.js
import express from "express";
import Week from "../models/week.js";
import { verifyToken } from "../middleware/auth.js";
// import { verifyAdmin } from "../middleware/auth.js"; // ← optional: uncomment if only admins should edit

const router = express.Router();

/**
 * GET /api/weeks
 * Get all weeks, sorted by week number
 */
router.get("/", async (req, res) => {
  try {
    const weeks = await Week.find().sort({ weekNo: 1 }).lean();
    res.status(200).json(weeks);
  } catch (err) {
    console.error("GET /weeks error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch weeks" });
  }
});

/**
 * GET /api/weeks/:id
 * Get single week by MongoDB _id
 */
router.get("/:id", async (req, res) => {
  try {
    const week = await Week.findById(req.params.id).lean();
    if (!week) {
      return res
        .status(404)
        .json({ success: false, message: "Week not found" });
    }
    res.status(200).json(week);
  } catch (err) {
    console.error("GET /weeks/:id error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /api/weeks
 * Create a new week (protected)
 */
router.post(
  "/",
  verifyToken,
  /* verifyAdmin, */ async (req, res) => {
    try {
      const { weekNo, name, date, theme, verse, purpose, plans } = req.body;

      // Basic validation
      if (!weekNo || !theme?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Week number and theme are required",
        });
      }

      // Check if weekNo already exists
      const existing = await Week.findOne({ weekNo: Number(weekNo) });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Week number ${weekNo} already exists`,
        });
      }

      const newWeek = new Week({
        weekNo: Number(weekNo),
        name: name?.trim() || "",
        date: date ? new Date(date) : null,
        theme: theme.trim(),
        verse: verse?.trim() || "",
        purpose: purpose?.trim() || "",
        plans: Array.isArray(plans) ? plans : [],
        createdBy: req.user._id, // optional: track who created it
      });

      const saved = await newWeek.save();

      res.status(201).json({
        success: true,
        message: "Week created successfully",
        data: saved,
      });
    } catch (err) {
      console.error("POST /weeks error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to create week",
        error: err.message,
      });
    }
  },
);

/**
 * PUT /api/weeks/:id
 * Update existing week by _id (protected)
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    console.log("PUT /weeks/:id", {
      id: req.params.id,
      body: req.body,
      user: req.user?._id,
    });

    const week = await Week.findById(req.params.id);
    if (!week) {
      console.log("Week not found for id:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Week not found",
      });
    }

    const { weekNo, name, date, theme, verse, purpose, plans } = req.body;

    // Optional: prevent changing weekNo to existing one
    if (weekNo !== undefined && Number(weekNo) !== week.weekNo) {
      const conflict = await Week.findOne({ weekNo: Number(weekNo) });
      if (conflict && conflict._id.toString() !== week._id.toString()) {
        return res.status(400).json({
          success: false,
          message: `Week number ${weekNo} is already used by another week`,
        });
      }
      week.weekNo = Number(weekNo);
    }

    // Safe updates – only set if provided
    if (name !== undefined) week.name = name?.trim() || week.name;
    if (date !== undefined) week.date = date ? new Date(date) : week.date;
    if (theme !== undefined) week.theme = theme?.trim() || week.theme;
    if (verse !== undefined) week.verse = verse?.trim() || week.verse;
    if (purpose !== undefined) week.purpose = purpose?.trim() || week.purpose;
    if (plans !== undefined) {
      week.plans = Array.isArray(plans)
        ? plans.filter((p) => typeof p === "string" && p.trim())
        : week.plans;
    }

    // Optional: touch updatedAt manually if you want
    week.updatedAt = new Date();

    const updated = await week.save();

    res.status(200).json({
      success: true,
      message: "Week updated",
      data: updated,
    });
  } catch (err) {
    console.error("PUT /weeks/:id failed:", {
      id: req.params.id,
      body: req.body,
      error: err.message,
      stack: err.stack?.substring(0, 300),
    });

    res.status(500).json({
      success: false,
      message: "Server error while updating week",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/**
 * DELETE /api/weeks/:id
 * Delete week by _id (protected)
 */
router.delete(
  "/:id",
  verifyToken,
  /* verifyAdmin, */ async (req, res) => {
    try {
      const week = await Week.findById(req.params.id);
      if (!week) {
        return res
          .status(404)
          .json({ success: false, message: "Week not found" });
      }

      await Week.deleteOne({ _id: req.params.id });

      res.status(200).json({
        success: true,
        message: "Week deleted successfully",
      });
    } catch (err) {
      console.error("DELETE /weeks/:id error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to delete week",
        error: err.message,
      });
    }
  },
);

export default router;
