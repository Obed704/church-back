import mongoose from "mongoose";

const SongSchema = new mongoose.Schema(
  {
    link: { type: String, required: true },       // YouTube link
    title: { type: String, required: true },      // Video title
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Song", SongSchema);
