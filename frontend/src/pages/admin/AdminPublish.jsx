import { useState, useEffect } from 'react';
import { useAdmin } from './AdminContext';
import { API_URL } from '../../config';
import {
  Globe, CheckCircle, XCircle, Clock, Search, Loader2,
  BookOpen, Timer, User, AlertCircle, BadgeCheck, Filter,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'pending',  label: 'Pending',  color: '#d97706', bg: '#fffbeb', Icon: Clock },
  { id: 'approved', label: 'Approved', color: '#059669', bg: '#f0fdf4', Icon: BadgeCheck },
  { id: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
];

export default function AdminPublish() {
  const { authHeader, toast } = useAdmin();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [search, setSearch]     = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing]     = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/tests/publish-requests?status=${filter}`, { headers: authHeader() });
      if (res.ok) setRequests(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleApprove = async (id) => {
    setActing(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/tests/${id}/publish-approve`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        toast.success('Test approved and published on the platform!');
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        toast.error('Failed to approve');
      }
    } catch { toast.error('Connection error'); }
    finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    try {
      const res = await fetch(`${API_URL}/api/admin/tests/${rejectId}/publish-reject`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      });
      if (res.ok) {
        toast.success('Request rejected');
        setRequests(prev => prev.filter(r => r._id !== rejectId));
        setRejectId(null);
        setRejectNote('');
      } else {
        toast.error('Failed to reject');
      }
    } catch { toast.error('Connection error'); }
    finally { setActing(null); }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return !q ||
      r.title?.toLowerCase().includes(q) ||
      r.teacherName?.toLowerCase().includes(q) ||
      r.teacherId?.name?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q);
  });

  const counts = { pending: 0, approved: 0, rejected: 0 };
  requests.forEach(r => { if (counts[r.publishStatus] !== undefined) counts[r.publishStatus]++; });

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={20} color="var(--primary)"/> Teacher Publish Requests
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Review and approve teacher tests to publish them on the platform for all students.
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(({ id, label, color, bg, Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${filter === id ? color : 'var(--border)'}`,
              background: filter === id ? bg : 'var(--bg-white)',
              color: filter === id ? color : 'var(--text-muted)',
              fontWeight: filter === id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, teacher, category…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--bg-white)', color: 'var(--text)', boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 0', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spin" color="var(--primary)"/> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <Globe size={40} strokeWidth={1.4} style={{ marginBottom: 12, opacity: 0.4 }}/>
          <p style={{ fontWeight: 600, margin: 0 }}>No {filter} requests</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {filter === 'pending' ? 'When teachers request to publish their tests, they will appear here.' : `No ${filter} requests found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(r => {
            const teacher = r.teacherId?.name || r.teacherName || 'Unknown Teacher';
            const email   = r.teacherId?.email || '';
            const isPending = r.publishStatus === 'pending';
            return (
              <div key={r._id} style={{
                background: 'var(--bg-white)',
                border: '1.5px solid var(--border)',
                borderRadius: 12, padding: '18px 20px',
                display: 'flex', alignItems: 'flex-start',
                gap: 16, flexWrap: 'wrap',
              }}>
                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={20} color="var(--primary)"/>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11}/> {teacher}{email ? ` · ${email}` : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={11}/> {r.duration} min</span>
                    {r.category && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={11}/> {r.category}</span>}
                    {r.subject && <span>· {r.subject}</span>}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.description}</div>
                  )}
                  {r.publishStatus === 'rejected' && r.publishNote && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '5px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <AlertCircle size={12}/> Rejection reason: {r.publishNote}
                    </div>
                  )}
                  {r.publishStatus === 'approved' && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#059669', background: '#f0fdf4', padding: '5px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <BadgeCheck size={12}/> Published — visible to all students
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => handleApprove(r._id)}
                      disabled={acting === r._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: acting === r._id ? 0.6 : 1 }}
                    >
                      {acting === r._id ? <Loader2 size={13} className="spin"/> : <CheckCircle size={13}/>} Approve
                    </button>
                    <button
                      onClick={() => { setRejectId(r._id); setRejectNote(''); }}
                      disabled={acting === r._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: acting === r._id ? 0.6 : 1 }}
                    >
                      <XCircle size={13}/> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-white)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Reject Publish Request</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Optionally provide a reason so the teacher knows what to improve.</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectId(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!acting}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
