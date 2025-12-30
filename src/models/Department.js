import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  replies: [ReplySchema],
}, { timestamps: true });

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  president: { type: String, required: true },
  est: { type: String },
  description: { type: String },
  members: [{ type: String }],
  committee: [{
    role: { type: String, required: true },
    name: { type: String, required: true },
  }],
  plans: [{ type: String }],
  actions: [{ type: String }],
  comments: [CommentSchema],
}, { timestamps: true });

export default mongoose.model("Department", DepartmentSchema, "departments");
