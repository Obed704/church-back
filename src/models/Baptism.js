import mongoose from "mongoose";

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const preparationSessionSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    conductedBy: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false },
);

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      set: (v) => (v || "").trim().toLowerCase(),
    },
    phone: { type: String, default: "", trim: true },
    dateOfBirth: { type: Date },
    address: { type: String, default: "", maxlength: 300 },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    emergencyContact: { type: String, default: "" },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "in_preparation", "ready", "completed", "dropped"],
      default: "pending",
    },
    baptized: { type: Boolean, default: false },
    baptismDate: { type: Date },
    dateRegistered: { type: Date, default: Date.now },
    attendanceCount: { type: Number, default: 0 },
    preparationSessions: [preparationSessionSchema],

    // which user account registered this student (optional)
    registeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true, timestamps: true },
);

const curriculumWeekSchema = new mongoose.Schema(
  {
    week: { type: Number, required: true },
    topic: { type: String, required: true, trim: true },
    scripture: { type: String, default: "" },
    description: { type: String, default: "" },
    materials: [{ type: String }],
    completed: { type: Boolean, default: false },
  },
  { _id: true },
);

const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["teaching", "verse", "announcement", "resource", "testimony"],
      default: "teaching",
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: "" },
    attachments: [{ type: String }], // URLs
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "Admin" },
    pinned: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
  },
  { _id: true, timestamps: true },
);

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: true, timestamps: true },
);

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true },
    userAvatar: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 1000 },
    replyTo: { type: mongoose.Schema.Types.ObjectId },
    edited: { type: Boolean, default: false },
    reactions: [
      {
        emoji: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { _id: true, timestamps: true },
);

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, default: "Member" },
    avatarUrl: { type: String, default: "" },
    role: {
      type: String,
      enum: ["member", "mentor", "assistant"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const messageToHolderSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fromName: { type: String, default: "Unknown" },
    text: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
    repliedAt: { type: Date },
    reply: { type: String, default: "" },
  },
  { _id: true, timestamps: true },
);

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    urgent: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "Admin" },
  },
  { _id: true, timestamps: true },
);

// ─── Main BaptismClass Schema ────────────────────────────────────────────────

const baptismClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", maxlength: 1000 },
    preaching: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    category: {
      type: String,
      enum: ["adult", "youth", "teen", "children", "special"],
      default: "adult",
    },
    language: { type: String, default: "English" },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    maxStudents: { type: Number, default: 20 },
    allowPublicRegistration: { type: Boolean, default: true },

    schedule: {
      startDate: { type: Date },
      endDate: { type: Date },
      days: [{ type: String }],
      time: { type: String, default: "" },
      location: { type: String, default: "" },
      meetingLink: { type: String, default: "" }, // for online sessions
      recurrence: {
        type: String,
        enum: ["weekly", "biweekly", "monthly", "custom"],
        default: "weekly",
      },
    },

    instructor: {
      name: { type: String, default: "" },
      bio: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    requirements: [{ type: String }],
    curriculum: [curriculumWeekSchema],

    students: [studentSchema],
    members: [memberSchema],
    posts: [postSchema],
    comments: [commentSchema],
    chat: [chatMessageSchema],
    messagesToHolder: [messageToHolderSchema],
    announcements: [announcementSchema],

    statistics: {
      totalRegistered: { type: Number, default: 0 },
      totalBaptized: { type: Number, default: 0 },
      totalMembers: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageAttendance: { type: Number, default: 0 },
    },

    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
baptismClassSchema.index({ isActive: 1, createdAt: -1 });
baptismClassSchema.index({ "members.userId": 1 });
baptismClassSchema.index({ "students.email": 1 });

// ─── Virtual: spots available ────────────────────────────────────────────────
baptismClassSchema.virtual("spotsAvailable").get(function () {
  return Math.max(0, (this.maxStudents || 20) - (this.students?.length || 0));
});

// ─── Pre-save: sync statistics ───────────────────────────────────────────────
baptismClassSchema.pre("save", function (next) {
  this.statistics.totalRegistered = this.students?.length || 0;
  this.statistics.totalBaptized =
    this.students?.filter((s) => s.baptized).length || 0;
  this.statistics.totalMembers = this.members?.length || 0;
  this.statistics.completionRate =
    this.statistics.totalRegistered > 0
      ? parseFloat(
          (
            (this.statistics.totalBaptized / this.statistics.totalRegistered) *
            100
          ).toFixed(2),
        )
      : 0;
  next();
});

export default mongoose.model("BaptismClass", baptismClassSchema);
