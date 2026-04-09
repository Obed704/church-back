import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    if (!uri) throw new Error("MONGO_URI is not defined");

    // Helpful (doesn't print password)
    console.log(
      "MONGO host:",
      uri.replace(/\/\/.*?:.*?@/, "//<user>:<pass>@")
    );

    await mongoose.connect(uri, {
      dbName: "church",
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed (FULL):");
    console.error(error); // prints full stack + underlying cause

    // Also print common fields (easy to read)
    console.error("message:", error?.message);
    console.error("name:", error?.name);
    console.error("code:", error?.code);
    console.error("cause:", error?.cause);
if (error?.cause?.servers) {
  console.error("---- Per-host errors ----");
  for (const [addr, desc] of error.cause.servers) {
    console.error(addr, desc?.error?.message || desc?.error);
  }
}
    process.exit(1);
  }
};

export default connectDB;