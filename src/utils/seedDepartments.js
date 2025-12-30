import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Department from "../models/Department.js";
import { departments } from "../utils/deptDB.js";
import connectDB from "../config/mongoConnect.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedDepartments = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await Department.deleteMany({});
    console.log("🗑 Cleared old departments");

    await Department.insertMany(departments);
    console.log("✅ Seeded departments successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDepartments();
