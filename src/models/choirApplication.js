import mongoose from "mongoose";

const ChoirApplicationSchema = new mongoose.Schema(
  {
    choir: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Choir",
      required: true,
      index: true,
    },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    message: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications (if email/phone provided)
ChoirApplicationSchema.index({ choir: 1, email: 1 }, { unique: true, sparse: true });
ChoirApplicationSchema.index({ choir: 1, phone: 1 }, { unique: true, sparse: true });

export default mongoose.model(
  "ChoirApplication",
  ChoirApplicationSchema,
  "choirApplications"
);