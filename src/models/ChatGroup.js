import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inviteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invitedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  { _id: false }
);

const chatGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    members: [memberSchema],
    invites: [inviteSchema],

    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ChatGroup", chatGroupSchema);