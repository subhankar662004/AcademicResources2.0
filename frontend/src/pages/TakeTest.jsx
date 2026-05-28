import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../App";
import { API_URL } from "../config";
import { useToast } from "../components/Toast";
import {
  Brain, CheckCircle, XCircle, Minus, ChevronLeft, ChevronRight,
  Send, RotateCcw, Loader2, Eye, EyeOff, Timer, Target,
  ListChecks, Star, TrendingUp, Award, AlertTriangle, Lock,
  BookOpen, GraduationCap, FileText, Share2, Copy, Check, ShieldAlert,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const fmtCountdown = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2,"0")}s`;
  return `${s}s`;
};

function ScoreRing({ score, total }) {
  const pct    = total ? Math.round((score / total) * 100) : 0;
  const r      = 60;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const grade  = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 40 ? "D" : "F";
  return (
    <div className="score-ring-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="14"/>
        <circle cx="80" cy="80" r={r} fill="none" stroke="white" strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{ transition:"stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)", filter:"drop-shadow(0 0 8px rgba(255,255,255,0.4))" }}
        />
        <text x="80" y="72"  textAnchor="middle" fontSize="28" fontWeight="900" fill="white">{pct}%</text>
        <text x="80" y="92"  textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(255,255,255,0.75)">Grade {grade}</text>
        <text x="80" y="110" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)">{score} / {total}</text>
      </svg>
    </div>
  );
}

function Stars({ pct }) {
  const full = Math.round((pct / 100) * 5);
  return (
    <div className="result-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={20}
          fill={i <= full ? "#fbbf24" : "none"}
          color={i <= full ? "#fbbf24" : "rgba(255,255,255,0.3)"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function TakeTest() {
  const { shareCode }  = useParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const toast          = useToast();

  const [state, setState] = useState("loading"); // loading | lobby | active | result | error | already | ended | not_started_msg
  const [test,  setTest]  = useState(null);
  const [questions, setQs] = useState([]);
  const [answers,  setAns] = useState({});
  const [result,   setRes] = useState(null);
  const [showModal, setModal] = useState(false);
  const [activeQ,  setAQ]  = useState(0);
  const [showNav,  setNav]  = useState(true);
  const [timeLeft, setTime] = useState(0);
  const [timeTaken, setTaken] = useState(0);
  const [submitting, setSub] = useState(false);
  const [secsToStart, setSecsToStart] = useState(0);
  const [submitErrMsg, setSubmitErrMsg] = useState("");
  const [reviewQuestions, setReviewQs] = useState([]);
  const [reviewLoading,   setRevLoad]  = useState(false);
  const [showReview,      setShowReview] = useState(false);
  const [copied,          setCopied]     = useState(false);

  const DRAFT_KEY = `test_draft_${shareCode}`;

  /* ── Anti-cheat ── */
  const [cheatCount,  setCheatCount]  = useState(0);
  const [showCheat,   setShowCheat]   = useState(false);
  const [cheatReason, setCheatReason] = useState("");
  const [autoSubIn,   setAutoSubIn]   = useState(0);

  const startRef        = useRef(Date.now());
  const timerRef        = useRef(null);
  const countdownRef    = useRef(null);
  const qRefs           = useRef([]);
  const cheatRef        = useRef(0);
  const submitOnceRef   = useRef(false);
  const handleSubmitRef = useRef(null);
  const lastViolateRef  = useRef(0);
  const autoSubTimerRef = useRef(null);
  const showCheatRef    = useRef(false);
  const violationLogRef = useRef([]);

  /* ── Hide header & nav during active test ── */
  useEffect(() => {
    if (state === "active") {
      document.body.classList.add("test-active-mode");
    } else {
      document.body.classList.remove("test-active-mode");
    }
    return () => document.body.classList.remove("test-active-mode");
  }, [state]);

  /* ── Lock body scroll when submit modal is open ── */
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  /* ── Fetch test by shareCode ── */
  useEffect(() => {
    const load = async () => {
      try {
        const r    = await fetch(`${API_URL}/api/teacher/share/${shareCode}`);
        const data = await r.json();
        if (data.message) { setState("error"); return; }

        setTest(data.test);
        const rawQs = data.questions || [];
        const shuffled = [...rawQs];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setQs(shuffled);
        setTime((data.test.duration || 30) * 60);

        /* Check if user already submitted — block reattempt at lobby */
        const uid = user?.id || user?._id;
        if (uid) {
          try {
            const cr   = await fetch(`${API_URL}/api/teacher/share/${shareCode}/my-result?userId=${uid}`);
            const cd   = await cr.json();
            if (cd.alreadySubmitted) {
              setRes({ ...cd.result });
              setState("already");
              return;
            }
          } catch { /* ignore — will be caught again at submit */ }
        }

        /* Restore any saved draft answers */
        try {
          const saved = localStorage.getItem(`test_draft_${data.test.shareCode || shareCode}`);
          if (saved) setAns(JSON.parse(saved));
        } catch { /* ignore */ }

        setState("lobby");
      } catch { setState("error"); }
    };
    load();
  }, [shareCode]);

  /* ── Countdown to start time ── */
  useEffect(() => {
    if (state !== "lobby" || !test) return;

    const tick = () => {
      const now = Date.now();
      // Check if test has ended
      if (test.endTime && now > new Date(test.endTime).getTime()) {
        setSecsToStart(0);
        clearInterval(countdownRef.current);
        return;
      }
      // Check if test hasn't started yet
      if (test.startTime) {
        const diff = Math.ceil((new Date(test.startTime).getTime() - now) / 1000);
        if (diff > 0) {
          setSecsToStart(diff);
        } else {
          setSecsToStart(0);
          clearInterval(countdownRef.current);
        }
      }
    };

    tick(); // immediate first run
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [test, state]);

  /* ── Timer ── */
  const startTimer = () => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Use ref so we always call the latest handleSubmit (avoids stale closure)
          setTimeout(() => handleSubmitRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  /* ── Auto-save answers to localStorage during active test ── */
  useEffect(() => {
    if (state !== "active") return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  }, [answers, state]);

  /* ── Anti-cheat: sync showCheat to ref ── */
  useEffect(() => { showCheatRef.current = showCheat; }, [showCheat]);

  /* ── Anti-cheat: active only during test ── */
  useEffect(() => {
    if (state !== "active") return;

    const violate = (reason) => {
      const now = Date.now();
      if (now - lastViolateRef.current < 1500) return; // debounce — same event can fire twice
      if (showCheatRef.current && cheatRef.current < 2) return; // already showing warning
      lastViolateRef.current = now;

      const next = cheatRef.current + 1;
      cheatRef.current = next;
      setCheatCount(next);
      setCheatReason(reason);
      setShowCheat(true);
      violationLogRef.current.push({ reason, at: new Date().toISOString() });

      if (next >= 2 && !submitOnceRef.current) {
        submitOnceRef.current = true;
        let secs = 5;
        setAutoSubIn(secs);
        autoSubTimerRef.current = setInterval(() => {
          secs -= 1;
          setAutoSubIn(secs);
          if (secs <= 0) {
            clearInterval(autoSubTimerRef.current);
            handleSubmitRef.current?.();
          }
        }, 1000);
      }
    };

    const onVisibility = () => { if (document.hidden) violate("You switched to another tab"); };
    const onBlur       = () => { if (!showCheatRef.current) violate("You left the test window"); };
    const onFSChange   = () => { if (!document.fullscreenElement) violate("You exited fullscreen mode"); };
    const onMouseLeave = (e) => { if (e.relatedTarget === null) violate("You moved outside the test window"); };
    const onCtxMenu     = (e) => e.preventDefault();
    const onCopy        = (e) => e.preventDefault();
    const onCut         = (e) => e.preventDefault();
    const onSelectStart = (e) => e.preventDefault();
    const onKeyDown     = (e) => {
      // DevTools & view source
      if (e.key === "F12") { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ["I","J","C","K"].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if (e.ctrlKey && ["U","A","C","X","P"].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      // Screenshot keys
      if (e.key === "PrintScreen") { e.preventDefault(); return; }
      if (e.metaKey && e.shiftKey && ["3","4","5","S"].includes(e.key)) { e.preventDefault(); return; }
      if (e.key === "F13" || e.key === "F14") { e.preventDefault(); return; }
      // Keyboard navigation lock — window/app switching
      if (e.altKey  && e.key === "Tab")  { e.preventDefault(); violate("Alt+Tab detected"); return; }
      if (e.altKey  && e.key === "F4")   { e.preventDefault(); return; }
      if (e.metaKey && e.key === "Tab")  { e.preventDefault(); violate("Cmd+Tab detected"); return; }
      if (e.metaKey && ["d","D","h","H","m","M"].includes(e.key)) { e.preventDefault(); violate("Window shortcut detected"); return; }
      // Escape exits fullscreen — block at JS level (Chrome handles it natively but Firefox doesn't)
      if (e.key === "Escape" && document.fullscreenElement) { e.preventDefault(); return; }
    };

    // Heartbeat: poll every 2 s to catch floating windows that don't trigger events
    const heartbeat = setInterval(() => {
      if (!document.hasFocus() && !showCheatRef.current) {
        violate("Window lost focus — floating window or other app detected");
      }
      if (!document.fullscreenElement) {
        violate("Fullscreen was exited");
      }
    }, 2000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("contextmenu", onCtxMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("contextmenu", onCtxMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKeyDown);
      clearInterval(autoSubTimerRef.current);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [state]);

  const scrollToQ = (idx) => {
    setAQ(idx);
    qRefs.current[idx]?.scrollIntoView({ behavior:"smooth", block:"center" });
  };

  /* ── Load review (answers after test ends) ── */
  const loadReview = async () => {
    setRevLoad(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/share/${shareCode}/review`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Could not load answers"); return; }
      setReviewQs(data.questions || []);
      setState("review");
    } catch { toast.error("Connection error — please try again"); }
    finally { setRevLoad(false); }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setTaken(Math.round((Date.now() - startRef.current) / 1000));
    setSub(true);
    setModal(false);
    setShowCheat(false);

    try {
      const res = await fetch(`${API_URL}/api/teacher/take/${test._id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, userId: user?.id || user?._id, userName: user?.name, violations: violationLogRef.current }),
      });
      const data = await res.json();
      if (res.status === 409) { setState("already"); return; }
      if (res.status === 403) {
        setSubmitErrMsg(data.message || "Submission not allowed at this time.");
        setState("submit_error");
        return;
      }
      if (!res.ok) {
        setSubmitErrMsg(data.message || "Submission failed. Please try again.");
        setState("submit_error");
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      setRes(data);
      setState("result");
      window.scrollTo({ top:0, behavior:"smooth" });
    } catch {
      setSubmitErrMsg("Connection error. Please check your internet and try again.");
      setState("submit_error");
    } finally {
      setSub(false);
    }
  };

  // Always point to the latest handleSubmit so timer & anti-cheat refs don't go stale
  handleSubmitRef.current = handleSubmit;

  /* ── Countdown sound: tick every second for last 15 s ── */
  useEffect(() => {
    if (state !== "active" || timeLeft <= 0 || timeLeft > 15) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx  = new AudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = timeLeft <= 5 ? 1046 : 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch { /* ignore — audio blocked by browser policy */ }
  }, [timeLeft, state]);

  const answered      = Object.keys(answers).length;
  const totalQ        = questions.length;
  const timerPct      = test ? (timeLeft / ((test.duration || 30) * 60)) * 100 : 100;
  const timerWarn     = timeLeft < 120;
  const timerCritical = timeLeft <= 60 && timeLeft > 15;
  const timerBoom     = timeLeft <= 15 && timeLeft > 0;

  /* ════ STATES ════ */
  if (state === "loading") return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16 }}>
      <Loader2 size={36} className="spin" color="var(--primary)"/>
      <p style={{ color:"var(--text-muted)", fontWeight:600 }}>Loading test…</p>
    </div>
  );

  if (state === "error") return (
    <div className="empty-state" style={{ padding:"80px 24px" }}>
      <div className="empty-state-icon"><AlertTriangle size={44} color="#dc2626" strokeWidth={1.5}/></div>
      <h3>Test Not Found</h3>
      <p>This link may be invalid or the test may have been removed.</p>
      <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => navigate("/")}>
        <ChevronLeft size={14}/> Go Home
      </button>
    </div>
  );

  if (state === "already") {
    const prevPct   = result ? (result.pct ?? (result.total ? Math.round((result.score/result.total)*100) : 0)) : null;
    const grade     = prevPct == null ? "—" : prevPct>=90?"A+":prevPct>=80?"A":prevPct>=70?"B":prevPct>=60?"C":prevPct>=40?"D":"F";
    const gradeColor= prevPct == null ? "#6b7280" : prevPct>=70?"#059669":prevPct>=40?"#d97706":"#dc2626";
    return (
      <div style={{ maxWidth:500, margin:"60px auto", padding:"0 20px" }}>
        <div className="test-card-adv" style={{ gap:0, padding:0, overflow:"hidden" }}>
          {/* Header band */}
          <div style={{ background:"linear-gradient(135deg,#059669,#34d399)", padding:"28px 28px 22px", textAlign:"center" }}>
            <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
              <CheckCircle size={30} color="#fff" strokeWidth={2}/>
            </div>
            <h2 style={{ margin:0,color:"#fff",fontSize:20,fontWeight:800 }}>Already Submitted</h2>
            <p style={{ margin:"6px 0 0",color:"rgba(255,255,255,0.8)",fontSize:13 }}>You have already taken this test</p>
          </div>

          {/* Result tiles (if we have the previous result) */}
          {result && prevPct != null ? (
            <div style={{ padding:"24px 28px" }}>
              <p style={{ margin:"0 0 16px",fontSize:13,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5 }}>Your Previous Result</p>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20 }}>
                <div className="sc-tile" style={{ padding:"14px 10px",textAlign:"center",flexDirection:"column",display:"flex",alignItems:"center",gap:6 }}>
                  <Target size={18} color="#fbbf24"/>
                  <span className="sc-tile-num" style={{ fontSize:20,color:"var(--text)" }}>{prevPct}%</span>
                  <span className="sc-tile-label">Score</span>
                </div>
                <div className="sc-tile sc-tile-correct" style={{ padding:"14px 10px",textAlign:"center",flexDirection:"column",display:"flex",alignItems:"center",gap:6 }}>
                  <CheckCircle size={18} color="#059669"/>
                  <span className="sc-tile-num" style={{ fontSize:20,color:"#059669" }}>{result.score}</span>
                  <span className="sc-tile-label">Correct</span>
                </div>
                <div className="sc-tile" style={{ padding:"14px 10px",textAlign:"center",flexDirection:"column",display:"flex",alignItems:"center",gap:6 }}>
                  <Award size={18} color={gradeColor}/>
                  <span className="sc-tile-num" style={{ fontSize:20,color:gradeColor }}>Grade {grade}</span>
                  <span className="sc-tile-label">{result.total} Questions</span>
                </div>
              </div>
              {result.submittedAt && (
                <p style={{ margin:"0 0 16px",fontSize:12,color:"var(--text-muted)",textAlign:"center" }}>
                  Submitted on {new Date(result.submittedAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div style={{ padding:"24px 28px" }}>
              <p style={{ margin:0,color:"var(--text-muted)",fontSize:14,textAlign:"center" }}>
                Each test can only be attempted once.
              </p>
            </div>
          )}

          <div style={{ padding:"0 28px 24px",display:"flex",gap:10 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate("/")}>
              <ChevronLeft size={14}/> Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "submit_error") return (
    <div className="empty-state" style={{ padding:"80px 24px" }}>
      <div className="empty-state-icon"><AlertTriangle size={44} color="#d97706" strokeWidth={1.5}/></div>
      <h3>Submission Failed</h3>
      <p style={{ maxWidth:420, margin:"0 auto" }}>{submitErrMsg}</p>
      <button className="btn btn-primary" style={{ marginTop:24 }} onClick={() => navigate("/")}>
        <ChevronLeft size={14}/> Go Home
      </button>
    </div>
  );

  /* ── Login gate ── */
  if (!user && state !== "lobby") return (
    <div className="empty-state" style={{ padding:"80px 24px" }}>
      <div className="empty-state-icon"><Lock size={44} color="var(--primary)" strokeWidth={1.5}/></div>
      <h3>Sign in to Take This Test</h3>
      <p>You need an account to submit and track your results.</p>
      <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => navigate("/login")}>Sign In</button>
    </div>
  );

  /* ── LOBBY ── */
  if (state === "lobby") return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"48px 24px" }}>
      <div className="take-test-lobby">
        <div className="ttl-icon"><BookOpen size={36} color="var(--primary)" strokeWidth={1.5}/></div>
        <h1 className="ttl-title">{test?.title}</h1>
        {test?.description && <p className="ttl-desc">{test.description}</p>}
        {test?.teacherName && (
          <div className="ttl-teacher">
            <GraduationCap size={14} color="var(--text-muted)"/>
            <span>By {test.teacherName}</span>
          </div>
        )}
        <div className="ttl-meta-row">
          <div className="ttl-meta-pill"><Timer size={14}/><span>{test?.duration} min</span></div>
          <div className="ttl-meta-pill"><ListChecks size={14}/><span>{totalQ} questions</span></div>
          {test?.subject && <div className="ttl-meta-pill"><BookOpen size={14}/><span>{test.subject}</span></div>}
        </div>

        <div className="ttl-rules">
          <p className="ttl-rules-title">Before you start:</p>
          <ul>
            <li><Timer size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Timer starts as soon as you click Start</li>
            <li><ListChecks size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Answer all questions before submitting</li>
            <li><Lock size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Each test can only be attempted once</li>
            <li><CheckCircle size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Results are shown immediately after submission</li>
          </ul>
        </div>

        <div style={{ marginTop:16, padding:"12px 16px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, fontSize:13, color:"#991b1b" }}>
          <p style={{ margin:"0 0 6px", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}><ShieldAlert size={14}/> Anti-Cheat Rules</p>
          <ul style={{ margin:0, paddingLeft:18, display:"flex", flexDirection:"column", gap:4 }}>
            <li>The test opens in <strong>fullscreen</strong> — do not exit</li>
            <li>Do <strong>not</strong> switch tabs, windows or use floating windows</li>
            <li>Do <strong>not</strong> move your mouse outside the test window</li>
            <li>Right-click, copy &amp; DevTools are <strong>disabled</strong></li>
            <li><strong>1st violation</strong>: warning shown</li>
            <li><strong>2nd violation</strong>: test auto-submits in 5 seconds</li>
          </ul>
        </div>

        {/* ── Time gate ── */}
        {test?.endTime && Date.now() > new Date(test.endTime).getTime() ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <XCircle size={28} color="#dc2626" strokeWidth={1.5}/>
            </div>
            <h3 style={{ color:"#dc2626", margin:"0 0 6px" }}>Test Has Ended</h3>
            <p style={{ fontSize:13, color:"var(--text-muted)" }}>
              This test closed on {new Date(test.endTime).toLocaleString()}.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
              <button className="btn btn-outline" onClick={() => navigate("/")}>
                <ChevronLeft size={14}/> Go Home
              </button>
              <button className="btn btn-primary" onClick={loadReview} disabled={reviewLoading}>
                {reviewLoading ? <><Loader2 size={14} className="spin"/> Loading…</> : <><FileText size={14}/> View Questions &amp; Answers</>}
              </button>
            </div>
          </div>
        ) : secsToStart > 0 ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <Timer size={28} color="var(--primary)" strokeWidth={1.5}/>
            </div>
            <p style={{ fontSize:13, color:"var(--text-muted)", margin:"0 0 4px" }}>Test starts in</p>
            <div style={{ fontSize:32, fontWeight:900, color:"var(--primary)", letterSpacing:1, fontVariantNumeric:"tabular-nums" }}>
              {fmtCountdown(secsToStart)}
            </div>
            <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:6 }}>
              Scheduled for {new Date(test.startTime).toLocaleString()}
            </p>
            <div style={{ marginTop:14, padding:"10px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
              <Loader2 size={14} className="spin" style={{ flexShrink:0 }} /> This page will automatically unlock when the test begins. Please wait here.
            </div>
          </div>
        ) : !user ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <p style={{ fontSize:14, color:"var(--text-muted)", textAlign:"center" }}>You need to be signed in to take this test.</p>
            <button className="btn btn-primary" style={{ width:"100%" }} onClick={() => navigate(`/login?redirect=/take-test/${shareCode}`)}>
              <Lock size={14}/> Sign In to Start
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width:"100%", padding:"14px 0", fontSize:16 }}
            onClick={async () => {
              // Block if a floating window or another app already has focus
              if (!document.hasFocus()) {
                toast.error("Please close any floating windows or apps before starting the test.");
                return;
              }
              try {
                await document.documentElement.requestFullscreen();
              } catch {
                toast.error("Fullscreen is required to start the test. Please allow fullscreen and try again.");
                return;
              }
              if (!document.fullscreenElement) {
                toast.error("Could not enter fullscreen. Please allow fullscreen in your browser and try again.");
                return;
              }
              // Re-check focus after entering fullscreen (floating windows may still be visible)
              if (!document.hasFocus()) {
                document.exitFullscreen?.().catch(() => {});
                toast.error("A floating window is detected. Please close it before starting the test.");
                return;
              }
              clearInterval(countdownRef.current);
              cheatRef.current = 0; submitOnceRef.current = false;
              setCheatCount(0); setShowCheat(false);
              handleSubmitRef.current = handleSubmit;
              setState("active"); startTimer();
            }}>
            <Send size={16}/> Start Test
          </button>
        )}
      </div>
    </div>
  );

  /* ── REVIEW (answers after test ends) ── */
  if (state === "review") return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setState("lobby")}>
          <ChevronLeft size={14}/> Back
        </button>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>{test?.title} — Answer Key</h2>
      </div>
      <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:28 }}>
        This test closed on {new Date(test.endTime).toLocaleString()}. Correct answers are highlighted in green.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {reviewQuestions.map((q, idx) => (
          <div key={q._id} style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:12, padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:14 }}>
              <span style={{ background:"var(--primary)", color:"#fff", borderRadius:6, padding:"2px 9px", fontSize:12, fontWeight:700, flexShrink:0 }}>Q{idx+1}</span>
              <p style={{ margin:0, fontWeight:600, fontSize:15, lineHeight:1.5 }}>{q.question}</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {q.options.map((opt, j) => {
                const isCorrect = opt === q.answer;
                return (
                  <div key={j} style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 14px", borderRadius:8,
                    border:`1.5px solid ${isCorrect ? "#059669" : "var(--border)"}`,
                    background: isCorrect ? "#ecfdf5" : "var(--bg-soft, #f8f9fa)",
                  }}>
                    <span style={{
                      width:26, height:26, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:700, flexShrink:0,
                      background: isCorrect ? "#059669" : "var(--border)",
                      color: isCorrect ? "#fff" : "var(--text-muted)",
                    }}>{LETTERS[j]}</span>
                    <span style={{ fontSize:14, fontWeight: isCorrect ? 700 : 400, color: isCorrect ? "#059669" : "var(--text)" }}>{opt}</span>
                    {isCorrect && <CheckCircle size={16} color="#059669" style={{ marginLeft:"auto", flexShrink:0 }}/>}
                  </div>
                );
              })}
            </div>
            {q.explanation && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"#eff6ff", borderRadius:8, fontSize:13, color:"#1d4ed8", borderLeft:"3px solid #3b82f6" }}>
                <strong>Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-outline" style={{ marginTop:28 }} onClick={() => navigate("/")}>
        <ChevronLeft size={14}/> Go Home
      </button>
    </div>
  );

  /* ── RESULT ── */
  if (state === "result" && result) {
    const pct       = result.pct ?? (result.total ? Math.round((result.score/result.total)*100) : 0);
    const grade     = pct>=90?"A+":pct>=80?"A":pct>=70?"B":pct>=60?"C":pct>=40?"D":"F";
    const gradeColor= pct>=70?"#059669":pct>=40?"#d97706":"#dc2626";
    const headline  = pct>=80?"Excellent Work!":pct>=60?"Well Done!":pct>=40?"Good Effort!":"Keep Practising!";
    const barBg     = pct>=70?"linear-gradient(90deg,#059669,#34d399)":pct>=40?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#dc2626,#f87171)";

    return (
      <div style={{ maxWidth:640, margin:"48px auto", padding:"0 20px 60px" }}>

        {/* ── Result Card ── */}
        <div className="test-card-adv" style={{ gap:0, padding:0, overflow:"hidden" }}>

          {/* Top gradient band */}
          <div style={{ background:"linear-gradient(135deg,#1e40af,#7c3aed)", padding:"32px 28px 28px", textAlign:"center" }}>
            <ScoreRing score={result.score} total={result.total}/>
            <Stars pct={pct}/>
            <h2 style={{ margin:"12px 0 4px", color:"#fff", fontSize:22, fontWeight:900 }}>{headline}</h2>
            <p style={{ margin:0, color:"rgba(255,255,255,0.7)", fontSize:14 }}>{test?.title}</p>
            {test?.teacherName && <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,0.5)", fontSize:12 }}>By {test.teacherName}</p>}
          </div>

          {/* Stats tiles */}
          <div style={{ padding:"24px 24px 0" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              <div className="sc-tile sc-tile-correct" style={{ flexDirection:"column", alignItems:"center", padding:"14px 8px", gap:6 }}>
                <CheckCircle size={20} color="#059669"/>
                <span className="sc-tile-num" style={{ color:"#059669" }}>{result.score}</span>
                <span className="sc-tile-label">Correct</span>
              </div>
              <div className="sc-tile sc-tile-wrong" style={{ flexDirection:"column", alignItems:"center", padding:"14px 8px", gap:6 }}>
                <XCircle size={20} color="#dc2626"/>
                <span className="sc-tile-num" style={{ color:"#dc2626" }}>{result.total - result.score}</span>
                <span className="sc-tile-label">Wrong</span>
              </div>
              <div className="sc-tile" style={{ flexDirection:"column", alignItems:"center", padding:"14px 8px", gap:6, borderColor:"rgba(251,191,36,0.4)", background:"rgba(251,191,36,0.08)" }}>
                <Award size={20} color={gradeColor}/>
                <span className="sc-tile-num" style={{ color:gradeColor, fontSize:20 }}>Grade {grade}</span>
                <span className="sc-tile-label">{result.total} Questions</span>
              </div>
            </div>

            {/* Score bar */}
            <div style={{ margin:"20px 0 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:"var(--text)", marginBottom:8 }}>
                <span>Score</span><span>{pct}%</span>
              </div>
              <div style={{ height:10, borderRadius:99, background:"var(--border)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:barBg, transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }}/>
              </div>
            </div>

            {timeTaken > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, margin:"14px 0 0", fontSize:13, color:"var(--text-muted)" }}>
                <Timer size={14}/> Time taken: <strong style={{ color:"var(--text)" }}>{fmt(timeTaken)}</strong>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding:"20px 24px 24px", display:"flex", gap:10, flexWrap:"wrap" }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate("/")}>
              <ChevronLeft size={14}/> Back to Home
            </button>
            {questions.length > 0 && (
              <button className="btn btn-outline" style={{ flex:1 }}
                onClick={() => { setShowReview(r => !r); setTimeout(() => document.getElementById("answer-review")?.scrollIntoView({ behavior:"smooth" }), 100); }}>
                <Eye size={14}/> {showReview ? "Hide Review" : "Review Answers"}
              </button>
            )}
            <button
              className="btn btn-outline"
              style={{ flex:1 }}
              onClick={() => {
                const score = result?.score ?? 0;
                const total = result?.total ?? 0;
                const pct   = total ? Math.round((score / total) * 100) : 0;
                const text  = `I scored ${score}/${total} (${pct}%) on a test at AcadHub!`;
                if (navigator.share) {
                  navigator.share({ title: 'My AcadHub Result', text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }
              }}
            >
              {copied ? <><Check size={14}/> Copied!</> : <><Share2 size={14}/> Share Result</>}
            </button>
          </div>
        </div>

        {/* Per-question answer review */}
        {showReview && questions.length > 0 && (
          <div id="answer-review" style={{ marginTop:24, display:"flex", flexDirection:"column", gap:14 }}>
            <h3 style={{ fontSize:17, fontWeight:800, margin:0, color:"var(--text)" }}>Your Answer Review</h3>
            {questions.map((q, idx) => {
              const qId        = q._id.toString();
              const detail     = result?.detailedAnswers?.[qId] || {};
              const correctAnswer = detail.correctAnswer;
              const explanation   = detail.explanation;
              const given      = answers[qId] || detail.given;
              const isCorrect  = given === correctAnswer;
              const unanswered = !given;
              const borderColor= isCorrect?"#059669":unanswered?"#d97706":"#dc2626";
              const bgColor    = isCorrect?"#f0fdf4":unanswered?"#fffbeb":"#fef2f2";
              return (
                <div key={q._id} className="test-card-adv" style={{ border:`1.5px solid ${borderColor}`, background:bgColor, gap:10 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ background: isCorrect?"#059669":unanswered?"#d97706":"#dc2626", color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700, flexShrink:0 }}>Q{idx+1}</span>
                    <p style={{ margin:0, fontWeight:600, fontSize:14, lineHeight:1.5, color:"var(--text)", flex:1 }}>{q.question}</p>
                    <span style={{ flexShrink:0 }}>
                      {isCorrect?<CheckCircle size={18} color="#059669"/>:unanswered?<Minus size={18} color="#d97706"/>:<XCircle size={18} color="#dc2626"/>}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {q.options.map((opt, j) => {
                      const isAnswer  = opt === correctAnswer;
                      const isGiven   = opt === given;
                      const hl = isAnswer?{ bg:"#ecfdf5", border:"#059669", color:"#059669" }
                               : isGiven ?{ bg:"#fef2f2", border:"#dc2626", color:"#dc2626" }
                               :           { bg:"transparent", border:"var(--border)", color:"var(--text-muted)" };
                      return (
                        <div key={j} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:hl.bg, border:`1.5px solid ${hl.border}` }}>
                          <span style={{ width:24, height:24, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, background:hl.border, color:"#fff" }}>{LETTERS[j]}</span>
                          <span style={{ fontSize:13, fontWeight: isAnswer||isGiven?700:400, color:hl.color }}>{opt}</span>
                          {isAnswer && <CheckCircle size={14} color="#059669" style={{ marginLeft:"auto" }}/>}
                          {isGiven && !isAnswer && <XCircle size={14} color="#dc2626" style={{ marginLeft:"auto" }}/>}
                        </div>
                      );
                    })}
                  </div>
                  {unanswered && correctAnswer && (
                    <p style={{ margin:0, fontSize:12, color:"#92400e", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                      <AlertTriangle size={13}/> You did not answer — correct answer: <strong style={{ color:"#059669" }}>{correctAnswer}</strong>
                    </p>
                  )}
                  {unanswered && !correctAnswer && (
                    <p style={{ margin:0, fontSize:12, color:"#92400e", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}><AlertTriangle size={13}/> You did not answer this question</p>
                  )}
                  {explanation && (
                    <div style={{ padding:"8px 12px", background:"#eff6ff", borderRadius:8, fontSize:13, color:"#1d4ed8", borderLeft:"3px solid #3b82f6" }}>
                      <strong>Explanation:</strong> {explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── ACTIVE TEST ── */
  return (
    <div className="test-active-page" style={{ userSelect:"none" }}>

      {/* ── Cheat Warning Overlay ── */}
      {showCheat && (
        <div style={{
          position:"fixed", inset:0, zIndex:9999,
          background:"rgba(0,0,0,0.85)", display:"flex",
          alignItems:"center", justifyContent:"center", padding:24,
        }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:"36px 32px",
            maxWidth:440, width:"100%", textAlign:"center",
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)",
          }}>
            {cheatCount < 2 ? (
              <>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"#fff7ed", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <AlertTriangle size={32} color="#f97316" strokeWidth={2}/>
                </div>
                <h2 style={{ margin:"0 0 8px", color:"#c2410c", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><AlertTriangle size={22}/> Warning {cheatCount}/2</h2>
                <p style={{ color:"#374151", marginBottom:6, fontWeight:600 }}>{cheatReason}</p>
                <p style={{ color:"#6b7280", fontSize:13, marginBottom:24 }}>
                  This is your <strong>1st warning</strong>. One more violation and your test will be <strong>auto-submitted immediately</strong>.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width:"100%", padding:"12px 0", fontSize:15 }}
                  onClick={() => setShowCheat(false)}
                >
                  I Understand — Continue Test
                </button>
              </>
            ) : (
              <>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <XCircle size={32} color="#dc2626" strokeWidth={2}/>
                </div>
                <h2 style={{ margin:"0 0 8px", color:"#dc2626", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><XCircle size={22}/> Test Auto-Submitting</h2>
                <p style={{ color:"#374151", marginBottom:6, fontWeight:600 }}>{cheatReason}</p>
                <p style={{ color:"#6b7280", fontSize:13, marginBottom:20 }}>
                  You violated the test rules twice. Your test is being submitted automatically.
                </p>
                <div style={{ fontSize:40, fontWeight:900, color:"#dc2626", fontVariantNumeric:"tabular-nums" }}>
                  {autoSubIn}s
                </div>
                <p style={{ fontSize:12, color:"#9ca3af", marginTop:6 }}>Submitting in {autoSubIn} second{autoSubIn !== 1 ? "s" : ""}…</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="test-topbar">
        <div className="test-topbar-inner">
          <div className="test-topbar-left">
            <div className="ttb-info">
              <div className="ttb-title">{test?.title}</div>
              <div className="ttb-sub">By {test?.teacherName || "Teacher"} · {totalQ} questions</div>
            </div>
          </div>
          <div className="test-topbar-center">
            <div className="topbar-progress-track">
              <div className="topbar-progress-fill" style={{ width:`${totalQ?(answered/totalQ)*100:0}%` }}/>
            </div>
            <span className="topbar-progress-label">{answered}/{totalQ} answered</span>
          </div>
          <div className="test-topbar-right">
            <div
              className={`topbar-timer${timerBoom ? " timer-boom" : timerCritical ? " timer-critical" : ""}`}
              style={{ background: timerWarn?"#fef2f2":"var(--bg)", border:`1.5px solid ${timerWarn?"#fecaca":"var(--border)"}` }}
            >
              <Timer size={14} color={timerWarn?"#dc2626":"var(--text-muted)"}/>
              <span style={{ fontWeight:800, fontSize:15, color:timerWarn?"#dc2626":"var(--text)" }}>{fmt(timeLeft)}</span>
            </div>
          </div>
        </div>
        <div className="topbar-time-bar">
          <div className="topbar-time-fill" style={{ width:`${timerPct}%`, background: timerWarn?"#dc2626":"var(--primary)" }}/>
        </div>
      </div>

      <div className="test-body-layout">
        {/* Sidebar */}
        <div className={`qnav-sidebar${showNav?"":" qnav-closed"}`}>
          <div className="qnav-header">
            <span>Questions</span>
            <button className="qnav-toggle" onClick={() => setNav(v=>!v)}>
              {showNav?<EyeOff size={14}/>:<Eye size={14}/>}
            </button>
          </div>
          {showNav && (
            <>
              <div className="qnav-grid">
                {questions.map((_, idx) => (
                  <button key={idx}
                    className={`qnav-btn${activeQ===idx?" qnav-curr":""}${answers[questions[idx]._id]!==undefined?" qnav-done":""}`}
                    onClick={() => scrollToQ(idx)}
                  >{idx+1}</button>
                ))}
              </div>
              <div className="qnav-bottom">
                <div className="qnav-summary">
                  <div><span className="qnav-sum-num">{answered}</span><span className="qnav-sum-lbl">Done</span></div>
                  <div><span className="qnav-sum-num" style={{ color:"#dc2626" }}>{totalQ-answered}</span><span className="qnav-sum-lbl">Left</span></div>
                </div>
                <button className="submit-btn-main" style={{ marginTop:12 }} onClick={() => setModal(true)} disabled={submitting}>
                  <Send size={14}/> Submit Test
                </button>
              </div>
            </>
          )}
        </div>

        {/* Single question display — one at a time only */}
        <div className="test-questions-area">
          {questions.length > 0 && (() => {
            const q = questions[activeQ];
            const userAns = answers[q._id];
            return (
              <div className="question-card-adv" key={q._id}>
                <div className="qca-topbar">
                  <div className="qca-num-badge">Q{activeQ+1}</div>
                  <div className="qca-progress-mini">{activeQ+1}/{totalQ}</div>
                </div>
                <h3 className="qca-text">{q.question}</h3>
                <div className="options-adv">
                  {q.options.map((opt, j) => (
                    <button key={j}
                      className={`option-adv${userAns===opt?" oa-selected":""}`}
                      onClick={() => setAns(prev => ({ ...prev, [q._id]: opt }))}
                    >
                      <span className={`oa-letter${userAns===opt?" oa-letter-sel":""}`}>{LETTERS[j]}</span>
                      <span className="oa-text">{opt}</span>
                    </button>
                  ))}
                </div>
                <div className="qca-nav-row">
                  <button className="btn btn-ghost btn-sm" disabled={activeQ===0} onClick={() => setAQ(i=>i-1)}>
                    <ChevronLeft size={14}/> Prev
                  </button>
                  <span className="qca-answered-pill">
                    {userAns!==undefined?<><CheckCircle size={11} color="#059669"/> Answered</>:<><Minus size={11}/> Not answered</>}
                  </span>
                  {activeQ < totalQ-1 ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => setAQ(i=>i+1)}>
                      Next <ChevronRight size={14}/>
                    </button>
                  ) : (
                    <button className="submit-btn-main" style={{ padding:"6px 14px", fontSize:13 }} onClick={() => setModal(true)} disabled={submitting}>
                      <Send size={13}/> Submit
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="test-submit-bar">
            <div className="tsb-info">
              <TrendingUp size={15} color="var(--primary)"/>
              <span><strong>{answered}</strong> of <strong>{totalQ}</strong> answered</span>
              {totalQ-answered>0 && <span className="tsb-warn">· {totalQ-answered} unanswered</span>}
            </div>
            <button className="submit-btn-main" onClick={() => setModal(true)} disabled={submitting}>
              {submitting?<><Loader2 size={15} className="spin"/> Submitting…</>:<><Send size={15}/> Submit Test</>}
            </button>
          </div>
        </div>
      </div>

      {/* Floating submit (mobile) */}
      <div className="floating-submit">
        <div className="floating-submit-progress">
          <div style={{ width:`${totalQ?(answered/totalQ)*100:0}%` }}/>
        </div>
        <button className="submit-btn-main floating-submit-btn" onClick={() => setModal(true)} disabled={submitting}>
          <Send size={15}/> Submit Test
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-icon"><Send size={28} color="var(--primary)"/></div>
            <h3 className="modal-title">Submit Test?</h3>
            <p className="modal-body">
              You've answered <strong>{answered}</strong> of <strong>{totalQ}</strong> questions.
              {totalQ-answered>0 && <> <span style={{ color:"var(--danger)" }}>{totalQ-answered} unanswered.</span></>}
              {" "}This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button>
              <button className="submit-btn-main" onClick={handleSubmit} disabled={submitting}>
                {submitting?<><Loader2 size={14} className="spin"/> Submitting…</>:<><CheckCircle size={15}/> Confirm Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
