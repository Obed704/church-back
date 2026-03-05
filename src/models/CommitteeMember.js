import mongoose from "mongoose";

const ROLE_ORDER = {
  representative: 1,
  vice_representative: 2,
  advisor_boy: 3,
  advisor_girl: 4,
  intercessor_boy: 5,
  intercessor_girl: 6,
  secretary: 7,
  treasurer: 8,
  accountant: 9,
  grand_pere: 10,
};

const committeeMemberSchema = new mongoose.Schema(
  {
    committeeYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommitteeYear",
      required: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
      enum: [
        "representative",
        "vice_representative",
        "advisor",
        "intercessor",
        "secretary",
        "treasurer",
        "accountant",
        "grand_pere",
      ],
    },

    gender: { type: String, enum: ["boy", "girl", "na"], default: "na" },

    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    narration: { type: String, default: "" },

    // ranking order (auto)
    order: { type: Number, default: 999 },
  },
  { timestamps: true }
);

committeeMemberSchema.index({ committeeYear: 1, order: 1 });

// auto compute order
committeeMemberSchema.pre("validate", function (next) {
  const isGenderRole = this.role === "advisor" || this.role === "intercessor";

  if (isGenderRole && (this.gender !== "boy" && this.gender !== "girl")) {
    return next(new Error("advisor/intercessor must have gender boy or girl"));
  }
  if (!isGenderRole) this.gender = "na";

  let key = this.role;
  if (this.role === "advisor") key = `advisor_${this.gender}`;
  if (this.role === "intercessor") key = `intercessor_${this.gender}`;

  this.order = ROLE_ORDER[key] ?? 999;
  next();
});

export default mongoose.model("CommitteeMember", committeeMemberSchema);