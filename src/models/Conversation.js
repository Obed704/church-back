import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["dm"], default: "dm" },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    dmKey: { type: String, unique: true, index: true },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: "" },
    lastMessageSenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Per-participant last-read timestamp for unread tracking
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model("Conversation", conversationSchema);
