// src/models/Week.js
import mongoose from "mongoose";

const WeekSchema = new mongoose.Schema({
  weekNo: { type: Number, required: true },
  date: { type: String, required: true },
  name: { type: String, required: true },
  theme: { type: String, required: true },
  verse: { type: String, required: true },
  purpose: { type: String },
  plans: [{ type: String }],
  icon: { type: String }, // emoji or icon string
}, {
  timestamps: true // optional: adds createdAt and updatedAt
});

const Week = mongoose.model("Week", WeekSchema);

export default Week;
