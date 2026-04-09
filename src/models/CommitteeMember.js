import mongoose from "mongoose";

/* ─── Role ordering ──────────────────────────────────────────── */
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

const VALID_ROLES = Object.keys(ROLE_ORDER)
  .map((k) => k.replace(/_boy$|_girl$/, ""))
  .filter((v, i, a) => a.indexOf(v) === i); // unique base roles

/* ─── Schema ─────────────────────────────────────────────────── */
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
      enum: VALID_ROLES,
      trim: true,
    },

    // Only meaningful for advisor / intercessor
    gender: {
      type: String,
      enum: ["boy", "girl", "na"],
      default: "na",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    narration: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // Computed rank — set automatically in pre-validate hook
    order: {
      type: Number,
      default: 999,
      index: true,
    },
  },
  { timestamps: true },
);

/* ─── Compound indexes ───────────────────────────────────────── */
committeeMemberSchema.index({ committeeYear: 1, order: 1 });
committeeMemberSchema.index({ committeeYear: 1, role: 1, gender: 1 });

/* ─── Validation + auto-order ────────────────────────────────── */
committeeMemberSchema.pre("validate", function (next) {
  const isGenderRole = this.role === "advisor" || this.role === "intercessor";

  if (isGenderRole) {
    if (this.gender !== "boy" && this.gender !== "girl") {
      return next(new Error(`${this.role} must have gender "boy" or "girl"`));
    }
  } else {
    this.gender = "na";
  }

  // Build the lookup key and assign order
  let key = this.role;
  if (isGenderRole) key = `${this.role}_${this.gender}`;
  this.order = ROLE_ORDER[key] ?? 999;

  next();
});

/* ─── Virtual: tierLabel ─────────────────────────────────────── */
committeeMemberSchema.virtual("tierLabel").get(function () {
  const tiers = {
    representative: "leadership",
    vice_representative: "leadership",
    advisor: "advisory",
    intercessor: "advisory",
    secretary: "executive",
    treasurer: "executive",
    accountant: "executive",
    grand_pere: "honorary",
  };
  return tiers[this.role] ?? "executive";
});

/* ─── Virtual: roleLabel ─────────────────────────────────────── */
committeeMemberSchema.virtual("roleLabel").get(function () {
  const labels = {
    representative: "Representative",
    vice_representative: "Vice Representative",
    advisor: "Advisor",
    intercessor: "Intercessor",
    secretary: "Secretary",
    treasurer: "Treasurer",
    accountant: "Accountant",
    grand_pere: "Grand Père",
  };
  const base = labels[this.role] ?? "Member";
  if (this.role === "advisor" || this.role === "intercessor") {
    return `${base} (${this.gender === "boy" ? "Boy" : "Girl"})`;
  }
  return base;
});

export default mongoose.model("CommitteeMember", committeeMemberSchema);
