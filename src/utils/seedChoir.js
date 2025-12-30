import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../config/mongoConnect.js";
import Choir from "../models/choir.js";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const choirsData = [
  {
    name: "Ebenezer",
    president: "Alice Uwimana",
    vicePresident: "John Mugisha",
    committee: ["Sarah Mukaruz", "Paul Nkurunziza", "Esther Uwase"],
    description: "Uplifting worship songs and energetic performances.",
    verse: "Psalm 100:1-2",
    about: "Ebenezer Choir glorifies God through music and praise.",
    songs: [
      {
        title: "Amazing Grace",
        youtubeLink: "https://www.youtube.com/watch?v=Jbe7OruLk8I",
      },
      {
        title: "Here I Am to Worship",
        youtubeLink: "https://www.youtube.com/watch?v=CjqJvLzB4gI",
      },
    ],
    social: {
      youtube: "https://www.youtube.com/@EbenezerChoir",
      instagram: "https://www.instagram.com/ebenezerchoir",
      email: "ebenezerchoir@example.com",
    },
  },
  {
    name: "Bethel",
    president: "Grace Uwitonze",
    vicePresident: "David Niyonzima",
    committee: ["Rachel Mukamana", "Eric Hakizimana", "Linda Umutoni"],
    description: "Contemporary gospel music and youth praise sessions.",
    verse: "Psalm 150:1-2",
    about: "Bethel Choir aims to reach hearts through dynamic music.",
    songs: [
      {
        title: "How Great Is Our God",
        youtubeLink: "https://www.youtube.com/watch?v=CqwT1ODh2hY",
      },
      {
        title: "Reckless Love",
        youtubeLink: "https://www.youtube.com/watch?v=Sc6SSHuZvQE",
      },
    ],
    social: {
      youtube: "https://www.youtube.com/@BethelChoir",
      instagram: "https://www.instagram.com/bethelchoir",
      email: "bethelchoir@example.com",
    },
  },
  {
    name: "Bethesda",
    president: "Marie Mukasine",
    vicePresident: "Fabrice Uwizeyimana",
    committee: ["Jean Bosco", "Alice Mukandayisenga", "Emmanuel Nshimiyimana"],
    description: "Traditional hymns and soulful worship sessions.",
    verse: "Colossians 3:16",
    about:
      "Bethesda Choir focuses on heartfelt worship connecting people with God.",
    songs: [
      {
        title: "Great Is Thy Faithfulness",
        youtubeLink: "https://www.youtube.com/watch?v=V3b4NnX0LcA",
      },
      {
        title: "It Is Well",
        youtubeLink: "https://www.youtube.com/watch?v=Zl6gG4r68G0",
      },
    ],
    social: {
      youtube: "https://www.youtube.com/@BethesdaChoir",
      instagram: "https://www.instagram.com/bethesdachoir",
      email: "bethesdachoir@example.com",
    },
  },
];

const seedChoirs = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    await Choir.deleteMany();
    console.log("🗑 Cleared old choirs");

    await Choir.insertMany(choirsData);
    console.log("✅ Seeded choirs successfully");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedChoirs();
