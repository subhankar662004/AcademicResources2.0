import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, Trash2, X, CheckCircle, BellOff } from 'lucide-react';
import { loadNotifications, saveNotifications, formatAge, TTL_MS } from '../utils/notifications';

/* ── Swipeable row ── */
function SwipeNotifItem({ n, onDelete, onNavigate }) {
  const [tx, setTx]         = useState(0);
  const [dragging, setDrag] = useState(false);
  const startX = useRef(null);
  const THRESHOLD = 80;

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setDrag(true); };
  const onTouchMove  = (e) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff > 0) setTx(diff);
  };
  const onTouchEnd = () => {
    setDrag(false);
    if (tx >= THRESHOLD) { onDelete(); } else { setTx(0); }
    startX.current = null;
  };

  return (
    <div className="np-swipe-wrap">
      {tx > 20 && (
        <div className="np-delete-bg">
          <Trash2 size={14}/> Delete
        </div>
      )}
      <div
        className={`np-notif-row${n.readAt ? '' : ' np-notif-unread'}`}
        style={{
          transform: `translateX(${tx}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease',
          opacity: Math.max(0.3, 1 - tx / 200),
          cursor: n.url ? 'pointer' : 'default',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (tx < 10) onNavigate(); }}
      >
        {/* Unread dot */}
        <div className="np-dot-col">
          {!n.readAt && <span className="np-unread-dot"/>}
        </div>

        {/* Bell icon */}
        <div className="np-bell-col">
          <Bell size={15} className="np-bell-icon"/>
        </div>

        {/* Content */}
        <div className="np-content">
          <span className="np-text">{n.body || n.message || String(n)}</span>
          <span className="np-age">{formatAge(n.timestamp || n.readAt)}</span>
        </div>

        {/* Right side */}
        <div className="np-row-right">
          {n.url && <ChevronRight size={14} className="np-chevron"/>}
          <button
            className="np-del-btn"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Dismiss"
          >
            <X size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => loadNotifications());

  /* Stay in sync when Header adds new notifications */
  useEffect(() => {
    const onUpdate = () => setNotifications(loadNotifications());
    window.addEventListener('notif-updated', onUpdate);
    return () => window.removeEventListener('notif-updated', onUpdate);
  }, []);

  /* Auto-cleanup: remove notifications read >24h ago */
  useEffect(() => {
    const now = Date.now();
    const cleaned = notifications.filter(n => !n.readAt || (now - n.readAt) < TTL_MS);
    if (cleaned.length !== notifications.length) {
      setNotifications(cleaned);
      saveNotifications(cleaned);
    }
  }, []);

  const deleteOne = (id) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const handleNavigate = (n) => {
    if (n.url) navigate(n.url);
  };

  const unread = notifications.filter(n => !n.readAt).length;

  return (
    <div className="np-page">
      {/* Header bar */}
      <div className="np-header">
        <button className="np-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={18}/>
        </button>
        <div className="np-header-info">
          <h1 className="np-title">Notifications</h1>
          {unread > 0 && (
            <span className="np-unread-badge">{unread} new</span>
          )}
        </div>
        {notifications.length > 0 && (
          <button className="np-clear-btn" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="np-hint">
        <BellOff size={12} style={{ display: 'inline', marginRight: 4 }}/>
        Swipe right on any notification to delete it · Auto-removed 24 h after reading
      </p>

      {/* List */}
      <div className="np-list">
        {notifications.length === 0 ? (
          <div className="np-empty">
            <div className="np-empty-icon">
              <Bell size={36} color="#a5b4fc" strokeWidth={1.5}/>
            </div>
            <h3 className="np-empty-title">All caught up!</h3>
            <p className="np-empty-sub">New notifications will appear here</p>
          </div>
        ) : (
          notifications.map(n => (
            <SwipeNotifItem
              key={n.id || n.timestamp}
              n={n}
              onDelete={() => deleteOne(n.id)}
              onNavigate={() => handleNavigate(n)}
            />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <p className="np-count-footer">
          <CheckCircle size={12} style={{ display: 'inline', marginRight: 4, color: '#6366f1' }}/>
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
