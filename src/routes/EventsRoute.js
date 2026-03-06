import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import { upload } from "../middleware/Upload.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseTags = (tags) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.map(String).map((t) => t.trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    const s = tags.trim();

    try {
      const maybe = JSON.parse(s);
      if (Array.isArray(maybe)) {
        return maybe.map(String).map((t) => t.trim()).filter(Boolean);
      }
    } catch (_) {}

    return s
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
};

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

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

  return {};
};

/* -------------------- STATS -------------------- */

router.get("/stats/summary", async (req, res) => {
  try {
    const now = new Date();

    const totalEvents = await Event.countDocuments();

    const upcomingEvents = await Event.countDocuments({
      status: "published",
      ...buildDateFilter("upcoming", now),
    });

    const pastEvents = await Event.countDocuments({
      status: "published",
      ...buildDateFilter("past", now),
    });

    const attendeesAggregation = await Event.aggregate([
      { $match: { status: "published" } },
      { $project: { attendeesCount: { $size: "$attendees" } } },
      { $group: { _id: null, total: { $sum: "$attendeesCount" } } },
    ]);

    const categoryStats = await Event.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalAttendees: { $sum: { $size: "$attendees" } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalAttendees: attendeesAggregation[0]?.total || 0,
      categories: categoryStats,
      featuredEvents: await Event.countDocuments({
        isFeatured: true,
        status: "published",
      }),
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching stats",
      error: err.message,
    });
  }
});

/* -------------------- UPCOMING REMINDERS -------------------- */

router.get("/reminders/upcoming", async (req, res) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const events = await Event.find({
      status: "published",
      $or: [
        { dateStart: { $gte: now, $lte: tomorrow } },
        { date: { $gte: now, $lte: tomorrow } },
      ],
    })
      .select("title date dateStart location attendees")
      .sort({ dateStart: 1, date: 1 });

    res.json({
      events,
      count: events.length,
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching reminders",
      error: err.message,
    });
  }
});

/* -------------------- LIST -------------------- */

router.get("/", async (req, res) => {
  try {
    const {
      status = "upcoming",
      category,
      featured,
      search,
      limit = 50,
      page = 1,
      skip,
      fromDate,
      toDate,
    } = req.query;

    const lim = Math.min(50, Math.max(1, Number(limit) || 50));
    const pg = Math.max(1, Number(page) || 1);
    const skipNum =
      skip !== undefined ? Math.max(0, parseInt(skip, 10) || 0) : (pg - 1) * lim;

    const now = new Date();

    let query = {
      status: { $ne: "draft" },
      ...buildDateFilter(status === "all" ? "all" : status, now),
    };

    if (category && category !== "all") {
      query.category = category;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            dateStart: {
              ...(from ? { $gte: from } : {}),
              ...(to ? { $lte: to } : {}),
            },
          },
          {
            date: {
              ...(from ? { $gte: from } : {}),
              ...(to ? { $lte: to } : {}),
            },
          },
        ],
      });
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { shortDescription: { $regex: search, $options: "i" } },
          { verse: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ],
      });
    }

    const pipeline = [
      { $match: query },
      {
        $addFields: {
          _sortDate: { $ifNull: ["$dateStart", "$date"] },
        },
      },
      { $sort: { _sortDate: status === "past" ? -1 : 1 } },
      { $skip: skipNum },
      { $limit: lim },
    ];

    const [events, total] = await Promise.all([
      Event.aggregate(pipeline),
      Event.countDocuments(query),
    ]);

    res.json({
      events,
      total,
      hasMore: skipNum + events.length < total,
      page: pg,
      pages: Math.max(1, Math.ceil(total / lim)),
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching events",
      error: err.message,
    });
  }
});

/* -------------------- SINGLE EVENT -------------------- */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const similarEvents = await Event.find({
      _id: { $ne: event._id },
      category: event.category,
      status: "published",
      $or: [{ dateStart: { $gte: new Date() } }, { date: { $gte: new Date() } }],
    })
      .limit(3)
      .sort({ dateStart: 1, date: 1 });

    res.json({
      event,
      similarEvents,
      meta: {
        status: event.eventStatus,
        daysUntil: event.daysUntil,
        attendeesCount: event.attendeesCount,
        availableSpots: event.availableSpots,
        effectiveStartDate: event.effectiveStartDate,
        effectiveEndDate: event.effectiveEndDate,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching event",
      error: err.message,
    });
  }
});

/* -------------------- CREATE -------------------- */

router.post("/", verifyToken, verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const body = req.body || {};
    const normalizedStart = parseDate(body.dateStart) || parseDate(body.date);

    if (!body.title?.trim() || !body.description?.trim() || !normalizedStart) {
      return res.status(400).json({
        message: "title, description, and dateStart (or date) are required",
      });
    }

    const normalizedEnd = parseDate(body.dateEnd) || parseDate(body.endDate) || null;

    const eventData = {
      title: body.title.trim(),
      verse: body.verse?.trim() || "",
      description: body.description.trim(),
      shortDescription: body.shortDescription?.trim() || "",
      dateStart: normalizedStart,
      date: normalizedStart,
      dateEnd: normalizedEnd,
      endDate: normalizedEnd,
      location: body.location?.trim() || "",
      virtualLink: body.virtualLink?.trim() || "",
      category: body.category || "other",
      capacity:
        body.capacity !== undefined && body.capacity !== ""
          ? Number(body.capacity || 0)
          : 0,
      status: body.status || "published",
      postedBy: body.postedBy || req.user?.fullName || "Admin",
      attendees: [],
      remindersSent: false,
      tags: parseTags(body.tags),
      isFeatured:
        body.isFeatured === true ||
        body.isFeatured === "true" ||
        body.isFeatured === 1 ||
        body.isFeatured === "1",
    };

    if (req.file) {
      eventData.imageUrl = `/uploads/${req.file.filename}`;
    } else if (body.imageUrl?.trim()) {
      eventData.imageUrl = body.imageUrl.trim();
    }

    const created = await Event.create(eventData);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({
      message: "Error creating event",
      error: err.message,
    });
  }
});

/* -------------------- UPDATE -------------------- */

router.put("/:id", verifyToken, verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const body = req.body || {};
    const update = { ...body };

    if (body.dateStart || body.date) {
      const normalizedStart = parseDate(body.dateStart || body.date);
      if (!normalizedStart) {
        return res.status(400).json({ message: "Invalid dateStart/date" });
      }
      update.dateStart = normalizedStart;
      update.date = normalizedStart;
    }

    if (body.dateEnd !== undefined || body.endDate !== undefined) {
      const normalizedEnd = parseDate(body.dateEnd || body.endDate);
      update.dateEnd = normalizedEnd;
      update.endDate = normalizedEnd;
    }

    if (body.capacity !== undefined) {
      update.capacity = Number(body.capacity || 0);
    }

    if (body.tags !== undefined) {
      update.tags = parseTags(body.tags);
    }

    if (body.isFeatured !== undefined) {
      update.isFeatured =
        body.isFeatured === true ||
        body.isFeatured === "true" ||
        body.isFeatured === 1 ||
        body.isFeatured === "1";
    }

    if (req.file) {
      update.imageUrl = `/uploads/${req.file.filename}`;
    } else if (body.imageUrl !== undefined) {
      update.imageUrl = body.imageUrl?.trim() || "/default-event.jpg";
    }

    const updated = await Event.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({
      message: "Error updating event",
      error: err.message,
    });
  }
});

/* -------------------- DELETE -------------------- */

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting event",
      error: err.message,
    });
  }
});

/* -------------------- OLD REGISTER API -------------------- */

router.post("/:id/register", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const { userId, userName, email } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.capacity > 0 && event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: "Event is at full capacity" });
    }

    const alreadyRegistered = event.attendees.some(
      (a) => String(a.userId) === String(userId)
    );

    if (alreadyRegistered) {
      return res.status(400).json({ message: "Already registered" });
    }

    event.attendees.push({
      userId,
      userName,
      email,
      registeredAt: new Date(),
      joinedAt: new Date(),
      reminderSent: false,
    });

    await event.save();

    res.json({
      success: true,
      message: "Successfully registered",
      event,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error registering",
      error: err.message,
    });
  }
});

router.delete("/:id/register/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const before = event.attendees.length;
    event.attendees = event.attendees.filter(
      (a) => String(a.userId) !== String(userId)
    );

    if (event.attendees.length === before) {
      return res.status(404).json({ message: "Registration not found" });
    }

    await event.save();

    res.json({
      success: true,
      message: "Registration cancelled",
      attendees: event.attendees,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error cancelling registration",
      error: err.message,
    });
  }
});

/* -------------------- NEW RSVP TOGGLE API -------------------- */

router.post("/:id/rsvp", verifyToken, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) {
      return res.status(404).json({ message: "Event not found" });
    }

    const userId = req.user.id;
    ev.attendees = ev.attendees || [];

    const already = ev.attendees.some(
      (a) => String(a.userId) === String(userId)
    );

    if (!already && ev.capacity > 0 && ev.attendees.length >= ev.capacity) {
      return res.status(400).json({ message: "Event is full" });
    }

    if (already) {
      ev.attendees = ev.attendees.filter(
        (a) => String(a.userId) !== String(userId)
      );
    } else {
      ev.attendees.push({
        userId,
        userName: req.user.fullName || "Member",
        email: req.user.email || "",
        registeredAt: new Date(),
        joinedAt: new Date(),
        reminderSent: false,
      });
    }

    await ev.save();
    res.json(ev);
  } catch (err) {
    res.status(500).json({
      message: "Error updating RSVP",
      error: err.message,
    });
  }
});

export default router;