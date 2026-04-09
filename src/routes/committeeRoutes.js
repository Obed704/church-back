import express from "express";
import CommitteeYear from "../models/CommitteeYear.js";
import CommitteeMember from "../models/CommitteeMember.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ══════════════════════════════════════════
   PUBLIC ROUTES
══════════════════════════════════════════ */

/**
 * GET /api/committees/years
 * List all committee years (latest first).
 * Query: ?activeOnly=true  → only return the active year
 */
router.get("/years", async (req, res) => {
  try {
    const filter = req.query.activeOnly === "true" ? { isActive: true } : {};
    const years = await CommitteeYear.find(filter).sort({
      startYear: -1,
      endYear: -1,
    });
    res.json(years);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to load committee years", error: err.message });
  }
});

/**
 * GET /api/committees/years/:id
 * Get a year + its members (sorted by rank).
 * Query: ?search=name  → filter members by name/role
 */
router.get("/years/:id", async (req, res) => {
  try {
    const year = await CommitteeYear.findById(req.params.id);
    if (!year)
      return res.status(404).json({ message: "Committee year not found" });

    let query = CommitteeMember.find({ committeeYear: year._id });

    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i");
      query = CommitteeMember.find({
        committeeYear: year._id,
        $or: [{ name: regex }, { narration: regex }],
      });
    }

    const members = await query.sort({ order: 1, createdAt: 1 });
    res.json({ year, members });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to load committee year", error: err.message });
  }
});

/**
 * GET /api/committees/active
 * Convenience: return the currently active year + its members.
 */
router.get("/active", async (req, res) => {
  try {
    const year = await CommitteeYear.findOne({ isActive: true });
    if (!year)
      return res.status(404).json({ message: "No active committee year" });

    const members = await CommitteeMember.find({
      committeeYear: year._id,
    }).sort({ order: 1, createdAt: 1 });

    res.json({ year, members });
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Failed to load active committee year",
        error: err.message,
      });
  }
});

/**
 * GET /api/committees/by-label/:label
 * Lookup by label string (e.g. "2024-2025").
 */
router.get("/by-label/:label", async (req, res) => {
  try {
    const year = await CommitteeYear.findOne({
      label: req.params.label.trim(),
    });
    if (!year)
      return res.status(404).json({ message: "Committee year not found" });

    const members = await CommitteeMember.find({
      committeeYear: year._id,
    }).sort({ order: 1, createdAt: 1 });

    res.json({ year, members });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to load committee year", error: err.message });
  }
});

/* ══════════════════════════════════════════
   ADMIN — YEAR CRUD
══════════════════════════════════════════ */

/**
 * POST /api/committees/years
 * Create a committee year.
 * If isActive is true, deactivates all others first (only one active at a time).
 */
router.post("/years", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      label,
      startYear,
      endYear,
      title,
      description,
      coverImageUrl,
      isActive,
    } = req.body;

    if (!label || !startYear || !endYear) {
      return res
        .status(400)
        .json({ message: "label, startYear, endYear are required" });
    }

    const exists = await CommitteeYear.findOne({ label: label.trim() });
    if (exists)
      return res
        .status(400)
        .json({ message: "This year label already exists" });

    // Ensure only one active year
    if (isActive) {
      await CommitteeYear.updateMany({}, { isActive: false });
    }

    const created = await CommitteeYear.create({
      label: label.trim(),
      startYear: Number(startYear),
      endYear: Number(endYear),
      title: title ?? "Church Committee",
      description: description ?? "",
      coverImageUrl: coverImageUrl ?? "",
      isActive: !!isActive,
    });

    res.status(201).json(created);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create committee year", error: err.message });
  }
});

/**
 * PUT /api/committees/years/:id
 * Update a committee year.
 * If setting isActive=true, deactivates all others first.
 */
router.put("/years/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // If activating this year, deactivate all others
    if (req.body.isActive === true) {
      await CommitteeYear.updateMany(
        { _id: { $ne: req.params.id } },
        { isActive: false },
      );
    }

    const updated = await CommitteeYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated)
      return res.status(404).json({ message: "Committee year not found" });
    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update committee year", error: err.message });
  }
});

/**
 * DELETE /api/committees/years/:id
 * Delete a year and cascade-delete all its members.
 */
router.delete("/years/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const year = await CommitteeYear.findById(req.params.id);
    if (!year)
      return res.status(404).json({ message: "Committee year not found" });

    const deletedMembers = await CommitteeMember.deleteMany({
      committeeYear: year._id,
    });
    await CommitteeYear.deleteOne({ _id: year._id });

    res.json({
      message: "Deleted committee year and its members",
      deletedMemberCount: deletedMembers.deletedCount,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete committee year", error: err.message });
  }
});

/* ══════════════════════════════════════════
   ADMIN — MEMBER CRUD
══════════════════════════════════════════ */

/**
 * POST /api/committees/years/:id/members
 * Add a single member to a year.
 */
router.post(
  "/years/:id/members",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const year = await CommitteeYear.findById(req.params.id);
      if (!year)
        return res.status(404).json({ message: "Committee year not found" });

      const { role, gender, name, imageUrl, narration } = req.body;
      if (!role || !name)
        return res.status(400).json({ message: "role and name are required" });

      const created = await CommitteeMember.create({
        committeeYear: year._id,
        role,
        gender: gender ?? "na",
        name: name.trim(),
        imageUrl: imageUrl ?? "",
        narration: narration ?? "",
      });

      res.status(201).json(created);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to create member", error: err.message });
    }
  },
);

/**
 * POST /api/committees/years/:id/members/bulk
 * Add multiple members at once.
 * Body: { members: [{ role, gender, name, imageUrl, narration }] }
 */
router.post(
  "/years/:id/members/bulk",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const year = await CommitteeYear.findById(req.params.id);
      if (!year)
        return res.status(404).json({ message: "Committee year not found" });

      const input = req.body.members;
      if (!Array.isArray(input) || input.length === 0) {
        return res
          .status(400)
          .json({ message: "members array is required and must not be empty" });
      }

      const docs = input.map((m) => ({
        committeeYear: year._id,
        role: m.role,
        gender: m.gender ?? "na",
        name: (m.name || "").trim(),
        imageUrl: m.imageUrl ?? "",
        narration: m.narration ?? "",
      }));

      const created = await CommitteeMember.insertMany(docs, {
        ordered: false,
      });
      res.status(201).json({ created: created.length, members: created });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to bulk-create members", error: err.message });
    }
  },
);

/**
 * PUT /api/committees/members/:memberId
 * Update a single member.
 */
router.put("/members/:memberId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updated = await CommitteeMember.findByIdAndUpdate(
      req.params.memberId,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated) return res.status(404).json({ message: "Member not found" });
    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update member", error: err.message });
  }
});

/**
 * DELETE /api/committees/members/:memberId
 * Delete a single member.
 */
router.delete(
  "/members/:memberId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const deleted = await CommitteeMember.findByIdAndDelete(
        req.params.memberId,
      );
      if (!deleted)
        return res.status(404).json({ message: "Member not found" });
      res.json({ message: "Member deleted", deleted });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to delete member", error: err.message });
    }
  },
);

/**
 * DELETE /api/committees/years/:id/members
 * Delete ALL members for a year (bulk clear).
 */
router.delete(
  "/years/:id/members",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const year = await CommitteeYear.findById(req.params.id);
      if (!year)
        return res.status(404).json({ message: "Committee year not found" });

      const result = await CommitteeMember.deleteMany({
        committeeYear: year._id,
      });
      res.json({
        message: "All members cleared",
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to clear members", error: err.message });
    }
  },
);

export default router;
