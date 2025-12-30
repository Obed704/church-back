import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/mongoConnect.js";
import Week from "../models/week.js";
import { weeks } from "../../weeksData.js"; // adjust path if needed

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedWeeks = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // Clear existing data
    await Week.deleteMany();
    console.log("🗑 Old weeks removed");

    // Insert new weeks
    await Week.insertMany(weeks);
    console.log("✅ Weeks seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding weeks:", error);
    process.exit(1);
  }
};

seedWeeks();
