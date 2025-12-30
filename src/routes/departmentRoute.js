import express from "express";
import Department from "../models/Department.js";

const router = express.Router();

// GET all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departments: " + err });
  }
});

// GET a single department by ID
router.get("/:id", async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch department: " + err });
  }
});

// ADD a new department (no authentication)
router.post("/", async (req, res) => {
  try {
    const { name, president, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const newDept = new Department({ name, president, description });
    await newDept.save();
    res.status(201).json(newDept);
  } catch (err) {
    res.status(500).json({ error: "Failed to create department: " + err });
  }
});

// UPDATE a department (no authentication)
router.put("/:id", async (req, res) => {
  try {
    const { name, president, description } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: "Department not found" });

    dept.name = name ?? dept.name;
    dept.president = president ?? dept.president;
    dept.description = description ?? dept.description;

    await dept.save();
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: "Failed to update department: " + err });
  }
});

// DELETE a department (no authentication)
router.delete("/:id", async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json({ message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete department: " + err });
  }
});

// POST a new comment (no authentication)
router.post("/:id/comments", async (req, res) => {
  try {
    const { name, text } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: "Department not found" });

    if (!dept.comments) dept.comments = [];
    dept.comments.push({ name, text });

    await dept.save();
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment: " + err });
  }
});

// POST a reply to a comment (no authentication)
router.post("/:deptId/comments/:commentId/replies", async (req, res) => {
  try {
    const { name, text } = req.body;
    const dept = await Department.findById(req.params.deptId);
    if (!dept) return res.status(404).json({ error: "Department not found" });

    const comment = dept.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.replies.push({ name, text });
    await dept.save();

    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: "Failed to add reply: " + err });
  }
});

export default router;
