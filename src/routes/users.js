import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ---------------- Directory search (for chat/new) ---------------- */
// GET /api/users?search=abc
router.get("/", verifyToken, async (req, res) => {
  try {
    const q = (req.query.search || "").trim();

    const filter = q
      ? {
          $or: [
            { fullName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    // ✅ include avatarUrl for UI
    const users = await User.find(filter)
      .select("fullName email role avatarUrl")
      .sort({ fullName: 1 })
      .limit(100)
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Admin list ---------------- */
// GET /api/users/admin/users
router.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("fullName email role avatarUrl createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Profile ---------------- */
// GET /api/users/me
router.get("/me", verifyToken, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PATCH /api/users/me
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const allowed = [
      "fullName",
      "email",
      "avatarUrl",
      "bio",
      "phone",
      "location",
      "website",
      "socials",
    ];

    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    delete updates.role;

    // cleanup
    if (typeof updates.fullName === "string") updates.fullName = updates.fullName.trim();
    if (typeof updates.email === "string") updates.email = updates.email.trim().toLowerCase();
    if (typeof updates.bio === "string") updates.bio = updates.bio.trim();
    if (typeof updates.location === "string") updates.location = updates.location.trim();
    if (typeof updates.website === "string") updates.website = updates.website.trim();
    if (typeof updates.avatarUrl === "string") updates.avatarUrl = updates.avatarUrl.trim();
    if (typeof updates.phone === "string") updates.phone = updates.phone.trim();

    // email uniqueness
    if (updates.email && updates.email !== req.user.email) {
      const exists = await User.findOne({ email: updates.email }).lean();
      if (exists) return res.status(400).json({ success: false, message: "Email already in use" });
    }

    // socials merge
    if (updates.socials && typeof updates.socials === "object") {
      const current = req.user.socials?.toObject?.() || req.user.socials || {};
      updates.socials = { ...current, ...updates.socials };
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select("fullName email role avatarUrl bio phone location website socials");

    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Profile update failed",
      error: err.message,
    });
  }
});

// PATCH /api/users/me/password
router.patch("/me/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const u = await User.findById(req.user._id).select("password");
    if (!u) return res.status(404).json({ success: false, message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, u.password);
    if (!ok) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    u.password = await bcrypt.hash(newPassword, 10);
    await u.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Password update failed",
      error: err.message,
    });
  }
});

export default router;