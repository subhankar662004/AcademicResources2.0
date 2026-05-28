import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import {
  ClipboardList, Brain, Clock, ChevronLeft, ChevronRight, Play,
  Trash2, CheckCircle, XCircle, AlertTriangle, Loader2, RotateCcw,
  BookOpen, Trophy, Target, Zap, Shield, Calendar, Timer,
  ListChecks, Eye, EyeOff, Award, TrendingUp, Minus, Star,
  Send, Flag,
} from 'lucide-react';

const fmt     = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const LETTERS = ['A', 'B', 'C', 'D'];

function DiffBadge({ dur }) {
  if (!dur) return null;
  const d = Number(dur);
  if (d <= 15) return <span className="diff-badge diff-quick"><Zap size={10}/> Quick</span>;
  if (d <= 30) return <span className="diff-badge diff-medium"><Timer size={10}/> Medium</span>;
  return <span className="diff-badge diff-long"><Flag size={10}/> Long</span>;
}

/* ── Animated SVG ring ── */
function ScoreRing({ score, total }) {
  const pct    = total ? Math.round((score / total) * 100) : 0;
  const r      = 60;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color  = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
  const grade  = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
  return (
    <div className="score-ring-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* bg track */}
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="14"/>
        {/* filled arc */}
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="white" strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' }}
        />
        <text x="80" y="72" textAnchor="middle" fontSize="28" fontWeight="900" fill="white">{pct}%</text>
        <text x="80" y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(255,255,255,0.75)">Grade {grade}</text>
        <text x="80" y="110" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)">{score} / {total}</text>
      </svg>
    </div>
  );
}

/* ── Stars based on % ── */
function Stars({ pct }) {
  const full = Math.round((pct / 100) * 5);
  return (
    <div className="result-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={20} fill={i <= full ? '#fbbf24' : 'none'} color={i <= full ? '#fbbf24' : 'rgba(255,255,255,0.3)'} strokeWidth={1.5}/>
      ))}
    </div>
  );
}

export default function Test() {
  const [tests,          setTests]          = useState([]);
  const [aiTests,        setAiTests]        = useState([]);
  const [selectedTest,   setSelectedTest]   = useState(null);
  const [currentTest,    setCurrentTest]    = useState(null);
  const [questions,      setQuestions]      = useState([]);
  const [answers,        setAnswers]        = useState({});
  const [timeLeft,       setTimeLeft]       = useState(0);
  const [timeTaken,      setTimeTaken]      = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [result,         setResult]         = useState(null);
  const [submitted,      setSubmitted]      = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [loadingTest,    setLoadingTest]    = useState(null);
  const [warning,        setWarning]        = useState('');
  const [activeQ,        setActiveQ]        = useState(0);
  const [showNav,        setShowNav]        = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const startTimeRef   = useRef(null);
  const questionRefs   = useRef([]);
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const selectedCategory = localStorage.getItem('selectedCategory');
  const pgTests   = usePagination(tests, 9);
  const pgAiTests = usePagination(aiTests, 9);

  /* ── Lock body scroll when submit modal is open ── */
  useEffect(() => {
    document.body.style.overflow = showSubmitModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSubmitModal]);

  useEffect(() => {
    try { const s = localStorage.getItem('testAnswers'); if (s) setAnswers(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (!selectedCategory) { navigate('/choose-category'); return; }
    fetch(`${API_URL}/api/admin/tests?category=${encodeURIComponent(selectedCategory)}`)
      .then(r => r.json()).then(d => setTests(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCategory, navigate]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/ai-tests/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) { setAiTests([]); return; }
        /* Show all if no category field set (legacy), filter when category matches */
        setAiTests(d.filter(t => !t.category || t.category === selectedCategory));
      })
      .catch(() => {});
  }, [user, selectedCategory]);

  useEffect(() => {
    if (!selectedTest || result || submitted) return;
    const t = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(t); handleSubmit(); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [selectedTest, result, submitted]);

  useEffect(() => {
    if (!selectedTest || result) return;

    const lastViolateRef = { current: 0 };

    const violate = (reason) => {
      const now = Date.now();
      if (now - lastViolateRef.current < 1500) return;
      lastViolateRef.current = now;
      setTabSwitchCount(prev => {
        const n = prev + 1;
        setWarning(
          n >= 3
            ? `Test auto-submitted: ${reason}`
            : `Violation ${n}/3: ${reason}. Test submits on 3rd violation.`
        );
        if (n >= 3) handleSubmit();
        return n;
      });
    };

    const onVisibility = () => { if (document.hidden) violate("You switched to another tab"); };
    const onBlur       = () => violate("You left the test window");
    const onMouseLeave = (e) => { if (e.relatedTarget === null) violate("You moved outside the test window"); };
    const onFSChange   = () => { if (!document.fullscreenElement) violate("You exited fullscreen mode"); };
    const onCtxMenu    = (e) => e.preventDefault();
    const onCopy       = (e) => e.preventDefault();
    const onCut        = (e) => e.preventDefault();
    const onKeyDown    = (e) => {
      // DevTools & view source
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if (e.ctrlKey && ['U','A','P'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      // Keyboard navigation lock — window/app switching
      if (e.altKey  && e.key === 'Tab')  { e.preventDefault(); violate('Alt+Tab detected'); return; }
      if (e.altKey  && e.key === 'F4')   { e.preventDefault(); return; }
      if (e.metaKey && e.key === 'Tab')  { e.preventDefault(); violate('Cmd+Tab detected'); return; }
      if (e.metaKey && ['d','D','h','H','m','M'].includes(e.key)) { e.preventDefault(); violate('Window shortcut detected'); return; }
      // Escape exits fullscreen — block at JS level
      if (e.key === 'Escape' && document.fullscreenElement) { e.preventDefault(); return; }
    };

    // Heartbeat: poll every 2 s — catches floating windows that don't trigger events
    const heartbeat = setInterval(() => {
      if (!document.hasFocus()) violate("Window lost focus — floating window or other app detected");
      if (!document.fullscreenElement) violate("Fullscreen was exited");
    }, 2000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('contextmenu', onCtxMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('contextmenu', onCtxMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('keydown', onKeyDown);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [selectedTest, result]);

  useEffect(() => { localStorage.setItem('testAnswers', JSON.stringify(answers)); }, [answers]);

  const scrollToQ = (idx) => {
    setActiveQ(idx);
    questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const loadTest = async (test) => {
    const now = new Date();
    if (test.startTime && now < new Date(test.startTime)) return setWarning('This test has not started yet.');
    if (test.endTime   && now > new Date(test.endTime))   return setWarning('This test has already ended.');
    if (!test.duration || Number(test.duration) <= 0)     return setWarning('Test duration is missing. Contact admin.');

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setWarning('Fullscreen is required to take this test. Please allow fullscreen in your browser and try again.');
      return;
    }
    if (!document.fullscreenElement) {
      setWarning('Could not enter fullscreen. Please allow fullscreen and try again.');
      return;
    }

    setLoadingTest(test._id);
    fetch(`${API_URL}/api/admin/tests/${test._id}/questions`)
      .then(r => r.json())
      .then(data => {
        setQuestions(Array.isArray(data) ? data : []);
        setSelectedTest(test._id);
        setCurrentTest(test);
        setTimeLeft(Number(test.duration) * 60);
        startTimeRef.current = Date.now();
        setResult(null); setSubmitted(false);
        setAnswers({}); setWarning(''); setActiveQ(0);
        localStorage.removeItem('testAnswers');
      })
      .catch(() => setWarning('Failed to load questions. Please try again.'))
      .finally(() => setLoadingTest(null));
  };

  const handleAnswer = (qId, opt) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [String(qId)]: opt }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setShowSubmitModal(false);
    setSubmitted(true);
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
    setTimeTaken(elapsed);
    try {
      const res  = await fetch(`${API_URL}/api/testSubmission/submit/${selectedTest}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) { setWarning(data.message || 'Submission failed.'); setSubmitted(false); return; }
      localStorage.removeItem('testAnswers');
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setWarning('Connection error. Please retry.'); setSubmitted(false); }
  };

  const handleDeleteAI = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/ai-tests/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {});
    setAiTests(prev => prev.filter(t => t._id !== id));
  };

  const resetTest = () => {
    setSelectedTest(null); setCurrentTest(null);
    setQuestions([]); setResult(null);
    setSubmitted(false); setAnswers({});
    setTimeLeft(0); setTimeTaken(0); setWarning(''); setActiveQ(0);
    setShowSubmitModal(false);
    localStorage.removeItem('testAnswers');
  };

  const answered   = Object.keys(answers).length;
  const totalQ     = questions.length;
  const unanswered = totalQ - answered;
  const pct        = totalQ && currentTest?.duration
    ? Math.round((timeLeft / (currentTest.duration * 60)) * 100) : 0;
  const timeColor  = timeLeft < 60 ? '#dc2626' : timeLeft < 300 ? '#d97706' : '#059669';
  const scorePct   = result ? Math.round((result.score / result.total) * 100) : 0;
  const wrongCnt   = result ? result.total - result.score : 0;

  if (!selectedCategory) return null;

  /* ═══════════ LISTING VIEW ═══════════ */
  if (!selectedTest) return (
    <div>
      <div className="page-header">
        <h1>{selectedCategory} Tests</h1>
        <p>Practice tests and AI-generated sets for {selectedCategory}</p>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/category-dashboard')}>
            <ChevronLeft size={14}/> Dashboard
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/choose-category')}>
            Change Category
          </button>
        </div>
      </div>

      <div className="page-body">
        {warning && (
          <div className="alert alert-warning" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <AlertTriangle size={16}/>
            <span style={{ flex:1 }}>{warning}</span>
            <button className="btn btn-ghost btn-sm" style={{ padding:'2px 8px' }} onClick={() => setWarning('')}>
              <XCircle size={15}/>
            </button>
          </div>
        )}

        {/* stats strip */}
        <div className="test-stats-strip">
          {[
            { icon: <ClipboardList size={16} color="#2563eb"/>, bg:'#eff6ff', num: tests.length,    label:'Admin Tests' },
            { icon: <Brain size={16} color="#7c3aed"/>,         bg:'#f5f3ff', num: aiTests.length,  label:'AI Practice Sets' },
            { icon: <Target size={16} color="#059669"/>,        bg:'#f0fdf4', num: selectedCategory, label:'Category' },
            { icon: <Zap size={16} color="#d97706"/>,           bg:'#fffbeb', num: 'AI',            label:'Powered' },
          ].map(({ icon, bg, num, label }) => (
            <div key={label} className="test-stat-pill">
              <div className="test-stat-icon" style={{ background: bg }}>{icon}</div>
              <div>
                <div className="test-stat-num">{num}</div>
                <div className="test-stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Tests */}
        <div className="test-section">
          <div className="test-section-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="test-section-icon" style={{ background:'#eff6ff' }}>
                <ClipboardList size={18} color="#2563eb" strokeWidth={1.8}/>
              </div>
              <div>
                <h2 className="test-section-title">Available Tests</h2>
                <p className="test-section-sub">Official {selectedCategory} practice tests</p>
              </div>
            </div>
            <span className="count-badge">{tests.length}</span>
          </div>

          {loading ? (
            <div className="loading-state"><Loader2 size={28} className="spin" color="var(--primary)"/><p>Loading tests…</p></div>
          ) : tests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardList size={40} color="var(--primary)" strokeWidth={1.5}/></div>
              <h3>No Tests Available</h3>
              <p>No {selectedCategory} tests have been created yet. Check back soon.</p>
            </div>
          ) : (
            <div className="test-grid">
              {pgTests.slice.map(test => (
                <div key={test._id} className="test-card-adv">
                  <div className="tca-top">
                    <div className="tca-icon-wrap"><ClipboardList size={20} color="#2563eb" strokeWidth={1.8}/></div>
                    <DiffBadge dur={test.duration}/>
                  </div>
                  <h3 className="tca-title">{test.title}</h3>
                  <div className="tca-meta-list">
                    {test.subject  && <div className="tca-meta-row"><BookOpen size={13} color="var(--text-muted)"/><span>{test.subject}</span></div>}
                    {test.duration && <div className="tca-meta-row"><Timer size={13} color="var(--text-muted)"/><span>{test.duration} minutes</span></div>}
                    {test.startTime && <div className="tca-meta-row"><Calendar size={13} color="var(--text-muted)"/><span>{new Date(test.startTime).toLocaleDateString()}</span></div>}
                  </div>
                  <div className="tca-footer">
                    <div className="tca-category-badge"><Shield size={11}/> {test.category || selectedCategory}</div>
                    <button className="btn btn-primary btn-sm" onClick={() => loadTest(test)} disabled={!!loadingTest}>
                      {loadingTest === test._id ? <Loader2 size={13} className="spin"/> : <><Play size={13}/> Start</>}
                    </button>
                  </div>
                </div>
              ))}
              <Pagination {...pgTests} />
            </div>
          )}
        </div>

        {/* AI Sets */}
        <div className="test-section">
          <div className="test-section-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="test-section-icon" style={{ background:'#f5f3ff' }}>
                <Brain size={18} color="#7c3aed" strokeWidth={1.8}/>
              </div>
              <div>
                <h2 className="test-section-title">AI Practice Sets</h2>
                <p className="test-section-sub">Your generated practice sets</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="count-badge" style={{ background:'#f5f3ff', color:'#7c3aed' }}>{aiTests.length}</span>
              <Link to="/ai-generator" className="btn btn-sm" style={{ background:'#f5f3ff', color:'#7c3aed', border:'1px solid #e9d5ff', fontWeight:600 }}>
                <Brain size={13}/> Generate New
              </Link>
            </div>
          </div>

          {aiTests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Brain size={40} color="#7c3aed" strokeWidth={1.5}/></div>
              <h3>No AI Sets Yet</h3>
              <p>Generate your first AI-powered MCQ practice set from any study material</p>
              <Link to="/ai-generator" className="btn btn-primary" style={{ marginTop:16 }}>
                <Brain size={14}/> Generate AI MCQ
              </Link>
            </div>
          ) : (
            <div className="test-grid">
              {pgAiTests.slice.map(test => (
                <div key={test._id} className="test-card-adv ai-card-adv">
                  <div className="tca-top">
                    <div className="tca-icon-wrap" style={{ background:'#f5f3ff' }}><Brain size={20} color="#7c3aed" strokeWidth={1.8}/></div>
                    <span className="tca-ai-badge"><Zap size={10}/> AI Generated</span>
                  </div>
                  <h3 className="tca-title">{test.moduleName || 'AI Practice Set'}</h3>
                  <div className="tca-meta-list">
                    <div className="tca-meta-row"><ListChecks size={13} color="var(--text-muted)"/><span>{test.questions?.length || 0} questions</span></div>
                    {test.difficulty && (
                      <div className="tca-meta-row">
                        <Zap size={13} color="var(--text-muted)"/>
                        <span style={{ textTransform: 'capitalize' }}>{test.difficulty}</span>
                      </div>
                    )}
                    {(test.createdAt || test.createdAt) && (
                      <div className="tca-meta-row">
                        <Calendar size={13} color="var(--text-muted)"/>
                        <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="tca-footer">
                    <Link to={`/ai-test/${test._id}`} className="btn btn-sm" style={{ background:'#7c3aed', color:'white', flex:1 }}>
                      <Play size={13}/> Open
                    </Link>
                    <button className="btn btn-sm tca-delete-btn" onClick={() => handleDeleteAI(test._id)} title="Delete">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              ))}
              <Pagination {...pgAiTests} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ═══════════ ACTIVE TEST VIEW ═══════════ */
  return (
    <div className="test-active-page">

      {/* ── Sticky top bar ── */}
      <div className="test-topbar">
        <div className="test-topbar-inner">
          <div className="test-topbar-left">
            <button className="btn btn-ghost btn-sm" onClick={resetTest} title="Exit">
              <ChevronLeft size={16}/>
            </button>
            <div className="ttb-info">
              <div className="ttb-title">{currentTest?.title}</div>
              <div className="ttb-sub">{selectedCategory} · {totalQ} questions</div>
            </div>
          </div>

          <div className="test-topbar-center">
            <div className="topbar-progress-track">
              <div className="topbar-progress-fill" style={{ width:`${totalQ ? (answered/totalQ)*100 : 0}%` }}/>
            </div>
            <span className="topbar-progress-label">{answered}/{totalQ} answered</span>
          </div>

          <div className="test-topbar-right">
            {tabSwitchCount > 0 && (
              <div className="topbar-switch-warn"><Shield size={13}/> {tabSwitchCount}/3</div>
            )}
            <div className="topbar-timer">
              <Timer size={15} style={{ color: timeColor, flexShrink:0 }}/>
              <span style={{ color: timeColor, fontWeight:800, fontSize:18, fontVariantNumeric:'tabular-nums' }}>{fmt(timeLeft)}</span>
            </div>
          </div>
        </div>
        <div className="topbar-time-bar">
          <div className="topbar-time-fill" style={{ width:`${pct}%`, background:timeColor }}/>
        </div>
      </div>

      {/* warning */}
      {warning && !result && (
        <div className="test-warn-banner">
          <AlertTriangle size={15}/>
          <span>{warning}</span>
          <button onClick={() => setWarning('')}><XCircle size={15}/></button>
        </div>
      )}

      {/* ════════ RESULT SCORECARD ════════ */}
      {result && (
        <div className="scorecard-hero">
          <div className="scorecard-hero-bg"/>
          <div className="scorecard-inner">

            {/* ring + headline */}
            <div className="scorecard-left">
              <ScoreRing score={result.score} total={result.total}/>
              <Stars pct={scorePct}/>
              <h2 className="scorecard-headline">
                {scorePct >= 80 ? 'Excellent Work!' : scorePct >= 60 ? 'Well Done!' : scorePct >= 40 ? 'Good Effort!' : 'Keep Practising!'}
              </h2>
              <p className="scorecard-sub">{currentTest?.title}</p>
            </div>

            {/* stat tiles */}
            <div className="scorecard-tiles">
              <div className="sc-tile sc-tile-correct">
                <CheckCircle size={22} color="#059669"/>
                <span className="sc-tile-num">{result.score}</span>
                <span className="sc-tile-label">Correct</span>
              </div>
              <div className="sc-tile sc-tile-wrong">
                <XCircle size={22} color="#dc2626"/>
                <span className="sc-tile-num">{wrongCnt}</span>
                <span className="sc-tile-label">Wrong</span>
              </div>
              <div className="sc-tile sc-tile-skip">
                <Minus size={22} color="rgba(255,255,255,0.6)"/>
                <span className="sc-tile-num">{totalQ - answered}</span>
                <span className="sc-tile-label">Skipped</span>
              </div>
              <div className="sc-tile sc-tile-accuracy">
                <Target size={22} color="#fbbf24"/>
                <span className="sc-tile-num">{scorePct}%</span>
                <span className="sc-tile-label">Accuracy</span>
              </div>
              <div className="sc-tile sc-tile-time">
                <Timer size={22} color="#a78bfa"/>
                <span className="sc-tile-num">{fmt(timeTaken || (currentTest?.duration * 60 - timeLeft))}</span>
                <span className="sc-tile-label">Time Taken</span>
              </div>
              <div className="sc-tile sc-tile-total">
                <ListChecks size={22} color="#67e8f9"/>
                <span className="sc-tile-num">{result.total}</span>
                <span className="sc-tile-label">Total Qs</span>
              </div>
            </div>

            {/* progress bar */}
            <div className="scorecard-bar-wrap">
              <div className="scorecard-bar-label">
                <span>Score</span><span>{scorePct}%</span>
              </div>
              <div className="scorecard-bar-track">
                <div
                  className="scorecard-bar-fill"
                  style={{
                    width:`${scorePct}%`,
                    background: scorePct >= 70 ? 'linear-gradient(90deg,#059669,#34d399)' :
                                scorePct >= 40 ? 'linear-gradient(90deg,#d97706,#fbbf24)' :
                                                 'linear-gradient(90deg,#dc2626,#f87171)',
                  }}
                />
              </div>
              <div className="scorecard-bar-markers">
                <span>0</span><span>Pass (40%)</span><span>100</span>
              </div>
            </div>

            {/* actions */}
            <div className="scorecard-actions">
              <button className="sc-action-btn sc-review-btn" onClick={() => {
                window.scrollTo({ top: document.querySelector('.test-body-layout')?.offsetTop || 500, behavior:'smooth' });
              }}>
                <Eye size={16}/> Review Answers
              </button>
              <button className="sc-action-btn sc-retry-btn" onClick={resetTest}>
                <RotateCcw size={16}/> Back to Tests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── body layout ── */}
      <div className="test-body-layout">

        {/* sidebar navigator */}
        <div className={`qnav-sidebar ${showNav ? 'qnav-open' : 'qnav-closed'}`}>
          <div className="qnav-header">
            <span>Questions</span>
            <button className="qnav-toggle" onClick={() => setShowNav(v => !v)}>
              {showNav ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          {showNav && (
            <>
              <div className="qnav-legend">
                <span className="qnav-dot answered"/> Answered
                <span className="qnav-dot unanswered"/> Pending
                {result && <><span className="qnav-dot" style={{ background:'#059669' }}/> Correct</>}
              </div>
              <div className="qnav-grid">
                {questions.map((q, idx) => {
                  const ans     = answers[String(q._id)];
                  const isRight = result && ans === q.answer;
                  const isWrong = result && ans && ans !== q.answer;
                  return (
                    <button
                      key={q._id}
                      className={`qnav-btn${activeQ === idx ? ' qnav-curr' : ''}${isRight ? ' qnav-right' : ''}${isWrong ? ' qnav-wrong-btn' : ''}${!!ans && !result ? ' qnav-done' : ''}`}
                      onClick={() => scrollToQ(idx)}
                    >
                      {result ? (isRight ? <CheckCircle size={10}/> : isWrong ? <XCircle size={10}/> : <Minus size={10}/>) : idx + 1}
                    </button>
                  );
                })}
              </div>
              {!result && (
                <div className="qnav-bottom">
                  <div className="qnav-summary">
                    <div><span className="qnav-sum-num">{answered}</span><span className="qnav-sum-lbl">Done</span></div>
                    <div><span className="qnav-sum-num" style={{ color:'#dc2626' }}>{unanswered}</span><span className="qnav-sum-lbl">Left</span></div>
                  </div>
                  <button
                    className="submit-btn-main"
                    onClick={() => setShowSubmitModal(true)}
                    disabled={submitted || totalQ === 0}
                    style={{ marginTop:12 }}
                  >
                    {submitted ? <><Loader2 size={14} className="spin"/> Submitting…</> : <><Send size={14}/> Submit Test</>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* questions */}
        <div className="test-questions-area">
          {totalQ === 0 && !result && (
            <div className="empty-state" style={{ margin:'40px auto' }}>
              <div className="empty-state-icon"><ListChecks size={40} color="var(--primary)" strokeWidth={1.5}/></div>
              <h3>No Questions Found</h3>
              <p>Admin hasn't added questions to this test yet.</p>
            </div>
          )}

          <div className="questions-list">
            {questions.map((q, idx) => {
              const userAns = answers[String(q._id)];
              const isRight = result && userAns === q.answer;
              const isWrong = result && userAns && userAns !== q.answer;
              return (
                <div
                  key={q._id}
                  ref={el => questionRefs.current[idx] = el}
                  className={`question-card-adv${result ? (isRight ? ' qca-correct' : isWrong ? ' qca-wrong' : ' qca-skipped') : ''}`}
                  onClick={() => setActiveQ(idx)}
                >
                  <div className="qca-topbar">
                    <div className="qca-num-badge">Q{idx + 1}</div>
                    {result && (
                      <div className={`qca-result-badge${isRight ? ' qrb-correct' : isWrong ? ' qrb-wrong' : ' qrb-skip'}`}>
                        {isRight ? <><CheckCircle size={13}/> Correct</> : isWrong ? <><XCircle size={13}/> Incorrect</> : <><Minus size={13}/> Skipped</>}
                      </div>
                    )}
                    <div className="qca-progress-mini">{idx + 1}/{totalQ}</div>
                  </div>

                  <h3 className="qca-text">{q.title}</h3>

                  <div className="options-adv">
                    {q.options.map((opt, i) => {
                      const isSel   = userAns === opt;
                      const isCorr  = result && opt === q.answer;
                      const isWrSel = result && isSel && opt !== q.answer;
                      return (
                        <button
                          key={i}
                          className={`option-adv${isSel ? ' oa-selected' : ''}${isCorr ? ' oa-correct' : ''}${isWrSel ? ' oa-wrong' : ''}`}
                          onClick={() => handleAnswer(q._id, opt)}
                          disabled={!!result}
                        >
                          <span className={`oa-letter${isSel ? ' oa-letter-sel' : ''}${isCorr ? ' oa-letter-correct' : ''}${isWrSel ? ' oa-letter-wrong' : ''}`}>{LETTERS[i]}</span>
                          <span className="oa-text">{opt}</span>
                          {isCorr  && <CheckCircle size={15} color="#059669" style={{ marginLeft:'auto', flexShrink:0 }}/>}
                          {isWrSel && <XCircle size={15} color="#dc2626" style={{ marginLeft:'auto', flexShrink:0 }}/>}
                        </button>
                      );
                    })}
                  </div>

                  {result && isWrong && q.answer && (
                    <div className="qca-correct-note">
                      <Award size={13} color="#059669"/>
                      <span>Correct answer: <strong>{q.answer}</strong></span>
                    </div>
                  )}

                  {!result && (
                    <div className="qca-nav-row">
                      <button className="btn btn-ghost btn-sm" disabled={idx===0} onClick={() => scrollToQ(idx-1)}>
                        <ChevronLeft size={14}/> Prev
                      </button>
                      <span className="qca-answered-pill">
                        {userAns ? <><CheckCircle size={11} color="#059669"/> Answered</> : <><Minus size={11}/> Not answered</>}
                      </span>
                      <button className="btn btn-ghost btn-sm" disabled={idx===totalQ-1} onClick={() => scrollToQ(idx+1)}>
                        Next <ChevronRight size={14}/>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* bottom submit bar */}
          {!result && totalQ > 0 && (
            <div className="test-submit-bar">
              <div className="tsb-info">
                <TrendingUp size={15} color="var(--primary)"/>
                <span><strong>{answered}</strong> of <strong>{totalQ}</strong> answered</span>
                {unanswered > 0 && <span className="tsb-warn">· {unanswered} unanswered</span>}
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <button className="btn btn-outline" onClick={resetTest}>
                  <ChevronLeft size={15}/> Exit
                </button>
                <button
                  className="submit-btn-main"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitted || totalQ === 0}
                >
                  {submitted ? <><Loader2 size={15} className="spin"/> Submitting…</> : <><Send size={15}/> Submit Test</>}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="test-submit-bar">
              <p style={{ fontSize:14, color:'var(--text-muted)' }}>
                <Trophy size={14} color="#d97706" style={{ display:'inline', marginRight:5 }}/>
                You scored <strong>{result.score}/{result.total}</strong> ({scorePct}%)
              </p>
              <button className="btn btn-primary" onClick={resetTest}>
                <RotateCcw size={14}/> Back to Tests
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating mobile submit button ── */}
      {!result && totalQ > 0 && (
        <div className="floating-submit">
          <div className="floating-submit-progress">
            <div style={{ width:`${totalQ ? (answered/totalQ)*100 : 0}%` }}/>
          </div>
          <button
            className="submit-btn-main floating-submit-btn"
            onClick={() => setShowSubmitModal(true)}
            disabled={submitted || totalQ === 0}
          >
            {submitted ? <><Loader2 size={15} className="spin"/> Submitting…</> : <><Send size={15}/> Submit Test</>}
          </button>
        </div>
      )}

      {/* ── Submit confirmation modal ── */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              <Send size={28} color="var(--primary)"/>
            </div>
            <h3 className="modal-title">Submit Test?</h3>
            <p className="modal-body">
              You've answered <strong>{answered}</strong> of <strong>{totalQ}</strong> questions.
              {unanswered > 0 && <> <span style={{ color:'var(--danger)' }}>{unanswered} question{unanswered > 1 ? 's' : ''}</span> left unanswered.</>}
              {' '}This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="submit-btn-main" onClick={handleSubmit}>
                <CheckCircle size={15}/> Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
