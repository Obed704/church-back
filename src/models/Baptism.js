// models/Baptism.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // NEW (optional, for logged-in register)
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  dateOfBirth: { type: Date },
  address: { type: String },
  dateRegistered: { type: Date, default: Date.now },
  baptized: { type: Boolean, default: false },
  baptismDate: { type: Date },
  testimony: { type: String },
  status: {
    type: String,
    enum: ["pending", "in_preparation", "ready", "completed", "dropped"],
    default: "pending",
  },
  preparationSessions: [{
    date: Date,
    topic: String,
    completed: Boolean,
    notes: String,
  }],
  assignedMentor: { type: String },
  notes: { type: String },
});

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: { type: String, enum: ["teaching", "verse", "resource", "announcement"], default: "teaching" },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    attachments: [{ name: String, url: String }], // store links
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const dmSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const baptismClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: "Baptism Preparation Class" },
    description: { type: String },
    preaching: { type: String, required: true },
    documentation: { type: String },

    schedule: {
      startDate: Date,
      endDate: Date,
      days: [String],
      time: String,
      location: String,
    },

    requirements: [String],
    curriculum: [{ week: Number, topic: String, scripture: String, materials: [String] }],

    maxStudents: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },

    // Existing students
    students: [studentSchema],

    // NEW: joining system (logged-in users)
    members: [memberSchema], // join once using userId

    // NEW: content uploaded by admin
    posts: [postSchema],

    // NEW: comments on class (general)
    comments: [commentSchema],

    // NEW: class community chat
    chat: [chatMessageSchema],

    // NEW: messages to class holder/admin
    messagesToHolder: [dmSchema],

    // statistics
    statistics: {
      totalRegistered: { type: Number, default: 0 },
      totalBaptized: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("BaptismClass", baptismClassSchema);