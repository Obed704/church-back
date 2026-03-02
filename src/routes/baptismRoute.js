import express from "express";
import BaptismClass from "../models/Baptism.js";

const router = express.Router();

// Add this route to your existing baptism routes

/**
 * DELETE a baptism class
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const baptism = await BaptismClass.findByIdAndDelete(id);
    
    if (!baptism) {
      return res.status(404).json({ message: "Class not found" });
    }
    
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET all baptism classes or active ones
 */
router.get("/", async (req, res) => {
  try {
    const { active } = req.query;
    const query = active === 'true' ? { isActive: true } : {};
    
    const classes = await BaptismClass.find(query)
      .sort({ createdAt: -1 });
    
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET single baptism class
 */
router.get("/:id", async (req, res) => {
  try {
    const baptism = await BaptismClass.findById(req.params.id);
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    res.json(baptism);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE new baptism class
 */
router.post("/", async (req, res) => {
  try {
    const baptism = new BaptismClass(req.body);
    await baptism.save();
    res.status(201).json(baptism);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * UPDATE baptism class
 */
router.put("/:id", async (req, res) => {
  try {
    const baptism = await BaptismClass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    res.json(baptism);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * REGISTER student for baptism
 */
router.post("/:id/students", async (req, res) => {
  try {
    const baptism = await BaptismClass.findById(req.params.id);
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    // Check if class is full
    if (baptism.students.length >= baptism.maxStudents) {
      return res.status(400).json({ message: "Class is full" });
    }
    
    const student = {
      ...req.body,
      dateRegistered: new Date(),
      status: 'pending'
    };
    
    baptism.students.push(student);
    baptism.statistics.totalRegistered += 1;
    await baptism.save();
    
    res.status(201).json(baptism.students);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * UPDATE student status/info
 */
router.put("/:classId/students/:studentId", async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const baptism = await BaptismClass.findById(classId);
    
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    const student = baptism.students.id(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    // Update baptism statistics if baptism status changed
    if (req.body.baptized === true && !student.baptized) {
      student.baptismDate = new Date();
      baptism.statistics.totalBaptized += 1;
    }
    
    Object.assign(student, req.body);
    
    // Calculate completion rate
    baptism.statistics.completionRate = 
      (baptism.statistics.totalBaptized / baptism.statistics.totalRegistered) * 100;
    
    await baptism.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ADD preparation session for student
 */
router.post("/:classId/students/:studentId/sessions", async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const baptism = await BaptismClass.findById(classId);
    
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    const student = baptism.students.id(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    student.preparationSessions.push({
      ...req.body,
      date: new Date()
    });
    
    // Update student status based on sessions
    const completedSessions = student.preparationSessions.filter(s => s.completed).length;
    if (completedSessions >= 3) {
      student.status = 'ready';
    }
    
    await baptism.save();
    res.json(student.preparationSessions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE a student
 */
router.delete("/:classId/students/:studentId", async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const baptism = await BaptismClass.findById(classId);
    
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    const student = baptism.students.id(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    // Remove student
    baptism.students.pull(studentId);
    
    // Update statistics
    baptism.statistics.totalRegistered -= 1;
    if (student.baptized) {
      baptism.statistics.totalBaptized -= 1;
    }
    
    // Recalculate completion rate
    baptism.statistics.completionRate = baptism.statistics.totalRegistered > 0 
      ? (baptism.statistics.totalBaptized / baptism.statistics.totalRegistered) * 100 
      : 0;
    
    await baptism.save();
    res.json({ message: "Student removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET statistics
 */
router.get("/:id/statistics", async (req, res) => {
  try {
    const baptism = await BaptismClass.findById(req.params.id);
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    const stats = {
      total: baptism.students.length,
      baptized: baptism.students.filter(s => s.baptized).length,
      byStatus: {
        pending: baptism.students.filter(s => s.status === 'pending').length,
        in_preparation: baptism.students.filter(s => s.status === 'in_preparation').length,
        ready: baptism.students.filter(s => s.status === 'ready').length,
        completed: baptism.students.filter(s => s.status === 'completed').length,
        dropped: baptism.students.filter(s => s.status === 'dropped').length
      },
      completionRate: baptism.statistics.completionRate
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * EXPORT students data (CSV)
 */
router.get("/:id/export", async (req, res) => {
  try {
    const baptism = await BaptismClass.findById(req.params.id);
    if (!baptism) return res.status(404).json({ message: "Class not found" });
    
    // Convert to CSV format
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Baptized', 'Date Registered', 'Baptism Date'];
    const csvRows = baptism.students.map(student => [
      `"${student.name}"`,
      `"${student.email || ''}"`,
      `"${student.phone || ''}"`,
      student.status,
      student.baptized ? 'Yes' : 'No',
      student.dateRegistered.toLocaleDateString(),
      student.baptismDate ? student.baptismDate.toLocaleDateString() : ''
    ]);
    
    const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=baptism-students-${baptism.title.replace(/\s+/g, '-')}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;