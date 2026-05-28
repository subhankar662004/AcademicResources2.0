import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen,
  Brain, Bell, BarChart3, AlertCircle, Loader2, ArrowRight,
} from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';

const FEATURES = [
  { Icon: BookOpen, text: 'Access thousands of resources' },
  { Icon: Brain,    text: 'AI-powered test generation' },
  { Icon: Bell,     text: 'Real-time notifications' },
  { Icon: BarChart3,text: 'Track your progress' },
];

function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

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
      const userObj = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar, bio: data.user.bio };
      login(userObj);
      const params = new URLSearchParams(location.search);
      const rawRedirect = params.get('redirect');
      const dest = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect
        : userObj.role === 'admin' ? '/admin/overview'
        : userObj.role === 'teacher' ? '/teacher'
        : '/';
      navigate(dest);
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'Login failed'); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      const userObj = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar, bio: data.user.bio };
      login(userObj);
      const params = new URLSearchParams(location.search);
      const rawRedirect = params.get('redirect');
      const redirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : null;
      const role = userObj.role;
      if (redirect) {
        navigate(redirect);
      } else {
        navigate(role === 'admin' ? '/admin/overview' : role === 'teacher' ? '/teacher' : '/');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
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
          <h1>Academic Resources Hub</h1>
          <p>Your gateway to knowledge, resources, and academic excellence.</p>
        </div>
        <div className="auth-features">
          {FEATURES.map(({ Icon, text }) => (
            <div className="auth-feature-item" key={text}>
              <Icon size={16} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="auth-left-footer">Trusted by students and educators worldwide</div>
      </motion.div>

      <motion.div
        className="auth-right-panel"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {error && (
            <motion.div className="auth-alert auth-alert-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <AlertCircle size={15} /> {error}
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
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
                <label style={{ marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon-svg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Signing in…</>
                : <> Sign In <ArrowRight size={16} /></>
              }
            </motion.button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={(msg) => { setError(msg); setLoading(false); }} disabled={loading} />
          <p className="auth-switch" style={{ marginTop: 16 }}>
            Don't have an account?{' '}
            <Link to={`/signup${location.search}`}>Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
