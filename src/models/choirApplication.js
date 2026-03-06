import mongoose from "mongoose";

const choirApplicationSchema = new mongoose.Schema(
  {
    choir: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Choir",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// Avoid duplicate applications for same choir + same email or phone when provided
choirApplicationSchema.index(
  { choir: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string", $ne: "" } } }
);

choirApplicationSchema.index(
  { choir: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $ne: "" } } }
);

export default mongoose.model(
  "ChoirApplication",
  choirApplicationSchema,
  "choirApplications"
);