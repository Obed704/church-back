import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["dm"], default: "dm" },

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ], // exactly 2

    // strict uniqueness for a DM pair
    dmKey: { type: String, unique: true, index: true },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);