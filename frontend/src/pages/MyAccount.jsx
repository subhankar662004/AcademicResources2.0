import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { useToast } from '../components/Toast';
import {
  User, BookOpen, Folder, LogOut, Plus, FolderOpen, FileText,
  CheckCircle, Clock, XCircle, Loader2, Camera, Trash2,
  Save, Image, ChevronRight, Upload, Bell, BellOff, Shield, Users, Megaphone, AlertCircle,
} from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush, checkPushSubscription } from '../utils/pushNotification';

const STATUS_ICONS = {
  approved: <CheckCircle size={12} color="#059669" />,
  pending:  <Clock      size={12} color="#d97706" />,
  rejected: <XCircle   size={12} color="#dc2626" />,
};
const STATUS_COLORS = {
  approved: { bg:'#f0fdf4', color:'#059669', border:'#bbf7d0' },
  pending:  { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  rejected: { bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
};

function AvatarDisplay({ avatar, name, size = 80 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) {
    return (
      <img src={avatar} alt={name} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: '3px solid white', boxShadow: '0 4px 16px rgba(37,99,235,0.2)', display: 'block',
      }}/>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      color: 'white', fontSize: size * 0.36, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '3px solid white', boxShadow: '0 4px 16px rgba(37,99,235,0.2)', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function MyAccount() {
  const { user, logout, setUser } = useAuth();
  const [activeTab, setActiveTab]             = useState('profile');
  const [name, setName]                       = useState(user?.name || '');
  const [bio,  setBio]                        = useState(user?.bio  || '');
  const [savingProfile, setSavingProfile]     = useState(false);
  const [avatar, setAvatar]                   = useState(user?.avatar || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving,  setAvatarRemoving]  = useState(false);
  const [avatarPreview,   setAvatarPreview]   = useState(null);
  const fileInputRef                          = useRef();
  const toast = useToast();
  const [myResources,   setMyResources]       = useState([]);
  const [myFolders,     setMyFolders]         = useState([]);
  const [loading,       setLoading]           = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');
  const [creatingFolder, setCreatingFolder]   = useState(false);

  const token = localStorage.getItem('token');
  const authHeader = { Authorization: `Bearer ${token}` };

  /* ── Push notification state ── */
  const [pushEnabled,     setPushEnabled]     = useState(false);
  const [pushPermission,  setPushPermission]  = useState('default');
  const [pushLoading,     setPushLoading]     = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult,  setTestPushResult]  = useState(null);
  const [pushDbCount,     setPushDbCount]     = useState(null); // subs saved in DB

  const checkDbStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/api/push/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { const d = await r.json(); setPushDbCount(d.count); }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!('Notification' in window)) return;
    const perm = Notification.permission;
    setPushPermission(perm);
    checkPushSubscription().then(async (enabled) => {
      if (perm === 'granted' && !enabled) {
        const ok = await subscribeToPush(token);
        setPushEnabled(ok);
        if (ok) checkDbStatus();
      } else {
        setPushEnabled(enabled);
        if (enabled) checkDbStatus();
      }
    });
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    setTestPushResult(null);
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        const ok = await subscribeToPush(token);
        setPushEnabled(ok);
        if (ok) {
          await checkDbStatus();
          flash('success', 'Push notifications enabled!');
        } else {
          flash('error', 'Subscription failed — check browser console for details');
        }
      } else {
        flash('error', 'Browser permission denied — please allow notifications');
      }
    } catch (e) {
      flash('error', 'Failed: ' + e.message);
    } finally { setPushLoading(false); }
  };

  const handleResubscribe = async () => {
    setPushLoading(true);
    setTestPushResult(null);
    try {
      // 1. Unsubscribe from browser
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      // 2. Delete from backend DB
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      // 3. Fresh subscribe
      const ok = await subscribeToPush(token);
      setPushEnabled(ok);
      if (ok) {
        await checkDbStatus();
        flash('success', 'Re-subscribed successfully! Try sending the test now.');
      } else {
        flash('error', 'Re-subscribe failed — check browser console');
      }
    } catch (e) {
      flash('error', 'Reset failed: ' + e.message);
    } finally { setPushLoading(false); }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try {
      await unsubscribeFromPush(token);
      setPushEnabled(false);
      setPushDbCount(0);
      setTestPushResult(null);
      flash('success', 'Push notifications disabled');
    } catch { flash('error', 'Failed to disable notifications'); }
    finally { setPushLoading(false); }
  };

  const handleTestPush = async () => {
    setTestPushLoading(true);
    setTestPushResult(null);
    try {
      const res = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTestPushResult({ ok: true, msg: data.message });
      } else {
        setTestPushResult({ ok: false, msg: data.message });
        // If send failed, update DB count to reflect any deletions
        checkDbStatus();
      }
    } catch {
      setTestPushResult({ ok: false, msg: 'Connection error — backend unreachable' });
    } finally { setTestPushLoading(false); }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio   || '');
      setAvatar(user.avatar || '');
      fetchMyResources();
      fetchMyFolders();
    }
  }, [user]);

  const flash = (type, msg) => {
    if (type === 'success') return toast.success(msg);
    if (type === 'edit')    return toast.edit(msg);
    if (type === 'delete')  return toast.delete(msg);
    if (type === 'warning') return toast.warning(msg);
    if (type === 'info')    return toast.info(msg);
    return toast.error(msg);
  };

  const fetchMyResources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resources/my-resources`, { headers: authHeader });
      if (res.ok) setMyResources(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchMyFolders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/folders/my-folders`, { headers: authHeader });
      if (res.ok) setMyFolders(await res.json());
    } catch { /* silent */ }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash('error', data.message || 'Failed to save'); return; }
      if (setUser) setUser(data);
      flash('edit', 'Profile updated successfully!');
    } catch { flash('error', 'Connection error — please try again'); }
    finally { setSavingProfile(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash('error', 'Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { flash('error', 'Image must be under 5 MB'); return; }
    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  const uploadAvatar = async (file) => {
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${API_URL}/api/users/avatar`, { method: 'POST', headers: authHeader, body: form });
      const data = await res.json();
      if (!res.ok) { flash('error', data.message || 'Upload failed'); setAvatarPreview(null); return; }
      setAvatar(data.avatar);
      setAvatarPreview(null);
      if (setUser) setUser(data.user);
      flash('edit', 'Profile photo updated!');
    } catch { flash('error', 'Upload failed — check your connection'); setAvatarPreview(null); }
    finally { setAvatarUploading(false); fileInputRef.current.value = ''; }
  };

  const handleRemoveAvatar = async () => {
    setAvatarRemoving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/avatar`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (!res.ok) { flash('error', data.message || 'Remove failed'); return; }
      setAvatar(''); setAvatarPreview(null);
      if (setUser) setUser(data.user);
      flash('success', 'Profile photo removed');
    } catch { flash('error', 'Failed to remove photo'); }
    finally { setAvatarRemoving(false); }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return flash('error', 'Enter a folder name');
    setCreatingFolder(true);
    try {
      const res = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, isPublic: true }),
      });
      const data = await res.json();
      if (!res.ok) { flash('error', data.message || 'Failed to create folder'); return; }
      flash('success', 'Folder created!');
      setNewFolderName(''); setShowCreateFolder(false);
      fetchMyFolders();
    } catch { flash('error', 'Connection error'); }
    finally { setCreatingFolder(false); }
  };

  const displayAvatar = avatarPreview || avatar;
  const roleMeta = {
    admin:   { label: 'Admin',   color: '#dc2626', bg: '#fef2f2' },
    teacher: { label: 'Teacher', color: '#d97706', bg: '#fffbeb' },
    student: { label: 'Student', color: '#2563eb', bg: '#eff6ff' },
  }[user?.role] || { label: 'Student', color: '#2563eb', bg: '#eff6ff' };

  const tabs = [
    { id: 'profile',       label: 'Edit Profile',    Icon: User     },
    { id: 'resources',     label: 'My Resources',    Icon: BookOpen },
    { id: 'folders',       label: 'My Folders',      Icon: Folder   },
    { id: 'notifications', label: 'Notifications',   Icon: Bell     },
  ];

  const approvedCount = myResources.filter(r => r.status === 'approved').length;
  const pendingCount  = myResources.filter(r => r.status === 'pending').length;

  return (
    <div className="ma-page">
      {/* ── Hero banner ── */}
      <div className="ma-hero">
        <div className="ma-hero-inner">
          <div className="ma-hero-avatar-wrap">
            <div className="ma-hero-avatar" onClick={() => fileInputRef.current.click()} title="Change photo">
              {(avatarUploading || avatarRemoving) ? (
                <div className="ma-avatar-loading">
                  <Loader2 size={28} color="white" className="spin"/>
                </div>
              ) : (
                <AvatarDisplay avatar={displayAvatar} name={user?.name} size={92}/>
              )}
              <div className="ma-avatar-overlay">
                <Camera size={16}/>
              </div>
            </div>
          </div>
          <div className="ma-hero-info">
            <h1 className="ma-hero-name">{user?.name || 'User'}</h1>
            <p className="ma-hero-email">{user?.email}</p>
            <span className="ma-role-chip" style={{ background: roleMeta.bg, color: roleMeta.color }}>
              {roleMeta.label}
            </span>
          </div>
          <div className="ma-hero-stats">
            <div className="ma-stat">
              <span className="ma-stat-num">{myResources.length}</span>
              <span className="ma-stat-label">Uploads</span>
            </div>
            <div className="ma-stat-div"/>
            <div className="ma-stat">
              <span className="ma-stat-num">{approvedCount}</span>
              <span className="ma-stat-label">Approved</span>
            </div>
            <div className="ma-stat-div"/>
            <div className="ma-stat">
              <span className="ma-stat-num">{myFolders.length}</span>
              <span className="ma-stat-label">Folders</span>
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange}/>

      <div className="ma-body">
        {/* ── Tab bar ── */}
        <div className="ma-tabs">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`ma-tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15}/> {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="ma-content">

          {/* ─── PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="ma-panel">
              <div className="ma-panel-title">
                <User size={18} color="var(--primary)"/>
                Personal Information
              </div>

              {/* Photo section */}
              <div className="ma-photo-row">
                <div className="ma-photo-preview">
                  {(avatarUploading || avatarRemoving) ? (
                    <div className="ma-photo-loading">
                      <Loader2 size={26} color="var(--primary)" className="spin"/>
                    </div>
                  ) : (
                    <AvatarDisplay avatar={displayAvatar} name={user?.name} size={72}/>
                  )}
                </div>
                <div className="ma-photo-info">
                  <p className="ma-photo-label">Profile Photo</p>
                  <p className="ma-photo-hint">JPG, PNG or WebP · Max 5 MB</p>
                  <div className="ma-photo-btns">
                    <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current.click()} disabled={avatarUploading || avatarRemoving}>
                      <Image size={13}/> {displayAvatar ? 'Change' : 'Upload'}
                    </button>
                    {displayAvatar && (
                      <button className="btn btn-sm ma-remove-btn" onClick={handleRemoveAvatar} disabled={avatarUploading || avatarRemoving}>
                        <Trash2 size={13}/> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>


              <form onSubmit={handleSaveProfile} className="ma-form">
                <div className="ma-form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required/>
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={user?.email || ''} disabled/>
                    <span className="form-hint">Email cannot be changed</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Your course, university, study interests…" rows={3}/>
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                    {savingProfile ? <Loader2 size={14} className="spin"/> : <Save size={14}/>}
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft:'auto', color:'var(--text-muted)' }}>
                    <LogOut size={13}/> Sign Out
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── RESOURCES TAB ─── */}
          {activeTab === 'resources' && (
            <div className="ma-panel">
              <div className="ma-panel-title">
                <BookOpen size={18} color="var(--primary)"/>
                My Uploads
                <span className="ma-count-chip">{myResources.length}</span>
              </div>

              {pendingCount > 0 && (
                <div className="ma-info-banner">
                  <Clock size={14} color="#d97706"/>
                  {pendingCount} resource{pendingCount > 1 ? 's are' : ' is'} awaiting admin approval
                </div>
              )}

              {loading ? (
                <div className="loading-state">
                  <Loader2 size={28} className="spin" color="var(--primary)"/>
                  <p>Loading…</p>
                </div>
              ) : myResources.length > 0 ? (
                <div className="ma-resource-list">
                  {myResources.map(r => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                    return (
                      <div key={r._id} className="ma-resource-item">
                        <div className="ma-resource-icon">
                          <FileText size={18} color="var(--primary)"/>
                        </div>
                        <div className="ma-resource-body">
                          <div className="ma-resource-title">{r.title}</div>
                          <div className="ma-resource-meta">
                            {r.folder?.name || 'Uncategorized'} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                          </div>
                        </div>
                        <span className="ma-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {STATUS_ICONS[r.status]}
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><BookOpen size={40} color="var(--primary)" strokeWidth={1.5}/></div>
                  <h3>No uploads yet</h3>
                  <p>Share your first resource with the community</p>
                  <a href="/upload" className="btn btn-primary" style={{ marginTop:16 }}>Upload Now</a>
                </div>
              )}
            </div>
          )}

          {/* ─── NOTIFICATIONS TAB ─── */}
          {activeTab === 'notifications' && (
            <div className="ma-panel">
              <div className="ma-panel-title">
                <Bell size={18} color="var(--primary)"/>
                Notification Settings
              </div>

              {/* Push notification card */}
              <div className="ma-notif-card">
                <div className="ma-notif-card-head">
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                      <Bell size={15} /> Push Notifications
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
                      Get instant alerts when the admin sends announcements, your resources are approved, or new tests are shared with you.
                    </div>
                  </div>
                  <div className="ma-notif-status-chip" style={{
                    background: pushEnabled ? '#f0fdf4' : '#f9fafb',
                    color: pushEnabled ? '#059669' : 'var(--text-muted)',
                    border: `1px solid ${pushEnabled ? '#bbf7d0' : 'var(--border)'}`,
                  }}>
                    {pushEnabled ? '● Active' : '○ Off'}
                  </div>
                </div>

                {pushPermission === 'denied' ? (
                  <div className="ma-notif-denied">
                    <div style={{ fontSize:14, fontWeight:600, color:'#dc2626', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                      <AlertCircle size={14} /> Notifications blocked in your browser
                    </div>
                    <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
                      To re-enable: click the lock/info icon in your browser's address bar → Notifications → Allow, then refresh the page.
                    </p>
                  </div>
                ) : pushEnabled ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ fontSize:13, color:'#059669', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                      <CheckCircle size={13} /> Subscribed — push notifications active on this device
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <button className="btn btn-outline btn-sm" onClick={handleDisablePush} disabled={pushLoading}
                        style={{ color:'#dc2626', borderColor:'#fecaca', display:'inline-flex', alignItems:'center', gap:6 }}>
                        {pushLoading ? <Loader2 size={13} className="spin"/> : <BellOff size={13} />}
                        {pushLoading ? 'Working…' : 'Disable'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={handleResubscribe} disabled={pushLoading}
                        style={{ color:'#d97706', borderColor:'#fde68a', display:'inline-flex', alignItems:'center', gap:6 }}>
                        {pushLoading ? <Loader2 size={13} className="spin"/> : <Bell size={13} />}
                        {pushLoading ? 'Working…' : 'Reset Subscription'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={handleTestPush} disabled={testPushLoading || pushLoading}
                        style={{ color:'#6366f1', borderColor:'#c7d2fe', display:'inline-flex', alignItems:'center', gap:6 }}>
                        {testPushLoading ? <Loader2 size={13} className="spin"/> : <Bell size={13} />}
                        {testPushLoading ? 'Sending…' : 'Send Test Notification'}
                      </button>
                    </div>
                    {testPushResult && (
                      <div style={{ fontSize:12, fontWeight:600, color: testPushResult.ok ? '#059669' : '#dc2626', display:'flex', alignItems:'center', gap:5 }}>
                        {testPushResult.ok ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                        {testPushResult.msg}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
                      Enable push notifications to get instant alerts — even when you're not on the site.
                    </div>
                    <button className="btn btn-primary" onClick={handleEnablePush} disabled={pushLoading}>
                      {pushLoading ? <Loader2 size={14} className="spin"/> : <Bell size={14}/>}
                      {pushLoading ? 'Setting up…' : 'Enable Push Notifications'}
                    </button>
                  </div>
                )}
              </div>

              {/* Browser support note */}
              {!('Notification' in window) && (
                <div className="ma-notif-denied" style={{ marginTop:12 }}>
                  Your browser does not support push notifications.
                </div>
              )}

              {/* Admin shortcut */}
              {user?.role === 'admin' && (
                <div className="ma-notif-card" style={{ marginTop:16 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <Megaphone size={15} /> Broadcast to Users
                  </div>
                  <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
                    As an admin, you can send emails and push notifications to all or selected users from the Admin Dashboard.
                  </p>
                  <a href="/admin" className="btn btn-primary btn-sm">
                    <Shield size={13}/> Go to Admin Dashboard → Broadcast
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ─── FOLDERS TAB ─── */}
          {activeTab === 'folders' && (
            <div className="ma-panel">
              <div className="ma-panel-title" style={{ marginBottom: showCreateFolder ? 16 : 20 }}>
                <Folder size={18} color="var(--primary)"/>
                My Folders
                <span className="ma-count-chip">{myFolders.length}</span>
                <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto' }} onClick={() => setShowCreateFolder(v => !v)}>
                  <Plus size={13}/> New Folder
                </button>
              </div>

              {showCreateFolder && (
                <div className="ma-create-folder">
                  <form onSubmit={handleCreateFolder} className="ma-create-folder-form">
                    <input
                      type="text" value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="Folder name, e.g. Study Notes"
                      autoFocus required
                      className="ma-folder-input"
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={creatingFolder}>
                      {creatingFolder ? <Loader2 size={13} className="spin"/> : 'Create'}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm"
                      onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}>
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              {myFolders.length > 0 ? (
                <div className="ma-folders-grid">
                  {myFolders.map(folder => (
                    <div key={folder._id} className="ma-folder-card">
                      <div className="ma-folder-icon">
                        <FolderOpen size={24} color="#2563eb" strokeWidth={1.8}/>
                      </div>
                      <div className="ma-folder-name">{folder.name}</div>
                      <div className="ma-folder-count">{folder.resourceCount || 0} resources</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><FolderOpen size={40} color="var(--primary)" strokeWidth={1.5}/></div>
                  <h3>No folders yet</h3>
                  <p>Create a folder to organise your resources</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
