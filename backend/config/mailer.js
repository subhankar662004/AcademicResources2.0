import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@academicrshub.com';

if (!BREVO_API_KEY) {
  console.error('[MAILER] BREVO_API_KEY is not set — OTP emails will fail');
} else {
  console.log('[MAILER] Brevo API ready ✅');
}

export const sendOTPEmail = async (email, otp, name) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Learnixa', email: EMAIL_FROM },
        to: [{ email }],
        subject: 'Your OTP Verification Code',
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="text-align:center;margin-bottom:20px;">
              <h2 style="color:#2563eb;margin:8px 0 0;">Learnixa</h2>
            </div>
            <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
            <p style="color:#374151;">Use the OTP below to verify your email. It expires in <strong>10 minutes</strong>.</p>
            <div style="background:#eff6ff;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
              <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2563eb;">${otp}</div>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[MAILER] OTP email sent to ${email} — messageId:`, response.data?.messageId);
    return response.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error(`[MAILER] Failed to send OTP to ${email}:`, JSON.stringify(detail));
    throw new Error(typeof detail === 'object' ? JSON.stringify(detail) : detail);
  }
};

export const sendResultEmail = async (teacherEmail, teacherName, studentName, testTitle, score, total) => {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
  const barColor = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'Learnixa', email: EMAIL_FROM },
      to: [{ email: teacherEmail, name: teacherName }],
      subject: `📋 New submission: ${studentName} completed "${testTitle}"`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#2563eb;margin:8px 0 0;">Learnixa</h2>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Test Result Notification</p>
          </div>
          <p style="color:#374151;">Hi <strong>${teacherName}</strong>,</p>
          <p style="color:#374151;">A student has just submitted your test.</p>
          <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">Student</td><td style="font-weight:700;color:#111827;text-align:right;">${studentName}</td></tr>
              <tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">Test</td><td style="font-weight:700;color:#111827;text-align:right;">${testTitle}</td></tr>
              <tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">Score</td><td style="font-weight:700;color:#111827;text-align:right;">${score} / ${total}</td></tr>
              <tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">Grade</td><td style="font-weight:700;color:${barColor};text-align:right;">${grade} (${pct}%)</td></tr>
            </table>
            <div style="margin-top:14px;background:#e2e8f0;border-radius:999px;height:8px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${barColor};border-radius:999px;"></div>
            </div>
          </div>
          <p style="color:#6b7280;font-size:13px;">Log in to your teacher dashboard to see all submissions for this test.</p>
        </div>
      `,
    },
    {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

export const sendPasswordResetEmail = async (email, name, resetUrl) => {
  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'Learnixa', email: EMAIL_FROM },
      to: [{ email }],
      subject: 'Reset your password',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#2563eb;margin:8px 0 0;">Learnixa</h2>
          </div>
          <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
          <p style="color:#374151;">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#6b7280;font-size:13px;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Or copy this link into your browser:<br/><a href="${resetUrl}" style="color:#2563eb;word-break:break-all;">${resetUrl}</a></p>
        </div>
      `,
    },
    {
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    }
  );
  return response.data;
};

export default { sendOTPEmail, sendResultEmail, sendPasswordResetEmail };
