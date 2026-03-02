// src/utils/seedShorts.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import Video from "../models/video.js";
import connectDB from "../config/mongoConnect.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const videosData = [];

const seedVideos = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await Video.deleteMany({});
    console.log("🗑 Existing videos removed");

    await Video.insertMany(videosData);
    console.log("✅ Videos seeded successfully!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding videos:", err);
    process.exit(1);
  }
};

seedVideos();
