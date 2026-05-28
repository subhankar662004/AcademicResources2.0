import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test"
  },
  title:       String,
  question:    String,
  options:     [String],
  answer:      String,
  explanation: { type: String, default: "" },
});

const Question = mongoose.model("Question", questionSchema);

export default Question;