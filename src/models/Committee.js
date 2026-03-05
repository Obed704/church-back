import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true },
    roleLabel: { type: String, required: true },
    rank: { type: Number, required: true },

    name: { type: String, required: true },
    narration: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

const committeeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: "Church Committee" },
    yearStart: { type: Number, required: true },
    yearEnd: { type: Number, required: true },

    narration: { type: String, default: "" }, // committee-level narration
    coverImageUrl: { type: String, default: "" },

    isActive: { type: Boolean, default: false },

    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

committeeSchema.index({ yearStart: 1, yearEnd: 1 }, { unique: true });

committeeSchema.virtual("yearLabel").get(function () {
  return `${this.yearStart}-${this.yearEnd}`;
});

committeeSchema.set("toJSON", { virtuals: true });
committeeSchema.set("toObject", { virtuals: true });

export default mongoose.model("Committee", committeeSchema);