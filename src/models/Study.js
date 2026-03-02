import mongoose from "mongoose";

const verseSchema = new mongoose.Schema({
  reference: { 
    type: String, 
    required: true,
    trim: true
  },
  text: { 
    type: String, 
    required: true,
    trim: true
  },
  version: {
    type: String,
    default: "NIV",
    enum: ["NIV", "KJV", "ESV", "NASB", "NLT", "MSG", "AMP"]
  },
  notes: {
    type: String,
    trim: true
  }
});

const songSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  url: { 
    type: String, 
    required: true,
    trim: true
  },
  artist: {
    type: String,
    trim: true
  },
  duration: {
    type: String
  }
});

const replySchema = new mongoose.Schema({
  user: { 
    type: String, 
    required: true,
    trim: true
  },
  text: { 
    type: String, 
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const commentSchema = new mongoose.Schema({
  user: { 
    type: String, 
    required: true,
    trim: true
  },
  text: { 
    type: String, 
    required: true,
    trim: true
  },
  likes: [{
    type: String
  }],
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const studySchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200
    },
    callToAction: { 
      type: String,
      trim: true,
      maxlength: 100
    },
    description: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 5000
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500
    },
    category: {
      type: String,
      enum: ["old_testament", "new_testament", "gospels", "prophets", "wisdom", "epistles", "apocalyptic", "topical"],
      default: "topical"
    },
    subcategory: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate"
    },
    estimatedTime: {
      type: Number, // minutes
      min: 1,
      max: 480
    },
    imageUrl: {
      type: String,
      default: "/images/bible-study-default.jpg"
    },
    verses: [verseSchema],
    songs: [songSchema],
    discussionQuestions: [{
      type: String,
      trim: true
    }],
    keyTakeaways: [{
      type: String,
      trim: true
    }],
    prayerPoints: [{
      type: String,
      trim: true
    }],
    tags: [{
      type: String,
      trim: true
    }],
    comments: [commentSchema],
    likes: [{
      type: String
    }],
    favorites: [{
      type: String
    }],
    views: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published"
    },
    postedBy: { 
      type: String, 
      default: "Admin" 
    },
    postedAt: { 
      type: Date, 
      default: Date.now 
    },
    lastUpdatedBy: {
      type: String
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for comments count
studySchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Virtual for total likes (study + comments)
studySchema.virtual('totalLikes').get(function() {
  const commentLikes = this.comments.reduce((sum, comment) => sum + comment.likes.length, 0);
  return this.likes.length + commentLikes;
});

// Virtual for completion time
studySchema.virtual('timeToComplete').get(function() {
  if (this.estimatedTime) {
    if (this.estimatedTime < 30) return 'Short (< 30 min)';
    if (this.estimatedTime < 60) return 'Medium (30-60 min)';
    return 'Long (> 60 min)';
  }
  return 'Not specified';
});

// Indexes for better performance
studySchema.index({ category: 1, difficulty: 1 });
studySchema.index({ tags: 1 });
studySchema.index({ isFeatured: 1, status: 1 });
studySchema.index({ createdAt: -1 });
studySchema.index({ likes: -1 });
studySchema.index({ views: -1 });

// Pre-save middleware
studySchema.pre('save', function(next) {
  if (this.isModified('description') && !this.summary) {
    this.summary = this.description.substring(0, 150) + '...';
  }
  
  // Auto-generate tags from title and description
  if (this.isModified('title') || this.isModified('description')) {
    const text = `${this.title} ${this.description}`.toLowerCase();
    const commonWords = ['the', 'and', 'for', 'you', 'that', 'this', 'with', 'are', 'from', 'have'];
    const words = text.split(/\W+/).filter(word => 
      word.length > 3 && !commonWords.includes(word)
    );
    
    // Get most frequent words as tags
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    this.tags = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  this.lastUpdatedAt = new Date();
  next();
});

export default mongoose.model("Study", studySchema);