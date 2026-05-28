import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function ResetPassword() {
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [status, setStatus]               = useState('idle'); // idle | loading | done | error | invalid
  const [message, setMessage]             = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!token) setStatus('invalid');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setMessage('Passwords do not match'); setStatus('error'); return; }
    if (password.length < 6) { setMessage('Password must be at least 6 characters'); setStatus('error'); return; }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.message || 'Reset failed'); setStatus('error'); return; }
      setStatus('done');
      setTimeout(() => navigate('/login'), 3000);
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
          <h1>Create a new password</h1>
          <p>Choose something strong that you haven't used before.</p>
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
          {status === 'invalid' ? (
            <div className="forgot-success">
              <div className="forgot-success-icon">
                <AlertCircle size={48} color="var(--danger)" strokeWidth={1.5} />
              </div>
              <h2>Invalid link</h2>
              <p>This password reset link is missing or malformed. Please request a new one.</p>
              <Link to="/forgot-password" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 16 }}>
                Request New Link
              </Link>
            </div>
          ) : status === 'done' ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="forgot-success">
              <div className="forgot-success-icon">
                <CheckCircle size={48} color="var(--success)" strokeWidth={1.5} />
              </div>
              <h2>Password updated!</h2>
              <p>Your password has been changed successfully. Redirecting you to login…</p>
              <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 16 }}>
                Go to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="auth-form-header">
                <h2>Set new password</h2>
                <p>Enter and confirm your new password below</p>
              </div>

              {status === 'error' && (
                <motion.div className="auth-alert auth-alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <AlertCircle size={15} /> {message}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label>New Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={15} className="auth-input-icon-svg" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label>Confirm New Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={15} className="auth-input-icon-svg" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      autoComplete="new-password"
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
                    ? <><Loader2 size={16} className="spin" /> Updating…</>
                    : <><CheckCircle size={16} /> Update Password</>
                  }
                </motion.button>
              </form>

              <div className="auth-divider"><span>or</span></div>
              <p className="auth-switch">
                <Link to="/login">Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPassword;
