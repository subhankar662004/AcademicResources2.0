import express from 'express';
import jwt from 'jsonwebtoken';
import Resource from '../models/Resource.js';
import Folder from '../models/Folder.js';
import { sendNotification } from "../index.js";
import User from "../models/User.js";
const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-secret-key';

// Middleware to verify token
const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    console.error('verifyToken error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default (upload) => {
  const router = express.Router();

  // Get all approved resources (public)
  router.get('/', async (req, res) => {
    try {
      const { search, folder, category } = req.query;
let query = { status: 'approved' };

if (category) {
  query.category = category;
}

      if (folder) {
        query.folder = folder;
      }

      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      const resources = await Resource.find(query)
        .populate('uploadedBy', 'name')
        .populate('folder', 'name')
        .sort({ createdAt: -1 });

      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get user's own resources
  router.get('/my-resources', verifyToken, async (req, res) => {
    try {
      const resources = await Resource.find({ uploadedBy: req.userId })
        .populate('folder', 'name')
        .sort({ createdAt: -1 });

      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get pending resources (admin only)
  router.get('/pending', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const resources = await Resource.find({ status: 'pending' })
        .populate('uploadedBy', 'name email')
        .populate('folder', 'name')
        .sort({ createdAt: -1 });

      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get all resources (admin only)
  router.get('/all', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const resources = await Resource.find()
        .populate('uploadedBy', 'name email')
        .populate('folder', 'name')
        .sort({ createdAt: -1 });

      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Upload new resource
  router.post('/', verifyToken, upload.single('file'), async (req, res) => {
    try {
     const { title, description, folder, category } = req.body;

      // Validate required fields
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }
      if (!category || !category.trim()) {
  return res.status(400).json({ message: 'Category is required' });
}

      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      // Check if folder exists (if provided)
      if (folder) {
        const folderExists = await Folder.findById(folder);
        if (!folderExists) {
          return res.status(404).json({ message: 'Folder not found' });
        }
      }

      const fileName = req.file.originalname;
      let cloudinaryId = req.file.filename;
      if (cloudinaryId && cloudinaryId.includes('.')) {
        cloudinaryId = cloudinaryId.split('.').slice(0, -1).join('.');
      }
      const fileUrl = req.file.path;
      const fileType = req.file.mimetype;
      const fileSize = req.file.size;

     const resource = new Resource({
  title: title.trim(),
  description: description || '',
  fileUrl,
  cloudinaryId,
  fileName,
  fileType,
  fileSize,
  category: category.trim(),
  folder: folder || null,
  uploadedBy: req.userId,
  status: req.userRole === 'admin' ? 'approved' : 'pending'
});

      if (req.userRole === 'admin') {
        resource.approvedBy = req.userId;
        resource.approvedAt = new Date();
      }

      await resource.save();

      const admins = await User.find({ role: "admin" });
      admins.forEach(admin => {
        sendNotification(admin._id.toString(), "New resource uploaded 📚");
      });

      // If admin uploads, it's auto-approved — notify all students immediately
      if (req.userRole === 'admin') {
        const students = await User.find({ role: "student" });
        const msg = `📚 New resource available: "${title.trim()}"`;
        students.forEach(s => {
          sendNotification(s._id.toString(), msg, "/resources");
        });
      }

      // Update folder resource count if folder is provided
      if (folder) {
        await Folder.findByIdAndUpdate(folder, { $inc: { resourceCount: 1 } });
      }

      res.status(201).json(resource);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Download route - must be defined BEFORE other routes with :id parameter
router.get("/download/:id", async (req, res) => {
  try {

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    let downloadUrl = resource.fileUrl;

    if (resource.fileType.startsWith("image/")) {
      downloadUrl = downloadUrl.replace(
        "/image/upload/",
        "/image/upload/fl_attachment/"
      );
    } else {
      downloadUrl = downloadUrl.replace(
        "/raw/upload/",
        "/raw/upload/fl_attachment/"
      );
    }

    return res.json({ url: downloadUrl });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

  // Edit resource metadata (admin only)
  router.put('/:id', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const { title, description, folder, category, status } = req.body;
      const updates = {};
      if (title       !== undefined) updates.title       = String(title).trim();
      if (description !== undefined) updates.description = String(description).trim();
      if (folder      !== undefined) updates.folder      = folder || null;
      if (category    !== undefined) updates.category    = String(category).trim();
      if (status !== undefined && ['pending','approved','rejected'].includes(status)) updates.status = status;
      const resource = await Resource.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate('uploadedBy', 'name email').populate('folder', 'name');
      if (!resource) return res.status(404).json({ message: 'Resource not found' });
      res.json(resource);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Approve resource (admin only)
  router.put('/:id/approve', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const resource = await Resource.findByIdAndUpdate(
        req.params.id,
        {
          status: 'approved',
          approvedBy: req.userId,
          approvedAt: new Date()
        },
        { new: true }
      ).populate('uploadedBy', 'name email');

     if (!resource) {
  return res.status(404).json({ message: 'Resource not found' });
}

// Notify the uploader
sendNotification(resource.uploadedBy._id.toString(), "Your resource has been approved 🎉");

// Notify all students that a new resource is available
const students = await User.find({ role: "student" });
const studentMsg = `📚 New resource available: "${resource.title}"`;
students.forEach(s => {
  sendNotification(s._id.toString(), studentMsg, "/resources").catch(() => {});
});

res.json(resource);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Reject resource (admin only)
  router.put('/:id/reject', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const resource = await Resource.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected' },
        { new: true }
      ).populate('uploadedBy', 'name email');

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      sendNotification(resource.uploadedBy._id.toString(), "Your resource was rejected ❌");

      res.json(resource);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Delete resource (admin only)
  router.delete('/:id', verifyToken, async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const resource = await Resource.findByIdAndDelete(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Update folder resource count if folder exists
      if (resource.folder) {
        await Folder.findByIdAndUpdate(resource.folder, { $inc: { resourceCount: -1 } });
      }

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};