import mongoose from "mongoose";
import crypto from "crypto";

const testSchema = new mongoose.Schema({
  title: String,
  description: String,

  category: {
    type: String,
    default: "General",
    trim: true
  },

  subject: {
    type: String,
    default: "",
    trim: true
  },

  duration: Number, // minutes

  // Optional scheduled test window
  startTime: { type: Date, default: null },
  endTime:   { type: Date, default: null },

  // Creator info
  createdBy:   String,           // legacy string ID
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  teacherName: { type: String,   default: "" },

  // Sharing
  shareCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(5).toString("hex"), // 10-char hex
  },
  isPublic: { type: Boolean, default: true },

  // Teacher publish request system
  publishStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  publishNote: { type: String, default: '' }, // admin's rejection reason
}, {
  timestamps: true
});

testSchema.index({ category: 1, createdAt: -1 });
testSchema.index({ startTime: 1, endTime: 1 });

const Test = mongoose.model("Test", testSchema);

export default Test;