import express from 'express';
import Resource from '../models/Resource.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

/* Admin-only debug search — not for public use */
router.get('/resources/search', verifyAdmin, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    const decoded = decodeURIComponent(q.trim());
    const exactFileUrl = `/api/uploads/${decoded}`;
    const regex = new RegExp(decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const results = await Resource.find({
      $or: [
        { fileUrl: exactFileUrl },
        { fileUrl: { $regex: regex } },
        { fileName: { $regex: regex } }
      ]
    })
      .select('fileUrl fileName _id status contentType fileSize downloads createdAt')
      .limit(100)
      .lean();

    res.json({ count: results.length, results });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
