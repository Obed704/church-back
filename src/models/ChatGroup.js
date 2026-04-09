import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    // Track when this member last read (for per-member unread count)
    lastReadAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inviteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { _id: false },
);

const chatGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 500 },
    avatarUrl: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
    invites: [inviteSchema],

    pinnedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
    },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: "" },
    lastMessageSenderName: { type: String, default: "" },

    // Soft archiving by admin
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

chatGroupSchema.index({ "members.userId": 1 });
chatGroupSchema.index({ lastMessageAt: -1 });

export default mongoose.model("ChatGroup", chatGroupSchema);
