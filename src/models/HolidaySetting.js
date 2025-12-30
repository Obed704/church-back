import mongoose from "mongoose";

const socialLinkSchema = new mongoose.Schema({
  icon: String,
  label: String,
  href: String,
  color: String,
  hoverColor: String,
  hoverText: String,
});

const tabSchema = new mongoose.Schema({
  key: String,
  label: String,
  content: String,
});

const featureSchema = new mongoose.Schema({
  label: String,
  color: String,
});

const bibleVerseSchema = new mongoose.Schema({
  text: String,
  reference: String,
});

const holidaySettingsSchema = new mongoose.Schema(
  {
    season: String,
    title: String,
    description: String,
    spiritualTitle: String,
    spiritualDescription: String,
    bibleVerse: bibleVerseSchema,
    socialLinks: [socialLinkSchema],
    tabs: [tabSchema],
    features: [featureSchema],
    successMessage: String,
    joinButtonText: String,
    processingText: String,
    loginRequiredText: String,
    welcomeText: String,
    readyText: String,
    participantsLabel: String,
    liveSessionText: String,
    startsIn: String,
    whatsappNote: String,
    history: [
      {
        type: mongoose.Schema.Types.Mixed, // store old version as a JSON object
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const HolidaySettings = mongoose.model(
  "HolidaySettings",
  holidaySettingsSchema
);

export default HolidaySettings;
