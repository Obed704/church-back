import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/mongoConnect.js";
import DailyPreaching from "../models/Preaching.js";

/* Fix __dirname for ES modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Load env */
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedPreachings = async () => {
  try {
    /* CONNECT DATABASE */
    await connectDB();

    /* CLEAR COLLECTION */
    await DailyPreaching.deleteMany();

    /* SEED DATA */
    const preachings = [
      {
        day: "Sunday",
        date: new Date("2025-01-12"),
        preacher: "Pastor John",
        verses: ["John 3:16", "Romans 8:28"],
        description: "God’s love is unconditional and eternal.",

        likes: ["Romz", "Sonia", "Zhang"],
        favorites: ["Romz"],

        comments: [
          {
            user: "Romz",
            text: "This message really touched my heart.",
            replies: [
              {
                user: "Sonia",
                text: "Same here, it was powerful.",
              },
            ],
          },
          {
            user: "Zhang",
            text: "Faith gives strength in hard times.",
            replies: [],
          },
        ],
      },
      {
        day: "Wednesday",
        date: new Date("2025-01-15"),
        preacher: "Pastor David",
        verses: ["Psalm 23:1", "Proverbs 3:5"],
        description: "Trust in God even when the path is unclear.",

        likes: ["Sonia"],
        favorites: ["Sonia", "Romz"],

        comments: [
          {
            user: "Sonia",
            text: "Very encouraging preaching.",
            replies: [
              {
                user: "Romz",
                text: "Absolutely, I learned a lot.",
              },
            ],
          },
        ],
      },
    ];

    await DailyPreaching.insertMany(preachings);

    console.log("DailyPreaching data seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeder failed:", error);
    process.exit(1);
  }
};

seedPreachings();
