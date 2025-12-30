import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  replies: [replySchema],
}, { timestamps: true });

const videoSchema = new mongoose.Schema({
  // Type: 'uploaded' or 'youtube'
  type: { 
    type: String, 
    enum: ['uploaded', 'youtube'],
    required: true,
    default: 'uploaded'
  },
  
  // Common fields
  title: { type: String, required: true },
  description: { type: String, default: "" },
  uploader: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
  views: { type: Number, default: 0 },
  
  // For uploaded videos
  src: { type: String }, // filename for uploaded videos
  
  // For YouTube videos
  youtubeId: { type: String }, // YouTube video ID
  youtubeUrl: { type: String }, // Original YouTube URL
  youtubeChannel: { type: String, default: "Unknown Channel" },
  youtubeDuration: { type: String }, // Duration in MM:SS format
  youtubePublishedAt: { type: Date }, // When video was published on YouTube
  
}, { timestamps: true });

export default mongoose.model("LargeVideo", videoSchema);