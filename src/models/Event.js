import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "Member" },
    email: { type: String, default: "" },
    registeredAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now },
    reminderSent: { type: Boolean, default: false },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    verse: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000,
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    // old system
    date: {
      type: Date,
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // new system
    dateStart: {
      type: Date,
      index: true,
    },

    dateEnd: {
      type: Date,
      default: null,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },

    virtualLink: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "general",
        "worship",
        "bible_study",
        "prayer",
        "youth",
        "choir",
        "training",
        "baptism",
        "fellowship",
        "outreach",
        "other",
      ],
      default: "other",
    },

    imageUrl: {
      type: String,
      default: "/default-event.jpg",
      trim: true,
    },

    capacity: {
      type: Number,
      min: 0,
      default: 0,
    },

    attendees: {
      type: [attendeeSchema],
      default: [],
    },

    postedAt: {
      type: Date,
      default: Date.now,
    },

    postedBy: {
      type: String,
      default: "Admin",
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    remindersSent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "archived"],
      default: "published",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ------------------ Virtuals ------------------ */

eventSchema.virtual("effectiveStartDate").get(function () {
  return this.dateStart || this.date || null;
});

eventSchema.virtual("effectiveEndDate").get(function () {
  return this.dateEnd || this.endDate || null;
});

eventSchema.virtual("daysUntil").get(function () {
  const start = this.dateStart || this.date;
  if (!start) return null;

  const now = new Date();
  const eventDate = new Date(start);
  const diffTime = eventDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

eventSchema.virtual("attendeesCount").get(function () {
  return this.attendees?.length || 0;
});

eventSchema.virtual("availableSpots").get(function () {
  if (!this.capacity || this.capacity <= 0) return null;
  return Math.max(0, this.capacity - (this.attendees?.length || 0));
});

eventSchema.virtual("eventStatus").get(function () {
  const start = this.dateStart || this.date;
  if (!start) return "unknown";

  const now = new Date();
  const eventDate = new Date(start);

  if (eventDate < now) return "past";
  if (this.daysUntil <= 1) return "tomorrow";
  if (this.daysUntil <= 7) return "this_week";
  return "upcoming";
});

/* ------------------ Indexes ------------------ */

eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ dateStart: 1, status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ isFeatured: 1, dateStart: 1 });

/* ------------------ Pre-save ------------------ */

eventSchema.pre("save", function (next) {
  if (this.isModified("description") && !this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 197) + "...";
  }

  if (!this.date && this.dateStart) {
    this.date = this.dateStart;
  }

  if (!this.dateStart && this.date) {
    this.dateStart = this.date;
  }

  if (!this.endDate && this.dateEnd) {
    this.endDate = this.dateEnd;
  }

  if (!this.dateEnd && this.endDate) {
    this.dateEnd = this.endDate;
  }

  if (this.isModified("category") && this.category) {
    this.tags = [this.category, ...(this.tags || [])].filter(
      (v, i, a) => a.indexOf(v) === i
    );
  }

  next();
});

export default mongoose.model("Event", eventSchema);