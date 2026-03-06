import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Event from "../models/Event.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const sampleEvents = [
  {
    title: "Youth Worship Night",
    verse: "Psalm 95:1 — Come, let us sing for joy to the Lord.",
    description:
      "Join us for a powerful evening of worship, prayer, and fellowship with the youth ministry. There will be praise sessions, a short word, and time to connect together as a church family.",
    shortDescription:
      "A powerful evening of worship, prayer, and youth fellowship.",
    date: new Date("2026-03-20T18:00:00"),
    dateStart: new Date("2026-03-20T18:00:00"),
    endDate: new Date("2026-03-20T21:00:00"),
    dateEnd: new Date("2026-03-20T21:00:00"),
    location: "Main Church Hall",
    virtualLink: "",
    category: "youth",
    imageUrl:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
    capacity: 150,
    attendees: [
      {
        userId: "user001",
        userName: "Aline Uwase",
        email: "aline@example.com",
        registeredAt: new Date(),
        joinedAt: new Date(),
        reminderSent: false,
      },
      {
        userId: "user002",
        userName: "Eric Niyonsenga",
        email: "eric@example.com",
        registeredAt: new Date(),
        joinedAt: new Date(),
        reminderSent: false,
      },
    ],
    postedAt: new Date(),
    postedBy: "Admin",
    isFeatured: true,
    remindersSent: false,
    status: "published",
    tags: ["youth", "worship", "prayer"],
  },
  {
    title: "Bible Study & Prayer Gathering",
    verse: "2 Timothy 3:16 — All Scripture is God-breathed.",
    description:
      "This weekly gathering focuses on Bible study, scripture discussion, and prayer. Members will reflect on God’s word together and pray for families, the church, and the community.",
    shortDescription:
      "Bible study, scripture discussion, and community prayer.",
    date: new Date("2026-03-25T17:30:00"),
    dateStart: new Date("2026-03-25T17:30:00"),
    endDate: new Date("2026-03-25T19:30:00"),
    dateEnd: new Date("2026-03-25T19:30:00"),
    location: "Prayer Room A",
    virtualLink: "https://meet.google.com/example-bible-study",
    category: "bible_study",
    imageUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1200&auto=format&fit=crop",
    capacity: 60,
    attendees: [
      {
        userId: "user003",
        userName: "Grace Mukamana",
        email: "grace@example.com",
        registeredAt: new Date(),
        joinedAt: new Date(),
        reminderSent: false,
      },
    ],
    postedAt: new Date(),
    postedBy: "Church Office",
    isFeatured: false,
    remindersSent: false,
    status: "published",
    tags: ["bible_study", "scripture", "prayer"],
  },
];

const seedInitialEvents = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI or MONGODB_URI is missing in .env");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    await Event.deleteMany({});
    console.log("Old events deleted");

    await Event.insertMany(sampleEvents);
    console.log("Initial events seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeder error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedInitialEvents();