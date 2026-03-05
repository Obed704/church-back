import mongoose from "mongoose";

const committeeYearSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, trim: true }, // "2024-2025"
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },

    title: { type: String, default: "Church Committee" },
    description: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },

    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

committeeYearSchema.index({ startYear: -1, endYear: -1 });

export default mongoose.model("CommitteeYear", committeeYearSchema);