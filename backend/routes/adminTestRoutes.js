import express from "express";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/auth.js";
import { sendNotification } from "../index.js";

const router = express.Router();

// Create new test — admin only
router.post("/create", verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, subject, duration, startTime, endTime, createdBy } = req.body;
    if (!title || !duration) return res.status(400).json({ message: "title and duration are required" });
    const test = new Test({
      title, description,
      category: category || "CSE",
      subject: subject || "",
      duration,
      startTime: startTime || null,
      endTime: endTime || null,
      createdBy: createdBy || req.userId,
    });
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to create test", error: error.message });
  }
});

// Get all tests category-wise — public (students browse tests)
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    const tests = await Test.find(query).sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tests", error: error.message });
  }
});

// Update test — admin only
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, subject, duration, startTime, endTime } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { title, description, category, subject, duration, startTime: startTime || null, endTime: endTime || null },
      { new: true }
    );
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to update test", error: error.message });
  }
});

// Add question to a test — admin only
router.post("/:testId/question", verifyAdmin, async (req, res) => {
  try {
    const question = new Question({ ...req.body, testId: req.params.testId });
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: "Failed to add question", error: error.message });
  }
});

// Get all questions of a test — answers hidden for students, full data for admins
router.get("/:testId/questions", async (req, res) => {
  try {
    let isAdmin = false;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const jwt = (await import("jsonwebtoken")).default;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "academic-hub-secret-key");
        isAdmin = decoded.role === "admin";
      } catch { /* invalid token — treat as public */ }
    }
    const select = isAdmin ? "" : "-answer -explanation";
    const questions = await Question.find({ testId: req.params.testId }).select(select);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch questions", error: error.message });
  }
});

// Delete a single question — admin only
router.delete("/:testId/questions/:questionId", verifyAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.questionId);
    res.json({ message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete question", error: error.message });
  }
});

// Edit a single question — admin only
router.put("/:testId/questions/:questionId", verifyAdmin, async (req, res) => {
  try {
    const { title, question, options, answer } = req.body;
    const q = await Question.findByIdAndUpdate(
      req.params.questionId,
      { title: title || question, options, answer },
      { new: true }
    );
    if (!q) return res.status(404).json({ message: "Question not found" });
    res.json(q);
  } catch (error) {
    res.status(500).json({ message: "Failed to update question", error: error.message });
  }
});

// Admin see results of a test — admin only
router.get("/:testId/results", verifyAdmin, async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .populate("userId", "name email")
      .populate("testId", "title category subject duration startTime endTime")
      .sort({ submittedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch results", error: error.message });
  }
});

// Get all teacher-created tests with teacher info + question counts — admin only
router.get("/teacher-all", verifyAdmin, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: { $exists: true, $ne: null } })
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });
    const counts = await Question.aggregate([
      { $group: { _id: "$testId", count: { $sum: 1 } } }
    ]);
    const qMap = Object.fromEntries(counts.map(r => [r._id.toString(), r.count]));
    res.json(tests.map(t => ({ ...t.toObject(), questionCount: qMap[t._id.toString()] || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all publish requests — admin only
router.get("/publish-requests", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { publishStatus: status } : { publishStatus: { $ne: 'none' } };
    const tests = await Test.find(query).populate("teacherId", "name email").sort({ updatedAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch publish requests", error: err.message });
  }
});

// Approve a publish request — admin only
router.put("/:id/publish-approve", verifyAdmin, async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { publishStatus: 'approved', publishNote: '' },
      { new: true }
    ).populate("teacherId", "name email");
    if (!test) return res.status(404).json({ message: "Test not found" });

    // Notify all students about the newly published test
    const students = await User.find({ role: "student" });
    const studentMsg = `📝 New test published: "${test.title}"`;
    students.forEach(s => {
      sendNotification(s._id.toString(), studentMsg, "/official-tests").catch(() => {});
    });

    // Notify the teacher their test was approved
    if (test.teacherId?._id) {
      sendNotification(
        test.teacherId._id.toString(),
        `✅ Your test "${test.title}" has been approved and published!`,
        "/teacher/tests"
      ).catch(() => {});
    }

    res.json(test);
  } catch (err) {
    res.status(500).json({ message: "Failed to approve", error: err.message });
  }
});

// Reject a publish request — admin only
router.put("/:id/publish-reject", verifyAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { publishStatus: 'rejected', publishNote: note || '' },
      { new: true }
    ).populate("teacherId", "name email");
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: "Failed to reject", error: err.message });
  }
});

// Delete test and all its data — admin only
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ testId: req.params.id });
    await Result.deleteMany({ testId: req.params.id });
    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete test", error: error.message });
  }
});

export default router;
