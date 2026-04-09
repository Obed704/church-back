import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/mongoConnect.js";
import User from "../models/User.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend root (adjust ../../ if your script folder differs)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const listUsers = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected");

    // Fetch users (NEVER include password)
    const users = await User.find({})
      .select("_id fullName email role createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`\nTotal users: ${users.length}\n`);

    // Print clean table
    console.table(
      users.map((u) => ({
        id: String(u._id),
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : "",
      }))
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  }
};

listUsers();