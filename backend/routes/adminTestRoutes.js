import express from "express";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/auth.js";
import { sendNotification } from "../index.js";

const router = express.Router();

// Create new test — admin only
// Create new test — admin only
router.post("/create", verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subject,
      duration,
      startTime,
      endTime,
      allowMultipleAttempts,
      createdBy,
      isOfficial
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!category?.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    if (!duration) {
      return res.status(400).json({ message: "Duration is required" });
    }

    const test = new Test({
      title: title.trim(),
      description: description?.trim() || "",
      category: category.trim(),
      subject: subject?.trim() || "",
      duration: Number(duration),
      startTime: startTime || null,
      endTime: endTime || null,

      // Admin official create hole default one attempt
      allowMultipleAttempts: isOfficial
        ? false
        : (allowMultipleAttempts !== undefined ? allowMultipleAttempts : true),

      createdBy: createdBy || req.userId,

      // Admin direct official create
      publishStatus: isOfficial ? "approved" : "none",
      approvedAt: isOfficial ? new Date() : null,
      publishNote: "",
    });

    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create test",
      error: error.message
    });
  }
});

// Get all tests category-wise — public (students browse tests)
// Get tests category-wise
router.get("/", async (req, res) => {
  try {
    const query = {};

    if (req.query.category) {
      query.category = req.query.category;
    }

    // Practice page er jonno official tests hide
    if (req.query.type === "practice") {
      query.publishStatus = { $ne: "approved" };
    }

    // Official tests only
    if (req.query.type === "official") {
      query.publishStatus = "approved";
    }

    const tests = await Test.find(query).sort({
      approvedAt: -1,
      createdAt: -1
    });

    res.json(tests);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tests",
      error: error.message
    });
  }
});

// Update test — admin only
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subject,
      duration,
      startTime,
      endTime,
      allowMultipleAttempts,
      isOfficial
    } = req.body;

    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (title !== undefined) test.title = title.trim();
    if (description !== undefined) test.description = description?.trim() || "";
    if (category !== undefined) test.category = category?.trim() || test.category;
    if (subject !== undefined) test.subject = subject?.trim() || "";
    if (duration !== undefined) test.duration = Number(duration);
    if (startTime !== undefined) test.startTime = startTime || null;
    if (endTime !== undefined) test.endTime = endTime || null;

    if (allowMultipleAttempts !== undefined) {
      test.allowMultipleAttempts = allowMultipleAttempts;
    }

    // Admin official ON korle
    if (isOfficial === true) {
      test.publishStatus = "approved";
      test.approvedAt = new Date();
      test.publishNote = "";
      test.allowMultipleAttempts = false;
    }

    // Admin nijer direct official test practice korte chaile
    // Teacher approved test ke accidentally practice banabe na
    if (isOfficial === false && !test.teacherId) {
      test.publishStatus = "none";
      test.approvedAt = null;
      test.publishNote = "";
    }

    await test.save();

    res.json(test);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update test",
      error: error.message
    });
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
  {
    publishStatus: "approved",
    publishNote: "",
    approvedAt: new Date(),
    allowMultipleAttempts: false
  },
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

// Remove from official only — admin only
router.put("/:id/remove-official", verifyAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    test.publishStatus = "none";
    test.publishNote = "";
    test.approvedAt = null;

    await test.save();

    res.json({
      message: "Test removed from official section",
      test
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove official test",
      error: error.message
    });
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