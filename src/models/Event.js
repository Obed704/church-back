import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  email: { type: String },
  registeredAt: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false }
});

const eventSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100 
    },
    verse: { 
      type: String,
      trim: true 
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 1000 
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 200
    },
    date: { 
      type: Date, 
      required: true,
      index: true 
    },
    endDate: {
      type: Date
    },
    location: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    virtualLink: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['worship', 'bible_study', 'prayer', 'fellowship', 'outreach', 'other'],
      default: 'other'
    },
    imageUrl: {
      type: String,
      default: '/default-event.jpg'
    },
    capacity: {
      type: Number,
      min: 0
    },
    attendees: [attendeeSchema],
    postedAt: { 
      type: Date, 
      default: Date.now 
    },
    postedBy: { 
      type: String, 
      default: "Admin" 
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    remindersSent: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'published'
    },
    tags: [{
      type: String,
      trim: true
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for days until event
eventSchema.virtual('daysUntil').get(function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  const diffTime = eventDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for attendees count
eventSchema.virtual('attendeesCount').get(function() {
  return this.attendees.length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.capacity) return null;
  return Math.max(0, this.capacity - this.attendees.length);
});

// Virtual for event status
eventSchema.virtual('eventStatus').get(function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  
  if (eventDate < now) return 'past';
  if (this.daysUntil <= 1) return 'tomorrow';
  if (this.daysUntil <= 7) return 'this_week';
  return 'upcoming';
});

// Indexes for better query performance
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ isFeatured: 1 });

// Pre-save middleware
eventSchema.pre('save', function(next) {
  if (this.isModified('description') && !this.shortDescription) {
    this.shortDescription = this.description.substring(0, 197) + '...';
  }
  
  // Auto-set tags from category
  if (this.isModified('category') && this.category) {
    this.tags = [this.category, ...(this.tags || [])].filter((v, i, a) => a.indexOf(v) === i);
  }
  
  next();
});

export default mongoose.model("Event", eventSchema);