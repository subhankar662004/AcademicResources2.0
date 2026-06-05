import express from "express";
import PDFDocument from "pdfkit";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import { verifyToken } from "../middleware/auth.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regularFont = path.join(__dirname, "../fonts/HindSiliguri-Regular.ttf");
const boldFont = path.join(__dirname, "../fonts/HindSiliguri-Bold.ttf");
const cleanText = (value) => {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/²/g, "^2")
.replace(/³/g, "^3")
.replace(/¹/g, "^1")
.replace(/⁰/g, "^0")
.replace(/⁴/g, "^4")
.replace(/⁵/g, "^5")
.replace(/⁶/g, "^6")
.replace(/⁷/g, "^7")
.replace(/⁸/g, "^8")
.replace(/⁹/g, "^9")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .replace(/[\uFFFC\uFFFD]/g, "")
    .replace(/[□■▪▫◻◼▯▮▢]/g, "")
    .replace(/\t/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const hasBengali = (value) => /[\u0980-\u09FF]/.test(String(value || ""));

const bnOptionLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

const toBanglaNumber = (num) => {
  return String(num).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
};

router.get("/:testId/download", verifyToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const userId = req.userId || req.user?.id || req.user?._id;
    const userRole = req.userRole || req.user?.role;

    console.log("PDF AUTH CHECK:", {
      userId,
      userRole,
      testId: req.params.testId,
      testTeacherId: test.teacherId?.toString(),
    });

    const isAdmin = userRole === "admin";

    const isTeacherOwner =
      userRole === "teacher" &&
      test.teacherId &&
      test.teacherId.toString() === userId;

    if (!isAdmin && !isTeacherOwner) {
      return res.status(403).json({
        message: "Only admin or test owner teacher can download this PDF",
      });
    }

    if (!fs.existsSync(regularFont)) {
      return res.status(500).json({
        message: "Regular font missing",
        path: regularFont,
      });
    }

    if (!fs.existsSync(boldFont)) {
      return res.status(500).json({
        message: "Bold font missing",
        path: boldFont,
      });
    }


    const questions = await Question.find({ testId: test._id });

    const safeTitle = cleanText(test.title || "test")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const doc = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.on("error", (error) => {
      console.error("PDF DOCUMENT ERROR:", error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to generate PDF",
          error: error.message,
        });
      }
    });

    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle || "test"}.pdf"`
      );

      res.send(pdfBuffer);
    });

   doc.registerFont("BanglaFont", regularFont);
doc.registerFont("BanglaFontBold", boldFont);

 const writeText = (text, options = {}) => {
  const value = cleanText(text);
  if (!value) return;

  doc.text(value, {
    ...options,
    features: [],
  });
};

const writeLine = (text, options = {}) => {
  writeText(text, options);
};

    // Header
   doc.font("BanglaFontBold").fontSize(20);
writeLine("Academic Resources Hub", { align: "center" });

    doc.moveDown(0.5);

doc.font("BanglaFontBold").fontSize(16);
writeText(cleanText(test.title) || "Untitled Test", { align: "center" });

    doc.moveDown();

   const bengaliMode =
  hasBengali(test.title) ||
  hasBengali(test.category) ||
  questions.some(q =>
    hasBengali(q.question || q.title) ||
    hasBengali(q.answer) ||
    (q.options || []).some(o => hasBengali(o))
  );

doc.font("BanglaFont").fontSize(10);

if (bengaliMode) {
  writeLine(`বিভাগ: ${cleanText(test.category) || "সাধারণ"}`);
  writeLine(`বিষয়: ${cleanText(test.subject) || "প্রযোজ্য নয়"}`);
  writeLine(`সময়: ${toBanglaNumber(test.duration || 0)} মিনিট`);
 
  writeLine(`মোট প্রশ্ন: ${toBanglaNumber(questions.length)}`);
} else {
  doc.font("Helvetica").fontSize(10);
  doc.text(`Category: ${cleanText(test.category) || "General"}`);
  doc.text(`Subject: ${cleanText(test.subject) || "N/A"}`);
  doc.text(`Duration: ${test.duration || 0} minutes`);

  doc.text(`Total Questions: ${questions.length}`);
}

    doc.moveDown();
    doc.moveTo(45, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    questions.forEach((q, index) => {
      if (doc.y > 720) {
        doc.addPage();
      }

      const questionText =
        cleanText(q.question || q.title) || "Question not available";

     doc.font("BanglaFontBold").fontSize(12);

if (bengaliMode) {
  writeLine(`প্রশ্ন ${toBanglaNumber(index + 1)}. ${questionText}`);
} else {
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(`Q${index + 1}. ${questionText}`);
}

      doc.moveDown(0.4);

      doc.font("BanglaFont").fontSize(11);

(q.options || []).forEach((opt, i) => {
  if (bengaliMode) {
    const letter = bnOptionLetters[i] || toBanglaNumber(i + 1);
    writeLine(`${letter}) ${cleanText(opt)}`, { indent: 18 });
  } else {
    const letter = String.fromCharCode(65 + i);
    doc.font("Helvetica").fontSize(11);
    doc.text(`${letter}) ${cleanText(opt)}`, { indent: 18 });
  }
});

      doc.moveDown(0.4);

      doc.font("BanglaFontBold").fontSize(10).fillColor("#059669");

if (bengaliMode) {
  writeLine(`উত্তর: ${cleanText(q.answer) || "প্রযোজ্য নয়"}`, { indent: 18 });
} else {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#059669");
  doc.text(`Answer: ${cleanText(q.answer) || "N/A"}`, { indent: 18 });
}

      doc.fillColor("black");
      doc.moveDown();
    });

    // Footer
   doc.font("BanglaFont").fontSize(9).fillColor("gray");
writeLine("Generated by Academic Resources Hub", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("PDF GENERATE ERROR:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to generate PDF",
        error: error.message,
      });
    }
  }
});

export default router;