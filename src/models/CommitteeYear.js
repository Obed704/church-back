import mongoose from "mongoose";

const committeeYearSchema = new mongoose.Schema(
  {
    // Display label: "2024-2025"
    label: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30,
    },

    startYear: { type: Number, required: true, min: 1900, max: 2100 },
    endYear: { type: Number, required: true, min: 1900, max: 2100 },

    // Displayed at the top of the committee page
    title: { type: String, default: "Church Committee", trim: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    coverImageUrl: { type: String, default: "", trim: true },

    // Only one year should be active at a time (enforced in the route layer)
    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

committeeYearSchema.index({ startYear: -1, endYear: -1 });

/* Virtual: full date range string */
committeeYearSchema.virtual("dateRange").get(function () {
  return `${this.startYear} – ${this.endYear}`;
});

export default mongoose.model("CommitteeYear", committeeYearSchema);
