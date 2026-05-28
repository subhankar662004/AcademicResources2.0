import express from 'express';
import webpush from 'web-push';
import jwt from 'jsonwebtoken';
import PushSubscription from '../models/PushSubscription.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'academic-hub-secret-key';

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
// Wipes ALL old subscriptions for this user first, then saves the fresh one.
// This prevents stale subscriptions from piling up and breaking delivery.
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: 'Invalid subscription object — missing endpoint' });
    }
    if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object — missing encryption keys' });
    }

    // Delete ALL previous subscriptions for this user (avoids stale/wrong-key subs)
    await PushSubscription.deleteMany({ userId: req.userId });

    // Save the fresh subscription
    await PushSubscription.create({
      userId: req.userId,
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth:   subscription.keys.auth,
        },
      },
    });

    console.log(`[PUSH] Subscribed user ${req.userId} → ${subscription.endpoint.slice(0, 60)}…`);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('[PUSH] Subscribe error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
    } else {
      // No endpoint provided — wipe all for this user
      await PushSubscription.deleteMany({ userId: req.userId });
    }
    res.json({ message: 'Unsubscribed from push notifications' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/push/test  — sends a test push to the requesting user's subscription
router.post('/test', verifyToken, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.userId });

    if (subs.length === 0) {
      return res.status(400).json({
        message: 'No subscription found. Open the notification bell and click Enable, then try again.',
      });
    }

    const payload = JSON.stringify({
      title: 'AcadHub 🔔',
      body: 'Push notifications are working!',
      url: '/',
      timestamp: Date.now(),
    });

    let sent = 0;
    const errors = [];

    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
        console.log(`[PUSH] Test sent OK to user ${req.userId}`);
      } catch (err) {
        const code = err.statusCode || err.status || 'network';
        errors.push(`${code}: ${err.message || 'unknown'}`);
        console.error(`[PUSH] Test failed (${code}):`, err.message);

        // Clean up any invalid subscription
        if ([401, 403, 404, 410].includes(code)) {
          await PushSubscription.findByIdAndDelete(s._id);
          console.log(`[PUSH] Deleted stale subscription (${code}) for user ${req.userId}`);
        }
      }
    }

    if (sent === 0) {
      return res.status(400).json({
        message: `Send failed — please disable and re-enable notifications. (Error: ${errors.join('; ')})`,
        errors,
      });
    }

    res.json({ message: `Test notification sent! Check your browser.` });
  } catch (error) {
    console.error('[PUSH] Test endpoint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/push/status — diagnostic: how many subs does this user have?
router.get('/status', verifyToken, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.userId });
    res.json({
      count: subs.length,
      subscriptions: subs.map(s => ({
        id: s._id,
        endpoint: s.subscription.endpoint.slice(0, 60) + '…',
        hasKeys: !!(s.subscription.keys?.p256dh && s.subscription.keys?.auth),
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
