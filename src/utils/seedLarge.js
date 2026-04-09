import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import Video from "../models/LargeVideo.js";
import connectDB from "../config/mongoConnect.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const videos = [
];

const seedVideos = async () => {
  try {
    await connectDB();

    await Video.deleteMany();
    await Video.insertMany(videos);

    console.log("✅ Videos seeded successfully!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding videos:", err);
    process.exit(1);
  }
};

seedVideos();
