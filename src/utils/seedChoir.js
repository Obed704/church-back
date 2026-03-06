import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Choir from "../models/Choir.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const sampleChoirs = [
  {
    name: "Grace Voices",
    slug: "grace-voices",
    description: "A passionate choir devoted to worship, harmony, and spiritual growth.",
    shortDescription: "Worship through music and unity.",
    about:
      "Grace Voices is a vibrant choir that ministers through inspiring songs, fellowship, and service in church and community events.",
    mission: "To lead people into worship through excellent and spirit-filled music.",
    vision: "To become a transformative choir that inspires lives through gospel music.",
    heroImage:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop",
    coverImage:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop",
    verse: "Psalm 95:1 — Come, let us sing for joy to the Lord.",
    motto: "One voice, one faith, one purpose.",
    foundedYear: 2018,
    president: "Ange Uwase",
    vicePresident: "Mugisha Caleb",
    committee: [
      {
        name: "Ange Uwase",
        role: "President",
        imageUrl: "https://randomuser.me/api/portraits/women/44.jpg",
        instagram: "https://instagram.com/ange.uwase",
        facebook: "https://facebook.com/ange.uwase",
        email: "ange@example.com",
        phone: "+250788000111",
        bio: "Leads the choir with passion and discipline.",
      },
      {
        name: "Mugisha Caleb",
        role: "Vice President",
        imageUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        instagram: "https://instagram.com/caleb.mugisha",
        facebook: "https://facebook.com/caleb.mugisha",
        email: "caleb@example.com",
        phone: "+250788000222",
        bio: "Supports operations and mentoring of younger members.",
      },
      {
        name: "Iradukunda Naomi",
        role: "Secretary",
        imageUrl: "https://randomuser.me/api/portraits/women/20.jpg",
        instagram: "",
        facebook: "",
        email: "naomi@example.com",
        phone: "+250788000333",
        bio: "Handles schedules, communication, and planning.",
      },
    ],
    members: [
      "Ange Uwase",
      "Mugisha Caleb",
      "Iradukunda Naomi",
      "Niyonsenga Eric",
      "Mukamana Joy",
      "Ishimwe Kevin",
      "Umutoni Bella",
      "Hirwa David",
    ],
    songs: [
      {
        title: "Amazing Grace",
        youtubeLink: "https://www.youtube.com/watch?v=CDdvReNKKuk",
        artist: "Grace Voices",
        duration: "4:22",
      },
      {
        title: "How Great Thou Art",
        youtubeLink: "https://www.youtube.com/watch?v=Cc0QVWzCv9k",
        artist: "Grace Voices",
        duration: "5:01",
      },
    ],
    socials: {
      youtube: "https://youtube.com/@gracevoices",
      instagram: "https://instagram.com/gracevoices",
      facebook: "https://facebook.com/gracevoices",
      email: "gracevoices@example.com",
      phone: "+250788123456",
      website: "https://gracevoices.org",
    },
    rehearsals: [
      {
        day: "Wednesday",
        time: "5:00 PM - 7:00 PM",
        venue: "Main Hall",
        note: "General rehearsal",
      },
      {
        day: "Saturday",
        time: "2:00 PM - 5:00 PM",
        venue: "Youth Room",
        note: "Performance rehearsal",
      },
    ],
    achievements: [
      "Won district gospel choir competition in 2023.",
      "Ministered at national youth worship conference.",
      "Released 2 live worship videos.",
    ],
    gallery: [
      {
        title: "Choir Sunday Performance",
        imageUrl:
          "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?q=80&w=1200&auto=format&fit=crop",
      },
      {
        title: "Rehearsal Session",
        imageUrl:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop",
      },
    ],
    faqs: [
      {
        question: "Who can join?",
        answer:
          "Anyone with passion for singing, worship, and commitment to rehearsal.",
      },
      {
        question: "Do I need prior experience?",
        answer: "No. Commitment and willingness to learn matter most.",
      },
    ],
    previousYears: [
      {
        yearLabel: "2024-2025",
        theme: "Serving Through Song",
        verse: "Colossians 3:16",
        summary: "Focused on outreach and live ministry events.",
        achievements: ["Held 4 outreach concerts", "Recorded first choir medley"],
        committee: [
          {
            name: "Diane Mukamurenzi",
            role: "President",
            imageUrl: "https://randomuser.me/api/portraits/women/60.jpg",
            instagram: "",
            facebook: "",
            email: "diane@example.com",
            phone: "+250788222111",
            bio: "",
          },
        ],
        members: ["Diane Mukamurenzi", "Claude Irakoze", "Aline Teta"],
        content: [
          {
            title: "Year Summary",
            body: "The choir expanded its ministry to schools and community events.",
          },
        ],
      },
    ],
    acceptsApplications: true,
    applicationNote: "Please provide one working contact.",
    isFeatured: true,
    status: "active",
    sortOrder: 1,
  },
  {
    name: "Zion Praise Team",
    slug: "zion-praise-team",
    description: "A joyful and energetic choir that leads praise and fellowship.",
    shortDescription: "Praise, energy, and unity.",
    about:
      "Zion Praise Team serves through uplifting praise sessions, youth activities, and spiritual encouragement.",
    mission: "To glorify God with joyful and disciplined praise.",
    vision: "To raise a generation that worships with truth and excellence.",
    heroImage:
      "https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=1200&auto=format&fit=crop",
    coverImage:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1200&auto=format&fit=crop",
    verse: "Psalm 150:6 — Let everything that has breath praise the Lord.",
    motto: "Praise without limits.",
    foundedYear: 2020,
    president: "Jean Claude",
    vicePresident: "Divine Keza",
    committee: [
      {
        name: "Jean Claude",
        role: "President",
        imageUrl: "https://randomuser.me/api/portraits/men/41.jpg",
        instagram: "",
        facebook: "",
        email: "jeanclaude@example.com",
        phone: "+250788888001",
        bio: "",
      },
      {
        name: "Divine Keza",
        role: "Vice President",
        imageUrl: "https://randomuser.me/api/portraits/women/15.jpg",
        instagram: "",
        facebook: "",
        email: "divine@example.com",
        phone: "+250788888002",
        bio: "",
      },
    ],
    members: ["Jean Claude", "Divine Keza", "Patrick M.", "Alice U.", "Ben K."],
    songs: [
      {
        title: "Way Maker",
        youtubeLink: "https://www.youtube.com/watch?v=iJCV_2H9xD0",
        artist: "Zion Praise Team",
        duration: "5:30",
      },
    ],
    socials: {
      youtube: "https://youtube.com/@zionpraise",
      instagram: "",
      facebook: "https://facebook.com/zionpraise",
      email: "zion@example.com",
      phone: "+250788777000",
      website: "",
    },
    rehearsals: [
      {
        day: "Friday",
        time: "4:00 PM - 6:30 PM",
        venue: "Church Hall",
        note: "",
      },
    ],
    achievements: ["Led praise at 3 youth camps."],
    gallery: [],
    faqs: [],
    previousYears: [],
    acceptsApplications: true,
    applicationNote: "",
    isFeatured: false,
    status: "active",
    sortOrder: 2,
  },
];

const seedChoirs = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI or MONGODB_URI is missing in .env");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    await Choir.deleteMany({});
    console.log("Old choirs deleted");

    await Choir.insertMany(sampleChoirs);
    console.log("Choirs seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeder error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedChoirs();