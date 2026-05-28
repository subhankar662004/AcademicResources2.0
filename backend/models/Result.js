import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true
  },

  score: Number,
  total: Number,
  answers: Object,

  violations: [
    {
      reason: { type: String },
      at:     { type: Date },
    }
  ],

  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

resultSchema.index({ userId: 1, testId: 1 });

const Result = mongoose.model("Result", resultSchema);

export default Result;