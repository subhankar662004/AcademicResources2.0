import express from "express";
import Result from "../models/Result.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/submit/:testId", verifyToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body;
    const userId = req.userId;

    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const now = new Date();

    const isScheduledTest = test.startTime && test.endTime;

    if (isScheduledTest) {
      if (now < new Date(test.startTime)) {
        return res.status(403).json({
          message: "This test has not started yet"
        });
      }

      if (now > new Date(test.endTime)) {
        return res.status(403).json({
          message: "This test has ended"
        });
      }

      const previousResult = await Result.findOne({
        userId,
        testId
      });

      if (previousResult) {
        return res.status(409).json({
          message: "You have already attempted this scheduled test"
        });
      }
    }

    const questions = await Question.find({ testId });

    let score = 0;

    questions.forEach(q => {
      if (answers[q._id.toString()] === q.answer) {
        score++;
      }
    });

    const result = new Result({
      userId,
      testId,
      score,
      total: questions.length,
      answers
    });

    await result.save();

    res.json({
      score,
      total: questions.length,
      resultId: result._id
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to submit test",
      error: error.message
    });
  }
});

// User's own attempted tests
router.get("/my-results/:userId", verifyToken, async (req, res) => {
  try {
    if (req.params.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const results = await Result.find({ userId: req.params.userId })
      .populate("testId", "title category subject startTime endTime duration")
      .sort({ submittedAt: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user results",
      error: error.message
    });
  }
});

// Admin can see results of a test
router.get("/results/:testId", verifyAdmin, async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .populate("userId", "name email")
      .populate("testId", "title category subject duration startTime endTime")
      .sort({ submittedAt: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch test results",
      error: error.message
    });
  }
});

export default router;