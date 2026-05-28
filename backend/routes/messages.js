import express from 'express';
import Message from '../models/Message.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Submit contact message (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Name, email and message are required' });
    }
    if (name.trim().length > 100)    return res.status(400).json({ message: 'Name too long (max 100 chars)' });
    if (email.trim().length > 200)   return res.status(400).json({ message: 'Email too long' });
    if (subject && subject.trim().length > 200) return res.status(400).json({ message: 'Subject too long (max 200 chars)' });
    if (message.trim().length > 5000) return res.status(400).json({ message: 'Message too long (max 5000 chars)' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const newMessage = new Message({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || '',
      message: message.trim(),
    });

    await newMessage.save();

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all messages (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count (admin only)
router.get('/unread-count', verifyAdmin, async (req, res) => {
  try {
    const count = await Message.countDocuments({ read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark ALL messages as read (admin only)
router.put('/read-all', verifyAdmin, async (req, res) => {
  try {
    await Message.updateMany({ read: false }, { read: true });
    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark message as read (admin only)
router.put('/:id/read', verifyAdmin, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete message (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
