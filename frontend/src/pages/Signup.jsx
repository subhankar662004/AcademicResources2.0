import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, User, Mail, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle, Loader2, ArrowRight, MailOpen,
  BookOpen,
} from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';

function Signup() {
  const [step, setStep]                     = useState('form');
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole]                     = useState('student');
  const [showPassword, setShowPassword]     = useState(false);
  const [digits, setDigits]                 = useState(['', '', '', '', '', '']);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [loading, setLoading]               = useState(false);
  const [cooldown, setCooldown]             = useState(0);
  const cooldownRef = useRef(null);
  const inputRefs = useRef([]);
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const otp = digits.join('');

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft'  && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  const startCooldown = () => {
    clearInterval(cooldownRef.current);
    setCooldown(60);
    let secs = 60;
    cooldownRef.current = setInterval(() => {
      secs -= 1;
      setCooldown(secs);
      if (secs <= 0) clearInterval(cooldownRef.current);
    }, 1000);
  };

  const handleGoogleCredential = async (credential) => {
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'Google sign-in failed'); setLoading(false); return; }
      if (data.isNewUser) {
        localStorage.setItem('token', data.token);
        navigate('/google-setup', { state: { token: data.token, user: data.user } });
        return;
      }
      localStorage.setItem('token', data.token);
      const userObj = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar || '', bio: data.user.bio || '' };
      login(userObj);
      const params = new URLSearchParams(location.search);
      const rawRedirect = params.get('redirect');
      const dest = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect
        : userObj.role === 'teacher' ? '/teacher'
        : '/';
      navigate(dest);
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.message || 'Failed to send OTP');
      setSuccess(`OTP sent to ${email}`);
      setStep('otp');
      setDigits(['', '', '', '', '', '']);
      startCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) return setError('Please enter all 6 digits');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.message || 'OTP verification failed');
      localStorage.setItem('token', data.token);
      const userObj = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar || '', bio: data.user.bio || '' };
      login(userObj);
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      navigate(redirect || '/');
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepDots = [
    { label: 'Your Details' },
    { label: 'Verify Email' },
    { label: 'Get Started' },
  ];

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
          <h1>Join Us Today</h1>
          <p>Create your account and unlock a world of academic resources.</p>
        </div>

        <div className="auth-steps-preview">
          {stepDots.map(({ label }, i) => {
            const stepNum = i + 1;
            const currentStep = step === 'form' ? 1 : 2;
            const isDone   = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <React.Fragment key={label}>
                <div className={`auth-step-dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  <span>{isDone ? <CheckCircle size={16} color="white" /> : stepNum}</span>
                  <label>{label}</label>
                </div>
                {i < 2 && <div className="auth-step-line" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="auth-left-footer">Free forever · No credit card needed</div>
      </motion.div>

      <motion.div
        className="auth-right-panel"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-form-box">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="auth-form-header">
                  <h2>Create your account</h2>
                  <p>Fill in your details to get started</p>
                </div>

                {error && (
                  <motion.div className="auth-alert auth-alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <AlertCircle size={15} /> {error}
                  </motion.div>
                )}

                <form onSubmit={handleSendOTP} className="auth-form">
                  {/* Role picker */}
                  <div className="auth-field">
                    <label>I am a…</label>
                    <div className="role-picker">
                      <button
                        type="button"
                        className={`role-option${role === 'student' ? ' role-selected' : ''}`}
                        onClick={() => setRole('student')}
                      >
                        <GraduationCap size={22} strokeWidth={1.6}/>
                        <span className="role-opt-label">Student</span>
                        <span className="role-opt-sub">Browse &amp; take tests</span>
                      </button>
                      <button
                        type="button"
                        className={`role-option${role === 'teacher' ? ' role-selected' : ''}`}
                        onClick={() => setRole('teacher')}
                      >
                        <BookOpen size={22} strokeWidth={1.6}/>
                        <span className="role-opt-label">Teacher</span>
                        <span className="role-opt-sub">Upload &amp; create tests</span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label>Full Name</label>
                    <div className="auth-input-wrap">
                      <User size={15} className="auth-input-icon-svg" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Email Address</label>
                    <div className="auth-input-wrap">
                      <Mail size={15} className="auth-input-icon-svg" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                    </div>
                  </div>
                  <div className="auth-row">
                    <div className="auth-field">
                      <label>Password</label>
                      <div className="auth-input-wrap">
                        <Lock size={15} className="auth-input-icon-svg" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required autoComplete="new-password" />
                        <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label>Confirm Password</label>
                      <div className="auth-input-wrap">
                        <Lock size={15} className="auth-input-icon-svg" />
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required autoComplete="new-password" />
                      </div>
                    </div>
                  </div>
                  <motion.button type="submit" className="auth-submit-btn" disabled={loading} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                    {loading
                      ? <><Loader2 size={15} className="spin" /> Sending OTP…</>
                      : <>Send Verification OTP <ArrowRight size={15} /></>
                    }
                  </motion.button>
                </form>
                <div className="auth-divider"><span>or</span></div>
                <GoogleSignInButton onCredential={handleGoogleCredential} onError={(msg) => { setError(msg); setLoading(false); }} disabled={loading} text="signup_with" />
                <p className="auth-switch" style={{ marginTop: 16 }}>Already have an account? <Link to={`/login${location.search}`}>Sign in</Link></p>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="auth-form-header">
                  <div className="auth-otp-icon">
                    <MailOpen size={44} color="var(--primary)" strokeWidth={1.4} />
                  </div>
                  <h2>Check your inbox</h2>
                  <p>We sent a 6-digit code to<br /><strong>{email}</strong></p>
                </div>

                {error   && (
                  <motion.div className="auth-alert auth-alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <AlertCircle size={15} /> {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div className="auth-alert auth-alert-success" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <CheckCircle size={15} /> {success}
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOTP} className="auth-form">
                  <div className="auth-otp-boxes" onPaste={handleDigitPaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        className={`auth-otp-box ${d ? 'filled' : ''}`}
                      />
                    ))}
                  </div>

                  <motion.button type="submit" className="auth-submit-btn" disabled={loading || otp.length !== 6} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                    {loading
                      ? <><Loader2 size={15} className="spin" /> Verifying…</>
                      : <><CheckCircle size={15} /> Verify &amp; Create Account</>
                    }
                  </motion.button>
                </form>

                <div className="auth-otp-footer">
                  <button
                    className="auth-link-btn"
                    onClick={() => { startCooldown(); handleSendOTP(); }}
                    disabled={loading || cooldown > 0}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                  <span>·</span>
                  <button className="auth-link-btn" onClick={() => { setStep('form'); setError(''); setSuccess(''); setDigits(['','','','','','']); clearInterval(cooldownRef.current); setCooldown(0); }}>
                    Change email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default Signup;
