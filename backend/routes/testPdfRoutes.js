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
    const test = await Test.findById(req.params.testId).populate("teacherId", "name email");

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

   const userId = String(req.userId || req.user?.id || req.user?._id);
const userRole = req.userRole || req.user?.role;

const teacherOwnerId =
  test.teacherId?._id?.toString() || test.teacherId?.toString();

console.log("PDF AUTH CHECK:", {
  userId,
  userRole,
  testId: req.params.testId,
  testTeacherId: teacherOwnerId,
});

const isAdmin = userRole === "admin";

const isTeacherOwner =
  userRole === "teacher" &&
  teacherOwnerId === userId;

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
  margin: 30,
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
const createdByName =
  cleanText(test.teacherId?.name) ||
  cleanText(test.teacherName) ||
  "Admin";

const watermarkText = `Created by: ${createdByName}`;

const addWatermarkToCurrentPage = () => {
  const oldX = doc.x;
  const oldY = doc.y;

  doc.save();

  doc
    .font("BanglaFontBold")
    .fontSize(30)
    .fillColor("#64748b")
    .opacity(0.08)
    .rotate(-35, {
      origin: [doc.page.width / 2, doc.page.height / 2],
    })
    .text(watermarkText, 0, doc.page.height / 2 - 20, {
      width: doc.page.width,
      align: "center",
      lineBreak: false,
    });

  doc.restore();

  doc.opacity(1);
  doc.fillColor("black");
  doc.x = oldX;
  doc.y = oldY;
};
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
   doc.font("BanglaFontBold").fontSize(16);
writeLine("Academic Resources Hub", { align: "center" });

doc.moveDown(0.25);

doc.font("BanglaFontBold").fontSize(13);
writeText(cleanText(test.title) || "Untitled Test", { align: "center" });

doc.moveDown(0.5);

   const bengaliMode =
  hasBengali(test.title) ||
  hasBengali(test.category) ||
  questions.some(q =>
    hasBengali(q.question || q.title) ||
    hasBengali(q.answer) ||
    (q.options || []).some(o => hasBengali(o))
  );

doc.font("BanglaFont").fontSize(8.5);

if (bengaliMode) {
  writeLine(`বিভাগ: ${cleanText(test.category) || "সাধারণ"}`);
  writeLine(`বিষয়: ${cleanText(test.subject) || "প্রযোজ্য নয়"}`);
  writeLine(`সময়: ${toBanglaNumber(test.duration || 0)} মিনিট`);
 
  writeLine(`মোট প্রশ্ন: ${toBanglaNumber(questions.length)}`);
} else {
  doc.font("Helvetica").fontSize(8.5);
  doc.text(`Category: ${cleanText(test.category) || "General"}`);
  doc.text(`Subject: ${cleanText(test.subject) || "N/A"}`);
  doc.text(`Duration: ${test.duration || 0} minutes`);

  doc.text(`Total Questions: ${questions.length}`);
}

    doc.moveDown(0.3);
doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();
doc.moveDown(0.3);

    questions.forEach((q, index) => {
 if (doc.y > 760) {
  doc.addPage();
}

      const questionText =
        cleanText(q.question || q.title) || "Question not available";

     doc.font("BanglaFontBold").fontSize(9.5);

if (bengaliMode) {
  writeLine(`প্রশ্ন ${toBanglaNumber(index + 1)}. ${questionText}`);
} else {
  doc.font("Helvetica-Bold").fontSize(9.5);
  doc.text(`Q${index + 1}. ${questionText}`);
}

      doc.moveDown(0.15);

    const writeOptionsTwoColumn = (options = []) => {
  const startX = doc.x + 18;
  let y = doc.y;

  const colGap = 16;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 18 - colGap) / 2;

  for (let i = 0; i < options.length; i += 2) {
    if (y > 760) {
      doc.addPage();
      y = doc.y;
    }

    const leftOpt = cleanText(options[i]);
    const rightOpt = cleanText(options[i + 1]);

    const leftLetter = bengaliMode
      ? bnOptionLetters[i] || toBanglaNumber(i + 1)
      : String.fromCharCode(65 + i);

    const rightLetter = bengaliMode
      ? bnOptionLetters[i + 1] || toBanglaNumber(i + 2)
      : String.fromCharCode(65 + i + 1);

    const leftText = `${leftLetter}) ${leftOpt}`;
    const rightText = rightOpt ? `${rightLetter}) ${rightOpt}` : "";

    if (bengaliMode) {
      doc.font("BanglaFont").fontSize(9);
    } else {
      doc.font("Helvetica").fontSize(9);
    }

    doc.text(leftText, startX, y, {
      width: colWidth,
      features: [],
    });

    if (rightText) {
      if (bengaliMode) {
        doc.font("BanglaFont").fontSize(9);
      } else {
        doc.font("Helvetica").fontSize(9);
      }

      doc.text(rightText, startX + colWidth + colGap, y, {
        width: colWidth,
        features: [],
      });
    }

    const leftHeight = doc.heightOfString(leftText, {
      width: colWidth,
      features: [],
    });

    const rightHeight = rightText
      ? doc.heightOfString(rightText, {
          width: colWidth,
          features: [],
        })
      : 0;

    y += Math.max(leftHeight, rightHeight) + 2;
  }

  doc.x = doc.page.margins.left;
  doc.y = y;
};

writeOptionsTwoColumn(q.options || []);

      doc.moveDown(0.15);

      doc.font("BanglaFontBold").fontSize(9).fillColor("#059669");

if (bengaliMode) {
  writeLine(`উত্তর: ${cleanText(q.answer) || "প্রযোজ্য নয়"}`, { indent: 18 });
} else {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#059669");
  doc.text(`Answer: ${cleanText(q.answer) || "N/A"}`, { indent: 18 });
}

      doc.fillColor("black");
      doc.moveDown(0.25);
    });

    // Footer
   // Add watermark to every page after all content is written
const range = doc.bufferedPageRange();

for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);

  addWatermarkToCurrentPage();

  // Footer on every page - keep safely above bottom
  const oldX = doc.x;
  const oldY = doc.y;

  doc.font("BanglaFont").fontSize(7).fillColor("gray");
  doc.text("Generated by Academic Resources Hub", 30, 790, {
    width: 535,
    align: "center",
    lineBreak: false,
  });

  doc.fillColor("black");
  doc.x = oldX;
  doc.y = oldY;
}

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