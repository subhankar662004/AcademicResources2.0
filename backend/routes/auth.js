import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../config/mailer.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-secret-key';
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const rateLimit = (key, maxRequests = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count += 1;
  rateLimitMap.set(key, entry);
  return entry.count > maxRequests;
};

// POST /api/auth/send-otp — send OTP before registration
router.post('/send-otp', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (rateLimit(`otp:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many OTP requests. Please wait 15 minutes.' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const allowedRoles = ['student', 'teacher'];
    const userRole = allowedRoles.includes(role) ? role : 'student';

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOTP();

    await OTP.findOneAndDelete({ email: email.toLowerCase().trim() });
    await OTP.create({ email: email.toLowerCase().trim(), otp, name, password, role: userRole });

    await sendOTPEmail(email, otp, name);
    console.log(`[OTP SUCCESS] Email sent to ${email}`);
    res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// POST /api/auth/verify-otp — verify OTP and complete registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const record = await OTP.findOne({ email: email.toLowerCase().trim() });

    if (!record) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({ name: record.name, email: record.email, password: record.password, role: record.role || 'student' });
    await user.save();

    await OTP.findOneAndDelete({ email: email.toLowerCase().trim() });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/google — sign in or register with Google
router.post('/google', async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ message: 'Google Sign-In is not configured on this server.' });
    }
    const { credential, role } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    let isNewUser = false;

    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      }
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      isNewUser = true;
      user = new User({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        role: 'student',
        password: crypto.randomBytes(32).toString('hex'),
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      isNewUser,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.', error: err.message });
  }
});

// POST /api/auth/complete-onboarding — called after Google sign-in setup screen
router.post('/complete-onboarding', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, JWT_SECRET);

    const { name, role, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name.trim();
    // Only allow role change if the account was very recently created (within 10 minutes)
    // so only genuine first-time Google onboarding can set the role.
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    if (ageMs < 10 * 60 * 1000) {
      const allowedRoles = ['student', 'teacher'];
      if (allowedRoles.includes(role)) user.role = role;
    }
    if (password && password.length >= 6) {
      user.password = password;
    }
    await user.save();

    const newToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token: newToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio },
    });
  } catch (err) {
    res.status(401).json({ message: 'Failed to complete setup', error: err.message });
  }
});

// POST /api/auth/register — disabled, use /send-otp + /verify-otp instead
router.post('/register', (req, res) => {
  res.status(410).json({ message: 'Direct registration is disabled. Please use email OTP verification at /api/auth/send-otp.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many login attempts. Please wait 15 minutes.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    const bcrypt = await import('bcryptjs');
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google Sign-In. Please use the "Continue with Google" button.' });
    }

    const isMatch = await bcrypt.default.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Too many requests. Please wait 15 minutes.' });
    }

    // Always respond OK to avoid user enumeration
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.findOneAndDelete({ email: user.email });
    await PasswordResetToken.create({ email: user.email, token });

    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${origin}/#/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const record = await PasswordResetToken.findOne({ token });
    if (!record || record.expiresAt < new Date()) {
      await PasswordResetToken.findOneAndDelete({ token });
      return res.status(400).json({ message: 'This reset link has expired or is invalid. Please request a new one.' });
    }

    const user = await User.findOne({ email: record.email });
    if (!user) return res.status(404).json({ message: 'Account not found' });

    user.password = password;
    await user.save();
    await PasswordResetToken.findOneAndDelete({ token });

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
