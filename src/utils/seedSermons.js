import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/mongoConnect.js";
import Sermon from "../models/sermons.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedSermons = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await Sermon.deleteMany();

    const initialSermons = [
      {
        verse: "John 3:16",
        preacher: "Pastor John",
        description:
          "God so loved the world that He gave His only Son, that whoever believes in Him shall not perish but have eternal life. This verse emphasizes the unconditional love of God and His promise of salvation for all who believe.",
        likes: 0,
        comments: [],
      },
      {
        verse: "Psalm 23:1",
        preacher: "Pastor Mary",
        description:
          "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me. Your rod and your staff, they comfort me.",
        likes: 0,
        comments: [],
      },
      {
        verse: "Romans 8:28",
        preacher: "Pastor Luke",
        description:
          "All things work together for good to those who love God, to those who are called according to His purpose. This verse reminds us that even challenges and trials can have a purpose when aligned with God’s divine plan. Trust in Him in all circumstances.",
        likes: 0,
        comments: [],
      },
      {
        verse: "Romans 8:28",
        preacher: "Pastor Luke",
        description:
          "All things work together for good to those who love God, to those who are called according to His purpose. This verse reminds us that even challenges and trials can have a purpose when aligned with God’s divine plan. Trust in Him in all circumstances.",
        likes: 0,
        comments: [],
      },
      {
        verse: "Romans 8:28",
        preacher: "Pastor Luke",
        description:
          "All things work together for good to those who love God, to those who are called according to His purpose. This verse reminds us that even challenges and trials can have a purpose when aligned with God’s divine plan. Trust in Him in all circumstances.",
        likes: 0,
        comments: [],
      },
      {
        verse: "Romans 8:28",
        preacher: "Pastor Luke",
        description:
          "All things work together for good to those who love God, to those who are called according to His purpose. This verse reminds us that even challenges and trials can have a purpose when aligned with God’s divine plan. Trust in Him in all circumstances. All things work together for good to those who love God, to those who are called according to His purpose. This verse reminds us that even challenges and trials can have a purpose when aligned with God’s divine plan. Trust in Him in all circumstances.",
        likes: 0,
        comments: [],
      },
    ];

    await Sermon.insertMany(initialSermons);
    console.log("✅ Sermons seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding sermons:", err);
    process.exit(1);
  }
};

seedSermons();
