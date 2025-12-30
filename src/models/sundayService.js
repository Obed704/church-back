// models/Preaching.js
import mongoose from "mongoose";

const PreachingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    verses: { type: String }, // e.g., "John 3:16, Psalm 23"
    serviceNumber: { type: Number, required: true },
    date: { type: Date, required: true },

    // New fields
    preacherName: { type: String, required: true },        // Who preached
    class: { type: String },                               // e.g., "Youth", "Adults"
    programOrder: [{                                       // How the program flowed
      order: Number,
      activity: String,
      details: String
    }],
    programLeader: { type: String },                       // Who led the program
    choirName: { type: String },                           // Choir that sang
    choirSongs: [{                                        // Songs performed by choir
      title: String,
      composer: String
    }]
  },
  { timestamps: true }
);

export default mongoose.model("sundayService", PreachingSchema, "sundayServices");
