import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    lowercase: true,
    trim: true
  },
  phone: { 
    type: String, 
    trim: true 
  },
  dateOfBirth: { type: Date },
  address: { type: String },
  dateRegistered: { type: Date, default: Date.now },
  baptized: { 
    type: Boolean, 
    default: false 
  },
  baptismDate: { type: Date },
  testimony: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'in_preparation', 'ready', 'completed', 'dropped'],
    default: 'pending'
  },
  preparationSessions: [{
    date: Date,
    topic: String,
    completed: Boolean,
    notes: String
  }],
  assignedMentor: { type: String },
  notes: { type: String }
});

const baptismClassSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    default: "Baptism Preparation Class" 
  },
  description: { type: String },
  preaching: { type: String, required: true },
  documentation: { type: String },
  schedule: {
    startDate: Date,
    endDate: Date,
    days: [String],
    time: String,
    location: String
  },
  requirements: [String],
  curriculum: [{
    week: Number,
    topic: String,
    scripture: String,
    materials: [String]
  }],
  maxStudents: { type: Number, default: 20 },
  isActive: { type: Boolean, default: true },
  students: [studentSchema],
  statistics: {
    totalRegistered: { type: Number, default: 0 },
    totalBaptized: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export default mongoose.model("BaptismClass", baptismClassSchema);