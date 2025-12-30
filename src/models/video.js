import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [replySchema],
}, { timestamps: true });

const videoSchema = new mongoose.Schema({
  // Common fields
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
  views: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  
  // Video type: 'uploaded' or 'youtube'
  type: { 
    type: String, 
    enum: ['uploaded', 'youtube'],
    required: true,
    default: 'uploaded'
  },
  
  // For uploaded videos
  filename: { type: String }, // For file system reference
  src: { type: String }, // Full URL for frontend
  
  // For YouTube videos
  youtubeId: { type: String },
  youtubeUrl: { type: String },
  youtubeChannel: { type: String, default: "Unknown Channel" },
  youtubeTitle: { type: String, default: "YouTube Video" },
  
  // Status
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
videoSchema.index({ type: 1, createdAt: -1 });
videoSchema.index({ youtubeId: 1 }, { unique: true, sparse: true });
videoSchema.index({ isActive: 1 });

// Update timestamp before save
videoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Video", videoSchema);