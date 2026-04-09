import mongoose from "mongoose";

const socialsSchema = new mongoose.Schema(
  {
    whatsapp: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    x: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // ✅ profile fields
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 280 },
    phone: { type: String, default: "" },
    location: { type: String, default: "" }, // e.g. "Kigali, Rwanda"
    website: { type: String, default: "" },
    socials: { type: socialsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);