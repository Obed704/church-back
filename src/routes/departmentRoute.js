import express from "express";
import mongoose from "mongoose";
import Department from "../models/Department.js";

const router = express.Router();

/* ----------------------------- helpers ----------------------------- */

const isValidUrl = (value = "") => {
  if (!value) return true; // allow empty
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const normalizeStringArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const normalizeGallery = (gallery) => {
  if (!Array.isArray(gallery)) return [];
  return gallery
    .map((img) => ({
      type: String(img?.type || "gallery").trim(),
      title: String(img?.title || "").trim(),
      imageUrl: String(img?.imageUrl || "").trim(),
      description: String(img?.description || "").trim(),
    }))
    .filter((img) => img.imageUrl);
};

const normalizeMembers = (members) => {
  if (!Array.isArray(members)) return [];
  return members
    .map((member) => ({
      name: String(member?.name || "").trim(),
      role: String(member?.role || "").trim(),
      imageUrl: String(member?.imageUrl || "").trim(),
      phone: String(member?.phone || "").trim(),
      email: String(member?.email || "").trim(),
      bio: String(member?.bio || "").trim(),
      socials: {
        instagram: String(member?.socials?.instagram || "").trim(),
        facebook: String(member?.socials?.facebook || "").trim(),
        linkedin: String(member?.socials?.linkedin || "").trim(),
        x: String(member?.socials?.x || "").trim(),
        whatsapp: String(member?.socials?.whatsapp || "").trim(),
      },
    }))
    .filter((member) => member.name);
};

const normalizeCommittee = (committee) => {
  if (!Array.isArray(committee)) return [];
  return committee
    .map((item) => ({
      role: String(item?.role || "").trim(),
      name: String(item?.name || "").trim(),
      imageUrl: String(item?.imageUrl || "").trim(),
      phone: String(item?.phone || "").trim(),
      email: String(item?.email || "").trim(),
    }))
    .filter((item) => item.role && item.name);
};

const validateDepartmentPayload = (payload) => {
  const errors = [];

  if (!payload.name || payload.name.trim().length < 2) {
    errors.push("Department name is required.");
  }

  if (!payload.president || payload.president.trim().length < 2) {
    errors.push("President is required.");
  }

  if (payload.heroImage && !isValidUrl(payload.heroImage)) {
    errors.push("Hero image must be a valid URL.");
  }

  for (const img of payload.gallery || []) {
    if (!isValidUrl(img.imageUrl)) {
      errors.push(`Invalid gallery image URL: ${img.imageUrl}`);
    }
  }

  for (const member of payload.members || []) {
    if (member.imageUrl && !isValidUrl(member.imageUrl)) {
      errors.push(`Invalid member image URL for ${member.name}`);
    }
    if (member.socials?.instagram && !isValidUrl(member.socials.instagram)) {
      errors.push(`Invalid Instagram URL for ${member.name}`);
    }
    if (member.socials?.facebook && !isValidUrl(member.socials.facebook)) {
      errors.push(`Invalid Facebook URL for ${member.name}`);
    }
    if (member.socials?.linkedin && !isValidUrl(member.socials.linkedin)) {
      errors.push(`Invalid LinkedIn URL for ${member.name}`);
    }
    if (member.socials?.x && !isValidUrl(member.socials.x)) {
      errors.push(`Invalid X URL for ${member.name}`);
    }
    if (member.socials?.whatsapp && !isValidUrl(member.socials.whatsapp)) {
      errors.push(`Invalid WhatsApp URL for ${member.name}`);
    }
  }

  for (const item of payload.committee || []) {
    if (item.imageUrl && !isValidUrl(item.imageUrl)) {
      errors.push(`Invalid committee image URL for ${item.name}`);
    }
  }

  return errors;
};

const buildDepartmentPayload = (body) => ({
  name: String(body.name || "").trim(),
  president: String(body.president || "").trim(),
  est: String(body.est || "").trim(),
  description: String(body.description || "").trim(),
  phone: String(body.phone || "").trim(),
  email: String(body.email || "").trim(),
  heroImage: String(body.heroImage || "").trim(),
  gallery: normalizeGallery(body.gallery),
  members: normalizeMembers(body.members),
  committee: normalizeCommittee(body.committee),
  plans: normalizeStringArray(body.plans),
  actions: normalizeStringArray(body.actions),
});

/* ----------------------------- routes ----------------------------- */

// APPLY TO JOIN
router.post("/:id/join", async (req, res) => {
  try {
    const { userId = "", name, email = "", phone = "", message = "" } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ message: "Name is required." });
    }

    const dept = await Department.findById(req.params.id).select("+joinRequests");
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    const normalizedName = String(name).trim().toLowerCase();

    const isMember = (dept.members || []).some(
      (m) => String(m?.name || "").trim().toLowerCase() === normalizedName
    );

    if (isMember) {
      return res.status(400).json({ message: "You are already a member." });
    }

    const alreadyRequested = (dept.joinRequests || []).some((r) => {
      const sameUser = userId && r.userId && String(r.userId) === String(userId);
      const sameEmail =
        email &&
        r.email &&
        String(r.email).toLowerCase() === String(email).toLowerCase();

      return (sameUser || sameEmail) && r.status === "pending";
    });

    if (alreadyRequested) {
      return res.status(400).json({ message: "You already have a pending request." });
    }

    dept.joinRequests.push({
      userId: String(userId || "").trim(),
      name: String(name || "").trim(),
      email: String(email || "").trim(),
      phone: String(phone || "").trim(),
      message: String(message || "").trim(),
      status: "pending",
    });

    await dept.save();

    return res.json({
      message: "Application submitted. We will contact you soon.",
      status: "requested",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to submit application.",
      error: err.message,
    });
  }
});

// GET all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return res.json(departments);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch departments.",
      error: err.message,
    });
  }
});

// GET one department
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid department ID." });
    }

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    return res.json(dept);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch department.",
      error: err.message,
    });
  }
});

// CREATE department
router.post("/", async (req, res) => {
  try {
    const payload = buildDepartmentPayload(req.body);
    const errors = validateDepartmentPayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const newDept = new Department(payload);
    await newDept.save();

    return res.status(201).json(newDept);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to create department.",
      error: err.message,
    });
  }
});

// UPDATE department
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid department ID." });
    }

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    const payload = buildDepartmentPayload(req.body);
    const errors = validateDepartmentPayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    dept.name = payload.name;
    dept.president = payload.president;
    dept.est = payload.est;
    dept.description = payload.description;
    dept.phone = payload.phone;
    dept.email = payload.email;
    dept.heroImage = payload.heroImage;
    dept.gallery = payload.gallery;
    dept.members = payload.members;
    dept.committee = payload.committee;
    dept.plans = payload.plans;
    dept.actions = payload.actions;

    await dept.save();

    return res.json(dept);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update department.",
      error: err.message,
    });
  }
});

// DELETE department
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid department ID." });
    }

    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    return res.json({ message: "Department deleted successfully." });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to delete department.",
      error: err.message,
    });
  }
});

// ADD comment
router.post("/:id/comments", async (req, res) => {
  try {
    const { name, email = "", text } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Comment text is required." });
    }

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    dept.comments.push({
      name: String(name).trim(),
      email: String(email).trim(),
      text: String(text).trim(),
    });

    await dept.save();

    return res.json(dept);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to add comment.",
      error: err.message,
    });
  }
});

// ADD reply
router.post("/:deptId/comments/:commentId/replies", async (req, res) => {
  try {
    const { name, text } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const dept = await Department.findById(req.params.deptId);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    const comment = dept.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    comment.replies.push({
      name: String(name).trim(),
      text: String(text).trim(),
    });

    await dept.save();

    return res.json(dept);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to add reply.",
      error: err.message,
    });
  }
});

export default router;