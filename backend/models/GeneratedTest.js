import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question:    { type: String, required: true },
  options:     [String],
  answer:      String,
  explanation: String,
});

const generatedTestSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  moduleName: { type: String, default: "AI Practice Set" },
  category:   { type: String, default: "" },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  questions:  [questionSchema],
}, { timestamps: true });

export default mongoose.model("GeneratedTest", generatedTestSchema);
