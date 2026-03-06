import mongoose from "mongoose";

const socialSchema = new mongoose.Schema(
  {
    youtube: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    facebook: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const songSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    youtubeLink: { type: String, trim: true, default: "" },
    artist: { type: String, trim: true, default: "" },
    duration: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const committeeMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    role: { type: String, trim: true, default: "Member" },
    imageUrl: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    facebook: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const previousCommitteeSchema = new mongoose.Schema(
  {
    yearLabel: { type: String, trim: true, required: true }, // e.g. 2024-2025
    theme: { type: String, trim: true, default: "" },
    verse: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    achievements: [{ type: String, trim: true }],
    committee: [committeeMemberSchema],
    members: [{ type: String, trim: true }],
    content: [{ title: { type: String, trim: true }, body: { type: String, trim: true } }],
  },
  { _id: false }
);

const rehearsalSchema = new mongoose.Schema(
  {
    day: { type: String, trim: true, default: "" },
    time: { type: String, trim: true, default: "" },
    venue: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: "" },
    answer: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const choirSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },

    description: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true, default: "" },
    about: { type: String, trim: true, default: "" },
    mission: { type: String, trim: true, default: "" },
    vision: { type: String, trim: true, default: "" },

    heroImage: { type: String, trim: true, default: "" },
    coverImage: { type: String, trim: true, default: "" },

    verse: { type: String, trim: true, default: "" },
    motto: { type: String, trim: true, default: "" },
    foundedYear: { type: Number },

    president: { type: String, trim: true, default: "" },
    vicePresident: { type: String, trim: true, default: "" },

    committee: [committeeMemberSchema],

    members: [{ type: String, trim: true }], // names only

    songs: [songSchema],

    socials: {
      type: socialSchema,
      default: () => ({
        youtube: "",
        instagram: "",
        facebook: "",
        email: "",
        phone: "",
        website: "",
      }),
    },

    rehearsals: [rehearsalSchema],

    achievements: [{ type: String, trim: true }],

    gallery: [gallerySchema],

    faqs: [faqSchema],

    previousYears: [previousCommitteeSchema],

    acceptsApplications: { type: Boolean, default: true },
    applicationNote: { type: String, trim: true, default: "" },

    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Choir", choirSchema, "choirs");