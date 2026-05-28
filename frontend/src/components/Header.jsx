import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import logo from '../assets/logo.png';
import { subscribeToPush, unsubscribeFromPush, checkPushSubscription } from '../utils/pushNotification';
import { loadNotifications, saveNotifications, TTL_MS } from '../utils/notifications';
import {
  Home, LayoutDashboard, ClipboardList, Shield, Mail,
  X, Bell, BellOff, Loader2, AlertCircle, Settings,
  LogOut, User, ChevronDown, Menu, BookOpen, Upload, Folder, Globe,
} from 'lucide-react';

const ROLE_META = {
  admin:   { label: 'Admin',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  teacher: { label: 'Teacher', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  student: { label: 'Student', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
};

function Avatar({ user, size = 34 }) {
  if (user?.avatar) {
    return (
      <img src={user.avatar} alt={user.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
    );
  }
  const rm = ROLE_META[user?.role] || ROLE_META.student;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: `linear-gradient(135deg, ${rm.color}22, ${rm.color}44)`,
      border: `2px solid ${rm.border}`,
      fontSize: size * 0.38, fontWeight: 700, color: rm.color,
    }}>
      {user?.name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

function Header() {
  const { user, isAdmin, isTeacher, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const token     = localStorage.getItem('token');

  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isScrolled,    setIsScrolled]    = useState(false);

  const [pushEnabled,    setPushEnabled]    = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushLoading,    setPushLoading]    = useState(false);

  const profileRef = useRef(null);

  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    if (!user || !('Notification' in window)) return;
    const perm = Notification.permission;
    setPushPermission(perm);
    checkPushSubscription().then(async (enabled) => {
      if (perm === 'granted' && !enabled) {
        // Permission already granted but subscription missing/expired — silently re-subscribe
        const ok = await subscribeToPush(token);
        setPushEnabled(ok);
      } else {
        setPushEnabled(enabled);
      }
      // Show banner only if the user hasn't decided yet
      if (perm === 'default' && !sessionStorage.getItem('push-banner-dismissed')) {
        setShowPushBanner(true);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION') {
        setNotifications(prev => {
          const newN = { ...event.data.payload, id: Date.now() + Math.random(), readAt: null };
          const updated = [newN, ...prev].slice(0, 50);
          saveNotifications(updated);
          return updated;
        });
        setUnreadCount(prev => prev + 1);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [user]);

  /* Auto-cleanup: remove notifications read >24h ago */
  useEffect(() => {
    const cleanup = () => {
      setNotifications(prev => {
        const now = Date.now();
        const updated = prev.filter(n => !n.readAt || (now - n.readAt) < TTL_MS);
        if (updated.length !== prev.length) saveNotifications(updated);
        return updated;
      });
    };
    cleanup();
    const id = setInterval(cleanup, 60000);
    return () => clearInterval(id);
  }, []);

  /* Sync when Notifications page modifies the store */
  useEffect(() => {
    const onUpdate = () => {
      const latest = loadNotifications();
      setNotifications(latest);
      setUnreadCount(latest.filter(n => !n.readAt).length);
    };
    window.addEventListener('notif-updated', onUpdate);
    return () => window.removeEventListener('notif-updated', onUpdate);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const dismissPushBanner = () => {
    setShowPushBanner(false);
    sessionStorage.setItem('push-banner-dismissed', '1');
  };

  const handleEnablePush = async () => {
    setPushLoading(true);
    setShowPushBanner(false);
    sessionStorage.setItem('push-banner-dismissed', '1');
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        const ok = await subscribeToPush(token);
        if (ok) setPushEnabled(true);
      }
    } catch (e) {
      console.error('[Push] Enable failed:', e);
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try { await unsubscribeFromPush(token); setPushEnabled(false); } catch {}
    finally { setPushLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: isAdmin ? '/admin/overview' : isTeacher ? '/teacher' : '/', label: 'Home', Icon: Home, show: true },
    { to: '/category-dashboard', label: 'Dashboard',  Icon: LayoutDashboard, show: !!user && !isAdmin && !isTeacher },
    { to: '/resources',          label: 'Resources',  Icon: BookOpen,        show: !isAdmin, mobile: isTeacher ? false : undefined },
    { to: '/official-tests',     label: 'Official Tests', Icon: Globe,       show: !!user && !isAdmin },
    { to: '/teacher/tests',      label: 'My Tests',   Icon: ClipboardList,   show: isTeacher && !isAdmin, mobile: false },
    { to: '/admin/pending',      label: 'Approvals',  Icon: ClipboardList,   show: isAdmin, mobile: false },
    { to: '/admin/resources',    label: 'Resources',  Icon: BookOpen,        show: isAdmin, mobile: false },
    { to: '/admin/folders',      label: 'Folders',    Icon: Folder,          show: isAdmin, mobile: false },
    { to: '/admin/messages',     label: 'Messages',   Icon: Mail,            show: isAdmin, mobile: false },
    { to: '/admin',              label: 'Admin',      Icon: Shield,          show: isAdmin },
    { to: '/contact',            label: 'Contact',    Icon: Mail,            show: true },
  ].filter(l => l.show);

  const rm = ROLE_META[user?.role] || ROLE_META.student;

  return (
    <>
      {/* Push notification permission banner */}
      {user && showPushBanner && (
        <div className="nh-push-banner">
          <Bell size={15} strokeWidth={2.5} className="nh-push-banner-icon"/>
          <span className="nh-push-banner-text">Enable browser notifications to get real-time updates</span>
          <button className="nh-push-banner-yes" onClick={handleEnablePush} disabled={pushLoading}>
            {pushLoading ? <Loader2 size={13} className="spin"/> : null}
            Enable
          </button>
          <button className="nh-push-banner-no" onClick={dismissPushBanner}>Not now</button>
        </div>
      )}
      <header className={`nh-header ${isScrolled ? 'nh-scrolled' : ''}`}>
        <div className="nh-inner">

          {/* Logo */}
          <Link to="/" className="nh-logo">
            <img src={logo} alt="AcadHub" className="nh-logo-img" />
            <span className="nh-logo-text">AcadHub</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="nh-nav">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={`nh-link ${isActive(to) ? 'nh-link-active' : ''}`}>
                {label}
                {isActive(to) && <span className="nh-link-dot"/>}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="nh-right">

            {/* Notification bell → navigates to /notifications page */}
            {user && (
              <button
                className="nh-icon-btn nh-notif-btn"
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
              >
                <Bell size={17} strokeWidth={2}/>
                {unreadCount > 0 && (
                  <span className="nh-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            )}

            {/* Profile dropdown */}
            {user ? (
              <div ref={profileRef} className="nh-profile-wrap">
                <button className="nh-profile-btn" onClick={() => setProfileOpen(v => !v)}>
                  <Avatar user={user} size={32}/>
                  <span className="nh-profile-name">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`nh-chevron ${profileOpen ? 'nh-chevron-open' : ''}`}/>
                </button>

                {profileOpen && (
                  <div className="nh-dropdown nh-profile-drop">
                    {/* User info */}
                    <div className="nh-drop-user">
                      <Avatar user={user} size={40}/>
                      <div className="nh-drop-user-info">
                        <span className="nh-drop-user-name">{user.name}</span>
                        <span className="nh-drop-user-email">{user.email}</span>
                      </div>
                    </div>
                    <span className="nh-role-pill" style={{ background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>
                      {rm.label}
                    </span>
                    <div className="nh-drop-divider"/>
                    <Link to="/my-account" className="nh-drop-item">
                      <User size={14}/> My Profile
                    </Link>
                    <Link to="/my-account" className="nh-drop-item">
                      <Settings size={14}/> Settings
                    </Link>
                    {(isTeacher || isAdmin) && (
                      <Link to="/upload" className="nh-drop-item">
                        <Upload size={14}/> Upload Resource
                      </Link>
                    )}
                    <div className="nh-drop-divider"/>
                    <button className="nh-drop-item nh-drop-logout" onClick={handleLogout}>
                      <LogOut size={14}/> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nh-auth-btns">
                <Link to="/login"  className="nh-btn-ghost">Login</Link>
                <Link to="/signup" className="nh-btn-primary">Sign Up</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="nh-hamburger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
              {mobileOpen ? <X size={20} strokeWidth={2.5}/> : <Menu size={20} strokeWidth={2.5}/>}
              {!mobileOpen && unreadCount > 0 && <span className="nh-ham-dot"/>}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="nh-backdrop" onClick={() => setMobileOpen(false)}/>}

      {/* Mobile drawer */}
      <div className={`nh-drawer ${mobileOpen ? 'nh-drawer-open' : ''}`}>
        <div className="nh-drawer-inner">

          {/* Drawer header */}
          <div className="nh-drawer-top">
            <Link to="/" className="nh-logo" onClick={() => setMobileOpen(false)}>
              <img src={logo} alt="AcadHub" className="nh-logo-img"/>
              <span className="nh-logo-text">AcadHub</span>
            </Link>
            <button className="nh-icon-btn" onClick={() => setMobileOpen(false)}><X size={18}/></button>
          </div>

          {/* User card */}
          {user && (
            <div className="nh-drawer-user">
              <Avatar user={user} size={46}/>
              <div className="nh-drawer-user-info">
                <span className="nh-drawer-user-name">{user.name}</span>
                <span className="nh-drawer-user-email">{user.email}</span>
              </div>
              <span className="nh-role-pill" style={{ background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>
                {rm.label}
              </span>
            </div>
          )}

          {/* Nav links */}
          <nav className="nh-drawer-nav">
            {navLinks.filter(l => l.mobile !== false).map(({ to, label, Icon }) => (
              <Link key={to} to={to}
                className={`nh-drawer-link ${isActive(to) ? 'nh-drawer-link-active' : ''}`}
                onClick={() => setMobileOpen(false)}>
                <Icon size={16} strokeWidth={2}/>
                {label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="nh-drawer-footer">
            {user ? (
              <>
                <Link to="/my-account" className="nh-drawer-action" onClick={() => setMobileOpen(false)}>
                  <Settings size={15}/> Account Settings
                </Link>
                <button className="nh-drawer-action nh-drawer-logout" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                  <LogOut size={15}/> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login"  className="nh-drawer-action" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/signup" className="nh-drawer-action nh-drawer-action-primary" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
