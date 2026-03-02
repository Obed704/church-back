import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: "" }, // ✅ optional
    text: { type: String, required: true },
    replies: [ReplySchema],
  },
  { timestamps: true }
);

const JoinRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    president: { type: String, required: true },
    est: { type: String },
    description: { type: String },
    phone: { type: String, default: "" }, // optional if you want
    email: { type: String, default: "" }, // optional if you want

    members: [{ type: String }],

    committee: [
      {
        role: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],

    plans: [{ type: String }],
    actions: [{ type: String }],
    comments: [CommentSchema],

    // ✅ store join applications (not returned by default)
    joinRequests: { type: [JoinRequestSchema], default: [], select: false },
  },
  { timestamps: true }
);

export default mongoose.model("Department", DepartmentSchema, "departments");