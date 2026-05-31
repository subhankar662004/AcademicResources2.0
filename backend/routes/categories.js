import express from "express";
import jwt from "jsonwebtoken";
import Category from "../models/Category.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "academic-hub-secret-key";

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const defaultCategories = [
  { name: "CSE", title: "Computer Science & Engineering" },
  { name: "SSC GD", title: "SSC GD Exam" },
  { name: "Agniveer", title: "Agniveer" },
  { name: "Railway", title: "Railway Exams" },
  { name: "WBP", title: "West Bengal Police" },
  { name: "Nursing", title: "Nursing" }
];

// Public: get all categories
router.get("/", async (req, res) => {
  try {
    let categories = await Category.find().sort({ createdAt: 1 });

    if (categories.length === 0) {
      categories = await Category.insertMany(defaultCategories);
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error: error.message });
  }
});

// Admin: add category
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { name, title } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exists = await Category.findOne({
      name: name.trim()
    });

    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
      title: title?.trim() || name.trim(),
      createdBy: req.userId
    });

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to create category", error: error.message });
  }
});

// Admin: delete category
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error: error.message });
  }
});

export default router;