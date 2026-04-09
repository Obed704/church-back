import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/mongoConnect.js";
import CommitteeYear from "../models/CommitteeYear.js";
import CommitteeMember from "../models/CommitteeMember.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const run = async () => {
  await connectDB();

  // clean
  await CommitteeMember.deleteMany({});
  await CommitteeYear.deleteMany({});

  const y2024 = await CommitteeYear.create({
    label: "2024-2025",
    startYear: 2024,
    endYear: 2025,
    title: "Church Committee",
    description: "Serving with faith, discipline, and love.",
    coverImageUrl: "",
    isActive: false,
  });

  const y2025 = await CommitteeYear.create({
    label: "2025-2026",
    startYear: 2025,
    endYear: 2026,
    title: "Church Committee",
    description: "Unity, service, and leadership for the church community.",
    coverImageUrl: "",
    isActive: true,
  });

  const members2025 = [
    { role: "representative", name: "John Doe", narration: "Leads the committee with vision.", imageUrl: "" },
    { role: "vice_representative", name: "Jane Doe", narration: "Supports and coordinates activities.", imageUrl: "" },

    { role: "advisor", gender: "boy", name: "Advisor (Boy)", narration: "Guides and mentors members.", imageUrl: "" },
    { role: "advisor", gender: "girl", name: "Advisor (Girl)", narration: "Provides counsel and support.", imageUrl: "" },

    { role: "intercessor", gender: "boy", name: "Intercessor (Boy)", narration: "Prayer and spiritual support.", imageUrl: "" },
    { role: "intercessor", gender: "girl", name: "Intercessor (Girl)", narration: "Prayer, care, and encouragement.", imageUrl: "" },

    { role: "secretary", name: "Secretary Name", narration: "Records meetings and announcements.", imageUrl: "" },
    { role: "treasurer", name: "Treasurer Name", narration: "Manages funds and budget discipline.", imageUrl: "" },
    { role: "accountant", name: "Accountant Name", narration: "Tracks records and reports.", imageUrl: "" },
    { role: "grand_pere", name: "Grand Père Name", narration: "Senior guide and wisdom for the team.", imageUrl: "" },
  ];

  await CommitteeMember.insertMany(
    members2025.map((m) => ({ ...m, committeeYear: y2025._id }))
  );

  console.log("Seeded committee years & members successfully.");
  await mongoose.connection.close();
};

run().catch((e) => {
  console.error("Seeder error:", e);
  process.exit(1);
});