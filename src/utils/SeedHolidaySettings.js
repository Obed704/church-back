import mongoose from "mongoose";
import dotenv from "dotenv";
import HolidaySettings from "../models/HolidaySetting.js";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const data = {
  season: "Holiday Season 2024",
  title: "Holiday Connect",
  description: "Join our special prayer gatherings this holiday season",
  spiritualTitle: "Spiritual Growth Together",
  spiritualDescription:
    "Strengthen your faith through collective prayer, reflection, and fellowship.",
  bibleVerse: {
    text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.",
    reference: "1 Thessalonians 5:16-18",
  },
  socialLinks: [
    {
      icon: "FaEnvelope",
      label: "Email",
      href: "mailto:contact@church.com",
      color: "from-red-500 to-red-600",
      hoverColor: "hover:from-red-600 hover:to-red-700",
      hoverText: "Send us an email",
    },
    {
      icon: "FaPhone",
      label: "Call",
      href: "tel:+1234567890",
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      hoverText: "Call us now",
    },
    {
      icon: "FaWhatsapp",
      label: "WhatsApp",
      href: "https://wa.me/250796707287",
      color: "from-green-500 to-green-600",
      hoverColor: "hover:from-green-600 hover:to-green-700",
      hoverText: "Chat on WhatsApp",
    },
  ],
  tabs: [
    { key: "join", label: "Join Session", content: "" },
    {
      key: "info",
      label: "Session Info",
      content:
        "Daily prayer sessions at 7 PM, Christmas Eve and New Year's special service.",
    },
    { key: "schedule", label: "Schedule", content: "Schedule coming soon." },
  ],
  features: [
    { label: "Daily Prayers", color: "from-blue-500 to-blue-600" },
    { label: "Group Sessions", color: "from-purple-500 to-purple-600" },
    { label: "Bible Study", color: "from-green-500 to-green-600" },
    { label: "Fellowship", color: "from-amber-500 to-amber-600" },
  ],
  successMessage: "Welcome to our holiday prayer community!",
  joinButtonText: "Join Holiday Prayer Session",
  processingText: "Processing...",
  loginRequiredText: "Please Log In to Join",
  welcomeText: "Welcome back, {name}!",
  readyText: "Ready to join the prayer session?",
  participantsLabel: "Participants Joined",
  liveSessionText: "Live Session",
  startsIn: "Starts in 2 days",
  whatsappNote: "We'll send confirmation and updates via WhatsApp",
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "church",
    });

    console.log("MongoDB connected");
    await HolidaySettings.deleteMany({});
    await HolidaySettings.create(data);
    console.log("Seeder done!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
