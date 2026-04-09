import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Department from "../models/Department.js";
import { departments } from "./deptDB.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const placeholderImage = (label = "Department") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=0D8ABC&color=fff&size=512`;

const memberImage = (name = "Member") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F2937&color=fff&size=512`;

const committeeImage = (name = "Leader") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F59E0B&color=111827&size=512`;

const normalizeComment = (comment = {}) => ({
  name: String(comment.name || "Anonymous").trim(),
  email: String(comment.email || "").trim(),
  text: String(comment.text || "").trim(),
  replies: Array.isArray(comment.replies)
    ? comment.replies.map((reply) => ({
        name: String(reply.name || "Anonymous").trim(),
        text: String(reply.text || "").trim(),
      }))
    : [],
});

const buildDepartment = (dept) => {
  return {
    name: String(dept.name || "").trim(),
    president: String(dept.president || "").trim(),
    est: String(dept.est || "").trim(),
    description: String(dept.description || "").trim(),

    phone: "",
    email: "",
    heroImage: placeholderImage(dept.name),

    gallery: [
      {
        type: "hero",
        title: `${dept.name} Cover`,
        imageUrl: placeholderImage(`${dept.name} Cover`),
        description: `Main image for ${dept.name}.`,
      },
      {
        type: "team",
        title: `${dept.name} Team`,
        imageUrl: placeholderImage(`${dept.name} Team`),
        description: `Team presentation image for ${dept.name}.`,
      },
      {
        type: "gallery",
        title: `${dept.name} Activity`,
        imageUrl: placeholderImage(`${dept.name} Activity`),
        description: `Sample gallery image for ${dept.name}.`,
      },
    ],

    members: Array.isArray(dept.members)
      ? dept.members.map((name) => ({
          name: String(name).trim(),
          role: "Member",
          imageUrl: memberImage(name),
          phone: "",
          email: "",
          bio: `${name} serves in the ${dept.name} department.`,
          socials: {
            instagram: "",
            facebook: "",
            linkedin: "",
            x: "",
            whatsapp: "",
          },
        }))
      : [],

    committee: Array.isArray(dept.committee)
      ? dept.committee.map((person) => ({
          role: String(person.role || "").trim(),
          name: String(person.name || "").trim(),
          imageUrl: committeeImage(person.name),
          phone: "",
          email: "",
        }))
      : [],

    plans: Array.isArray(dept.plans)
      ? dept.plans.map((item) => String(item).trim()).filter(Boolean)
      : [],

    actions: Array.isArray(dept.actions)
      ? dept.actions.map((item) => String(item).trim()).filter(Boolean)
      : [],

    comments: Array.isArray(dept.comments)
      ? dept.comments.map(normalizeComment)
      : [],

    joinRequests: [],
  };
};

const seedDepartments = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    console.log("Loaded .env from:", path.resolve(__dirname, "../../.env"));
    console.log("MONGO_URI found:", mongoUri ? "YES" : "NO");

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in your .env file");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const transformedDepartments = departments.map(buildDepartment);

    await Department.deleteMany({});
    console.log("Old departments removed");

    await Department.insertMany(transformedDepartments);
    console.log(`${transformedDepartments.length} departments seeded successfully`);

    console.log(
      transformedDepartments.map((d) => ({
        name: d.name,
        members: d.members.length,
        committee: d.committee.length,
        gallery: d.gallery.length,
      }))
    );

    await mongoose.disconnect();
    console.log("MongoDB disconnected");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
};

seedDepartments();