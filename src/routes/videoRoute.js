import express from "express";
import Video from "../models/video.js";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Helper function to extract YouTube ID
const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/shorts\/|youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].substring(0, 11); // YouTube IDs are 11 characters
    }
  }
  return null;
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (videoId) => {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0`;
};

// Helper function to get YouTube thumbnail
const getYouTubeThumbnail = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Multer configuration for uploaded videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "public/uploads/videos";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm|flv|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only video files are allowed!"));
    }
  }
});

// ============ ROUTES ============

// GET all videos (with optional filtering)
router.get("/", async (req, res) => {
  try {
    const { type, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = { isActive: true };
    if (type && ['uploaded', 'youtube'].includes(type)) {
      filter.type = type;
    }
    
    const videos = await Video.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Format videos for frontend
    const formattedVideos = videos.map(video => {
      const videoObj = video.toObject();
      
      if (video.type === 'uploaded') {
        videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
        videoObj.isYouTube = false;
      } else if (video.type === 'youtube') {
        videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
        videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
        videoObj.isYouTube = true;
      }
      
      return videoObj;
    });
    
    const total = await Video.countDocuments(filter);
    
    res.json({
      success: true,
      videos: formattedVideos,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
    
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching videos", 
      error: err.message 
    });
  }
});

// GET single video by ID
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    const videoObj = video.toObject();
    
    if (video.type === 'uploaded') {
      videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
      videoObj.isYouTube = false;
    } else if (video.type === 'youtube') {
      videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
      videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
      videoObj.isYouTube = true;
    }
    
    res.json({ success: true, video: videoObj });
    
  } catch (err) {
    console.error("Error fetching video:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching video", 
      error: err.message 
    });
  }
});

// POST upload local video
router.post("/upload", verifyToken, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No video file uploaded" 
      });
    }
    
    const { title = "", description = "" } = req.body;
    
    const newVideo = new Video({
      type: 'uploaded',
      filename: req.file.filename,
      src: `/uploads/videos/${req.file.filename}`,
      title: title || req.file.originalname,
      description: description,
      likes: 0,
      comments: [],
      views: 0,
      userId: req.user.id,
      userName: req.user.fullName || req.user.username,
      isActive: true
    });
    
    const savedVideo = await newVideo.save();
    
    // Format response
    const videoObj = savedVideo.toObject();
    videoObj.src = `${req.protocol}://${req.get('host')}${videoObj.src}`;
    videoObj.isYouTube = false;
    
    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error uploading video:", err);
    
    // Clean up uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error uploading video", 
      error: err.message 
    });
  }
});

// POST add YouTube video
router.post("/youtube", verifyToken, async (req, res) => {
  try {
    const { url, title = "", description = "", channel = "Unknown Channel" } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: "YouTube URL is required" 
      });
    }
    
    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid YouTube URL format" 
      });
    }
    
    // Check if video already exists
    const existingVideo = await Video.findOne({ youtubeId });
    if (existingVideo) {
      return res.status(400).json({ 
        success: false, 
        message: "This YouTube video is already in the system" 
      });
    }
    
    const newVideo = new Video({
      type: 'youtube',
      youtubeId: youtubeId,
      youtubeUrl: url,
      youtubeTitle: title || "YouTube Video",
      youtubeChannel: channel,
      title: title || "YouTube Video",
      description: description,
      likes: 0,
      comments: [],
      views: 0,
      userId: req.user.id,
      userName: req.user.fullName || req.user.username,
      isActive: true
    });
    
    const savedVideo = await newVideo.save();
    
    // Format response
    const videoObj = savedVideo.toObject();
    videoObj.src = getYouTubeEmbedUrl(youtubeId);
    videoObj.thumbnail = getYouTubeThumbnail(youtubeId);
    videoObj.isYouTube = true;
    
    res.status(201).json({
      success: true,
      message: "YouTube video added successfully",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error adding YouTube video:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error adding YouTube video", 
      error: err.message 
    });
  }
});

// DELETE video by ID
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    // Check if user owns the video or is admin
    if (video.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this video" 
      });
    }
    
    // If uploaded video, delete the file
    if (video.type === 'uploaded' && video.filename) {
      const filePath = path.join("public", video.src);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Soft delete by setting isActive to false
    video.isActive = false;
    await video.save();
    
    res.json({
      success: true,
      message: "Video deleted successfully"
    });
    
  } catch (err) {
    console.error("Error deleting video:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting video", 
      error: err.message 
    });
  }
});

// PUT update video information
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const video = await Video.findById(req.params.id);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    // Check if user owns the video or is admin
    if (video.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to edit this video" 
      });
    }
    
    // Update fields
    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    
    const updatedVideo = await video.save();
    
    // Format response based on video type
    const videoObj = updatedVideo.toObject();
    if (video.type === 'uploaded') {
      videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
      videoObj.isYouTube = false;
    } else if (video.type === 'youtube') {
      videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
      videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
      videoObj.isYouTube = true;
    }
    
    res.json({
      success: true,
      message: "Video updated successfully",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error updating video:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error updating video", 
      error: err.message 
    });
  }
});

// POST like/unlike video
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    // For simplicity, just increment likes
    video.likes += 1;
    const updatedVideo = await video.save();
    
    // Format response
    const videoObj = updatedVideo.toObject();
    if (video.type === 'uploaded') {
      videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
    } else if (video.type === 'youtube') {
      videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
      videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
    }
    
    res.json({
      success: true,
      message: "Video liked",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error liking video:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error liking video", 
      error: err.message 
    });
  }
});

// POST add comment to video
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Comment text is required" 
      });
    }
    
    const video = await Video.findById(req.params.id);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    const newComment = {
      user: req.user.fullName || req.user.username,
      userId: req.user.id,
      text: text.trim()
    };
    
    video.comments.push(newComment);
    const updatedVideo = await video.save();
    
    // Format response
    const videoObj = updatedVideo.toObject();
    if (video.type === 'uploaded') {
      videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
    } else if (video.type === 'youtube') {
      videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
      videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
    }
    
    res.json({
      success: true,
      message: "Comment added successfully",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error adding comment", 
      error: err.message 
    });
  }
});

// POST add reply to comment
router.post("/:videoId/comment/:commentId/reply", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Reply text is required" 
      });
    }
    
    const video = await Video.findById(req.params.videoId);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    const comment = video.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: "Comment not found" 
      });
    }
    
    const newReply = {
      user: req.user.fullName || req.user.username,
      userId: req.user.id,
      text: text.trim()
    };
    
    comment.replies.push(newReply);
    const updatedVideo = await video.save();
    
    // Format response
    const videoObj = updatedVideo.toObject();
    if (video.type === 'uploaded') {
      videoObj.src = `${req.protocol}://${req.get('host')}${video.src}`;
    } else if (video.type === 'youtube') {
      videoObj.src = getYouTubeEmbedUrl(video.youtubeId);
      videoObj.thumbnail = getYouTubeThumbnail(video.youtubeId);
    }
    
    res.json({
      success: true,
      message: "Reply added successfully",
      video: videoObj
    });
    
  } catch (err) {
    console.error("Error adding reply:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error adding reply", 
      error: err.message 
    });
  }
});

// POST increment view count
router.post("/:id/view", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }
    
    video.views += 1;
    await video.save();
    
    res.json({
      success: true,
      views: video.views
    });
    
  } catch (err) {
    console.error("Error incrementing views:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error incrementing views", 
      error: err.message 
    });
  }
});

// GET video statistics
router.get("/stats/summary", verifyToken, async (req, res) => {
  try {
    const totalVideos = await Video.countDocuments({ isActive: true });
    const uploadedVideos = await Video.countDocuments({ 
      type: 'uploaded', 
      isActive: true 
    });
    const youtubeVideos = await Video.countDocuments({ 
      type: 'youtube', 
      isActive: true 
    });
    const totalLikes = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$likes" } } }
    ]);
    const totalViews = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$views" } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalVideos,
        uploadedVideos,
        youtubeVideos,
        totalLikes: totalLikes[0]?.total || 0,
        totalViews: totalViews[0]?.total || 0
      }
    });
    
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching statistics", 
      error: err.message 
    });
  }
});

export default router;