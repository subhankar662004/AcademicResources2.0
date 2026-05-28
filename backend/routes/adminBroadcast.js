import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from 'web-push';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM    = process.env.EMAIL_FROM || 'noreply@academicrshub.com';

/* POST /api/admin/broadcast */
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { targetType, userIds, subject, message, channels } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
    if (!channels?.length) return res.status(400).json({ message: 'Select at least one channel' });

    let recipients = [];
    if (targetType === 'all') {
      recipients = await User.find({}).select('_id name email');
    } else if (targetType === 'role' && req.body.role) {
      recipients = await User.find({ role: req.body.role }).select('_id name email');
    } else if (targetType === 'specific' && Array.isArray(userIds) && userIds.length > 0) {
      recipients = await User.find({ _id: { $in: userIds } }).select('_id name email');
    } else {
      return res.status(400).json({ message: 'Invalid target configuration' });
    }

    if (recipients.length === 0) return res.status(400).json({ message: 'No recipients found' });

    const results = { email: { sent: 0, failed: 0 }, push: { sent: 0, failed: 0 } };

    const emailSubject = subject?.trim() || 'Message from Academic Resources Hub';
    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#2563eb;margin-bottom:4px;">Academic Resources Hub</h2>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <div style="font-size:15px;line-height:1.7;color:#374151;white-space:pre-wrap;">${message.trim()}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="font-size:12px;color:#9ca3af;">This message was sent by the site admin. Do not reply to this email.</p>
      </div>`;

    /* ── Email via Brevo API ── */
    if (channels.includes('email') && BREVO_API_KEY) {
      const emailPromises = recipients.map(async (u) => {
        try {
          await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
              sender: { name: 'Academic Resources Hub', email: EMAIL_FROM },
              to: [{ email: u.email, name: u.name }],
              subject: emailSubject,
              htmlContent: htmlBody,
            },
            { headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' } }
          );
          results.email.sent++;
        } catch {
          results.email.failed++;
        }
      });
      await Promise.allSettled(emailPromises);
    } else if (channels.includes('email') && !BREVO_API_KEY) {
      results.email.failed = recipients.length;
    }

    /* ── Web Push ── */
    if (channels.includes('push')) {
      const payload = JSON.stringify({
        title: 'Academic Resources Hub',
        body: message.trim().slice(0, 200),
        url: '/',
        timestamp: Date.now(),
      });

      for (const u of recipients) {
        const subs = await PushSubscription.find({ userId: u._id.toString() });
        for (const s of subs) {
          try {
            await webpush.sendNotification(s.subscription, payload);
            results.push.sent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403) {
              await PushSubscription.findByIdAndDelete(s._id);
            }
            results.push.failed++;
          }
        }
      }
    }

    res.json({
      message: 'Broadcast complete',
      recipients: recipients.length,
      emailsSent: results.email.sent,
      emailsFailed: results.email.failed,
      pushSent: results.push.sent,
      pushFailed: results.push.failed,
      results,
    });
  } catch (err) {
    res.status(500).json({ message: 'Broadcast failed', error: err.message });
  }
});

export default router;
