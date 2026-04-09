import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import { upload } from "../middleware/Upload.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags
      .map(String)
      .map((t) => t.trim())
      .filter(Boolean);
  if (typeof tags === "string") {
    try {
      const maybe = JSON.parse(tags.trim());
      if (Array.isArray(maybe))
        return maybe
          .map(String)
          .map((t) => t.trim())
          .filter(Boolean);
    } catch (_) {}
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

/* -------------------- LIST NEWEST EVENTS -------------------- */
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ status: "published" })
      .sort({ dateStart: -1 }) // newest first
      .limit(2); // only 2 newest events

    res.json({
      events,
      total: events.length,
      page: 1,
      pages: 1,
      hasMore: false,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching newest events", error: err.message });
  }
});

/* -------------------- SINGLE EVENT -------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id))
      return res.status(400).json({ message: "Invalid ID format" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching event", error: err.message });
  }
});

/* -------------------- CREATE -------------------- */
router.post(
  "/",
  verifyToken,
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.title?.trim() || !body.description?.trim()) {
        return res
          .status(400)
          .json({ message: "title and description are required" });
      }

      const eventData = {
        title: body.title.trim(),
        description: body.description.trim(),
        shortDescription: body.shortDescription?.trim() || "",
        location: body.location?.trim() || "",
        virtualLink: body.virtualLink?.trim() || "",
        category: body.category || "other",
        capacity: body.capacity ? Number(body.capacity) : 0,
        status: body.status || "published",
        postedBy: body.postedBy || req.user?.fullName || "Admin",
        attendees: [],
        tags: parseTags(body.tags),
        isFeatured:
          body.isFeatured === true ||
          body.isFeatured === "true" ||
          body.isFeatured === 1 ||
          body.isFeatured === "1",
      };

      if (req.file) eventData.imageUrl = `/uploads/${req.file.filename}`;
      else if (body.imageUrl?.trim()) eventData.imageUrl = body.imageUrl.trim();

      const created = await Event.create(eventData);
      res.status(201).json(created);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error creating event", error: err.message });
    }
  },
);

/* -------------------- UPDATE -------------------- */
router.put(
  "/:id",
  verifyToken,
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id))
        return res.status(400).json({ message: "Invalid ID format" });

      const body = req.body || {};
      const update = { ...body };

      if (body.tags !== undefined) update.tags = parseTags(body.tags);
      if (body.isFeatured !== undefined)
        update.isFeatured =
          body.isFeatured === true ||
          body.isFeatured === "true" ||
          body.isFeatured === 1 ||
          body.isFeatured === "1";
      if (req.file) update.imageUrl = `/uploads/${req.file.filename}`;
      else if (body.imageUrl !== undefined)
        update.imageUrl = body.imageUrl?.trim() || "/default-event.jpg";

      const updated = await Event.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
      if (!updated) return res.status(404).json({ message: "Event not found" });

      res.json(updated);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating event", error: err.message });
    }
  },
);

/* -------------------- DELETE -------------------- */
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id))
      return res.status(400).json({ message: "Invalid ID format" });

    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting event", error: err.message });
  }
});

export default router;
