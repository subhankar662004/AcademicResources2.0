import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import {
  GraduationCap, BookOpen, User, Lock, Eye, EyeOff,
  Camera, CheckCircle, Loader2, ArrowRight, AlertCircle,
} from 'lucide-react';

export default function GoogleOnboarding() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const state = location.state || {};
  const pendingToken = state.token || '';
  const googleUser   = state.user  || {};

  const [name,        setName]        = useState(googleUser.name || '');
  const [role,        setRole]        = useState('student');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [avatar,      setAvatar]      = useState(googleUser.avatar || '');
  const [avatarFile,  setAvatarFile]  = useState(null);
  const [avatarPrev,  setAvatarPrev]  = useState(googleUser.avatar || '');
  const [uploading,   setUploading]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const fileRef = useRef();

  if (!pendingToken) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return; }
    setAvatarPrev(URL.createObjectURL(file));
    setAvatarFile(file);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res  = await fetch(`${API_URL}/api/users/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pendingToken}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) setAvatar(data.avatar);
      else setError(data.message || 'Photo upload failed');
    } catch { setError('Photo upload failed'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (password && password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingToken}` },
        body: JSON.stringify({ name: name.trim(), role, password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Setup failed'); return; }
      localStorage.setItem('token', data.token);
      login({ id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar || avatar, bio: data.user.bio || '' });
      navigate(data.user.role === 'teacher' ? '/teacher' : '/', { replace: true });
    } catch { setError('Connection error — please try again'); }
    finally { setLoading(false); }
  };

  const roles = [
    { id: 'student', label: 'Student',  Icon: BookOpen,      desc: 'Access resources & take tests' },
    { id: 'teacher', label: 'Teacher',  Icon: GraduationCap, desc: 'Create tests & manage students' },
  ];

  return (
    <div className="auth-split-page">
      <motion.div className="auth-left-panel" initial={{ x:-60, opacity:0 }} animate={{ x:0, opacity:1 }} transition={{ duration:0.5 }}>
        <div className="auth-brand">
          <div className="auth-brand-icon"><GraduationCap size={40} color="white" strokeWidth={1.5}/></div>
          <h1>Welcome to AcadHub</h1>
          <p>Just a few quick details and you're all set. This only takes a moment.</p>
        </div>
        <div className="auth-features">
          {['Choose your role', 'Confirm your name', 'Optionally set a password', 'Upload a profile photo'].map(t => (
            <div className="auth-feature-item" key={t}>
              <CheckCircle size={16} color="rgba(255,255,255,0.9)" strokeWidth={1.8}/>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="auth-left-footer">Google account connected ✓</div>
      </motion.div>

      <motion.div className="auth-right-panel" initial={{ x:60, opacity:0 }} animate={{ x:0, opacity:1 }} transition={{ duration:0.5 }}>
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h2>Complete your profile</h2>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>Signed in as <strong>{googleUser.email}</strong></p>
          </div>

          {error && (
            <motion.div className="auth-alert auth-alert-error" initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
              <AlertCircle size={15}/> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Avatar */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:4 }}>
              <div
                style={{ position:'relative', width:80, height:80, borderRadius:'50%', cursor:'pointer', flexShrink:0 }}
                onClick={() => fileRef.current?.click()}
                title="Change photo"
              >
                {avatarPrev
                  ? <img src={avatarPrev} alt="avatar" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--primary)' }}/>
                  : <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', border:'3px solid var(--primary)' }}>
                      <User size={32} color="white"/>
                    </div>
                }
                <div style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid white' }}>
                  {uploading ? <Loader2 size={12} color="white" className="spin"/> : <Camera size={12} color="white"/>}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange}/>
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
                {uploading ? 'Uploading…' : 'Tap to change photo (optional)'}
              </p>
            </div>

            {/* Name */}
            <div className="auth-field">
              <label>Your Name</label>
              <div className="auth-input-wrap">
                <User size={15} className="auth-input-icon-svg"/>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Role */}
            <div className="auth-field">
              <label>I am a…</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {roles.map(({ id, label, Icon, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                      padding:'16px 12px', borderRadius:12, border:`2px solid ${role===id?'var(--primary)':'var(--border)'}`,
                      background: role===id?'#eff6ff':'var(--bg)', cursor:'pointer',
                      transition:'all 0.18s',
                    }}
                  >
                    <div style={{ width:40, height:40, borderRadius:10, background: role===id?'var(--primary)':'var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={20} color={role===id?'white':'var(--text-muted)'}/>
                    </div>
                    <span style={{ fontWeight:700, fontSize:14, color: role===id?'var(--primary)':'var(--text)' }}>{label}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', lineHeight:1.4 }}>{desc}</span>
                    {role===id && <CheckCircle size={16} color="var(--primary)"/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional password */}
            <div className="auth-field">
              <label style={{ display:'flex', justifyContent:'space-between' }}>
                <span>Password <span style={{ color:'var(--text-muted)', fontWeight:400, fontSize:12 }}>(optional)</span></span>
              </label>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon-svg"/>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Set a password for email login later"
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text-muted)' }}>
                Skip this if you only plan to use Google sign-in
              </p>
            </div>

            <motion.button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || uploading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading
                ? <><Loader2 size={16} className="spin"/> Setting up…</>
                : <>Enter AcadHub <ArrowRight size={16}/></>
              }
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
