import express from "express";
import fetch from "node-fetch";
import GeneratedTest from "../models/GeneratedTest.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ── In-memory rate limiter: 10 generations per user per hour ── */
const rateMap = new Map();
const RATE_LIMIT  = 10;
const RATE_WINDOW = 60 * 60 * 1000;
function checkRate(userId) {
  const now = Date.now();
  const e   = rateMap.get(userId);
  if (!e || now > e.resetAt) { rateMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

/* ── Extract a JSON array from raw AI text (handles preamble/markdown) ── */
function extractJson(raw) {
  const stripped = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const match = stripped.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) return JSON.parse(match[0]);
  return JSON.parse(stripped);
}

/* ── Admin: get all AI tests (with user names) ── */
router.get("/admin/all", verifyToken, async (req, res) => {
  if (req.userRole !== "admin") return res.status(403).json({ message: "Admin only" });
  try {
    const tests   = await GeneratedTest.find().sort({ createdAt: -1 }).limit(300);
    const userIds = [...new Set(tests.map(t => t.userId).filter(Boolean))];
    const users   = await User.find({ _id: { $in: userIds } }, "name email");
    const uMap    = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    res.json(tests.map(t => ({ ...t.toObject(), user: uMap[t.userId] || null })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Save generated MCQ (requires login) ── */
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { moduleName, questions, category, difficulty } = req.body;
    if (!moduleName || !questions?.length) {
      return res.status(400).json({ message: "moduleName and questions are required" });
    }
    const test = new GeneratedTest({
      userId: req.userId, moduleName, questions,
      category: category || "",
      difficulty: ["easy","medium","hard"].includes(difficulty) ? difficulty : "medium",
    });
    await test.save();
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Get single AI test (must own it or be admin) ── */
router.get("/test/:id", verifyToken, async (req, res) => {
  try {
    const test = await GeneratedTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    if (test.userId.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Get all AI tests for a user ── */
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    if (req.params.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const tests = await GeneratedTest.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Delete AI test (must own it or be admin) ── */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const test = await GeneratedTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    if (test.userId.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    await GeneratedTest.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Generate MCQs via AI ── */
router.post("/generate", verifyToken, async (req, res) => {
  try {
    const { moduleText, count, difficulty } = req.body;

    /* Input validation */
    if (!moduleText?.trim())
      return res.status(400).json({ message: "moduleText is required." });
    if (moduleText.trim().length < 80)
      return res.status(400).json({ message: "Text is too short. Paste at least 80 characters of study material." });

    /* Count validation */
    const validCount = Math.min(30, Math.max(5, Number(count) || 10));

    /* Rate limit */
    if (!checkRate(req.userId))
      return res.status(429).json({ message: "Too many requests. You can generate up to 10 times per hour." });

    /* Build prompt */
    const diffLine = difficulty ? `Difficulty: ${difficulty}.\n` : '';
    const prompt =
      `Generate exactly ${validCount} MCQ questions from the study text below.\n` +
      diffLine +
      `Rules:\n` +
      `- Return ONLY a valid JSON array. No markdown, no preamble, no explanation outside the JSON.\n` +
      `- Each "answer" must be the EXACT text of the correct option (not a letter like A/B/C/D).\n` +
      `Format:\n` +
      `[\n  {"question":"...","options":["option1","option2","option3","option4"],"answer":"exact text of correct option","explanation":"brief reason"}\n]\n\n` +
      `Study Text:\n${moduleText.slice(0, 12000)}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      const errMsg = data.error?.message || "AI service did not return a response.";
      return res.status(502).json({ message: errMsg });
    }

    let questions;
    try {
      questions = extractJson(data.choices[0].message.content);
    } catch {
      return res.status(502).json({ message: "AI returned an unreadable format. Please try again." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(502).json({ message: "AI could not produce questions from this text. Try adding more detail." });
    }

    /* Normalise: ensure answer matches an option (case-insensitive fallback) */
    const normalised = questions.map(q => {
      const opts = Array.isArray(q.options) ? q.options : [];
      let answer  = q.answer || '';
      const exact = opts.find(o => o === answer);
      if (!exact) {
        const ci = opts.find(o => o?.toLowerCase() === answer?.toLowerCase());
        if (ci) answer = ci;
        // if the AI returned a letter index (A/B/C/D) map it
        else if (/^[ABCD]$/i.test(answer.trim())) {
          const idx = 'ABCD'.indexOf(answer.trim().toUpperCase());
          if (idx >= 0 && opts[idx]) answer = opts[idx];
        }
      }
      return { question: q.question || '', options: opts, answer, explanation: q.explanation || '' };
    }).filter(q => q.question && q.options.length >= 2);

    res.json(normalised);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

export default router;
