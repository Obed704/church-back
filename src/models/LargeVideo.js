import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
    replies: [replySchema],
  },
  { timestamps: true }
);

const videoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["youtube"],
      required: true,
      default: "youtube",
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    uploader: { type: String, required: true },

    likes: { type: Number, default: 0 },
    comments: [commentSchema],
    views: { type: Number, default: 0 },

    youtubeId: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    youtubeChannel: { type: String, default: "Unknown Channel" },

    youtubeDuration: { type: String },
    youtubePublishedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("LargeVideo", videoSchema);