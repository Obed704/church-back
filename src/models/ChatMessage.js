import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String },
  },
  { _id: false, timestamps: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["dm", "group"], required: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatGroup" },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: { type: String, required: true },

    text: { type: String, required: true, trim: true, maxlength: 4000 },

    // Editing
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: [
      {
        text: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },

    // Reply thread
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    replyToSnapshot: {
      text: String,
      senderName: String,
    },

    // Forward
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: {
      fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fromUserName: String,
      originalMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatMessage",
      },
      originalTextSnapshot: String,
    },

    // Emoji reactions: { "❤️": [{userId, userName}] }
    reactions: { type: Map, of: [reactionSchema], default: {} },

    // Read receipts
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

chatMessageSchema.index({ targetType: 1, conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ targetType: 1, groupId: 1, createdAt: -1 });
chatMessageSchema.index({ isDeleted: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
