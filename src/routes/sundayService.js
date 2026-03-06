// routes/sundayService.js
import express from "express";
import SundayService from "../models/sundayService.js";
import mongoose from "mongoose";
import { verifyToken } from "../middleware/auth.js"; // ✅ add auth

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * GET /api/sundayService
 * Get all services with advanced filtering
 * (your existing GET stays, unchanged except small safety if needed)
 */
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

    let query = {};

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

      if (!isNaN(Number(search))) {
        query.$or.push({ serviceNumber: Number(search) });
      }
    }

    if (preacher) query.preacherName = preacher;

    if (serviceClass && serviceClass !== "All") {
      query.class = serviceClass;
    }

    if (year && year !== "All") {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (month) {
      const [yearPart, monthPart] = month.split("-");
      const startDate = new Date(parseInt(yearPart), parseInt(monthPart) - 1, 1);
      const endDate = new Date(parseInt(yearPart), parseInt(monthPart), 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const preachings = await SundayService.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await SundayService.countDocuments(query);

    res.json({
      preachings: Array.isArray(preachings) ? preachings : [],
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Error fetching Sunday services:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/**
 * POST /api/sundayService
 * Create new service (protected)
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      fullDescription,
      verses,
      serviceNumber,
      date,
      // optional fields if your model has them
      preacherName,
      programLeader,
      choirName,
      class: serviceClass,
    } = req.body;

    const parsedDate = parseDate(date);

    if (!title?.trim() || !fullDescription?.trim() || !parsedDate) {
      return res.status(400).json({
        success: false,
        message: "title, fullDescription, and date are required",
      });
    }

    let serviceNo = undefined;
    if (serviceNumber !== undefined && serviceNumber !== "") {
      const n = Number(serviceNumber);
      if (Number.isNaN(n)) {
        return res.status(400).json({ success: false, message: "serviceNumber must be a number" });
      }
      serviceNo = n;
    }

    const created = await SundayService.create({
      title: title.trim(),
      shortDescription: shortDescription?.trim() || "",
      fullDescription: fullDescription.trim(),
      verses: verses?.trim() || "",
      serviceNumber: serviceNo,
      date: parsedDate,

      // optional extras (only if your schema supports them)
      preacherName: preacherName?.trim() || "",
      programLeader: programLeader?.trim() || "",
      choirName: choirName?.trim() || "",
      class: serviceClass?.trim() || "",

      createdBy: req.user?._id, // if you want tracking
    });

    res.status(201).json({ success: true, message: "Created", data: created });
  } catch (err) {
    console.error("POST /sundayService error:", err);
    res.status(500).json({ success: false, message: "Failed to create", error: err.message });
  }
});

/**
 * PUT /api/sundayService/:id
 * Update by _id (protected)
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const update = {};
    const {
      title,
      shortDescription,
      fullDescription,
      verses,
      serviceNumber,
      date,
      preacherName,
      programLeader,
      choirName,
      class: serviceClass,
    } = req.body;

    if (title !== undefined) update.title = title?.trim() || "";
    if (shortDescription !== undefined) update.shortDescription = shortDescription?.trim() || "";
    if (fullDescription !== undefined) update.fullDescription = fullDescription?.trim() || "";
    if (verses !== undefined) update.verses = verses?.trim() || "";
    if (preacherName !== undefined) update.preacherName = preacherName?.trim() || "";
    if (programLeader !== undefined) update.programLeader = programLeader?.trim() || "";
    if (choirName !== undefined) update.choirName = choirName?.trim() || "";
    if (serviceClass !== undefined) update.class = serviceClass?.trim() || "";

    if (serviceNumber !== undefined) {
      if (serviceNumber === "" || serviceNumber === null) update.serviceNumber = undefined;
      else {
        const n = Number(serviceNumber);
        if (Number.isNaN(n)) {
          return res.status(400).json({ success: false, message: "serviceNumber must be a number" });
        }
        update.serviceNumber = n;
      }
    }

    if (date !== undefined) {
      const parsedDate = parseDate(date);
      if (!parsedDate) {
        return res.status(400).json({ success: false, message: "Invalid date" });
      }
      update.date = parsedDate;
    }

    // If you require title/fullDescription/date always, enforce here:
    // (optional) if update.title === "" etc -> return 400

    const updated = await SundayService.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.json({ success: true, message: "Updated", data: updated });
  } catch (err) {
    console.error("PUT /sundayService/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to update", error: err.message });
  }
});

/**
 * DELETE /api/sundayService/:id
 * Delete by _id (protected)
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const deleted = await SundayService.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("DELETE /sundayService/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to delete", error: err.message });
  }
});

export default router;