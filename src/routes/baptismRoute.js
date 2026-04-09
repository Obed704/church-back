import express from "express";
import BaptismClass from "../models/Baptism.js";
import User from "../models/User.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const recalcStats = async (cls) => {
  // handled by pre-save hook, just call save
  await cls.save();
};

// ─── CLASS CRUD ───────────────────────────────────────────────────────────────

/**
 * GET /api/baptism
 * Query: ?active=true|false  ?category=adult  ?featured=true  ?search=text
 */
router.get("/", async (req, res) => {
  try {
    const {
      active,
      category,
      featured,
      search,
      limit = 50,
      page = 1,
    } = req.query;
    const query = {};

    if (active === "true") query.isActive = true;
    if (active === "false") query.isActive = false;
    if (category) query.category = category;
    if (featured === "true") query.isFeatured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [classes, total] = await Promise.all([
      BaptismClass.find(query)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chat -messagesToHolder"), // exclude heavy fields from list
      BaptismClass.countDocuments(query),
    ]);

    res.json({ classes, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/baptism/me/joined
 * Returns all classes the logged-in user has joined
 */
router.get("/me/joined", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const classes = await BaptismClass.find({ "members.userId": userId })
      .sort({ createdAt: -1 })
      .select("-chat -messagesToHolder");
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/baptism/admin/messages
 * Returns all messages sent to holder across all classes (admin)
 */
router.get("/admin/messages", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const classes = await BaptismClass.find(
      { "messagesToHolder.0": { $exists: true } },
      { title: 1, messagesToHolder: 1 },
    );
    const messages = [];
    classes.forEach((cls) => {
      cls.messagesToHolder.forEach((msg) => {
        messages.push({
          ...msg.toObject(),
          classId: cls._id,
          classTitle: cls.title,
        });
      });
    });
    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/baptism/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id).select(
      "-messagesToHolder -chat",
    );
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/baptism  (admin)
 */
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const cls = new BaptismClass({
      ...req.body,
      createdBy: req.user._id,
    });
    await cls.save();
    res.status(201).json(cls);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/baptism/:id  (admin)
 */
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const cls = await BaptismClass.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/baptism/:id  (admin)
 */
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const cls = await BaptismClass.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MEMBERSHIP ───────────────────────────────────────────────────────────────

/**
 * POST /api/baptism/:id/join
 */
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = req.user._id;
    const already = cls.members.some(
      (m) => String(m.userId) === String(userId),
    );
    if (already) return res.status(400).json({ message: "Already a member" });

    cls.members.push({
      userId,
      fullName: req.user.fullName || "Member",
      avatarUrl: req.user.avatarUrl || "",
      role: "member",
      joinedAt: new Date(),
    });

    await cls.save();
    res.json({
      message: "Joined successfully",
      membersCount: cls.members.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/baptism/:id/leave
 */
router.delete("/:id/leave", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = String(req.user._id);
    cls.members = cls.members.filter((m) => String(m.userId) !== userId);
    await cls.save();
    res.json({ message: "Left class successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/baptism/:id/members/:userId/role  (admin — assign mentor/assistant)
 */
router.put(
  "/:id/members/:userId/role",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!["member", "mentor", "assistant"].includes(role))
        return res.status(400).json({ message: "Invalid role" });

      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const member = cls.members.find(
        (m) => String(m.userId) === req.params.userId,
      );
      if (!member) return res.status(404).json({ message: "Member not found" });

      member.role = role;
      await cls.save();
      res.json({ message: "Role updated", member });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

/**
 * POST /api/baptism/:id/students
 * Public registration (no token required)
 */
router.post("/:id/students", async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (!cls.allowPublicRegistration)
      return res.status(403).json({ message: "Public registration is closed" });
    if ((cls.students?.length || 0) >= (cls.maxStudents || 20))
      return res.status(400).json({ message: "Class is full" });

    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const phone = (req.body.phone || "").trim();

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!email && !phone)
      return res
        .status(400)
        .json({ message: "Email or phone required to prevent duplicates" });

    // Duplicate check within this class
    const exists = cls.students.some((s) => {
      if (email && s.email) return s.email === email;
      if (phone && s.phone) return s.phone === phone;
      return false;
    });
    if (exists)
      return res
        .status(400)
        .json({ message: "Already registered in this class" });

    const student = {
      name,
      email,
      phone,
      dateOfBirth: req.body.dateOfBirth || undefined,
      address: req.body.address || "",
      gender: req.body.gender || "",
      emergencyContact: req.body.emergencyContact || "",
      notes: req.body.notes || "",
      dateRegistered: new Date(),
      status: "pending",
    };

    cls.students.push(student);
    await cls.save(); // pre-save hook recalculates stats
    res.status(201).json(cls.students);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/baptism/:classId/students/:studentId  (admin)
 */
router.put(
  "/:classId/students/:studentId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = cls.students.id(req.params.studentId);
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      const wasNotBaptized = !student.baptized;
      Object.assign(student, req.body);

      if (
        req.body.baptized === true &&
        wasNotBaptized &&
        !student.baptismDate
      ) {
        student.baptismDate = new Date();
      }

      await cls.save();
      res.json(student);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

/**
 * DELETE /api/baptism/:classId/students/:studentId  (admin)
 */
router.delete(
  "/:classId/students/:studentId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = cls.students.id(req.params.studentId);
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      cls.students.pull(req.params.studentId);
      await cls.save();
      res.json({ message: "Student removed successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

/**
 * POST /api/baptism/:classId/students/:studentId/sessions  (admin)
 */
router.post(
  "/:classId/students/:studentId/sessions",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = cls.students.id(req.params.studentId);
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      student.preparationSessions.push({
        ...req.body,
        conductedBy: req.user.fullName || "Admin",
        date: new Date(),
      });

      const completedCount = student.preparationSessions.filter(
        (s) => s.completed,
      ).length;
      if (completedCount >= 3 && student.status === "in_preparation") {
        student.status = "ready";
      }

      await cls.save();
      res.json(student.preparationSessions);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

/**
 * PATCH /api/baptism/:classId/students/:studentId/attendance  (admin)
 * Increment attendance count
 */
router.patch(
  "/:classId/students/:studentId/attendance",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const student = cls.students.id(req.params.studentId);
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      const delta = req.body.delta || 1; // +1 or -1
      student.attendanceCount = Math.max(
        0,
        (student.attendanceCount || 0) + delta,
      );
      await cls.save();
      res.json({ attendanceCount: student.attendanceCount });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// ─── POSTS ────────────────────────────────────────────────────────────────────

/**
 * GET /api/baptism/:id/posts  (public)
 */
router.get("/:id/posts", async (req, res) => {
  try {
    const { type } = req.query;
    const cls = await BaptismClass.findById(req.params.id, { posts: 1 });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    let posts = cls.posts || [];
    if (type) posts = posts.filter((p) => p.type === type);

    posts = posts.sort((a, b) => {
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
 * POST /api/baptism/:id/posts  (admin)
 */
router.post("/:id/posts", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, title, body, attachments, pinned } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: "Title is required" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.posts.push({
      type: type || "teaching",
      title: title.trim(),
      body: body || "",
      attachments: Array.isArray(attachments) ? attachments : [],
      createdBy: req.user._id,
      createdByName: req.user.fullName || "Admin",
      pinned: !!pinned,
    });

    await cls.save();
    res.status(201).json(cls.posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/baptism/:id/posts/:postId  (admin)
 */
router.put("/:id/posts/:postId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const post = cls.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    Object.assign(post, req.body);
    await cls.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/baptism/:id/posts/:postId  (admin)
 */
router.delete(
  "/:id/posts/:postId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      cls.posts.pull(req.params.postId);
      await cls.save();
      res.json({ message: "Post deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

/**
 * POST /api/baptism/:id/posts/:postId/like  (authenticated)
 */
router.post("/:id/posts/:postId/like", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const post = cls.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = String(req.user._id);
    const liked = post.likes.map(String).includes(userId);
    if (liked) {
      post.likes = post.likes.filter((id) => String(id) !== userId);
    } else {
      post.likes.push(req.user._id);
    }

    await cls.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

/**
 * GET /api/baptism/:id/comments  (public)
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id, { comments: 1 });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls.comments || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/baptism/:id/comments  (members only)
 */
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: "Comment cannot be empty" });
    if (text.length > 1000)
      return res.status(400).json({ message: "Comment too long (max 1000)" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = String(req.user._id);
    const isMember = cls.members.some((m) => String(m.userId) === userId);
    if (!isMember)
      return res.status(403).json({ message: "Join the class to comment" });

    cls.comments.push({
      userId: req.user._id,
      userName: req.user.fullName,
      text: text.trim(),
    });
    await cls.save();
    res.status(201).json(cls.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/baptism/:id/comments/:commentId  (admin or own comment)
 */
router.delete("/:id/comments/:commentId", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const comment = cls.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = String(comment.userId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    cls.comments.pull(req.params.commentId);
    await cls.save();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/baptism/:id/chat  (members only)
 */
router.get("/:id/chat", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id, {
      members: 1,
      chat: 1,
    });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = String(req.user._id);
    const isMember = cls.members.some((m) => String(m.userId) === userId);
    const isAdmin = req.user.role === "admin";
    if (!isMember && !isAdmin)
      return res.status(403).json({ message: "Join the class to view chat" });

    const limit = parseInt(req.query.limit || "100");
    const messages = (cls.chat || []).slice(-limit);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/baptism/:id/chat  (members only)
 */
router.post("/:id/chat", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: "Message cannot be empty" });
    if (text.length > 1000)
      return res.status(400).json({ message: "Message too long (max 1000)" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const userId = String(req.user._id);
    const isMember = cls.members.some((m) => String(m.userId) === userId);
    const isAdmin = req.user.role === "admin";
    if (!isMember && !isAdmin)
      return res.status(403).json({ message: "Join the class to chat" });

    cls.chat.push({
      userId: req.user._id,
      userName: req.user.fullName,
      userAvatar: req.user.avatarUrl || "",
      text: text.trim(),
    });

    // Keep last 500
    if (cls.chat.length > 500) cls.chat = cls.chat.slice(cls.chat.length - 500);
    await cls.save();

    res.status(201).json(cls.chat.slice(-100));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/baptism/:id/chat/:messageId  (admin or own message)
 */
router.delete("/:id/chat/:messageId", verifyToken, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const msg = cls.chat.id(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isOwner = String(msg.userId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    cls.chat.pull(req.params.messageId);
    await cls.save();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MESSAGES TO HOLDER ───────────────────────────────────────────────────────

/**
 * POST /api/baptism/:id/message-to-holder
 */
router.post("/:id/message-to-holder", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: "Message cannot be empty" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.messagesToHolder.push({
      fromUserId: req.user._id,
      fromName: req.user.fullName,
      text: text.trim(),
    });

    await cls.save();
    res.json({ message: "Message sent to admin" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/baptism/:id/messages/:msgId/reply  (admin)
 * Mark as read and optionally reply
 */
router.put(
  "/:id/messages/:msgId/reply",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const msg = cls.messagesToHolder.id(req.params.msgId);
      if (!msg) return res.status(404).json({ message: "Message not found" });

      msg.read = true;
      if (req.body.reply) {
        msg.reply = req.body.reply;
        msg.repliedAt = new Date();
      }

      await cls.save();
      res.json(msg);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

/**
 * POST /api/baptism/:id/announcements  (admin)
 */
router.post(
  "/:id/announcements",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { title, body, urgent } = req.body;
      if (!title?.trim())
        return res.status(400).json({ message: "Title required" });

      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      cls.announcements.push({
        title: title.trim(),
        body: body || "",
        urgent: !!urgent,
        createdBy: req.user._id,
        createdByName: req.user.fullName,
      });

      await cls.save();
      res.status(201).json(cls.announcements);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

/**
 * DELETE /api/baptism/:id/announcements/:annId  (admin)
 */
router.delete(
  "/:id/announcements/:annId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      cls.announcements.pull(req.params.annId);
      await cls.save();
      res.json({ message: "Announcement deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── CURRICULUM ───────────────────────────────────────────────────────────────

/**
 * PUT /api/baptism/:id/curriculum  (admin - replace full curriculum)
 */
router.put("/:id/curriculum", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { curriculum } = req.body;
    if (!Array.isArray(curriculum))
      return res.status(400).json({ message: "curriculum must be array" });

    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.curriculum = curriculum;
    await cls.save();
    res.json(cls.curriculum);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/baptism/:id/curriculum/:weekId  (admin - mark week complete)
 */
router.patch(
  "/:id/curriculum/:weekId",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const cls = await BaptismClass.findById(req.params.id);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const week = cls.curriculum.id(req.params.weekId);
      if (!week) return res.status(404).json({ message: "Week not found" });

      Object.assign(week, req.body);
      await cls.save();
      res.json(week);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// ─── STATISTICS ───────────────────────────────────────────────────────────────

/**
 * GET /api/baptism/:id/statistics
 */
router.get("/:id/statistics", async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const students = cls.students || [];
    const byStatus = {
      pending: students.filter((s) => s.status === "pending").length,
      in_preparation: students.filter((s) => s.status === "in_preparation")
        .length,
      ready: students.filter((s) => s.status === "ready").length,
      completed: students.filter((s) => s.status === "completed").length,
      dropped: students.filter((s) => s.status === "dropped").length,
    };

    const genderBreakdown = {
      male: students.filter((s) => s.gender === "male").length,
      female: students.filter((s) => s.gender === "female").length,
      other: students.filter((s) => s.gender === "other" || !s.gender).length,
    };

    res.json({
      total: students.length,
      baptized: students.filter((s) => s.baptized).length,
      byStatus,
      genderBreakdown,
      members: cls.members.length,
      posts: cls.posts.length,
      comments: cls.comments.length,
      chatMessages: cls.chat.length,
      spotsAvailable: Math.max(0, (cls.maxStudents || 20) - students.length),
      completionRate: cls.statistics.completionRate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────

/**
 * GET /api/baptism/:id/export  (admin)
 */
router.get("/:id/export", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const cls = await BaptismClass.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Gender",
      "Date of Birth",
      "Address",
      "Emergency Contact",
      "Status",
      "Baptized",
      "Baptism Date",
      "Date Registered",
      "Attendance",
    ];

    const rows = cls.students.map((s) => [
      `"${s.name}"`,
      `"${s.email || ""}"`,
      `"${s.phone || ""}"`,
      `"${s.gender || ""}"`,
      `"${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : ""}"`,
      `"${(s.address || "").replace(/"/g, "'")}"`,
      `"${s.emergencyContact || ""}"`,
      s.status,
      s.baptized ? "Yes" : "No",
      s.baptismDate ? new Date(s.baptismDate).toLocaleDateString() : "",
      s.dateRegistered ? new Date(s.dateRegistered).toLocaleDateString() : "",
      s.attendanceCount || 0,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="baptism-${cls.title.replace(/\s+/g, "-")}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
