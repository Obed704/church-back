import express from "express";
import Event from "../models/eventEvent.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * Helper: build filter for upcoming/past across BOTH dateStart and date
 */
const buildDateFilter = (status, now) => {
  if (status === "upcoming") {
    return {
      $or: [{ dateStart: { $gte: now } }, { date: { $gte: now } }],
    };
  }
  if (status === "past") {
    return {
      $or: [{ dateStart: { $lt: now } }, { date: { $lt: now } }],
    };
  }
  return {}; // all
};

// GET /api/commingevents?status=upcoming|past|all&limit=10&page=1
router.get("/", async (req, res) => {
  try {
    const { status = "upcoming", limit = 10, page = 1 } = req.query;

    const lim = Math.min(50, Math.max(1, Number(limit) || 10));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;

    const now = new Date();
    const filter = buildDateFilter(status, now);

    // Sort by whichever exists: dateStart OR date
    const sortDir = status === "past" ? -1 : 1;

    const pipeline = [
      { $match: filter },
      { $addFields: { _sortDate: { $ifNull: ["$dateStart", "$date"] } } },
      { $sort: { _sortDate: sortDir } },
      { $skip: skip },
      { $limit: lim },
    ];

    const [events, total] = await Promise.all([
      Event.aggregate(pipeline),
      Event.countDocuments(filter),
    ]);

    res.json({
      events,
      total,
      page: pg,
      pages: Math.max(1, Math.ceil(total / lim)),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching events", error: err.message || err });
  }
});

// GET /api/commingevents/:id
router.get("/:id", async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });
    res.json(ev);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching event", error: err.message || err });
  }
});

// ADMIN CREATE (accept dateStart OR date from frontend)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;
    const dateValue = req.body.dateStart || req.body.date;

    if (!title || !description || !dateValue) {
      return res
        .status(400)
        .json({
          message: "title, description, and dateStart (or date) are required",
        });
    }

    const created = await Event.create({
      ...req.body,
      // normalize into dateStart for consistency going forward
      dateStart: new Date(dateValue),
      dateEnd: req.body.dateEnd ? new Date(req.body.dateEnd) : null,
      capacity: Number(req.body.capacity || 0),
      isFeatured: Boolean(req.body.isFeatured),
    });

    res.status(201).json(created);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating event", error: err.message || err });
  }
});

// ADMIN UPDATE (accept dateStart OR date)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const update = { ...req.body };

    // normalize dates
    if (req.body.dateStart || req.body.date) {
      update.dateStart = new Date(req.body.dateStart || req.body.date);
    }
    if (req.body.dateEnd) update.dateEnd = new Date(req.body.dateEnd);

    if (req.body.capacity !== undefined) {
      update.capacity = Number(req.body.capacity || 0);
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!updated) return res.status(404).json({ message: "Event not found" });
    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating event", error: err.message || err });
  }
});

// ADMIN DELETE
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting event", error: err.message || err });
  }
});

// MEMBER RSVP toggle
router.post("/:id/rsvp", verifyToken, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const userId = req.user.id; // your verifyToken provides this
    ev.attendees = ev.attendees || [];

    const already = ev.attendees.some(
      (a) => String(a.userId) === String(userId),
    );

    if (!already && ev.capacity > 0 && ev.attendees.length >= ev.capacity) {
      return res.status(400).json({ message: "Event is full" });
    }

    if (already) {
      ev.attendees = ev.attendees.filter(
        (a) => String(a.userId) !== String(userId),
      );
    } else {
      ev.attendees.push({
        userId,
        userName: req.user.fullName || "Member",
        email: req.user.email || "",
      });
    }

    await ev.save();
    res.json(ev);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating RSVP", error: err.message || err });
  }
});

export default router;
