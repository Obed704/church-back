import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import connectDB from "../config/mongoConnect.js";
import BaptismClass from "../models/Baptism.js";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Sample baptism classes data
const sampleClasses = [
  {
    title: "Spring 2024 Baptism Preparation",
    description:
      "An 8-week journey of spiritual growth and preparation for baptism...",
    preaching:
      "Baptism is not just a ritual; it's a public declaration of your faith in Jesus Christ...",
    documentation: "/uploads/baptism-guide-2024.pdf",
    schedule: {
      startDate: new Date("2024-03-15"),
      endDate: new Date("2024-05-10"),
      days: ["Thursday", "Saturday"],
      time: "7:00 PM - 8:30 PM",
      location: "Main Sanctuary - Room 203",
    },
    requirements: [
      "Personal faith in Jesus Christ",
      "Completed salvation class or equivalent",
      "Commitment to attend all sessions",
      "Read through the Gospel of John",
      "Be part of a small group or have a spiritual mentor",
    ],
    curriculum: [
      {
        week: 1,
        topic: "Understanding Salvation",
        scripture: "Ephesians 2:8-9",
        materials: ["Salvation Study Guide", "Gospel Presentation Video"],
      },
      {
        week: 2,
        topic: "The Meaning of Baptism",
        scripture: "Romans 6:3-4",
        materials: ["Baptism Symbolism Chart", "Testimony Writing Guide"],
      },
      {
        week: 3,
        topic: "Walking in New Life",
        scripture: "2 Corinthians 5:17",
        materials: [
          "Spiritual Disciplines Checklist",
          "Prayer Journal Template",
        ],
      },
      {
        week: 4,
        topic: "The Role of the Holy Spirit",
        scripture: "Acts 1:8",
        materials: ["Holy Spirit Study", "Gifts Assessment"],
      },
      {
        week: 5,
        topic: "Living in Christian Community",
        scripture: "Hebrews 10:24-25",
        materials: ["Church Membership Info", "Small Group Directory"],
      },
      {
        week: 6,
        topic: "Sharing Your Testimony",
        scripture: "1 Peter 3:15",
        materials: ["Testimony Worksheet", "Evangelism Tools"],
      },
      {
        week: 7,
        topic: "Overcoming Spiritual Challenges",
        scripture: "James 1:2-4",
        materials: ["Spiritual Warfare Guide", "Accountability Partner Guide"],
      },
      {
        week: 8,
        topic: "Baptism Day Preparation",
        scripture: "Matthew 28:19-20",
        materials: ["Baptism Checklist", "What to Expect Guide"],
      },
    ],
    maxStudents: 25,
    isActive: true,
    students: [
      {
        name: "John Smith",
        email: "john.smith@email.com",
        baptized: true,
        baptismDate: new Date("2024-05-12"),
        status: "completed",
        assignedMentor: "Pastor Michael",
      },
      {
        name: "Sarah Johnson",
        email: "sarah.j@email.com",
        baptized: false,
        status: "in_preparation",
        assignedMentor: "Deacon Robert",
      },
    ],
    statistics: { totalRegistered: 8, totalBaptized: 2, completionRate: 25 },
  },
  {
    title: "Summer 2024 Baptism Intensive",
    description:
      "A 4-week intensive program for those ready to commit to baptism...",
    preaching:
      "In baptism, we unite with Christ in his death and resurrection...",
    schedule: {
      startDate: new Date("2024-06-10"),
      endDate: new Date("2024-07-05"),
      days: ["Tuesday", "Thursday"],
      time: "6:30 PM - 8:00 PM",
      location: "Youth Chapel",
    },
    maxStudents: 15,
    isActive: true,
    students: [
      {
        name: "Kevin Martinez",
        email: "kevin.m@email.com",
        baptized: false,
        status: "pending",
      },
      {
        name: "Lisa Thompson",
        email: "lisa.t@email.com",
        baptized: false,
        status: "pending",
      },
    ],
    statistics: { totalRegistered: 2, totalBaptized: 0, completionRate: 0 },
  },
];

// Seeder function
const seedBaptismClasses = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    await BaptismClass.deleteMany();
    console.log("🗑 Cleared existing baptism classes");

    const inserted = await BaptismClass.insertMany(sampleClasses);
    console.log(`✅ Seeded ${inserted.length} baptism classes`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

// Run the seeder directly
seedBaptismClasses();
