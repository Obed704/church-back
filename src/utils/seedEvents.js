import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import Event from "../models/Event.js";
import connectDB from "../config/mongoConnect.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Sample events to seed
const events = [
  {
    title: "Sunday Worship Service",
    verse: "Psalm 100:2",
    description: "Join us for a powerful worship experience with live praise and teaching.",
    shortDescription: "Powerful worship and teaching.",
    date: new Date("2026-01-05T10:00:00Z"),
    location: "Main Church Hall",
    address: {
      street: "123 Church St",
      city: "Kigali",
      state: "Kigali City",
      zipCode: "00000"
    },
    category: "worship",
    imageUrl: "/images/sunday-worship.jpg",
    capacity: 300,
    postedBy: "Admin",
    isFeatured: true,
    tags: ["worship", "service"]
  },
  {
    title: "Bible Study on Faith",
    verse: "Hebrews 11:1",
    description: "An in-depth study of faith with group discussions and reflection.",
    shortDescription: "Deep dive into faith.",
    date: new Date("2026-01-07T18:00:00Z"),
    location: "Community Hall",
    category: "bible_study",
    imageUrl: "/images/bible-study.jpg",
    capacity: 50,
    postedBy: "Admin",
    isFeatured: false,
    tags: ["bible_study", "faith"]
  },
  {
    title: "Youth Fellowship Night",
    verse: "1 Timothy 4:12",
    description: "Fun and spiritual growth for youth with games, worship, and small groups.",
    shortDescription: "Youth fun & worship night.",
    date: new Date("2026-01-10T19:00:00Z"),
    location: "Youth Center",
    category: "fellowship",
    imageUrl: "/images/youth-fellowship.jpg",
    capacity: 100,
    postedBy: "Admin",
    isFeatured: true,
    tags: ["youth", "fellowship"]
  },
  {
    title: "Youth Fellowship Night",
    verse: "1 Timothy 4:12",
    description: "Fun and spiritual growth for youth with games, worship, and small groups.",
    shortDescription: "Youth fun & worship night.",
    date: new Date("2026-01-10T19:00:00Z"),
    location: "Youth Center",
    category: "fellowship",
    imageUrl: "/images/youth-fellowship.jpg",
    capacity: 100,
    postedBy: "Admin",
    isFeatured: true,
    tags: ["youth", "fellowship"]
  },
  {
    title: "Youth Fellowship Night",
    verse: "1 Timothy 4:12",
    description: "Fun and spiritual growth for youth with games, worship, and small groups.",
    shortDescription: "Youth fun & worship night.",
    date: new Date("2026-01-10T19:00:00Z"),
    location: "Youth Center",
    category: "fellowship",
    imageUrl: "/public/default-event.jpg",
    capacity: 100,
    postedBy: "Admin",
    isFeatured: true,
    tags: ["youth", "fellowship"]
  },
  {
    title: "Youth Fellowship Night",
    verse: "1 Timothy 4:12",
    description: "Fun and spiritual growth for youth with games, worship, and small groups.",
    shortDescription: "Youth fun & worship night.",
    date: new Date("2026-01-10T19:00:00Z"),
    location: "Youth Center",
    category: "fellowship",
    imageUrl: "/images/youth-fellowship.jpg",
    capacity: 100,
    postedBy: "Admin",
    isFeatured: true,
    tags: ["youth", "fellowship"]
  }
];

// Seeder function
const seedEvents = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected");

    // Clear existing events
    await Event.deleteMany();
    console.log("Existing events removed");

    // Insert sample events
    await Event.insertMany(events);
    console.log("Sample events inserted");

    process.exit();
  } catch (err) {
    console.error("Error seeding events:", err);
    process.exit(1);
  }
};

seedEvents();
