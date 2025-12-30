import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/mongoConnect.js";
import Study from "../models/Study.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Sample data
const studies = [
  {
    title: "Faith in Action",
    description: "Understanding how faith manifests in daily life through examples from the New Testament.",
    callToAction: "Apply your faith this week!",
    category: "new_testament",
    difficulty: "beginner",
    estimatedTime: 25,
    verses: [
      { reference: "James 2:17", text: "Faith by itself, if it does not have works, is dead.", version: "NIV" },
      { reference: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see.", version: "NIV" }
    ],
    discussionQuestions: ["What does it mean to have living faith?", "How can we demonstrate faith in our daily routines?"],
    keyTakeaways: ["Faith requires action", "Trusting God brings results"],
    prayerPoints: ["Pray for guidance in living out faith", "Pray for courage to act on faith"],
    songs: [{ name: "Great Is Thy Faithfulness", url: "https://example.com/song1.mp3", artist: "Thomas Chisholm" }],
  },
  {
    title: "Walking with God",
    description: "Exploring the spiritual journey and relationship with God through scripture and reflection.",
    category: "wisdom",
    difficulty: "intermediate",
    estimatedTime: 40,
    verses: [
      { reference: "Micah 6:8", text: "Act justly, love mercy, walk humbly with your God.", version: "NIV" }
    ],
    discussionQuestions: ["What does 'walking humbly with God' mean to you?"],
    keyTakeaways: ["Humility is essential", "Justice and mercy are vital"],
    prayerPoints: ["Seek humility in all actions"],
    songs: [{ name: "I Will Follow", url: "https://example.com/song2.mp3", artist: "Chris Tomlin" }],
  },
  {
    title: "The Beatitudes Explained",
    description: "A deep dive into Jesus’ Beatitudes and their practical application today.",
    category: "gospels",
    difficulty: "beginner",
    estimatedTime: 35,
    verses: [
      { reference: "Matthew 5:3-12", text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven.", version: "NIV" }
    ],
    discussionQuestions: ["Which Beatitude speaks most to you?", "How can you embody these in your life?"],
    keyTakeaways: ["Blessedness comes through humility", "Following Christ is counter-cultural"],
  },
  {
    title: "Prayer and Fasting",
    description: "Understanding the power and purpose of prayer and fasting in spiritual growth.",
    category: "epistles",
    difficulty: "advanced",
    estimatedTime: 60,
    verses: [
      { reference: "Matthew 6:16-18", text: "When you fast, do not look somber as the hypocrites do...", version: "NIV" }
    ],
    discussionQuestions: ["Why do we fast?", "How does fasting strengthen prayer life?"],
    keyTakeaways: ["Fasting draws us closer to God", "Prayer and fasting enhance spiritual focus"],
  },
  {
    title: "End Times Overview",
    description: "A study of apocalyptic literature in the Bible, including Revelation and Daniel.",
    category: "apocalyptic",
    difficulty: "advanced",
    estimatedTime: 50,
    verses: [
      { reference: "Revelation 21:1", text: "Then I saw a new heaven and a new earth...", version: "NIV" }
    ],
    discussionQuestions: ["What is the hope for believers in end times?", "How should we live in light of prophecy?"],
    keyTakeaways: ["God’s plan is ultimate", "Stay faithful until the end"],
  }
];

// Seeder function
const seedStudies = async () => {
  try {
    await connectDB();

    // Clear existing studies
    await Study.deleteMany();

    // Insert sample studies
    await Study.insertMany(studies);

    console.log("✅ 5 sample studies inserted successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding studies:", err);
    process.exit(1);
  }
};

seedStudies();
