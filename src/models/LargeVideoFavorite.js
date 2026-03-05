import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "LargeVideo", required: true, index: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("LargeVideoFavorite", favoriteSchema);