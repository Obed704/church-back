import mongoose from "mongoose";
import dotenv from "dotenv";
import HolidayParticipant from "../models/HolidayParticipants.js";
import User from "../models/User.js";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");

    // Clear old data
    await HolidayParticipant.deleteMany();

    // Optional: fetch a user to assign participants
    const user = await User.findOne();

    const participants = [
      { name: "Alice Johnson", phone: "123-456-7890", user: user?._id },
      { name: "Bob Smith", phone: "987-654-3210", user: user?._id },
      { name: "Charlie Davis", phone: "555-666-7777", user: user?._id },
    ];

    await HolidayParticipant.insertMany(participants);
    console.log("Seeder finished!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
