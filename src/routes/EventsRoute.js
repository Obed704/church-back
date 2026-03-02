import express from "express";
import Event from "../models/Event.js";
import { upload } from "../middleware/Upload.js";

const router = express.Router();

// GET all events with advanced filtering
router.get("/", async (req, res) => {
  try {
    const {
      status,
      category,
      featured,
      search,
      limit,
      skip,
      fromDate,
      toDate,
    } = req.query;

    let query = { status: { $ne: "draft" } };

    // Status filter
    if (status === "upcoming") {
      query.date = { $gte: new Date() };
    } else if (status === "past") {
      query.date = { $lt: new Date() };
    }

    // Category filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Featured filter
    if (featured === "true") {
      query.isFeatured = true;
    }

    // Date range filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { verse: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Build query
    let eventsQuery = Event.find(query).sort({ date: 1 });

    // Pagination
    if (skip) eventsQuery = eventsQuery.skip(parseInt(skip));
    if (limit) eventsQuery = eventsQuery.limit(parseInt(limit));

    const events = await eventsQuery;

    // Get total count for pagination
    const total = await Event.countDocuments(query);

    res.json({
      events,
      total,
      hasMore: skip + events.length < total,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching events", error: err.message });
  }
});

// GET single event with enhanced data
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Get similar events
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
    res
      .status(500)
      .json({ message: "Error fetching event", error: err.message });
  }
});

// POST new event
router.post("/", async (req, res) => {
  try {
    const newEvent = new Event({
      ...req.body,
      attendees: [],
      remindersSent: false,
      tags: req.body.tags || [],
    });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error creating event", error: err.message });
  }
});

// Register for event
router.post("/:id/register", async (req, res) => {
  try {
    const { userId, userName, email } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check capacity
    if (event.capacity && event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: "Event is at full capacity" });
    }

    // Check if already registered
    const alreadyRegistered = event.attendees.some(
      (attendee) => attendee.userId === userId
    );
    if (alreadyRegistered) {
      return res
        .status(400)
        .json({ message: "Already registered for this event" });
    }

    event.attendees.push({
      userId,
      userName,
      email,
      registeredAt: new Date(),
      reminderSent: false,
    });

    await event.save();

    res.json({
      success: true,
      message: "Successfully registered",
      event: event,
      registration: {
        id: event.attendees[event.attendees.length - 1]._id,
        registeredAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error registering", error: err.message });
  }
});

// Cancel registration
router.delete("/:id/register/:userId", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const initialCount = event.attendees.length;
    event.attendees = event.attendees.filter(
      (attendee) => attendee.userId !== req.params.userId
    );

    if (event.attendees.length === initialCount) {
      return res.status(404).json({ message: "Registration not found" });
    }

    await event.save();

    res.json({
      success: true,
      message: "Registration cancelled",
      attendees: event.attendees,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error cancelling registration", error: err.message });
  }
});

// GET upcoming reminders (for browser notifications)
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

    res.json({
      events: upcomingEvents,
      count: upcomingEvents.length,
      timestamp: new Date(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching reminders", error: err.message });
  }
});

// Toggle event feature status
router.put("/:id/toggle-feature", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.isFeatured = !event.isFeatured;
    await event.save();

    res.json({
      success: true,
      message: `Event ${event.isFeatured ? "featured" : "unfeatured"}`,
      isFeatured: event.isFeatured,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error toggling feature", error: err.message });
  }
});

// Statistics endpoint
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
    res
      .status(500)
      .json({ message: "Error fetching stats", error: err.message });
  }
});

// Add tags to event
router.post("/:id/tags", async (req, res) => {
  try {
    const { tags } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    const newTags = [...new Set([...(event.tags || []), ...tags])];
    event.tags = newTags;
    await event.save();

    res.json({
      success: true,
      message: "Tags added",
      tags: event.tags,
    });
  } catch (err) {
    res.status(500).json({ message: "Error adding tags", error: err.message });
  }
});

// POST new event with image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const eventData = { ...req.body };
    if (req.file) {
      eventData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const newEvent = new Event({
      ...eventData,
      attendees: [],
      remindersSent: false,
      tags: req.body.tags || [],
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error creating event", error: err.message });
  }
});

// PUT (update) event with optional new image
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const updatedData = { ...req.body };
    if (req.file) {
      updatedData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updatedData,
      {
        new: true,
      }
    );

    res.json(updatedEvent);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error updating event", error: err.message });
  }
});
export default router;
