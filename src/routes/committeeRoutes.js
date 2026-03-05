import express from "express";
import CommitteeYear from "../models/CommitteeYear.js";
import CommitteeMember from "../models/CommitteeMember.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ---------------- PUBLIC ---------------- */

// list years (latest first)
router.get("/years", async (req, res) => {
  try {
    const years = await CommitteeYear.find().sort({ startYear: -1, endYear: -1 });
    res.json(years);
  } catch (err) {
    res.status(500).json({ message: "Failed to load committee years", error: err.message });
  }
});

// get a year + members (sorted by rank)
router.get("/years/:id", async (req, res) => {
  try {
    const year = await CommitteeYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: "Committee year not found" });

    const members = await CommitteeMember.find({ committeeYear: year._id })
      .sort({ order: 1, createdAt: 1 });

    res.json({ year, members });
  } catch (err) {
    res.status(500).json({ message: "Failed to load committee year", error: err.message });
  }
});

// get by label: /api/committees/by-label/2024-2025
router.get("/by-label/:label", async (req, res) => {
  try {
    const year = await CommitteeYear.findOne({ label: req.params.label.trim() });
    if (!year) return res.status(404).json({ message: "Committee year not found" });

    const members = await CommitteeMember.find({ committeeYear: year._id })
      .sort({ order: 1, createdAt: 1 });

    res.json({ year, members });
  } catch (err) {
    res.status(500).json({ message: "Failed to load committee year", error: err.message });
  }
});

/* ---------------- ADMIN CRUD ---------------- */

// create year
router.post("/years", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { label, startYear, endYear, title, description, coverImageUrl, isActive } = req.body;

    if (!label || !startYear || !endYear) {
      return res.status(400).json({ message: "label, startYear, endYear are required" });
    }

    const exists = await CommitteeYear.findOne({ label: label.trim() });
    if (exists) return res.status(400).json({ message: "This year label already exists" });

    const created = await CommitteeYear.create({
      label: label.trim(),
      startYear,
      endYear,
      title: title ?? "Church Committee",
      description: description ?? "",
      coverImageUrl: coverImageUrl ?? "",
      isActive: !!isActive,
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: "Failed to create committee year", error: err.message });
  }
});

// update year
router.put("/years/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updated = await CommitteeYear.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Committee year not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update committee year", error: err.message });
  }
});

// delete year + cascade members
router.delete("/years/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const year = await CommitteeYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: "Committee year not found" });

    await CommitteeMember.deleteMany({ committeeYear: year._id });
    await CommitteeYear.deleteOne({ _id: year._id });

    res.json({ message: "Deleted committee year and its members" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete committee year", error: err.message });
  }
});

// add member to year
router.post("/years/:id/members", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const year = await CommitteeYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: "Committee year not found" });

    const { role, gender, name, imageUrl, narration } = req.body;
    if (!role || !name) return res.status(400).json({ message: "role and name are required" });

    const created = await CommitteeMember.create({
      committeeYear: year._id,
      role,
      gender: gender ?? "na",
      name,
      imageUrl: imageUrl ?? "",
      narration: narration ?? "",
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: "Failed to create member", error: err.message });
  }
});

// update member
router.put("/members/:memberId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updated = await CommitteeMember.findByIdAndUpdate(req.params.memberId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Member not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update member", error: err.message });
  }
});

// delete member
router.delete("/members/:memberId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await CommitteeMember.findByIdAndDelete(req.params.memberId);
    if (!deleted) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Deleted member" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete member", error: err.message });
  }
});

export default router;