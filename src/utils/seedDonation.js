import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/mongoConnect.js";
import Donation from "../models/Donation.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seed = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected");

    await Donation.deleteMany({});

    const donations = [
      {
        name: "John Doe",
        phone: "0781234567",
        amount: 5000,
        paymentMethod: "MTN",
        status: "Completed",
      },
      {
        name: "Jane Smith",
        phone: "0787654321",
        amount: 10000,
        paymentMethod: "AIRTEL",
        status: "Pending",
      },
    ];

    await Donation.insertMany(donations);

    console.log("✅ Donations seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Donation seeding failed:", error);
    process.exit(1);
  }
};

seed();
