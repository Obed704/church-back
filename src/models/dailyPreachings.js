import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    user: String,
    text: String,
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    user: String,
    text: String,
    replies: [ReplySchema],
  },
  { timestamps: true }
);

const PreachingSchema = new mongoose.Schema(
  {
    day: String,
    date: Date,
    preacher: String,
    verses: [String],
    description: String,

    likes: [String], // user IDs
    favorites: [String], // user IDs
    comments: [CommentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("DailyPreaching", PreachingSchema);
