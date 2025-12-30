import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import DailyPreaching from "../models/dailyPreachings.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed", error);
    process.exit(1);
  }
};

const seedPreachings = async () => {
  try {
    await connectDB();

    // Clear existing data
    await DailyPreaching.deleteMany();
    console.log("🗑 Existing preachings removed");

    const preachings = [
      {
        day: "Monday",
        date: new Date("2025-01-06"),
        preacher: "Pastor John",
        verses: [
          "Hebrews 11:1",
          "Romans 10:17"
        ],
        description:
          "Faith is trusting God even when we cannot see the outcome. True faith grows when we rely fully on His Word.",
        likes: ["user1", "user2"],
        favorites: ["user2"],
        comments: [
          {
            user: "Grace",
            text: "This message really strengthened my faith.",
            replies: [
              {
                user: "Admin",
                text: "Amen! Faith comes by hearing the Word."
              }
            ]
          }
        ]
      },
      {
        day: "Wednesday",
        date: new Date("2025-01-08"),
        preacher: "Admin",
        verses: [
          "1 Thessalonians 5:17",
          "Matthew 7:7"
        ],
        description:
          "Prayer is not just asking from God but building a relationship with Him through constant communication.",
        likes: ["user3"],
        favorites: [],
        comments: []
      },
      {
        day: "Friday",
        date: new Date("2025-01-10"),
        preacher: "Pastor Sarah",
        verses: [
          "Psalm 23:1",
          "Proverbs 3:5"
        ],
        description:
          "God is our shepherd and provider. When we trust Him completely, He leads us in the right path.",
        likes: ["user1", "user2", "user4"],
        favorites: ["user1"],
        comments: [
          {
            user: "Michael",
            text: "Very comforting message.",
            replies: []
          }
        ]
      }
    ];

    await DailyPreaching.insertMany(preachings);
    console.log("🌱 Daily preachings seeded successfully");

    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed", error);
    process.exit(1);
  }
};

seedPreachings();
