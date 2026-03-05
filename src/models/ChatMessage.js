import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["dm", "group"], required: true },

    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatGroup" },

    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },

    text: { type: String, required: true, trim: true, maxlength: 2000 },

    // Reply
    replyToMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },

    // Forward
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: {
      fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fromUserName: { type: String },
      originalMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },
      originalTextSnapshot: { type: String },
    },

    // Read receipts (basic)
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

chatMessageSchema.index({ targetType: 1, conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ targetType: 1, groupId: 1, createdAt: -1 });

export default mongoose.model("ChatMessage", chatMessageSchema);