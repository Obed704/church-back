import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    text: { type: String, required: true, trim: true },
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true }
);

const JoinRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const SocialLinksSchema = new mongoose.Schema(
  {
    instagram: { type: String, default: "", trim: true },
    facebook: { type: String, default: "", trim: true },
    linkedin: { type: String, default: "", trim: true },
    x: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    socials: { type: SocialLinksSchema, default: () => ({}) },
  },
  { _id: true }
);

const CommitteeSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const DepartmentImageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["hero", "gallery", "event", "choir", "worship", "service", "mission", "team", "other"],
      default: "gallery",
    },
    title: { type: String, default: "", trim: true },
    imageUrl: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    president: { type: String, required: true, trim: true },
    est: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },

    heroImage: { type: String, default: "", trim: true },

    gallery: { type: [DepartmentImageSchema], default: [] },

    members: { type: [MemberSchema], default: [] },

    committee: { type: [CommitteeSchema], default: [] },

    plans: { type: [String], default: [] },
    actions: { type: [String], default: [] },
    comments: { type: [CommentSchema], default: [] },

    joinRequests: { type: [JoinRequestSchema], default: [], select: false },
  },
  { timestamps: true }
);

export default mongoose.model("Department", DepartmentSchema, "departments");