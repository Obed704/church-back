import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import { upload } from "../middleware/Upload.js";
// import { verifyToken } from "../middleware/auth.js"; // optional protection

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);

  // If tags came as JSON string: '["a","b"]'
  if (typeof tags === "string") {
    const s = tags.trim();
    try {
      const maybe = JSON.parse(s);
      if (Array.isArray(maybe)) return maybe.map(String).map((t) => t.trim()).filter(Boolean);
    } catch (_) {}

    // If tags came as "a,b,c"
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

/* -------------------- FIXED ROUTE ORDER (static routes first) -------------------- */

// Stats summary
router.get("/stats/summary", async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: new Date() },
      status: "published",
    });
    const pastEvents = await Event.countDocuments({
      date: { $lt: new Date() },
      status: "published",
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
      featuredEvents: await Event.countDocuments({ isFeatured: true }),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
});

// Upcoming reminders
router.get("/reminders/upcoming", async (req, res) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingEvents = await Event.find({
      date: { $gte: now, $lte: tomorrow },
      status: "published",
    })
      .select("title date location attendees")
      .sort({ date: 1 });

    res.json({ events: upcomingEvents, count: upcomingEvents.length, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ message: "Error fetching reminders", error: err.message });
  }
});

/* -------------------- LIST (GET /) -------------------- */

router.get("/", async (req, res) => {
  try {
    const {
      status,
      category,
      featured,
      search,
      limit = 50,
      skip = 0,
      fromDate,
      toDate,
    } = req.query;

    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);

    let query = { status: { $ne: "draft" } };

    if (status === "upcoming") query.date = { $gte: new Date() };
    if (status === "past") query.date = { $lt: new Date() };

    if (category && category !== "all") query.category = category;
    if (featured === "true") query.isFeatured = true;

    if (fromDate || toDate) {
      query.date = query.date || {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { verse: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const events = await Event.find(query)
      .sort({ date: 1 })
      .skip(skipNum)
      .limit(limitNum);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      total,
      hasMore: skipNum + events.length < total,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching events", error: err.message });
  }
});

/* -------------------- CREATE (POST /) - supports JSON + multipart image -------------------- */

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const body = req.body || {};

    const date = parseDate(body.date);
    if (!body.title?.trim() || !date) {
      return res.status(400).json({ message: "title and date are required" });
    }

    const eventData = {
      title: body.title?.trim(),
      verse: body.verse?.trim() || "",
      description: body.description?.trim() || "",
      shortDescription: body.shortDescription?.trim() || "",
      date,
      endDate: body.endDate ? parseDate(body.endDate) : undefined,
      location: body.location?.trim() || "",
      virtualLink: body.virtualLink?.trim() || "",
      category: body.category || "other",
      capacity: body.capacity !== undefined && body.capacity !== "" ? Number(body.capacity) : undefined,
      status: body.status || "published",
      postedBy: body.postedBy || "Admin",
      attendees: [],
      remindersSent: false,
      tags: parseTags(body.tags),
    };

    if (req.file) eventData.imageUrl = `/uploads/${req.file.filename}`;

    const created = await Event.create(eventData);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(400).json({ message: "Error creating event", error: err.message });
  }
});

/* -------------------- UPDATE (PUT /:id) -------------------- */

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID format" });

    const body = req.body || {};
    const updatedData = { ...body };

    if (body.date !== undefined) {
      const d = parseDate(body.date);
      if (!d) return res.status(400).json({ message: "Invalid date" });
      updatedData.date = d;
    }
    if (body.endDate !== undefined) {
      const d = body.endDate ? parseDate(body.endDate) : null;
      if (body.endDate && !d) return res.status(400).json({ message: "Invalid endDate" });
      updatedData.endDate = d;
    }

    if (body.capacity !== undefined && body.capacity !== "") updatedData.capacity = Number(body.capacity);
    if (body.tags !== undefined) updatedData.tags = parseTags(body.tags);

    if (req.file) updatedData.imageUrl = `/uploads/${req.file.filename}`;

    const updatedEvent = await Event.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedEvent) return res.status(404).json({ message: "Event not found" });

    res.json({ success: true, data: updatedEvent });
  } catch (err) {
    res.status(400).json({ message: "Error updating event", error: err.message });
  }
});

/* -------------------- DELETE (DELETE /:id) ✅ THIS FIXES YOUR 404 -------------------- */

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID format" });

    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });

    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting event", error: err.message });
  }
});

/* -------------------- OTHER ENDPOINTS (register etc) -------------------- */

router.post("/:id/register", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID format" });

    const { userId, userName, email } = req.body;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.capacity && event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: "Event is at full capacity" });
    }

    const alreadyRegistered = event.attendees.some((a) => a.userId === userId);
    if (alreadyRegistered) return res.status(400).json({ message: "Already registered" });

    event.attendees.push({
      userId,
      userName,
      email,
      registeredAt: new Date(),
      reminderSent: false,
    });

    await event.save();

    res.json({ success: true, message: "Successfully registered", event });
  } catch (err) {
    res.status(500).json({ message: "Error registering", error: err.message });
  }
});

router.delete("/:id/register/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID format" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const before = event.attendees.length;
    event.attendees = event.attendees.filter((a) => a.userId !== userId);
    if (event.attendees.length === before) return res.status(404).json({ message: "Registration not found" });

    await event.save();
    res.json({ success: true, message: "Registration cancelled", attendees: event.attendees });
  } catch (err) {
    res.status(500).json({ message: "Error cancelling registration", error: err.message });
  }
});

// Single event (keep last so it doesn't hijack other routes)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID format" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const similarEvents = await Event.find({
      _id: { $ne: event._id },
      category: event.category,
      date: { $gte: new Date() },
    })
      .limit(3)
      .sort({ date: 1 });

    res.json({
      event,
      similarEvents,
      meta: {
        status: event.eventStatus,
        daysUntil: event.daysUntil,
        attendeesCount: event.attendeesCount,
        availableSpots: event.availableSpots,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching event", error: err.message });
  }
});

export default router;