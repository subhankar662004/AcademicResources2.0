import express from "express";
import Question from "../models/Question.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const { question, options, answer, testId } = req.body;
    if (!question || !options || !answer || !testId) {
      return res.status(400).json({ message: "question, options, answer and testId are required" });
    }
    const q = new Question(req.body);
    await q.save();
    res.json(q);
  } catch (err) {
    res.status(500).json({ message: "Failed to add question", error: err.message });
  }
});

router.get("/", verifyAdmin, async (req, res) => {
  try {
    const data = await Question.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch questions", error: err.message });
  }
});

export default router;
