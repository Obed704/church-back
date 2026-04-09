import express from "express";
import mongoose from "mongoose";
import Choir from "../models/Choir.js";
import ChoirApplication from "../models/choirApplication.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

// GET all choirs
router.get("/", async (req, res) => {
  try {
    const { status = "active", search = "", featured } = req.query;

    const filter = {};
    if (status !== "all") filter.status = status;
    if (featured === "true") filter.isFeatured = true;
    if (featured === "false") filter.isFeatured = false;

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { about: { $regex: search.trim(), $options: "i" } },
        { members: { $elemMatch: { $regex: search.trim(), $options: "i" } } },
        { "committee.name": { $regex: search.trim(), $options: "i" } },
      ];
    }

    const choirs = await Choir.find(filter).sort({ sortOrder: 1, name: 1 });
    res.json(choirs);
  } catch (err) {
    console.error("GET /choirs error:", err);
    res.status(500).json({ error: "Failed to load choirs." });
  }
});

// GET one choir by ID
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid choir ID." });
    }

    const choir = await Choir.findById(req.params.id);
    if (!choir) return res.status(404).json({ error: "Choir not found." });

    res.json(choir);
  } catch (err) {
    console.error("GET /choirs/:id error:", err);
    res.status(500).json({ error: "Failed to load choir." });
  }
});

// CREATE choir
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const choir = await Choir.create({
      name: body.name,
      slug: body.slug,
      description: body.description,
      shortDescription: body.shortDescription || "",
      about: body.about || "",
      mission: body.mission || "",
      vision: body.vision || "",
      heroImage: body.heroImage || "",
      coverImage: body.coverImage || "",
      verse: body.verse || "",
      motto: body.motto || "",
      foundedYear: body.foundedYear || undefined,
      president: body.president || "",
      vicePresident: body.vicePresident || "",
      committee: normalizeArray(body.committee),
      members: normalizeArray(body.members),
      songs: normalizeArray(body.songs),
      socials: body.socials || {},
      rehearsals: normalizeArray(body.rehearsals),
      achievements: normalizeArray(body.achievements),
      gallery: normalizeArray(body.gallery),
      faqs: normalizeArray(body.faqs),
      previousYears: normalizeArray(body.previousYears),
      acceptsApplications:
        typeof body.acceptsApplications === "boolean"
          ? body.acceptsApplications
          : true,
      applicationNote: body.applicationNote || "",
      isFeatured: !!body.isFeatured,
      status: body.status || "active",
      sortOrder: Number(body.sortOrder || 0),
    });

    res.status(201).json(choir);
  } catch (err) {
    console.error("POST /choirs error:", err);
    res.status(500).json({ error: "Failed to create choir." });
  }
});

// UPDATE choir
router.put("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid choir ID." });
    }

    const body = req.body || {};
    const choir = await Choir.findById(req.params.id);

    if (!choir) return res.status(404).json({ error: "Choir not found." });

    choir.name = body.name ?? choir.name;
    choir.slug = body.slug ?? choir.slug;
    choir.description = body.description ?? choir.description;
    choir.shortDescription = body.shortDescription ?? choir.shortDescription;
    choir.about = body.about ?? choir.about;
    choir.mission = body.mission ?? choir.mission;
    choir.vision = body.vision ?? choir.vision;
    choir.heroImage = body.heroImage ?? choir.heroImage;
    choir.coverImage = body.coverImage ?? choir.coverImage;
    choir.verse = body.verse ?? choir.verse;
    choir.motto = body.motto ?? choir.motto;
    choir.foundedYear = body.foundedYear ?? choir.foundedYear;
    choir.president = body.president ?? choir.president;
    choir.vicePresident = body.vicePresident ?? choir.vicePresident;
    choir.committee = Array.isArray(body.committee) ? body.committee : choir.committee;
    choir.members = Array.isArray(body.members) ? body.members : choir.members;
    choir.songs = Array.isArray(body.songs) ? body.songs : choir.songs;
    choir.socials = body.socials ?? choir.socials;
    choir.rehearsals = Array.isArray(body.rehearsals) ? body.rehearsals : choir.rehearsals;
    choir.achievements = Array.isArray(body.achievements) ? body.achievements : choir.achievements;
    choir.gallery = Array.isArray(body.gallery) ? body.gallery : choir.gallery;
    choir.faqs = Array.isArray(body.faqs) ? body.faqs : choir.faqs;
    choir.previousYears = Array.isArray(body.previousYears) ? body.previousYears : choir.previousYears;
    choir.acceptsApplications =
      typeof body.acceptsApplications === "boolean"
        ? body.acceptsApplications
        : choir.acceptsApplications;
    choir.applicationNote = body.applicationNote ?? choir.applicationNote;
    choir.isFeatured =
      typeof body.isFeatured === "boolean" ? body.isFeatured : choir.isFeatured;
    choir.status = body.status ?? choir.status;
    choir.sortOrder = body.sortOrder ?? choir.sortOrder;

    await choir.save();
    res.json(choir);
  } catch (err) {
    console.error("PUT /choirs/:id error:", err);
    res.status(500).json({ error: "Failed to update choir." });
  }
});

// APPLY to join choir
router.post("/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, message } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid choir ID." });
    }

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: "Full name is required." });
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({ error: "Provide at least email or phone." });
    }

    const choir = await Choir.findById(id);
    if (!choir) return res.status(404).json({ error: "Choir not found." });

    if (!choir.acceptsApplications) {
      return res.status(400).json({ error: "This choir is not accepting applications now." });
    }

    const application = await ChoirApplication.create({
      choir: choir._id,
      fullName: String(fullName).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      message: String(message || "").trim(),
    });

    res.status(201).json({
      message: "Application submitted successfully.",
      application,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "You already applied to this choir with that contact.",
      });
    }

    console.error("POST /choirs/:id/apply error:", err);
    res.status(500).json({ error: "Failed to submit application." });
  }
});

// GET choir applications
router.get("/:id/applications", async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "all", page = 1, limit = 50 } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid choir ID." });
    }

    const choir = await Choir.findById(id);
    if (!choir) return res.status(404).json({ error: "Choir not found." });

    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (pg - 1) * lim;

    const filter = { choir: id };
    if (status !== "all") filter.status = status;

    const [items, total] = await Promise.all([
      ChoirApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
      ChoirApplication.countDocuments(filter),
    ]);

    res.json({
      choir: { _id: choir._id, name: choir.name },
      total,
      page: pg,
      limit: lim,
      items,
    });
  } catch (err) {
    console.error("GET /choirs/:id/applications error:", err);
    res.status(500).json({ error: "Failed to load choir applications." });
  }
});

export default router;