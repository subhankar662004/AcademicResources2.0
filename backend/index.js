import dotenv from 'dotenv';
dotenv.config();

import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./config/cloudinary.js";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import resourceRoutes from './routes/resources.js';
import folderRoutes from './routes/folders.js';
import messageRoutes from './routes/messages.js';
import pushRoutes from './routes/pushRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import adminTestRoutes from './routes/adminTestRoutes.js';
import testSubmissionRoutes from './routes/testSubmission.js';
import aiTestRoutes from "./routes/aiTestRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import adminBroadcastRoutes from "./routes/adminBroadcast.js";
import PushSubscription from './models/PushSubscription.js';
import categoryRoutes from "./routes/categories.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure VAPID for Web Push
// VAPID_SUBJECT from env takes priority so it matches the registered key pair
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || ('mailto:' + (process.env.EMAIL_USER || 'admin@academicrshub.com')),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");
    const ext = file.originalname.split('.').pop();
    const name = file.originalname.replace(/\.[^/.]+$/, "").replace(/\s+/g, "-");
    return {
      folder: "academic-resources",
      resource_type: isImage ? "image" : "raw",
      public_id: `${Date.now()}-${name}.${ext}`,
      flags: isImage ? [] : ["attachment"],
    };
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const { hostname } = new URL(origin);
      const isLocalhost =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.startsWith('10.') ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('172.');
      const isReplit = hostname.endsWith('.replit.dev') || hostname.endsWith('.repl.co') || hostname.endsWith('.replit.app');
      const isVercel = hostname.endsWith('.vercel.app');
      const isRender = hostname.endsWith('.onrender.com');
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
      const isFrontendUrl = (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) || allowedOrigins.includes(origin);
      if (isLocalhost || isReplit || isVercel || isRender || isFrontendUrl) return callback(null, true);
    } catch (_) {}
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes(upload));
app.use('/api/folders', folderRoutes);
app.use("/api/categories", categoryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin/tests', adminTestRoutes);
app.use('/api/testSubmission', testSubmissionRoutes);
app.use("/api/ai-tests", aiTestRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin/broadcast", adminBroadcastRoutes);

// Web Push — only delivery method
export const sendNotification = async (userId, message, url = null) => {
  try {
    const subs = await PushSubscription.find({ userId });
    if (subs.length === 0) {
      console.log(`[PUSH] No subscriptions for user ${userId}`);
      return;
    }
    const payload = JSON.stringify({
      title: 'Academic Resources Hub',
      body: message,
      url: url || '/',
      timestamp: Date.now(),
    });
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(s.subscription, payload).catch(async (err) => {
          // Clean up invalid/expired subscriptions (410 gone, 404 not found, 401 wrong key)
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403) {
            await PushSubscription.findByIdAndDelete(s._id);
          } else {
            console.error('[PUSH] Send error:', err.statusCode, err.message);
          }
        })
      )
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[PUSH] Sent to ${sent}/${subs.length} subscriptions for user ${userId}`);
  } catch (err) {
    console.error('[PUSH] sendNotification error:', err.message);
  }
};


// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const jwt = await import('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'academic-hub-secret-key');
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    const User     = (await import('./models/User.js')).default;
    const Resource = (await import('./models/Resource.js')).default;
    const Folder   = (await import('./models/Folder.js')).default;
    const Message  = (await import('./models/Message.js')).default;

    const [totalUsers, totalResources, pendingResources, approvedResources, rejectedResources,
           totalFolders, totalMessages, unreadMessages,
           students, teachers, admins] = await Promise.all([
      User.countDocuments(),
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'pending' }),
      Resource.countDocuments({ status: 'approved' }),
      Resource.countDocuments({ status: 'rejected' }),
      Folder.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ read: false }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    res.json({
      users: { total: totalUsers, students, teachers, admins },
      resources: { total: totalResources, pending: pendingResources, approved: approvedResources, rejected: rejectedResources },
      folders: totalFolders,
      messages: { total: totalMessages, unread: unreadMessages },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public — all platform-approved published tests (visible to all logged-in students)
app.get('/api/tests/published', async (req, res) => {
  try {
    const Test = (await import('./models/Test.js')).default;
    const tests = await Test.find({ publishStatus: 'approved' })
      .select('title description category subject duration teacherName teacherId shareCode createdAt')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/", (req, res) => res.send("Backend is Live 🚀"));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

const encodeMongoURI = (uri) => {
  if (!uri) return uri;
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return uri;
  const [, protocol, user, password, rest] = match;
  return protocol + encodeURIComponent(user) + ':' + encodeURIComponent(password) + '@' + rest;
};

// Health check — shows MongoDB connection state and env diagnostics
app.get('/api/health', (req, res) => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    db: states[dbState] || 'unknown',
    dbState,
    mongoUriSet: !!process.env.MONGO_URI,
    mongoUriPrefix: process.env.MONGO_URI ? process.env.MONGO_URI.slice(0, 20) + '…' : 'NOT SET',
    env: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// Start listening immediately so Render detects the port right away
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// Connect to MongoDB with retry logic for Render cold starts
const connectWithRetry = (retries = 5, delay = 3000) => {
  mongoose.connect(encodeMongoURI(process.env.MONGO_URI), {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error(`MongoDB connection error (retries left: ${retries}):`, err.message);
      if (retries > 0) {
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      } else {
        console.error('MongoDB connection failed after all retries.');
      }
    });
};
connectWithRetry();

export default app;
