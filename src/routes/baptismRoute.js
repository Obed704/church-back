import express from "express";
import BaptismClass from "../models/Baptism.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js"; // adjust names if needed

const router = express.Router();

// Add this route to your existing baptism routes

/**
 * DELETE a baptism class
 * 
 */

// POST /api/baptism/:id/join
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = req.user.id || req.user._id;
    const fullName = req.user.fullName || req.user.name || "Member";

    const already = (cls.members || []).some(m => String(m.userId) === String(userId));
    if (already) return res.status(400).json({ message: "You already joined this class" });

    cls.members.push({ userId, fullName, joinedAt: new Date() });
    await cls.save();

    res.json({ message: "Joined successfully", membersCount: cls.members.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/baptism/:id/students

// GET /api/baptism/me/joined
router.get("/me/joined", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const classes = await BaptismClass.find({ "members.userId": userId }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    if ((baptism.students?.length || 0) >= (baptism.maxStudents || 20)) {
      return res.status(400).json({ message: "Class is full" });
    }

    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const phone = (req.body.phone || "").trim();

    if (!name) return res.status(400).json({ message: "Name is required" });

    // ✅ Strong rule: require email OR phone so duplicates are preventable
    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone is required to register (to prevent duplicates)." });
    }

    // ✅ Duplicate check in THIS class
    const exists = (baptism.students || []).some((s) => {
      const sEmail = (s.email || "").trim().toLowerCase();
      const sPhone = (s.phone || "").trim();
      if (email && sEmail) return sEmail === email;
      if (phone && sPhone) return sPhone === phone;
      return false;
    });

    if (exists) {
      return res.status(400).json({ message: "You are already registered in this class" });
    }

    const student = {
      ...req.body,
      name,
      email,
      phone,
      dateRegistered: new Date(),
      status: "pending",
    };

    baptism.students.push(student);

    // keep statistics safe
    baptism.statistics = baptism.statistics || {};
    baptism.statistics.totalRegistered = (baptism.statistics.totalRegistered || 0) + 1;

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


// POST /api/baptism/:id/message-to-holder
router.post("/:id/message-to-holder", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Message cannot be empty" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.messagesToHolder.push({
      fromUserId: req.user.id || req.user._id,
      fromName: req.user.fullName || "Member",
      text: text.trim(),
    });

    await cls.save();
    res.json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/baptism/:id/comments
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment cannot be empty" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    // Optional: only members can comment
    const userId = req.user.id || req.user._id;
    const isMember = (cls.members || []).some(m => String(m.userId) === String(userId));
    if (!isMember) return res.status(403).json({ message: "Join the class to comment" });

    cls.comments.push({
      userId,
      userName: req.user.fullName || "Member",
      text: text.trim(),
    });

    await cls.save();
    res.json(cls.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/baptism/:id/chat
router.post("/:id/chat", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Message cannot be empty" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = req.user.id || req.user._id;
    const isMember = (cls.members || []).some(m => String(m.userId) === String(userId));
    if (!isMember) return res.status(403).json({ message: "Join the class to chat" });

    cls.chat.push({
      userId,
      userName: req.user.fullName || "Member",
      text: text.trim(),
    });

    // Optional: keep last 500 messages
    if (cls.chat.length > 500) cls.chat = cls.chat.slice(cls.chat.length - 500);

    await cls.save();
    res.json(cls.chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/baptism/:id/chat (members-only)
router.get("/:id/chat", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = req.user.id || req.user._id;
    const isMember = (cls.members || []).some(m => String(m.userId) === String(userId));
    if (!isMember) return res.status(403).json({ message: "Join the class to view chat" });

    res.json(cls.chat || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/baptism/:id/posts  (admin)
router.post("/:id/posts", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, title, body, attachments, pinned } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.posts.push({
      type: type || "teaching",
      title: title.trim(),
      body: body || "",
      attachments: Array.isArray(attachments) ? attachments : [],
      createdBy: req.user.id || req.user._id,
      createdByName: req.user.fullName || "Admin",
      pinned: !!pinned,
    });

    await cls.save();
    res.json(cls.posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/baptism/:id/posts (members or public; your choice)
router.get("/:id/posts", async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const posts = (cls.posts || []).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
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