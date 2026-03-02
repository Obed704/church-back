import express from "express";
import Choir from "../models/choir.js";
import ChoirApplication from "../models/choirApplication.js";

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
// APPLY to join a choir
// POST /api/choirs/:id/apply
router.post("/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, message } = req.body;

    // basic validation
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: "Full name is required." });
    }
    const hasContact = (email && String(email).trim()) || (phone && String(phone).trim());
    if (!hasContact) {
      return res.status(400).json({ error: "Provide at least email or phone." });
    }

    const choir = await Choir.findById(id);
    if (!choir) return res.status(404).json({ error: "Choir not found" });

    const application = await ChoirApplication.create({
      choir: choir._id,
      fullName: String(fullName).trim(),
      email: email ? String(email).trim().toLowerCase() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      message: message ? String(message).trim() : undefined,
    });

    return res.status(201).json({
      message: "Application submitted successfully.",
      application,
    });
  } catch (err) {
    // Duplicate key (already applied)
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "You already applied to this choir using this contact.",
      });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to submit application." });
  }
});

// LIST applications for a choir (admin-only recommended)
// GET /api/choirs/:id/applications?status=pending|approved|rejected|all
router.get("/:id/applications", async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "pending", limit = 50, page = 1 } = req.query;

    const choir = await Choir.findById(id);
    if (!choir) return res.status(404).json({ error: "Choir not found" });

    const lim = Math.min(100, Math.max(1, Number(limit) || 50));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;

    const filter = { choir: id };
    if (status !== "all") filter.status = status;

    const [items, total] = await Promise.all([
      ChoirApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
      ChoirApplication.countDocuments(filter),
    ]);

    res.json({ total, page: pg, limit: lim, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load applications." });
  }
});
export default router;
