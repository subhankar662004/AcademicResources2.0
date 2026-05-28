import express from 'express';
import jwt from 'jsonwebtoken';
import { sendNotification } from '../index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-secret-key';

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// POST /api/notifications/test — send a test notification to yourself
router.post('/test', verifyToken, async (req, res) => {
  try {
    const message = req.body.message || '🔔 This is a test notification from Academic Resources Hub!';
    await sendNotification(req.userId, message);
    res.json({ message: 'Test notification sent', userId: req.userId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
});

export default router;
