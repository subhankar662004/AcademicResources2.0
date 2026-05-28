import express from "express";
import jwt from "jsonwebtoken";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { sendResultEmail } from "../config/mailer.js";
import { sendNotification } from "../index.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "academic-hub-secret-key";

/* ── Auth: teacher or admin ── */
const verifyTeacher = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || (user.role !== "teacher" && user.role !== "admin"))
      return res.status(403).json({ message: "Teacher access required" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ══ GET /api/teacher/tests — my tests ══ */
router.get("/tests", verifyTeacher, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user._id }).sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ GET /api/teacher/tests/submission-counts — count per test ══ */
router.get("/tests/submission-counts", verifyTeacher, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user._id }, "_id");
    const ids = tests.map(t => t._id);
    const counts = await Result.aggregate([
      { $match: { testId: { $in: ids } } },
      { $group: { _id: "$testId", count: { $sum: 1 } } },
    ]);
    const map = {};
    counts.forEach(c => { map[c._id.toString()] = c.count; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ POST /api/teacher/tests — create test ══ */
router.post("/tests", verifyTeacher, async (req, res) => {
  try {
    const { title, description, category, subject, duration, startTime, endTime } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!duration)      return res.status(400).json({ message: "Duration is required" });

    const test = new Test({
      title: title.trim(),
      description: description?.trim() || "",
      category: category?.trim() || "General",
      subject:  subject?.trim()   || "",
      duration: Number(duration),
      startTime: startTime || null,
      endTime:   endTime   || null,
      teacherId:   req.user._id,
      teacherName: req.user.name,
      createdBy:   req.user._id.toString(),
    });
    await test.save();
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ message: "Failed to create test", error: err.message });
  }
});

/* ══ PUT /api/teacher/tests/:id — update ══ */
router.put("/tests/:id", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });

    const { title, description, category, subject, duration, startTime, endTime } = req.body;
    Object.assign(test, {
      title:       title?.trim() || test.title,
      description: description?.trim() ?? test.description,
      category:    category?.trim() || test.category,
      subject:     subject?.trim()  || test.subject,
      duration:    duration ? Number(duration) : test.duration,
      startTime:   startTime || null,
      endTime:     endTime   || null,
    });
    await test.save();
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: "Failed to update test", error: err.message });
  }
});

/* ══ DELETE /api/teacher/tests/:id ══ */
router.delete("/tests/:id", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });
    await Question.deleteMany({ testId: req.params.id });
    await Result.deleteMany({ testId: req.params.id });
    res.json({ message: "Test deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete test", error: err.message });
  }
});

/* ══ POST /api/teacher/tests/:id/questions — add question ══ */
router.post("/tests/:id/questions", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });

    const { question, options, answer, explanation } = req.body;
    if (!question || !options || !answer)
      return res.status(400).json({ message: "Question, options and answer are required" });

    const q = new Question({
      testId: req.params.id,
      question: question.trim(),
      options,
      answer: answer.trim(),
      explanation: explanation?.trim() || "",
    });
    await q.save();
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ message: "Failed to add question", error: err.message });
  }
});

/* ══ GET /api/teacher/tests/:id/questions ══ */
router.get("/tests/:id/questions", verifyTeacher, async (req, res) => {
  try {
    const qs = await Question.find({ testId: req.params.id });
    res.json(qs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch questions", error: err.message });
  }
});

/* ══ POST /api/teacher/tests/:id/questions/bulk — bulk upload from text ══ */
router.post("/tests/:id/questions/bulk", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "No text provided" });

    /* ── parse MCQ blocks ──
       Supported formats:
       1. Question text?        or   Q1. ...   or   1) ...
       A) option               or   A. option  or   a) option
       B) option
       C) option
       D) option
       Answer: A               or   Ans: A     or   Correct: A  or   Correct Answer: A
    */
    const blocks = text.trim().split(/\n{2,}/); // split by blank lines
    const parsed = [];
    const errors = [];

    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 3) continue;

      // First line is the question (strip leading numbering)
      const qLine = lines[0].replace(/^(Q\d+[\.\)]\s*|\d+[\.\)]\s*)/, '').trim();

      // Collect option lines: A) B) C) D) or A. B. C. D.
      const optLines = lines.slice(1).filter(l => /^[A-Da-d][\.\)]\s+/.test(l));
      const ansLine  = lines.find(l => /^(ans(wer)?|correct(\s+answer)?)\s*[:=]/i.test(l));

      if (!qLine || optLines.length < 2 || !ansLine) {
        errors.push(`Block ${i + 1}: skipped (incomplete — need question, ≥2 options, answer line)`);
        continue;
      }

      const options = optLines.map(l => l.replace(/^[A-Da-d][\.\)]\s+/, '').trim());
      // Extract answer letter/text
      const rawAns = ansLine.replace(/^(ans(wer)?|correct(\s+answer)?)\s*[:=]\s*/i, '').trim();
      // rawAns could be "A", "a", "Option text", etc.
      let answer = rawAns;
      if (/^[A-Da-d]$/.test(rawAns)) {
        // It's a letter — map to option text
        const idx = rawAns.toUpperCase().charCodeAt(0) - 65;
        if (options[idx]) answer = options[idx];
      }

      if (!options.includes(answer)) {
        errors.push(`Block ${i + 1}: answer "${answer}" not found in options — skipped`);
        continue;
      }

      parsed.push({ testId: req.params.id, question: qLine, options, answer });
    }

    if (parsed.length === 0) {
      return res.status(400).json({ message: "No valid questions found", errors });
    }

    const inserted = await Question.insertMany(parsed);
    res.status(201).json({ inserted: inserted.length, skipped: errors.length, errors, questions: inserted });
  } catch (err) {
    res.status(500).json({ message: "Bulk upload failed", error: err.message });
  }
});

/* ══ PUT /api/teacher/questions/:qid — edit question ══ */
router.put("/questions/:qid", verifyTeacher, async (req, res) => {
  try {
    const { question, options, answer, explanation } = req.body;
    const q = await Question.findByIdAndUpdate(
      req.params.qid,
      { question: question?.trim(), options, answer: answer?.trim(), explanation: explanation?.trim() || "" },
      { new: true }
    );
    if (!q) return res.status(404).json({ message: "Question not found" });
    res.json(q);
  } catch (err) {
    res.status(500).json({ message: "Failed to update question", error: err.message });
  }
});

/* ══ DELETE /api/teacher/questions/:qid ══ */
router.delete("/questions/:qid", verifyTeacher, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.qid);
    res.json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete question", error: err.message });
  }
});

/* ══ POST /api/teacher/tests/:id/duplicate ══ */
router.post("/tests/:id/duplicate", verifyTeacher, async (req, res) => {
  try {
    const src = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!src) return res.status(404).json({ message: "Test not found" });

    const copy = new Test({
      title:       `${src.title} (Copy)`,
      description: src.description,
      category:    src.category,
      subject:     src.subject,
      duration:    src.duration,
      startTime:   null,
      endTime:     null,
      teacherId:   req.user._id,
      teacherName: req.user.name,
      createdBy:   req.user._id.toString(),
      publishStatus: 'none',
    });
    await copy.save();

    const srcQs = await Question.find({ testId: src._id });
    if (srcQs.length > 0) {
      await Question.insertMany(srcQs.map(q => ({
        testId:      copy._id,
        question:    q.question,
        options:     q.options,
        answer:      q.answer,
        explanation: q.explanation || "",
      })));
    }
    res.status(201).json({ test: copy, questionsCopied: srcQs.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to duplicate", error: err.message });
  }
});

/* ══ GET /api/teacher/tests/:id/results — student results ══ */
router.get("/tests/:id/results", verifyTeacher, async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.id })
      .populate("userId", "name email avatar role")
      .sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch results", error: err.message });
  }
});

/* ══ GET /api/teacher/share/:shareCode/my-result?userId=xxx — check if user already submitted ══ */
router.get("/share/:shareCode/my-result", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const test = await Test.findOne({ shareCode: req.params.shareCode, isPublic: true });
    if (!test) return res.status(404).json({ message: "Test not found" });
    const existing = await Result.findOne({ userId, testId: test._id });
    if (!existing) return res.json({ alreadySubmitted: false });
    const pct = existing.total ? Math.round((existing.score / existing.total) * 100) : 0;
    res.json({
      alreadySubmitted: true,
      result: {
        score: existing.score,
        total: existing.total,
        pct,
        submittedAt: existing.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ GET /api/teacher/share/:shareCode/review — answers visible only after test ends ══ */
router.get("/share/:shareCode/review", async (req, res) => {
  try {
    const test = await Test.findOne({ shareCode: req.params.shareCode, isPublic: true });
    if (!test) return res.status(404).json({ message: "Test not found or not public" });
    if (!test.endTime || new Date() <= new Date(test.endTime))
      return res.status(403).json({ message: "Answers are only available after the test ends" });
    const questions = await Question.find({ testId: test._id });
    res.json({ test, questions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ GET /api/teacher/share/:shareCode — public, no auth ══ */
router.get("/share/:shareCode", async (req, res) => {
  try {
    const test = await Test.findOne({ shareCode: req.params.shareCode, isPublic: true });
    if (!test) return res.status(404).json({ message: "Test not found or not public" });
    const questions = await Question.find({ testId: test._id }).select("-answer -explanation");
    res.json({ test, questions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ GET /api/teacher/take/:testId — student take by ID, no auth ══ */
router.get("/take/:testId", async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ testId: test._id }).select("-answer -explanation");
    res.json({ test, questions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══ POST /api/teacher/take/:testId/submit ══ */
router.post("/take/:testId/submit", async (req, res) => {
  try {
    const { answers, userName, violations } = req.body;
    let userId = req.body.userId;

    // If a valid token is present, always use the token's userId —
    // prevents a logged-in user from submitting on behalf of someone else.
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "academic-hub-secret-key");
        userId = decoded.id;
      } catch { /* token invalid or expired — fall back to body userId */ }
    }

    if (!userId) return res.status(400).json({ message: "User ID required" });

    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    /* Time window check */
    const now = new Date();
    if (test.startTime && now < new Date(test.startTime))
      return res.status(403).json({ message: "This test has not started yet" });
    if (test.endTime && now > new Date(test.endTime))
      return res.status(403).json({ message: "This test has ended" });

    /* Duplicate check */
    const existing = await Result.findOne({ userId, testId: test._id });
    if (existing) return res.status(409).json({ message: "You have already submitted this test" });

    const questions = await Question.find({ testId: test._id });
    let score = 0;
    const detailedAnswers = {};

    questions.forEach(q => {
      const given = answers[q._id.toString()];
      const correct = given === q.answer;
      if (correct) score++;
      detailedAnswers[q._id.toString()] = { given, correct, correctAnswer: q.answer, explanation: q.explanation || "" };
    });

    const result = new Result({
      userId,
      testId: test._id,
      score,
      total: questions.length,
      answers,
      violations: Array.isArray(violations)
        ? violations.map(v => ({ reason: v.reason || '', at: v.at ? new Date(v.at) : new Date() }))
        : [],
    });
    await result.save();

    // Respond to student immediately — don't wait for notifications
    res.json({
      score,
      total: questions.length,
      pct: questions.length ? Math.round((score / questions.length) * 100) : 0,
      detailedAnswers,
      resultId: result._id,
    });

    // Notify teacher in background (non-blocking)
    if (test.teacherId) {
      try {
        const teacher = await User.findById(test.teacherId).select("name email");
        if (teacher) {
          const studentName = userName || "A student";
          const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
          const pushMsg = `📋 ${studentName} submitted "${test.title}" — ${score}/${questions.length} (${pct}%)`;

          // Push notification (in-app)
          sendNotification(test.teacherId.toString(), pushMsg, "/teacher/tests").catch(() => {});

          // Email notification
          if (teacher.email) {
            sendResultEmail(
              teacher.email,
              teacher.name,
              studentName,
              test.title,
              score,
              questions.length
            ).catch(() => {});
          }
        }
      } catch {
        // Notification failure must never affect the student's submission
      }
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to submit", error: err.message });
  }
});

/* ══ POST /api/teacher/tests/:id/publish-request ══ */
router.post("/tests/:id/publish-request", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });
    if (test.publishStatus === 'approved') return res.status(400).json({ message: "Already published" });
    if (test.publishStatus === 'pending')  return res.status(400).json({ message: "Request already pending" });
    test.publishStatus = 'pending';
    test.publishNote   = '';
    await test.save();
    res.json({ message: "Publish request sent to admin", publishStatus: 'pending' });
  } catch (err) {
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
});

/* ══ DELETE /api/teacher/tests/:id/publish-request — cancel pending request ══ */
router.delete("/tests/:id/publish-request", verifyTeacher, async (req, res) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!test) return res.status(404).json({ message: "Test not found" });
    if (test.publishStatus !== 'pending') return res.status(400).json({ message: "No pending request" });
    test.publishStatus = 'none';
    await test.save();
    res.json({ message: "Request cancelled", publishStatus: 'none' });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel", error: err.message });
  }
});

export default router;
