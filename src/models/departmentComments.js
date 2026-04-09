import mongoose from "mongoose";

const DepartmentCommentSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the department
    ref: "Department",
    required: true,
  },
  name: { type: String, required: true },      // Name of the person commenting
  email: { type: String },                      // Optional email
  text: { type: String, required: true },      // Comment text
  createdAt: { type: Date, default: Date.now },// Timestamp
  updatedAt: { type: Date },                   // Optional update timestamp
  replies: [
    {
      name: { type: String, required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model("DepartmentComment", DepartmentCommentSchema);
