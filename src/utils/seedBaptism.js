/**
 * Baptism Seeder
 * Run: node seeders/baptismSeeder.js
 *
 * Seeds:
 *  - 1 Admin user
 *  - 3 Regular users (members)
 *  - 3 Baptism classes with full data
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ── Import models ─────────────────────────────────────────────────────────────
// Adjust paths to match your project structure
import User from "../models/User.js";
import BaptismClass from "../models/Baptism.js";

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/church_db";

// ── Seed Data ─────────────────────────────────────────────────────────────────

const users = [
  {
    fullName: "Pastor Emmanuel",
    email: "admin@church.rw",
    password: "Admin1234!",
    role: "admin",
    bio: "Senior pastor and baptism coordinator with 15 years of ministry.",
    phone: "+250788000001",
    location: "Kigali, Rwanda",
  },
  {
    fullName: "Marie Claire Uwimana",
    email: "marie@example.com",
    password: "User1234!",
    role: "user",
    bio: "Eager to grow in faith.",
    phone: "+250788000002",
    location: "Kigali, Rwanda",
  },
  {
    fullName: "Jean Paul Habimana",
    email: "jeanpaul@example.com",
    password: "User1234!",
    role: "user",
    bio: "New believer, excited about baptism.",
    phone: "+250788000003",
    location: "Kigali, Rwanda",
  },
  {
    fullName: "Grace Mukamana",
    email: "grace@example.com",
    password: "User1234!",
    role: "user",
    bio: "Worshipper and community builder.",
    phone: "+250788000004",
    location: "Huye, Rwanda",
  },
];

const buildClass = (adminId, memberIds) => [
  {
    title: "Adult Baptism Preparation – Cohort A",
    description:
      "A 6-week intensive preparation journey for adults ready to take the step of public baptism. Covers the foundations of Christian faith, the meaning of baptism, and personal testimony.",
    preaching:
      "Baptism is not merely a ritual — it is a public declaration that you have died with Christ and risen with Him. Through these weeks, we walk together through Scripture, prayer, and community to ensure every candidate is spiritually ready.",
    category: "adult",
    language: "English",
    isActive: true,
    isFeatured: true,
    maxStudents: 25,
    allowPublicRegistration: true,
    coverImage: "",
    tags: ["adult", "foundation", "faith", "2025"],
    schedule: {
      startDate: new Date("2025-07-06"),
      endDate: new Date("2025-08-17"),
      days: ["Sunday", "Wednesday"],
      time: "10:00 AM – 12:00 PM",
      location: "Main Sanctuary Hall B",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      recurrence: "weekly",
    },
    instructor: {
      name: "Pastor Emmanuel",
      bio: "Senior pastor with 15 years of experience in baptism ministry.",
      userId: adminId,
    },
    requirements: [
      "Personal confession of faith in Jesus Christ",
      "Completion of all 6 preparation sessions",
      "Submission of personal testimony (written or verbal)",
      "Attendance of at least 4 of 6 sessions",
    ],
    curriculum: [
      {
        week: 1,
        topic: "Who Is Jesus? — The Foundation",
        scripture: "John 1:1-14; Colossians 1:15-20",
        description:
          "Exploring the identity of Jesus Christ as revealed in Scripture — fully God and fully man.",
        materials: ["Study Guide Week 1", "Colossians Devotional"],
        completed: true,
      },
      {
        week: 2,
        topic: "The Gospel — Death, Burial, Resurrection",
        scripture: "1 Corinthians 15:1-8; Romans 6:1-11",
        description:
          "Understanding the core gospel message and what Christ accomplished on the cross.",
        materials: ["Romans 6 Worksheet"],
        completed: true,
      },
      {
        week: 3,
        topic: "Faith, Repentance, and Conversion",
        scripture: "Acts 2:38; Ephesians 2:8-10",
        description:
          "What does it mean to truly repent and believe? Practical and theological exploration.",
        materials: ["Testimony Writing Guide"],
        completed: false,
      },
      {
        week: 4,
        topic: "What Is Baptism? — Symbol and Significance",
        scripture: "Matthew 28:19-20; Romans 6:3-4; Acts 8:36-38",
        description:
          "A detailed study of the biblical meaning and practice of water baptism.",
        materials: ["Baptism Booklet"],
        completed: false,
      },
      {
        week: 5,
        topic: "Life in the Spirit — The Holy Spirit",
        scripture: "Acts 1:8; Galatians 5:16-25; Romans 8:1-17",
        description:
          "Understanding the role of the Holy Spirit in the life of a new believer.",
        materials: ["Holy Spirit Study Sheet"],
        completed: false,
      },
      {
        week: 6,
        topic: "Community, Church, and Discipleship",
        scripture: "Acts 2:42-47; Hebrews 10:24-25",
        description:
          "Why the local church matters and how to grow as a disciple.",
        materials: ["Church Membership Form"],
        completed: false,
      },
    ],
    students: [
      {
        name: "Alice Nzeyimana",
        email: "alice.nz@example.com",
        phone: "+250788100001",
        gender: "female",
        dateOfBirth: new Date("1998-03-14"),
        address: "Kacyiru, Kigali",
        status: "in_preparation",
        baptized: false,
        attendanceCount: 2,
        dateRegistered: new Date("2025-06-20"),
      },
      {
        name: "Emmanuel Habyarimana",
        email: "emma.haby@example.com",
        phone: "+250788100002",
        gender: "male",
        dateOfBirth: new Date("1995-07-22"),
        address: "Gisozi, Kigali",
        status: "ready",
        baptized: false,
        attendanceCount: 4,
        dateRegistered: new Date("2025-06-18"),
      },
      {
        name: "Clarisse Mukabutera",
        email: "clarisse.m@example.com",
        phone: "+250788100003",
        gender: "female",
        dateOfBirth: new Date("2001-11-05"),
        address: "Remera, Kigali",
        status: "completed",
        baptized: true,
        baptismDate: new Date("2025-07-20"),
        attendanceCount: 6,
        dateRegistered: new Date("2025-06-15"),
      },
      {
        name: "Patrick Nkurunziza",
        email: "pat.nk@example.com",
        phone: "+250788100004",
        gender: "male",
        dateOfBirth: new Date("1990-01-30"),
        address: "Kicukiro, Kigali",
        status: "pending",
        baptized: false,
        attendanceCount: 1,
        dateRegistered: new Date("2025-07-01"),
      },
      {
        name: "Solange Uwamariya",
        email: "solange.u@example.com",
        phone: "+250788100005",
        gender: "female",
        dateOfBirth: new Date("2003-06-18"),
        address: "Nyamirambo, Kigali",
        status: "dropped",
        baptized: false,
        attendanceCount: 1,
        dateRegistered: new Date("2025-06-22"),
      },
    ],
    members: memberIds.map((id, i) => ({
      userId: id,
      fullName:
        ["Marie Claire Uwimana", "Jean Paul Habimana", "Grace Mukamana"][i] ||
        "Member",
      role: i === 0 ? "mentor" : "member",
      joinedAt: new Date("2025-06-25"),
    })),
    posts: [
      {
        type: "teaching",
        title: "Understanding Romans 6 — Dying and Rising with Christ",
        body: `Romans 6:3-4 is the theological heart of baptism. Paul writes that when we were baptized into Christ Jesus, we were baptized into His death. We were therefore buried with Him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.\n\nThis passage teaches us three things:\n1. Baptism is a union with Christ's death — we die to our old self.\n2. Baptism is a burial — the old life is gone, placed in the grave.\n3. Baptism is a resurrection — we rise to new life in Christ.\n\nThink of it as a spiritual autobiography told in a single act. When you go under the water, you are saying: "The old me — with all its sin, rebellion, and brokenness — is dead and buried." When you come up from the water, you are announcing: "I am alive in Christ!"\n\nThis is not merely symbolic theater. It is a covenant act — a moment when heaven witnesses your declaration and the Holy Spirit confirms His presence in you.`,
        createdByName: "Pastor Emmanuel",
        pinned: true,
        views: 42,
      },
      {
        type: "verse",
        title: "Memory Verse — Week 2",
        body: `"We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life." — Romans 6:4 (NIV)\n\nMeditate on this verse daily this week. Write it out by hand three times. Pray it back to God as a declaration over your life.`,
        createdByName: "Pastor Emmanuel",
        pinned: false,
        views: 31,
      },
      {
        type: "announcement",
        title: "📅 Session 3 Rescheduled — New Date: July 16th",
        body: "Dear Candidates, please note that our Week 3 session has been moved from July 9th to July 16th due to a church event. Same time (10:00 AM) and same location (Hall B). Please update your calendars. God bless!",
        createdByName: "Pastor Emmanuel",
        pinned: true,
        views: 28,
      },
      {
        type: "resource",
        title: "Free Download: Baptism Preparation Booklet (PDF)",
        body: "We have prepared a comprehensive 20-page booklet covering everything we discuss in class. You can download it from the church website or collect a printed copy at the front desk.\n\nTopics covered:\n• The biblical basis for baptism\n• How to write your testimony\n• FAQ about baptism day logistics\n• Post-baptism discipleship guide",
        createdByName: "Pastor Emmanuel",
        pinned: false,
        views: 55,
      },
    ],
    comments: [
      {
        userId: memberIds[0],
        userName: "Marie Claire Uwimana",
        text: "Week 2 was incredibly powerful. Romans 6 hit differently when explained in context. I feel so ready for this!",
      },
      {
        userId: memberIds[1],
        userName: "Jean Paul Habimana",
        text: "Pastor, thank you for the patience with all our questions. This class has answered so much that I struggled with for years.",
      },
    ],
    announcements: [
      {
        title: "🎉 Baptism Sunday is August 17th!",
        body: "All candidates who complete the preparation course will be baptized during the Sunday service at 10 AM. Family and friends are welcome to attend. White attire is recommended.",
        urgent: false,
        createdByName: "Pastor Emmanuel",
      },
      {
        title: "⚠️ Attendance Reminder",
        body: "Please ensure you attend at least 4 out of 6 sessions to be eligible for baptism. If you have a scheduling conflict, contact the admin team immediately.",
        urgent: true,
        createdByName: "Pastor Emmanuel",
      },
    ],
    createdBy: adminId,
  },
  {
    title: "Youth Baptism Journey – Teens 13–17",
    description:
      "A specially designed 4-week program for teenagers (ages 13–17) seeking to be baptized. Age-appropriate teachings, group discussions, and mentorship from young leaders.",
    preaching:
      "Young people are not the church of tomorrow — they are the church of today. This program affirms that God's call has no age limit. If you believe, you can be baptized.",
    category: "youth",
    language: "Kinyarwanda / English",
    isActive: true,
    isFeatured: false,
    maxStudents: 15,
    allowPublicRegistration: true,
    tags: ["youth", "teens", "kinyarwanda", "2025"],
    schedule: {
      startDate: new Date("2025-08-03"),
      endDate: new Date("2025-08-24"),
      days: ["Saturday"],
      time: "2:00 PM – 4:00 PM",
      location: "Youth Hall",
      recurrence: "weekly",
    },
    instructor: {
      name: "Pastor Emmanuel",
      bio: "Senior pastor, also leads youth ministry.",
      userId: adminId,
    },
    requirements: [
      "Age 13–17",
      "Parental/guardian consent form signed",
      "Personal confession of faith",
      "At least 3 of 4 sessions attended",
    ],
    curriculum: [
      {
        week: 1,
        topic: "Who Am I In Christ?",
        scripture: "2 Corinthians 5:17; John 3:16",
        description: "Identity, worth, and what it means to be a new creation.",
        materials: ["Identity Worksheet", "Journal"],
        completed: false,
      },
      {
        week: 2,
        topic: "What Is Baptism And Why Do It?",
        scripture: "Matthew 3:13-17; Acts 2:41",
        description:
          "Youth-friendly breakdown of baptism — meaning, history, and significance.",
        materials: ["Youth Baptism Booklet"],
        completed: false,
      },
      {
        week: 3,
        topic: "Living Different — Christian Life At School",
        scripture: "Daniel 1:8; Romans 12:2",
        description:
          "How to live out faith practically in school, at home, and with peers.",
        materials: ["Real Life Scenarios Cards"],
        completed: false,
      },
      {
        week: 4,
        topic: "Testimony & Commitment",
        scripture: "1 Peter 3:15; Revelation 12:11",
        description:
          "Each candidate shares their story. Final preparation and prayer.",
        materials: ["Testimony Template"],
        completed: false,
      },
    ],
    students: [
      {
        name: "Kevin Ishimwe",
        email: "kevin.ish@example.com",
        phone: "+250788200001",
        gender: "male",
        dateOfBirth: new Date("2009-04-12"),
        address: "Kimironko, Kigali",
        status: "pending",
        baptized: false,
        attendanceCount: 0,
        dateRegistered: new Date("2025-07-15"),
      },
      {
        name: "Diana Ingabire",
        email: "diana.ing@example.com",
        phone: "+250788200002",
        gender: "female",
        dateOfBirth: new Date("2010-08-25"),
        address: "Kanombe, Kigali",
        status: "pending",
        baptized: false,
        attendanceCount: 0,
        dateRegistered: new Date("2025-07-16"),
      },
    ],
    members: [memberIds[2]].map((id) => ({
      userId: id,
      fullName: "Grace Mukamana",
      role: "mentor",
      joinedAt: new Date("2025-07-10"),
    })),
    posts: [
      {
        type: "announcement",
        title: "Welcome to the Youth Baptism Journey!",
        body: "We are so excited to walk with you through this 4-week journey. This is YOUR moment. Come ready to learn, ask questions, and grow. No question is too basic — ask everything!\n\nSee you Saturday at 2 PM in the Youth Hall. Bring your Bible and a friend!",
        createdByName: "Pastor Emmanuel",
        pinned: true,
        views: 14,
      },
    ],
    comments: [],
    announcements: [],
    createdBy: adminId,
  },
  {
    title: "New Believers Baptism — Special Service",
    description:
      "A condensed 2-session fast-track for new converts who have recently accepted Christ and are ready for baptism. Ideal for those who came to faith through evangelism crusades or personal ministry.",
    preaching:
      "When the Ethiopian eunuch asked 'What hinders me from being baptized?', Philip answered simply: 'If you believe with all your heart, you may.' We believe the same today. New faith should not wait indefinitely.",
    category: "special",
    language: "English",
    isActive: false,
    isFeatured: false,
    maxStudents: 10,
    allowPublicRegistration: false,
    tags: ["new believers", "evangelism", "fast-track", "2024"],
    schedule: {
      startDate: new Date("2024-12-07"),
      endDate: new Date("2024-12-14"),
      days: ["Saturday"],
      time: "9:00 AM – 11:00 AM",
      location: "Prayer Room 2",
      recurrence: "weekly",
    },
    instructor: {
      name: "Pastor Emmanuel",
      userId: adminId,
    },
    requirements: [
      "Recent confession of faith (within past 3 months)",
      "Completion of both preparation sessions",
    ],
    curriculum: [
      {
        week: 1,
        topic: "The New Birth — What Happened When You Believed",
        scripture: "John 3:3-8; 2 Corinthians 5:17; Titus 3:5",
        description:
          "Understanding the transformation that occurred at conversion.",
        materials: ["New Life Booklet"],
        completed: true,
      },
      {
        week: 2,
        topic: "Baptism — Your First Step of Obedience",
        scripture: "Acts 8:26-40; Matthew 28:19; Colossians 2:12",
        description: "Why baptism is the natural next step after believing.",
        materials: [],
        completed: true,
      },
    ],
    students: [
      {
        name: "Francois Habimana",
        email: "francois.h@example.com",
        phone: "+250788300001",
        gender: "male",
        dateOfBirth: new Date("1987-09-10"),
        address: "Muhanga, Rwanda",
        status: "completed",
        baptized: true,
        baptismDate: new Date("2024-12-21"),
        attendanceCount: 2,
        dateRegistered: new Date("2024-12-01"),
      },
      {
        name: "Jacqueline Umwali",
        email: "jacqueline.u@example.com",
        phone: "+250788300002",
        gender: "female",
        dateOfBirth: new Date("1992-02-28"),
        address: "Rwamagana, Rwanda",
        status: "completed",
        baptized: true,
        baptismDate: new Date("2024-12-21"),
        attendanceCount: 2,
        dateRegistered: new Date("2024-12-02"),
      },
      {
        name: "Moses Rutaganda",
        email: "moses.r@example.com",
        phone: "+250788300003",
        gender: "male",
        dateOfBirth: new Date("1999-05-15"),
        address: "Nyagatare, Rwanda",
        status: "completed",
        baptized: true,
        baptismDate: new Date("2024-12-21"),
        attendanceCount: 2,
        dateRegistered: new Date("2024-12-03"),
      },
    ],
    members: [],
    posts: [
      {
        type: "testimony",
        title: "Francois' Testimony — From Darkness to Light",
        body: `I grew up in a religious family but never truly understood the gospel. Last November at the crusade, I heard for the first time that Jesus didn't just die 2000 years ago — He died FOR ME.\n\nI gave my life to Christ that night in the parking lot, weeping. Three weeks later I was baptized. My wife couldn't believe the change.\n\nIf you are reading this: it is never too late, and you are never too far. God is waiting.`,
        createdByName: "Francois Habimana",
        pinned: true,
        views: 87,
      },
    ],
    comments: [],
    announcements: [],
    createdBy: adminId,
  },
];

// ── Main Seed Function ─────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    // ── Clear existing data
    await BaptismClass.deleteMany({});
    console.log("🗑️  Cleared BaptismClass collection");

    // ── Upsert users (don't wipe users — just create if not exists)
    const createdUsers = [];
    for (const u of users) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        const hashed = await bcrypt.hash(u.password, 10);
        existing = await User.create({ ...u, password: hashed });
        console.log(`👤 Created user: ${u.email}`);
      } else {
        console.log(`👤 User exists: ${u.email}`);
      }
      createdUsers.push(existing);
    }

    const [adminUser, ...memberUsers] = createdUsers;
    const memberIds = memberUsers.map((u) => u._id);

    // ── Seed classes
    const classData = buildClass(adminUser._id, memberIds);
    const created = await BaptismClass.insertMany(classData);
    console.log(`🏫 Created ${created.length} baptism classes:`);
    created.forEach((c) =>
      console.log(`   • ${c.title} (${c.students.length} students)`),
    );

    console.log("\n✅ Seeding complete!");
    console.log("─────────────────────────────────────────");
    console.log("Admin login:");
    console.log("  Email:    admin@church.rw");
    console.log("  Password: Admin1234!");
    console.log("\nSample member logins:");
    console.log("  marie@example.com  / User1234!");
    console.log("  jeanpaul@example.com / User1234!");
    console.log("  grace@example.com  / User1234!");
    console.log("─────────────────────────────────────────");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
