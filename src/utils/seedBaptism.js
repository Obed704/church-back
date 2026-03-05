import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

import connectDB from "../config/mongoConnect.js";
import User from "../models/User.js";
import BaptismClass from "../models/Baptism.js";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (church-back-main/.env)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const addDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function ensureUser({ fullName, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const hashed = await bcrypt.hash(password, 10);
  return await User.create({ fullName, email, password: hashed, role });
}

function makeClasses({ admin1, admin2, member1, member2, member3 }) {
  return [
    {
      title: "Baptism Preparation Class (March Cohort)",
      description: "An 8-week discipleship pathway preparing candidates for baptism.",
      preaching:
        "This program teaches the biblical meaning of baptism, repentance, faith, and new life in Christ.",
      documentation: "Bring a notebook, Bible, and be ready for weekly assignments.",

      schedule: {
        startDate: addDays(2),
        endDate: addDays(58),
        days: ["Wednesday", "Saturday"],
        time: "18:00",
        location: "Main Church Hall",
      },

      requirements: [
        "Attend at least 6 out of 8 weeks",
        "Complete weekly reflections",
        "Meet mentor at least twice",
      ],

      curriculum: [
        { week: 1, topic: "What is Baptism?", scripture: "Matthew 28:19-20", materials: ["Lesson Notes 1"] },
        { week: 2, topic: "Repentance & Faith", scripture: "Acts 2:38", materials: ["Lesson Notes 2"] },
        { week: 3, topic: "New Life in Christ", scripture: "Romans 6:4", materials: ["Lesson Notes 3"] },
        { week: 4, topic: "Salvation by Grace", scripture: "Ephesians 2:8-9", materials: ["Lesson Notes 4"] },
      ],

      maxStudents: 25,
      isActive: true,

      students: [
        {
          userId: member1._id,
          name: member1.fullName,
          email: member1.email,
          phone: "0780000001",
          address: "Kigali",
          status: "in_preparation",
          dateRegistered: addDays(-3),
        },
        {
          userId: member2._id,
          name: member2.fullName,
          email: member2.email,
          phone: "0780000002",
          address: "Kigali",
          status: "pending",
          dateRegistered: addDays(-2),
        },
        {
          userId: member3._id,
          name: member3.fullName,
          email: member3.email,
          phone: "0780000003",
          address: "Kicukiro",
          status: "ready",
          dateRegistered: addDays(-5),
        },
      ],

      members: [
        { userId: member1._id, fullName: member1.fullName, joinedAt: addDays(-3) },
        { userId: member2._id, fullName: member2.fullName, joinedAt: addDays(-2) },
        { userId: member3._id, fullName: member3.fullName, joinedAt: addDays(-5) },
      ],

      posts: [
        {
          type: "announcement",
          title: "Welcome to the March Cohort",
          body: "Please read the requirements, and join the community chat for updates.",
          attachments: [],
          createdBy: admin1._id,
          createdByName: admin1.fullName,
          pinned: true,
        },
        {
          type: "verse",
          title: "Verse of the Week: Romans 6:4",
          body: "Reflect on what it means to walk in newness of life.",
          attachments: [],
          createdBy: admin1._id,
          createdByName: admin1.fullName,
        },
        {
          type: "teaching",
          title: "Lesson 1 Notes: What is Baptism?",
          body: "Baptism is a public declaration of faith and identification with Christ.",
          attachments: [{ name: "Lesson1.pdf", url: "https://example.com/lesson1.pdf" }],
          createdBy: admin1._id,
          createdByName: admin1.fullName,
        },
      ],

      comments: [
        { userId: member2._id, userName: member2.fullName, text: "When is mentorship meeting?" },
        { userId: member1._id, userName: member1.fullName, text: "Excited to start!" },
      ],

      chat: [
        { userId: member3._id, userName: member3.fullName, text: "Hello everyone 👋" },
        { userId: admin1._id, userName: admin1.fullName, text: "Welcome! Check pinned announcement." },
      ],

      messagesToHolder: [
        { fromUserId: member2._id, fromName: member2.fullName, text: "Can I attend only Saturdays?" },
      ],

      statistics: {
        totalRegistered: 3,
        totalBaptized: 0,
        completionRate: 0,
      },
    },

    {
      title: "Baptism Preparation Class (April Cohort)",
      description: "New cohort focusing on discipleship basics + mentorship.",
      preaching:
        "We will study salvation, repentance, baptism meaning, and Christian living.",
      documentation: "Bring Bible and notebook. Weekly reflections required.",

      schedule: {
        startDate: addDays(25),
        endDate: addDays(85),
        days: ["Sunday"],
        time: "15:00",
        location: "Community Hall",
      },

      requirements: ["Attend weekly classes", "Participate in discussion"],

      curriculum: [
        { week: 1, topic: "The Gospel Message", scripture: "John 3:16", materials: ["Lesson Notes A1"] },
        { week: 2, topic: "Faith and Works", scripture: "James 2:17", materials: ["Lesson Notes A2"] },
      ],

      maxStudents: 20,
      isActive: true,

      students: [],
      members: [],

      posts: [
        {
          type: "announcement",
          title: "April Cohort Pre-Registration Open",
          body: "You can join the class now. Full registration opens next week.",
          createdBy: admin2._id,
          createdByName: admin2.fullName,
          pinned: true,
        },
      ],

      comments: [],
      chat: [],
      messagesToHolder: [],

      statistics: {
        totalRegistered: 0,
        totalBaptized: 0,
        completionRate: 0,
      },
    },
  ];
}

async function main() {
  try {
    // Uses your existing connection helper
    await connectDB();

    const WIPE = process.env.SEED_WIPE === "true";
    if (WIPE) {
      console.log("🧹 Wiping BaptismClass + seed users...");
      await BaptismClass.deleteMany({});
      await User.deleteMany({
        email: {
          $in: [
            "admin1@church.com",
            "admin2@church.com",
            "member1@church.com",
            "member2@church.com",
            "member3@church.com",
          ],
        },
      });
    }

    console.log("👤 Creating/ensuring seed users...");
    const admin1 = await ensureUser({
      fullName: "Admin Grace",
      email: "admin1@church.com",
      password: "Admin1234!",
      role: "admin",
    });
    const admin2 = await ensureUser({
      fullName: "Admin David",
      email: "admin2@church.com",
      password: "Admin1234!",
      role: "admin",
    });

    const member1 = await ensureUser({
      fullName: "Jean Paul",
      email: "member1@church.com",
      password: "User1234!",
      role: "user",
    });
    const member2 = await ensureUser({
      fullName: "Aline",
      email: "member2@church.com",
      password: "User1234!",
      role: "user",
    });
    const member3 = await ensureUser({
      fullName: "Eric",
      email: "member3@church.com",
      password: "User1234!",
      role: "user",
    });

    console.log("📚 Seeding baptism classes...");
    const classes = makeClasses({ admin1, admin2, member1, member2, member3 });

    for (const cls of classes) {
      await BaptismClass.findOneAndUpdate(
        { title: cls.title },
        cls,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const clsCount = await BaptismClass.countDocuments();
    console.log(`✅ Done. Baptism classes in DB: ${clsCount}`);

    console.log("\n🔐 Seed logins:");
    console.log("Admin: admin1@church.com / Admin1234!");
    console.log("Admin: admin2@church.com / Admin1234!");
    console.log("User : member1@church.com / User1234!");
    console.log("User : member2@church.com / User1234!");
    console.log("User : member3@church.com / User1234!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder failed:", err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

main();