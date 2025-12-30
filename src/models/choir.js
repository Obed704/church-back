import mongoose from "mongoose";

const ChoirSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  president: { type: String, required: true },
  vicePresident: { type: String, required: true },
  committee: [{ type: String }], // rest of committee members
  verse: { type: String },
  about: { type: String },
  songs: [{ title: String, youtubeLink: String }], // YouTube links
  social: {
    youtube: { type: String },
    instagram: { type: String },
    email: { type: String },
  },
}, { timestamps: true });

export default mongoose.model("Choir", ChoirSchema, "choirs");
