import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: "guest" },
  userName: { type: String, required: true, default: "Guest" },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});


const SermonSchema = new mongoose.Schema(
  {
    verse: { type: String, required: true },
    preacher: { type: String, required: true },
    description: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] }, // track user IDs who liked
    favorites: { type: [String], default: [] }, // track user IDs who favorited
    comments: [CommentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Sermon", SermonSchema);
