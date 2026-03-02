import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/mongoConnect.js";
import Song from "../models/song.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const songs = [
  {
    title: "Amazing Gospel Song 1",
    link: "https://youtu.be/s7jXASBWwwI?list=RDs7jXASBWwwI",
    description: "Amazing Gospel Song 1",
  },
  {
    title: "Uplifting Gospel Track 2",
    link: "https://youtu.be/iJCV_2H9xD0?list=RDiJCV_2H9xD0",
    description: "Uplifting Gospel Track 2",
  },
  {
    title: "Worship Praise Song 3",
    link: "https://youtu.be/OHUNyOVX4rk?list=RDOHUNyOVX4rk",
    description: "Worship Praise Song 3",
  },
  // continue for all songs
];


const seedDB = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await Song.deleteMany({});
    console.log("🗑 Old songs cleared");

    await Song.insertMany(songs);
    console.log("✅ Seeded songs successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding songs:", err);
    process.exit(1);
  }
};

seedDB();
