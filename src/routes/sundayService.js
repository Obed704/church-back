import express from "express";
import SundayService from "../models/sundayService.js";
import mongoose from "mongoose";

const router = express.Router();

// GET all services with advanced filtering
router.get("/", async (req, res) => {
  try {
    const {
      search,
      preacher,
      class: serviceClass,
      year,
      month,
      sortBy = "date",
      sortOrder = "desc",
      limit = 50,
      page = 1,
    } = req.query;

    // Build query
    let query = {};

    // Search across multiple fields
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { shortDescription: regex },
        { fullDescription: regex },
        { verses: regex },
        { preacherName: regex },
        { programLeader: regex },
        { choirName: regex },
      ];

      // Handle service number search separately
      if (!isNaN(Number(search))) {
        if (!query.$or) query.$or = [];
        query.$or.push({ serviceNumber: Number(search) });
      }
    }

    // Filter by preacher
    if (preacher) {
      query.preacherName = preacher;
    }

    // Filter by class
    if (serviceClass && serviceClass !== "All") {
      query.class = serviceClass;
    }

    // Filter by year
    if (year && year !== "All") {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Filter by month
    if (month) {
      const [yearPart, monthPart] = month.split("-");
      const startDate = new Date(
        parseInt(yearPart),
        parseInt(monthPart) - 1,
        1
      );
      const endDate = new Date(parseInt(yearPart), parseInt(monthPart), 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Build sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const preachings = await SundayService.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination info
    const total = await SundayService.countDocuments(query);

    // Get statistics
    const stats = {
      total,
      byClass: await SundayService.aggregate([
        { $group: { _id: "$class", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      byPreacher: await SundayService.aggregate([
        { $group: { _id: "$preacherName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      byYear: await SundayService.aggregate([
        {
          $group: {
            _id: { $year: "$date" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    };

    // Get latest and most popular
    const latest = await SundayService.find().sort({ date: -1 }).limit(5);

    const popular = await SundayService.find({ views: { $exists: true } })
      .sort({ views: -1 })
      .limit(5);

    res.json({
      preachings: Array.isArray(preachings) ? preachings : [],
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      stats,
      latest,
      popular,
      filters: {
        availableClasses: await SundayService.distinct("class"),
        availablePreachers: await SundayService.distinct("preacherName"),
        availableYears: await SundayService.aggregate([
          {
            $group: {
              _id: { $year: "$date" },
            },
          },
          { $sort: { _id: -1 } },
          {
            $project: {
              year: "$_id",
              _id: 0,
            },
          },
        ]),
      },
    });
  } catch (err) {
    console.error("Error fetching Sunday services:", err);
    res.status(500).json({
      error: "Server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// GET single service by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const preaching = await SundayService.findById(id);

    if (!preaching) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Increment views
    preaching.views = (preaching.views || 0) + 1;
    await preaching.save();

    // Get related preachings
    const related = await SundayService.find({
      $or: [
        { preacherName: preaching.preacherName },
        { class: preaching.class },
      ],
      _id: { $ne: preaching._id },
    })
      .limit(4)
      .sort({ date: -1 });

    res.json({
      preaching,
      related,
    });
  } catch (err) {
    console.error("Error fetching single service:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const totalServices = await SundayService.countDocuments();
    const totalPreachers = (await SundayService.distinct("preacherName"))
      .length;
    const totalClasses = (await SundayService.distinct("class")).length;

    const latestService = await SundayService.findOne().sort({ date: -1 });
    const oldestService = await SundayService.findOne().sort({ date: 1 });

    const servicesByYear = await SundayService.aggregate([
      {
        $group: {
          _id: { $year: "$date" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      totalServices,
      totalPreachers,
      totalClasses,
      dateRange: {
        earliest: oldestService?.date,
        latest: latestService?.date,
      },
      servicesByYear,
      popularPreachers: await SundayService.aggregate([
        {
          $group: {
            _id: "$preacherName",
            count: { $sum: 1 },
            latestDate: { $max: "$date" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET bookmarked services
router.post("/bookmarked", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json([]);
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.json([]);
    }

    const preachings = await SundayService.find({
      _id: { $in: validIds },
    }).sort({ date: -1 });

    res.json(preachings);
  } catch (err) {
    console.error("Error fetching bookmarked services:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET search suggestions
router.get("/search/suggestions", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const regex = new RegExp(query, "i");

    const suggestions = await SundayService.aggregate([
      {
        $match: {
          $or: [
            { title: regex },
            { preacherName: regex },
            { verses: regex },
            { shortDescription: regex },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          preacherName: 1,
          date: 1,
          class: 1,
          serviceNumber: 1,
          score: {
            $cond: [
              { $regexMatch: { input: "$title", regex: regex } },
              3,
              {
                $cond: [
                  { $regexMatch: { input: "$preacherName", regex: regex } },
                  2,
                  {
                    $cond: [
                      { $regexMatch: { input: "$verses", regex: regex } },
                      1.5,
                      1,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1, date: -1 } },
      { $limit: 10 },
    ]);

    res.json(suggestions);
  } catch (err) {
    console.error("Error fetching search suggestions:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
