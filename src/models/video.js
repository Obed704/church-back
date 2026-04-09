import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    replies: [replySchema],
  },
  { timestamps: true }
);

const videoSchema = new mongoose.Schema(
  {
    // Display info
    title: { type: String, default: "" },
    description: { type: String, default: "" },

    // YouTube only
    youtubeId: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    youtubeChannel: { type: String, default: "Unknown Channel" },

    // Engagement
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],       // unique per user (enforced in code)
    favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],   // unique per user (enforced in code)
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    comments: [commentSchema],

    // Ownership
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },

    // Status
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
videoSchema.index({ createdAt: -1 });
videoSchema.index({ youtubeId: 1 }, { unique: true });
videoSchema.index({ isActive: 1 });

export default mongoose.model("Video", videoSchema);