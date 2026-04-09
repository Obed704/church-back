import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["MTN", "AIRTEL"], required: true },
  auth_req_id: { type: String },
  transactionId: { type: String },
  status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Donation", donationSchema);
