import React, { useState } from 'react';
import { useAdmin } from './AdminContext';
import { API_URL } from '../../config';
import {
  Radio, Send, Loader2, CheckCircle, XCircle, Search,
  Users, UserCheck, Globe, Mail, Bell, ChevronRight,
  MessageSquare, Target, Hash, ArrowLeft, FlaskConical,
} from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { v: 'all',      label: 'All Users',     desc: 'Send to everyone on the platform', Icon: Globe,      color: '#6366f1', bg: '#eef2ff' },
  { v: 'role',     label: 'By Role',       desc: 'Target a specific user role',      Icon: UserCheck,  color: '#0891b2', bg: '#ecfeff' },
  { v: 'specific', label: 'Specific Users',desc: 'Hand-pick individual recipients',  Icon: Users,      color: '#059669', bg: '#ecfdf5' },
];

const CHANNEL_OPTIONS = [
  { v: 'email', label: 'Email',             desc: 'Delivered to inbox',  Icon: Mail, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { v: 'push',  label: 'Push Notification', desc: 'Instant device alert', Icon: Bell, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
];

const STEPS = [
  { n: 1, label: 'Audience',  Icon: Target        },
  { n: 2, label: 'Channel',   Icon: Hash          },
  { n: 3, label: 'Compose',   Icon: MessageSquare },
];

export default function AdminBroadcast() {
  const { users, toast, token } = useAdmin();

  const [target,     setTarget]     = useState('all');
  const [role,       setRole]       = useState('student');
  const [userIds,    setUserIds]    = useState([]);
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');
  const [channels,   setChannels]   = useState(['email']);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [step,       setStep]       = useState(1);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult,  setTestResult]  = useState(null);

  const toggleChannel = (v) =>
    setChannels(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]);

  const toggleUser = (id) =>
    setUserIds(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);

  const send = async () => {
    if (!message.trim()) { toast.error('Message is required'); return; }
    if (!channels.length) { toast.error('Select at least one channel'); return; }
    setLoading(true); setResult(null);
    try {
      const body = { targetType: target, subject, message, channels };
      if (target === 'role')     body.role    = role;
      if (target === 'specific') body.userIds = userIds;
      const res = await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.message || 'Broadcast failed' });
        toast.error(data.message || 'Broadcast failed');
      } else {
        setResult({
          ok: true,
          recipients: data.recipients,
          emailsSent: data.emailsSent ?? data.results?.email?.sent,
          pushSent:   data.pushSent   ?? data.results?.push?.sent,
        });
        toast.success(`Sent to ${data.recipients} user${data.recipients !== 1 ? 's' : ''}!`);
        setMessage(''); setSubject(''); setUserIds([]);
      }
    } catch {
      setResult({ ok: false, message: 'Connection error' });
      toast.error('Connection error');
    } finally { setLoading(false); }
  };

  const sendTestPush = async () => {
    setTestLoading(true); setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestResult({ ok: false, message: data.message });
        toast.error(data.message);
      }
    } catch {
      setTestResult({ ok: false, message: 'Connection error' });
      toast.error('Connection error');
    } finally { setTestLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const recipientCount = target === 'all'
    ? users.length
    : target === 'role'
    ? users.filter(u => u.role === role).length
    : userIds.length;

  return (
    <div className="adm-page">

      {/* ── Page Header ── */}
      <div className="bc2-header">
        <div className="bc2-header-left">
          <div className="bc2-header-icon">
            <Radio size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="bc2-header-title">Broadcast Message</h1>
            <p className="bc2-header-sub">Send announcements and alerts to your users</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Test Push Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              className="bc2-test-push-btn"
              onClick={sendTestPush}
              disabled={testLoading}
              title="Send a test push notification to yourself to verify push is working"
            >
              {testLoading
                ? <><Loader2 size={13} className="spin"/> Testing…</>
                : <><FlaskConical size={13}/> Test Push</>
              }
            </button>
            {testResult && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: testResult.ok ? '#059669' : '#dc2626',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {testResult.ok ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                {testResult.message}
              </span>
            )}
          </div>
          {recipientCount > 0 && (
            <div className="bc2-recipient-pill">
              <Users size={13} />
              <span>{recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Step Progress Bar ── */}
      <div className="bc2-stepper">
        {STEPS.map(({ n, label, Icon }, idx) => {
          const done   = step > n;
          const active = step === n;
          return (
            <React.Fragment key={n}>
              <button
                className={`bc2-step-item ${active ? 'bc2-step-active' : ''} ${done ? 'bc2-step-done' : ''}`}
                onClick={() => setStep(n)}
              >
                <div className="bc2-step-circle">
                  {done ? <CheckCircle size={15} /> : <Icon size={14} />}
                </div>
                <span className="bc2-step-label">{label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`bc2-step-line ${done ? 'bc2-step-line-done' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Audience ── */}
      {step === 1 && (
        <div className="bc2-card">
          <div className="bc2-card-title">
            <Target size={16} color="#6366f1" />
            Target Audience
          </div>

          <div className="bc2-audience-grid">
            {AUDIENCE_OPTIONS.map(({ v, label, desc, Icon, color, bg }) => (
              <button
                key={v}
                className={`bc2-audience-card ${target === v ? 'bc2-audience-active' : ''}`}
                style={target === v ? { borderColor: color, background: bg } : {}}
                onClick={() => setTarget(v)}
              >
                <div className="bc2-audience-icon-wrap" style={{ background: bg, color }}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div className="bc2-audience-label" style={target === v ? { color } : {}}>{label}</div>
                <div className="bc2-audience-desc">{desc}</div>
                {target === v && (
                  <div className="bc2-audience-check" style={{ color }}>
                    <CheckCircle size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {target === 'role' && (
            <div className="bc2-sub-section">
              <label className="bc2-label">Select Role</label>
              <div className="bc2-role-chips">
                {['student', 'teacher', 'admin'].map(r => (
                  <button
                    key={r}
                    className={`bc2-role-chip ${role === r ? 'bc2-role-chip-active' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                    <span className="bc2-role-count">{users.filter(u => u.role === r).length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {target === 'specific' && (
            <div className="bc2-sub-section">
              <div className="bc2-picker-head">
                <label className="bc2-label">Select Users</label>
                {userIds.length > 0 && (
                  <span className="bc2-selected-badge">{userIds.length} selected</span>
                )}
              </div>
              <div className="bc2-search-box">
                <Search size={13} color="#9ca3af" />
                <input
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="bc2-user-list">
                {filteredUsers.map(u => {
                  const checked = userIds.includes(u._id);
                  return (
                    <label key={u._id} className={`bc2-user-row ${checked ? 'bc2-user-row-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(u._id)}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div className="bc2-user-avatar">{u.name?.[0]?.toUpperCase() || '?'}</div>
                      <div className="bc2-user-info">
                        <div className="bc2-user-name">{u.name}</div>
                        <div className="bc2-user-email">{u.email}</div>
                      </div>
                      <span className="bc2-user-role-badge">{u.role}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bc2-actions">
            <button className="bc2-btn-primary" onClick={() => setStep(2)}>
              Continue <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Channel ── */}
      {step === 2 && (
        <div className="bc2-card">
          <div className="bc2-card-title">
            <Hash size={16} color="#6366f1" />
            Delivery Channels
          </div>

          <div className="bc2-channel-grid">
            {CHANNEL_OPTIONS.map(({ v, label, desc, Icon, color, bg, border }) => {
              const active = channels.includes(v);
              return (
                <button
                  key={v}
                  className={`bc2-channel-card ${active ? 'bc2-channel-active' : ''}`}
                  style={active ? { background: bg, borderColor: border } : {}}
                  onClick={() => toggleChannel(v)}
                >
                  <div className="bc2-channel-icon" style={{ background: active ? bg : '#f3f4f6', color: active ? color : '#9ca3af' }}>
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <div className="bc2-channel-label" style={active ? { color } : {}}>{label}</div>
                  <div className="bc2-channel-desc">{desc}</div>
                  {active && <CheckCircle size={15} color={color} className="bc2-channel-check" />}
                </button>
              );
            })}
          </div>

          <div className="bc2-actions bc2-actions-between">
            <button className="bc2-btn-ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="bc2-btn-primary" onClick={() => setStep(3)}>
              Continue <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Compose ── */}
      {step === 3 && (
        <div className="bc2-card">
          <div className="bc2-card-title">
            <MessageSquare size={16} color="#6366f1" />
            Compose Message
          </div>

          <div className="bc2-field">
            <label className="bc2-label">
              Subject <span className="bc2-optional">optional</span>
            </label>
            <input
              className="bc2-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important Update — New Resources Added"
            />
          </div>

          <div className="bc2-field">
            <div className="bc2-field-head">
              <label className="bc2-label">Message <span className="bc2-required">*</span></label>
              <span className="bc2-char-count">{message.length} chars</span>
            </div>
            <textarea
              className="bc2-input bc2-textarea"
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement here…"
            />
          </div>

          <div className="bc2-summary">
            <div className="bc2-summary-title">Summary</div>
            <div className="bc2-summary-grid">
              <div className="bc2-summary-item">
                <span className="bc2-summary-key">Recipients</span>
                <span className="bc2-summary-val">{recipientCount} user{recipientCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="bc2-summary-item">
                <span className="bc2-summary-key">Channels</span>
                <span className="bc2-summary-val">{channels.join(' + ') || '—'}</span>
              </div>
              <div className="bc2-summary-item">
                <span className="bc2-summary-key">Audience</span>
                <span className="bc2-summary-val">
                  {target === 'all' ? 'Everyone' : target === 'role' ? role : `${userIds.length} selected`}
                </span>
              </div>
            </div>
          </div>

          {result && (
            <div className={`bc2-result ${result.ok ? 'bc2-result-ok' : 'bc2-result-err'}`}>
              {result.ok ? (
                <>
                  <CheckCircle size={22} />
                  <div>
                    <div className="bc2-result-title">Broadcast sent successfully!</div>
                    <div className="bc2-result-sub">
                      Delivered to <strong>{result.recipients}</strong> user{result.recipients !== 1 ? 's' : ''}
                      {result.emailsSent > 0 ? ` · ${result.emailsSent} email${result.emailsSent !== 1 ? 's' : ''}` : ''}
                      {result.pushSent > 0    ? ` · ${result.pushSent} push notification${result.pushSent !== 1 ? 's' : ''}` : ''}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={22} />
                  <div>
                    <div className="bc2-result-title">Broadcast failed</div>
                    <div className="bc2-result-sub">{result.message}</div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="bc2-actions bc2-actions-between">
            <button className="bc2-btn-ghost" onClick={() => setStep(2)}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="bc2-btn-send" onClick={send} disabled={loading}>
              {loading
                ? <><Loader2 size={15} className="spin" /> Sending…</>
                : <><Send size={15} /> Send Broadcast</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
