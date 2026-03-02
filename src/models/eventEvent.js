import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // store as string for easy compare
    userName: { type: String, default: "Member" },
    email: { type: String, default: "" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    verse: { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },
    shortDescription: { type: String, default: "", trim: true },

    dateStart: { type: Date, required: true },
    dateEnd: { type: Date, default: null },

    location: { type: String, default: "", trim: true },
    category: {
      type: String,
      default: "general",
      enum: ["general", "worship", "bible_study", "prayer", "youth", "choir", "training", "baptism", "other"],
    },

    imageUrl: { type: String, default: "" },
    capacity: { type: Number, default: 0 }, // 0 = unlimited
    isFeatured: { type: Boolean, default: false },

    attendees: { type: [attendeeSchema], default: [] },
  },
  { timestamps: true }
);

eventSchema.index({ dateStart: 1 });
eventSchema.index({ isFeatured: 1, dateStart: 1 });

eventSchema.virtual("attendeesCount").get(function () {
  return this.attendees?.length || 0;
});

eventSchema.virtual("availableSpots").get(function () {
  if (!this.capacity || this.capacity <= 0) return null;
  return Math.max(0, this.capacity - (this.attendees?.length || 0));
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

export default mongoose.model("CommingEvent", eventSchema);