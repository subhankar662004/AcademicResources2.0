import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import {
  Globe, BookOpen, Timer, User, Search, Loader2,
  ChevronRight, BadgeCheck, Filter,
} from 'lucide-react';

const CAT_COLORS = {
  'CSE':      { bg: '#eef2ff', color: '#6366f1' },
  'SSC GD':   { bg: '#fef3c7', color: '#d97706' },
  'Agniveer': { bg: '#fce7f3', color: '#db2777' },
  'Nursing':  { bg: '#ecfdf5', color: '#059669' },
  'WBP':      { bg: '#eff6ff', color: '#2563eb' },
  'Railway':  { bg: '#fff7ed', color: '#ea580c' },
};
const fallback = { bg: '#f1f5f9', color: '#6366f1' };

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function PublishedTests() {
  const navigate = useNavigate();
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tests/published`);
        if (res.ok) setTests(await res.json());
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const cats = ['All', ...new Set(tests.map(t => t.category).filter(Boolean))];

  const filtered = tests.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.teacherName?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || t.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={26} color="var(--primary)"/> Official Tests
        </h1>
        <p>Platform-approved tests created by verified teachers — attempt anytime</p>
      </div>

      {/* Search + Category filter */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tests, subjects, teachers…"
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 9, border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--bg-white)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-muted)"/>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: catFilter === c ? 700 : 500, cursor: 'pointer',
                background: catFilter === c ? 'var(--primary)' : 'var(--bg-white)',
                color: catFilter === c ? '#fff' : 'var(--text-muted)',
                border: `1.5px solid ${catFilter === c ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin" color="var(--primary)"/> Loading official tests…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
          <Globe size={48} strokeWidth={1.3} style={{ marginBottom: 14, opacity: 0.35 }}/>
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>{search || catFilter !== 'All' ? 'No tests match your search' : 'No official tests yet'}</h3>
          <p style={{ fontSize: 13, margin: 0 }}>{search || catFilter !== 'All' ? 'Try different keywords or remove the filter.' : 'Teachers can request to publish their tests — check back soon!'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(t => {
            const { bg, color } = CAT_COLORS[t.category] || fallback;
            return (
              <div key={t._id} style={{
                background: 'var(--bg-white)', border: '1.5px solid var(--border)',
                borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={19} color={color}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                      {t.category && (
                        <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>{t.category}</span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Timer size={11}/> {t.duration} min</span>
                      {t.subject && <span>· {t.subject}</span>}
                    </div>
                  </div>
                </div>

                {t.description && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description}
                  </p>
                )}

                {/* Teacher credit */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input, #f8fafc)', padding: '6px 10px', borderRadius: 7 }}>
                  <User size={12}/>
                  <span>By <strong style={{ color: 'var(--text)' }}>{t.teacherName || 'Teacher'}</strong></span>
                  <BadgeCheck size={12} color="#059669" style={{ marginLeft: 2 }} title="Verified Teacher"/>
                  <span style={{ marginLeft: 'auto' }}>{fmt(t.createdAt)}</span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate(`/take-test/${t.shareCode}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 9, background: 'var(--primary)', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 'auto',
                  }}
                >
                  Attempt Now <ChevronRight size={15}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
