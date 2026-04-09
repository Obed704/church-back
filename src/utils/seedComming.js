import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import CommingEvent from "../models/eventEvent.js";
import connectDB from "../config/mongoConnect.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (same as your working seeders)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedComming = async () => {
  try {
    await connectDB();

    // Confirm exactly which DB the seeder is using
    console.log("SEED DB:", mongoose.connection.host, mongoose.connection.name);
    console.log("SEED collection:", CommingEvent.collection.name);

    await CommingEvent.deleteMany({});
    await CommingEvent.insertMany([
      {
        title: "Sunday Worship Service",
        verse: "Psalm 100:2",
        description: "Join us for worship and teaching.",
        shortDescription: "Worship and teaching.",
        // Make it future so `status=upcoming` works
        dateStart: new Date("2026-03-05T07:00:00.000Z"),
        location: "Main Church Hall",
        category: "worship",
        capacity: 300,
        isFeatured: true,
      },
      {
        title: "Bible Study on Faith",
        verse: "Hebrews 11:1",
        description: "Deep study with discussion and reflection.",
        shortDescription: "Deep dive into faith.",
        dateStart: new Date("2026-03-07T16:00:00.000Z"),
        location: "Community Hall",
        category: "bible_study",
        capacity: 50,
        isFeatured: false,
      },
    ]);

    const count = await CommingEvent.countDocuments();
    console.log("Count after seed:", count);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedComming();