import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Mail, GraduationCap, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState('idle'); // idle | loading | sent | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.message || 'Something went wrong'); setStatus('error'); return; }
      setStatus('sent');
    } catch (err) {
      setMessage('Connection error: ' + err.message);
      setStatus('error');
    }
  };

  return (
    <div className="auth-split-page">
      <motion.div
        className="auth-left-panel"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <GraduationCap size={40} color="white" strokeWidth={1.5} />
          </div>
          <h1>Forgot your password?</h1>
          <p>No worries — we'll send you a reset link right away.</p>
        </div>
        <div className="auth-left-footer">Academic Resources Hub</div>
      </motion.div>

      <motion.div
        className="auth-right-panel"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-form-box">
          {status === 'sent' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="forgot-success"
            >
              <div className="forgot-success-icon">
                <CheckCircle size={48} color="var(--success)" strokeWidth={1.5} />
              </div>
              <h2>Check your email</h2>
              <p>
                We sent a password reset link to <strong>{email}</strong>.
                The link expires in 1 hour.
              </p>
              <p className="forgot-hint">Didn't get it? Check your spam folder or try again.</p>
              <div className="forgot-actions">
                <button className="auth-link-btn" onClick={() => { setStatus('idle'); setEmail(''); }}>
                  Try a different email
                </button>
                <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', justifyContent: 'center' }}>
                  Back to Login
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="auth-form-header">
                <h2>Reset your password</h2>
                <p>Enter your email and we'll send you a reset link</p>
              </div>

              {status === 'error' && (
                <motion.div className="auth-alert auth-alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <AlertCircle size={15} /> {message}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label>Email Address</label>
                  <div className="auth-input-wrap">
                    <Mail size={15} className="auth-input-icon-svg" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={status === 'loading'}
                  whileHover={{ scale: status === 'loading' ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'loading' ? 1 : 0.98 }}
                >
                  {status === 'loading'
                    ? <><Loader2 size={16} className="spin" /> Sending…</>
                    : <>Send Reset Link</>
                  }
                </motion.button>
              </form>

              <div className="auth-divider"><span>or</span></div>
              <p className="auth-switch">
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
