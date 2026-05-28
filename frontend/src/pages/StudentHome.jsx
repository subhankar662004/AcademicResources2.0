import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import {
  BookOpen, Brain, Upload, Trophy, Target, TrendingUp,
  CheckCircle, Clock, ArrowRight, Star, Zap, BarChart2,
  Award, Play, ChevronRight, Loader2, Flame, Search,
  FileText, Users, CalendarDays, UserCheck, PieChart,
  CheckCircle2, XCircle, TimerReset,
} from 'lucide-react';

const TIPS = [
  'Consistency beats cramming — study a little every day.',
  'Review your wrong answers. Mistakes are the best teachers.',
  'Take short breaks every 25 minutes to stay focused.',
  'Teach what you learn to someone else to truly master it.',
  'Sleep well before a test — rest sharpens recall significantly.',
  'Practice with timed tests to build exam-day confidence.',
  'Break big topics into smaller chunks and tackle one at a time.',
];

function greet(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name.split(' ')[0]}!`;
}

function computeStreak(results) {
  if (!results.length) return 0;
  const daySet = new Set(results.map(r => new Date(r.submittedAt).toDateString()));
  const sorted = [...daySet].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let expected = new Date(); expected.setHours(0, 0, 0, 0);
  for (const day of sorted) {
    const d = new Date(day); d.setHours(0, 0, 0, 0);
    if (Math.round((expected - d) / 86400000) <= 1) { streak++; expected = d; }
    else break;
  }
  return streak;
}

function profileCompletion(user, category) {
  let score = 0;
  if (user?.name?.trim()) score += 25;
  if (user?.bio?.trim())  score += 25;
  if (user?.avatar)       score += 25;
  if (category)           score += 25;
  return score;
}

const UPLOAD_STATUS_META = {
  approved: { label: 'Approved', color: '#059669', bg: '#f0fdf4', Icon: CheckCircle },
  pending:  { label: 'Pending',  color: '#d97706', bg: '#fffbeb', Icon: TimerReset },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
};

function getGrade(pct) {
  if (pct >= 90) return { label: 'A+', color: '#059669' };
  if (pct >= 80) return { label: 'A',  color: '#10b981' };
  if (pct >= 70) return { label: 'B+', color: '#3b82f6' };
  if (pct >= 60) return { label: 'B',  color: '#6366f1' };
  if (pct >= 50) return { label: 'C',  color: '#f59e0b' };
  return { label: 'F', color: '#ef4444' };
}

function ScoreRing({ pct, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const grade = getGrade(pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={grade.color} strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <text
        x={size/2} y={size/2 + 5}
        textAnchor="middle"
        style={{ fill: grade.color, fontSize: size < 60 ? 11 : 13, fontWeight: 800, transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function StudentHome() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [code,      setCode]      = useState('');
  const [codeErr,   setCodeErr]   = useState('');
  const [myUploads, setMyUploads] = useState([]);

  const selectedCategory = localStorage.getItem('selectedCategory');

  // All hooks must come before any conditional return (React Rules of Hooks)
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/testSubmission/my-results/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setResults(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`${API_URL}/api/resources/my-resources`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setMyUploads(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {});
  }, [user?.id]);

  // Redirect first-time students to pick a category (after all hooks)
  if (!selectedCategory) {
    return <Navigate to="/choose-category" replace />;
  }

  const tip = TIPS[new Date().getDay() % TIPS.length];

  const total     = results.length;
  const avgScore  = total ? Math.round(results.reduce((s, r) => s + (r.score / r.total) * 100, 0) / total) : 0;
  const bestScore = total ? Math.round(Math.max(...results.map(r => (r.score / r.total) * 100))) : 0;
  const passed    = results.filter(r => (r.score / r.total) >= 0.5).length;
  const recent    = results.slice(0, 5);
  const chartData = results.slice(0, 7).reverse();

  const streak     = computeStreak(results);
  const profilePct = profileCompletion(user, selectedCategory);

  // Subject-wise performance breakdown
  const subjectMap = {};
  results.forEach(r => {
    const subj = r.testId?.subject || r.testId?.category || 'General';
    if (!subjectMap[subj]) subjectMap[subj] = { sum: 0, count: 0 };
    subjectMap[subj].sum   += (r.score / r.total) * 100;
    subjectMap[subj].count += 1;
  });
  const subjectData = Object.entries(subjectMap)
    .map(([subj, { sum, count }]) => ({ subj, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);

  const stats = [
    { label: 'Tests Taken',   value: total,        Icon: BookOpen,    color: '#2563eb', bg: '#eff6ff' },
    { label: 'Avg Score',     value: `${avgScore}%`, Icon: BarChart2,  color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Best Score',    value: `${bestScore}%`, Icon: Trophy,    color: '#059669', bg: '#f0fdf4' },
    { label: 'Tests Passed',  value: passed,        Icon: CheckCircle, color: '#f59e0b', bg: '#fffbeb' },
  ];

  const quickActions = [
    { label: 'Browse Resources', desc: 'Notes, papers & books',      Icon: Search,       to: '/resources',      color: '#2563eb' },
    { label: 'AI Practice',      desc: 'Generate smart tests',        Icon: Brain,        to: '/ai-generator',   color: '#7c3aed' },
    { label: 'Upload Notes',     desc: 'Share with community',        Icon: Upload,       to: '/upload',         color: '#059669' },
    { label: 'Official Tests',   desc: `${selectedCategory} papers`,  Icon: FileText,     to: '/official-tests', color: '#f59e0b' },
  ];

  const handleEnterCode = (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) { setCodeErr('Please enter a test code'); return; }
    setCodeErr('');
    navigate(`/take-test/${trimmed}`);
  };

  return (
    <div className="sh-page">

      {/* ── Welcome banner ── */}
      <motion.div className="sh-banner" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="sh-banner-left">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="sh-avatar" />
            : <div className="sh-avatar sh-avatar-init">{user?.name?.[0]?.toUpperCase() || 'S'}</div>
          }
          <div style={{ flex: 1 }}>
            <h2 className="sh-greeting">{greet(user?.name || 'Student')}</h2>
            <p className="sh-sub">
              {total === 0
                ? 'Welcome! Start your first test to track your progress.'
                : `You've completed ${total} test${total !== 1 ? 's' : ''} so far. Keep it up!`}
            </p>
            <div className="sh-category-badge">
              <span className="sh-category-pill">{selectedCategory}</span>
              {streak > 0 && (
                <span className="sh-streak-badge">
                  <Flame size={12} color="#f59e0b" />
                  {streak} day streak
                </span>
              )}
              <button className="sh-change-cat" onClick={() => navigate('/choose-category')}>
                Change category
              </button>
            </div>
            {/* Profile completion bar */}
            {profilePct < 100 && (
              <div className="sh-profile-meter">
                <div className="sh-profile-meter-row">
                  <span><UserCheck size={11} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Profile {profilePct}% complete</span>
                  <Link to="/my-account" className="sh-profile-link">Complete now</Link>
                </div>
                <div className="sh-profile-bar-track">
                  <motion.div className="sh-profile-bar-fill" style={{ width: `${profilePct}%` }} initial={{ width: 0 }} animate={{ width: `${profilePct}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sh-tip">
          <Flame size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span><strong>Tip of the day:</strong> {tip}</span>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <div className="sh-stats-grid">
        {stats.map(({ label, value, Icon, color, bg }, i) => (
          <motion.div
            key={label}
            className="sh-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.4 }}
          >
            <div className="sh-stat-icon" style={{ background: bg }}>
              <Icon size={20} color={color} />
            </div>
            <div className="sh-stat-val" style={{ color }}>
              {loading ? '—' : value}
            </div>
            <div className="sh-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Enter test code ── */}
      <motion.div className="sh-code-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
        <div className="sh-code-banner-left">
          <div className="sh-code-icon"><Play size={20} color="white" /></div>
          <div>
            <div className="sh-code-title">Enter Test Code</div>
            <div className="sh-code-desc">Have a code from your teacher? Paste it here to start instantly.</div>
          </div>
        </div>
        <form className="sh-code-form" onSubmit={handleEnterCode}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={code}
                onChange={e => { setCode(e.target.value); setCodeErr(''); }}
                placeholder="e.g. MATH-2024-XYZ"
                className="sh-code-input"
              />
              <button type="submit" className="sh-code-btn">
                Start <ArrowRight size={15} />
              </button>
            </div>
            {codeErr && <span style={{ fontSize: 12, color: '#ef4444' }}>{codeErr}</span>}
          </div>
        </form>
      </motion.div>

      {/* ── Subject performance breakdown ── */}
      {subjectData.length > 0 && !loading && (
        <motion.div className="sh-card sh-subject-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.44 }}>
          <div className="sh-card-hdr">
            <span className="sh-card-title"><PieChart size={15} /> Performance by Subject</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subjectData.length} subject{subjectData.length > 1 ? 's' : ''}</span>
          </div>
          <div className="sh-subj-list">
            {subjectData.map(({ subj, avg, count }) => {
              const grade = getGrade(avg);
              return (
                <div key={subj} className="sh-subj-row">
                  <div className="sh-subj-name">
                    <span>{subj}</span>
                    <span className="sh-subj-count">{count} test{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="sh-subj-bar-track">
                    <motion.div
                      className="sh-subj-bar-fill"
                      style={{ background: grade.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${avg}%` }}
                      transition={{ delay: 0.35, duration: 0.65, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="sh-subj-avg" style={{ color: grade.color }}>{avg}%</span>
                  <span className="sh-grade-pill" style={{ color: grade.color, background: grade.color + '18', fontSize: 11, padding: '2px 8px' }}>
                    {grade.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Two-column layout ── */}
      <div className="sh-cols">

        {/* ── Recent Results ── */}
        <motion.div className="sh-card" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32, duration: 0.44 }}>
          <div className="sh-card-hdr">
            <span className="sh-card-title"><Clock size={15} /> Recent Results</span>
            <Link to="/category-dashboard" className="sh-card-link">View all <ChevronRight size={13} /></Link>
          </div>

          {loading ? (
            <div className="sh-spinner"><Loader2 size={24} className="spin" color="var(--primary)" /></div>
          ) : recent.length === 0 ? (
            <div className="sh-empty">
              <Target size={40} color="var(--border)" />
              <p>No tests taken yet</p>
              <span>Enter a test code above to get started!</span>
            </div>
          ) : (
            <div className="sh-results-list">
              {recent.map((r, i) => {
                const pct   = Math.round((r.score / r.total) * 100);
                const grade = getGrade(pct);
                const date  = new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={r._id} className="sh-result-row">
                    <ScoreRing pct={pct} size={52} />
                    <div className="sh-result-info">
                      <span className="sh-result-name">{r.testId?.title || 'Unnamed Test'}</span>
                      <div className="sh-result-meta-row">
                        <span className="sh-meta-chip" style={{ background: '#eff6ff', color: '#2563eb' }}>
                          <FileText size={11} /> {r.testId?.subject || r.testId?.category || 'General'}
                        </span>
                        <span className="sh-meta-chip">
                          <Clock size={11} /> {date}
                        </span>
                        <span className="sh-meta-chip" style={{ background: grade.color + '18', color: grade.color }}>
                          {r.score}/{r.total} correct
                        </span>
                      </div>
                      <div className="sh-result-bar-wrap">
                        <div className="sh-result-bar-track">
                          <motion.div
                            className="sh-result-bar-fill"
                            style={{ background: grade.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                          />
                        </div>
                        <span className="sh-result-pct" style={{ color: grade.color }}>{pct}%</span>
                      </div>
                    </div>
                    <span className="sh-grade-pill" style={{ color: grade.color, background: grade.color + '18' }}>
                      {grade.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Right column ── */}
        <div className="sh-right-col">

          {/* Performance trend chart */}
          <motion.div className="sh-card" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.37, duration: 0.44 }}>
            <div className="sh-card-hdr">
              <span className="sh-card-title"><TrendingUp size={15} /> Performance Trend</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last {chartData.length} tests</span>
            </div>
            {!loading && chartData.length > 0 ? (
              <>
                <div className="sh-chart">
                  {chartData.map((r, i) => {
                    const pct   = Math.round((r.score / r.total) * 100);
                    const grade = getGrade(pct);
                    return (
                      <div key={r._id} className="sh-chart-col" title={`${r.testId?.title || 'Test'}: ${pct}%`}>
                        <span className="sh-chart-pct">{pct}%</span>
                        <div className="sh-chart-track">
                          <motion.div
                            className="sh-chart-fill"
                            style={{ background: grade.color }}
                            initial={{ height: 0 }}
                            animate={{ height: `${pct}%` }}
                            transition={{ delay: 0.5 + i * 0.08, duration: 0.55 }}
                          />
                        </div>
                        <span className="sh-chart-label">#{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="sh-chart-legend">
                  {[['#059669','≥70% Good'],['#f59e0b','50–69% OK'],['#ef4444','<50% Needs work']].map(([c, l]) => (
                    <span key={l} className="sh-legend-item">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                      {l}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="sh-empty" style={{ padding: '24px 0' }}>
                <BarChart2 size={32} color="var(--border)" />
                <p>Complete tests to see your trend</p>
              </div>
            )}
          </motion.div>

          {/* My Uploads */}
          <motion.div className="sh-card" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.40, duration: 0.44 }}>
            <div className="sh-card-hdr">
              <span className="sh-card-title"><Upload size={15} /> My Uploads</span>
              <Link to="/my-account" className="sh-card-link">View all <ChevronRight size={13} /></Link>
            </div>
            {myUploads.length === 0 ? (
              <div className="sh-empty" style={{ padding: '16px 0' }}>
                <Upload size={28} color="var(--border)" />
                <p style={{ fontSize: 13 }}>No uploads yet</p>
                <Link to="/upload" className="sh-card-link" style={{ marginTop: 4 }}>Upload your first resource</Link>
              </div>
            ) : (
              <div className="sh-uploads-list">
                {myUploads.map(u => {
                  const meta = UPLOAD_STATUS_META[u.status] || UPLOAD_STATUS_META.pending;
                  return (
                    <div key={u._id} className="sh-upload-row">
                      <div className="sh-upload-icon" style={{ background: meta.bg }}>
                        <meta.Icon size={14} color={meta.color} />
                      </div>
                      <div className="sh-upload-info">
                        <span className="sh-upload-name">{u.title}</span>
                        <span className="sh-upload-sub">{u.category || 'General'}</span>
                      </div>
                      <span className="sh-upload-status" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Quick actions */}
          <motion.div className="sh-card" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42, duration: 0.44 }}>
            <div className="sh-card-hdr">
              <span className="sh-card-title"><Zap size={15} /> Quick Actions</span>
            </div>
            <div className="sh-actions-grid">
              {quickActions.map(({ label, desc, Icon, to, color }) => (
                <Link key={label} to={to} className="sh-action-card">
                  <div className="sh-action-icon" style={{ background: color + '18' }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div className="sh-action-label">{label}</div>
                    <div className="sh-action-desc">{desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Progress summary */}
          {total > 0 && !loading && (
            <motion.div className="sh-card sh-progress-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}>
              <div className="sh-card-hdr">
                <span className="sh-card-title"><Award size={15} /> Your Progress</span>
              </div>
              <div className="sh-progress-rows">
                {[
                  { label: 'Pass Rate',    value: total ? Math.round((passed / total) * 100) : 0, color: '#059669' },
                  { label: 'Avg Score',    value: avgScore,  color: '#2563eb' },
                  { label: 'Best Score',   value: bestScore, color: '#7c3aed' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="sh-progress-row">
                    <span className="sh-progress-label">{label}</span>
                    <div className="sh-progress-bar-track">
                      <motion.div
                        className="sh-progress-bar-fill"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="sh-progress-val" style={{ color }}>{value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
