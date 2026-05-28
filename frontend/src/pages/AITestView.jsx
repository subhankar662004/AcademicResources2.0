import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { API_URL } from "../config";
import {
  Brain, CheckCircle, XCircle, Minus, ChevronLeft, ChevronRight,
  Send, RotateCcw, Loader2, Eye, EyeOff, Target, Timer,
  ListChecks, Star, TrendingUp, Award, Lightbulb, AlertTriangle,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ── Animated SVG ring ── */
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
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="white" strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)", filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))" }}
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

export default function AITestView() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [test,       setTest]       = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [submitted,  setSubmitted]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [activeQ,    setActiveQ]    = useState(0);
  const [showNav,    setShowNav]    = useState(true);
  const [timeTaken,  setTimeTaken]  = useState(0);
  const [loading,    setLoading]    = useState(true);
  const startRef     = useRef(Date.now());
  const questionRefs = useRef([]);

  /* ── Lock body scroll when submit modal is open ── */
  useEffect(() => {
    if (showModal) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [showModal]);

  /* Restore saved answers from localStorage (survives accidental refresh) */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ai_answers_${id}`);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/ai-tests/test/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => { setTest(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const scrollToQ = (idx) => {
    setActiveQ(idx);
    questionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* Persist answers to localStorage as user answers (survives refresh) */
  useEffect(() => {
    if (Object.keys(answers).length > 0)
      localStorage.setItem(`ai_answers_${id}`, JSON.stringify(answers));
  }, [answers, id]);

  const handleSubmit = () => {
    setTimeTaken(Math.round((Date.now() - startRef.current) / 1000));
    setSubmitted(true);
    setShowModal(false);
    localStorage.removeItem(`ai_answers_${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16 }}>
      <Loader2 size={36} className="spin" color="var(--primary)"/>
      <p style={{ color:"var(--text-muted)", fontWeight:600 }}>Loading practice set…</p>
    </div>
  );

  if (!test) return (
    <div className="empty-state" style={{ padding:"80px 24px" }}>
      <div className="empty-state-icon"><Brain size={44} color="var(--primary)" strokeWidth={1.5}/></div>
      <h3>Practice Set Not Found</h3>
      <p>This AI practice set may have been deleted.</p>
      <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => navigate("/test")}>
        <ChevronLeft size={14}/> Back to Tests
      </button>
    </div>
  );

  const questions  = test.questions || [];
  const totalQ     = questions.length;
  const answered   = Object.keys(answers).length;
  const unanswered = totalQ - answered;
  const score      = submitted ? questions.filter((q, i) => answers[i] === q.answer).length : 0;
  const scorePct   = submitted && totalQ ? Math.round((score / totalQ) * 100) : 0;
  const wrongCnt   = submitted ? totalQ - score : 0;

  return (
    <div className="test-active-page">

      {/* ── Sticky top bar ── */}
      <div className="test-topbar">
        <div className="test-topbar-inner">
          <div className="test-topbar-left">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/test")} title="Back">
              <ChevronLeft size={16}/>
            </button>
            <div className="ttb-info">
              <div className="ttb-title">{test.moduleName || "AI Practice Set"}</div>
              <div className="ttb-sub">AI Generated · {totalQ} questions</div>
            </div>
          </div>

          <div className="test-topbar-center">
            <div className="topbar-progress-track">
              <div className="topbar-progress-fill" style={{ width: `${totalQ ? (answered / totalQ) * 100 : 0}%` }}/>
            </div>
            <span className="topbar-progress-label">{answered}/{totalQ} answered</span>
          </div>

          <div className="test-topbar-right">
            <div className="topbar-timer" style={{ background:"#f5f3ff", border:"1px solid #e9d5ff" }}>
              <Brain size={14} color="#7c3aed"/>
              <span style={{ color:"#7c3aed", fontWeight:700, fontSize:14 }}>AI Practice</span>
            </div>
          </div>
        </div>
        <div className="topbar-time-bar">
          <div className="topbar-time-fill" style={{ width:`${totalQ ? (answered/totalQ)*100 : 0}%`, background:"#7c3aed" }}/>
        </div>
      </div>

      {/* ══════════ RESULT SCORECARD ══════════ */}
      {submitted && (
        <div className="scorecard-hero">
          <div className="scorecard-hero-bg"/>
          <div className="scorecard-inner">

            <div className="scorecard-left">
              <ScoreRing score={score} total={totalQ}/>
              <Stars pct={scorePct}/>
              <h2 className="scorecard-headline">
                {scorePct >= 80 ? "Excellent Work!" : scorePct >= 60 ? "Well Done!" : scorePct >= 40 ? "Good Effort!" : "Keep Practising!"}
              </h2>
              <p className="scorecard-sub">{test.moduleName || "AI Practice Set"}</p>
            </div>

            <div className="scorecard-tiles">
              <div className="sc-tile sc-tile-correct">
                <CheckCircle size={22} color="#059669"/>
                <span className="sc-tile-num">{score}</span>
                <span className="sc-tile-label">Correct</span>
              </div>
              <div className="sc-tile sc-tile-wrong">
                <XCircle size={22} color="#dc2626"/>
                <span className="sc-tile-num">{wrongCnt}</span>
                <span className="sc-tile-label">Wrong</span>
              </div>
              <div className="sc-tile sc-tile-skip">
                <Minus size={22} color="rgba(255,255,255,0.6)"/>
                <span className="sc-tile-num">{unanswered}</span>
                <span className="sc-tile-label">Skipped</span>
              </div>
              <div className="sc-tile sc-tile-accuracy">
                <Target size={22} color="#fbbf24"/>
                <span className="sc-tile-num">{scorePct}%</span>
                <span className="sc-tile-label">Accuracy</span>
              </div>
              <div className="sc-tile sc-tile-time">
                <Timer size={22} color="#a78bfa"/>
                <span className="sc-tile-num">{fmt(timeTaken)}</span>
                <span className="sc-tile-label">Time Taken</span>
              </div>
              <div className="sc-tile sc-tile-total">
                <ListChecks size={22} color="#67e8f9"/>
                <span className="sc-tile-num">{totalQ}</span>
                <span className="sc-tile-label">Total Qs</span>
              </div>
            </div>

            <div className="scorecard-bar-wrap">
              <div className="scorecard-bar-label">
                <span>Score</span><span>{scorePct}%</span>
              </div>
              <div className="scorecard-bar-track">
                <div
                  className="scorecard-bar-fill"
                  style={{
                    width: `${scorePct}%`,
                    background:
                      scorePct >= 70 ? "linear-gradient(90deg,#059669,#34d399)" :
                      scorePct >= 40 ? "linear-gradient(90deg,#d97706,#fbbf24)" :
                                       "linear-gradient(90deg,#dc2626,#f87171)",
                  }}
                />
              </div>
              <div className="scorecard-bar-markers">
                <span>0</span><span>Pass (40%)</span><span>100</span>
              </div>
            </div>

            <div className="scorecard-actions">
              <button className="sc-action-btn sc-review-btn" onClick={() => {
                document.querySelector(".test-body-layout")?.scrollIntoView({ behavior:"smooth" });
              }}>
                <Eye size={16}/> Review & Explanations
              </button>
              <button className="sc-action-btn sc-retry-btn" onClick={() => navigate("/test")}>
                <RotateCcw size={16}/> Back to Tests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body layout ── */}
      <div className="test-body-layout">

        {/* sidebar navigator */}
        <div className={`qnav-sidebar ${showNav ? "qnav-open" : "qnav-closed"}`}>
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
                {submitted && <><span className="qnav-dot" style={{ background:"#059669" }}/> Correct</>}
              </div>
              <div className="qnav-grid">
                {questions.map((q, idx) => {
                  const isRight = submitted && answers[idx] === q.answer;
                  const isWrong = submitted && answers[idx] !== undefined && answers[idx] !== q.answer;
                  return (
                    <button
                      key={idx}
                      className={`qnav-btn
                        ${activeQ === idx ? " qnav-curr" : ""}
                        ${isRight ? " qnav-right" : ""}
                        ${isWrong ? " qnav-wrong-btn" : ""}
                        ${answers[idx] !== undefined && !submitted ? " qnav-done" : ""}
                      `}
                      onClick={() => scrollToQ(idx)}
                    >
                      {submitted
                        ? isRight ? <CheckCircle size={10}/> : isWrong ? <XCircle size={10}/> : <Minus size={10}/>
                        : idx + 1}
                    </button>
                  );
                })}
              </div>

              {!submitted && (
                <div className="qnav-bottom">
                  <div className="qnav-summary">
                    <div><span className="qnav-sum-num">{answered}</span><span className="qnav-sum-lbl">Done</span></div>
                    <div><span className="qnav-sum-num" style={{ color:"#dc2626" }}>{unanswered}</span><span className="qnav-sum-lbl">Left</span></div>
                  </div>
                  <button
                    className="submit-btn-main"
                    style={{ marginTop:12, background:"linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                    onClick={() => setShowModal(true)}
                  >
                    <Send size={14}/> Submit Practice
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* questions area */}
        <div className="test-questions-area">
          <div className="questions-list">
            {questions.map((q, idx) => {
              const userAns = answers[idx];
              const isRight = submitted && userAns === q.answer;
              const isWrong = submitted && userAns !== undefined && userAns !== q.answer;
              const skipped = submitted && userAns === undefined;

              return (
                <div
                  key={idx}
                  ref={el => questionRefs.current[idx] = el}
                  className={`question-card-adv${submitted ? (isRight ? " qca-correct" : isWrong ? " qca-wrong" : " qca-skipped") : ""}`}
                  onClick={() => setActiveQ(idx)}
                >
                  <div className="qca-topbar">
                    <div className="qca-num-badge" style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)" }}>Q{idx + 1}</div>
                    {submitted && (
                      <div className={`qca-result-badge${isRight ? " qrb-correct" : isWrong ? " qrb-wrong" : " qrb-skip"}`}>
                        {isRight ? <><CheckCircle size={13}/> Correct</> : isWrong ? <><XCircle size={13}/> Incorrect</> : <><Minus size={13}/> Skipped</>}
                      </div>
                    )}
                    <div className="qca-progress-mini">{idx + 1}/{totalQ}</div>
                  </div>

                  <h3 className="qca-text">{q.question}</h3>

                  <div className="options-adv">
                    {q.options.map((opt, j) => {
                      const isSel   = userAns === opt;
                      const isCorr  = submitted && opt === q.answer;
                      const isWrSel = submitted && isSel && opt !== q.answer;
                      return (
                        <button
                          key={j}
                          className={`option-adv${isSel ? " oa-selected" : ""}${isCorr ? " oa-correct" : ""}${isWrSel ? " oa-wrong" : ""}`}
                          onClick={() => !submitted && setAnswers(prev => ({ ...prev, [idx]: opt }))}
                          disabled={submitted}
                        >
                          <span className={`oa-letter${isSel ? " oa-letter-sel" : ""}${isCorr ? " oa-letter-correct" : ""}${isWrSel ? " oa-letter-wrong" : ""}`}>
                            {LETTERS[j]}
                          </span>
                          <span className="oa-text">{opt}</span>
                          {isCorr  && <CheckCircle size={15} color="#059669" style={{ marginLeft:"auto", flexShrink:0 }}/>}
                          {isWrSel && <XCircle size={15} color="#dc2626" style={{ marginLeft:"auto", flexShrink:0 }}/>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Correct answer note */}
                  {submitted && isWrong && q.answer && (
                    <div className="qca-correct-note">
                      <Award size={13} color="#059669"/>
                      <span>Correct answer: <strong>{q.answer}</strong></span>
                    </div>
                  )}

                  {/* AI Explanation */}
                  {submitted && q.explanation && (
                    <div className="ai-explanation">
                      <div className="ai-explanation-header">
                        <Lightbulb size={14} color="#d97706"/>
                        <span>AI Explanation</span>
                      </div>
                      <p className="ai-explanation-text">{q.explanation}</p>
                    </div>
                  )}

                  {/* Prev / Next nav */}
                  {!submitted && (
                    <div className="qca-nav-row">
                      <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => scrollToQ(idx - 1)}>
                        <ChevronLeft size={14}/> Prev
                      </button>
                      <span className="qca-answered-pill">
                        {userAns !== undefined
                          ? <><CheckCircle size={11} color="#059669"/> Answered</>
                          : <><Minus size={11}/> Not answered</>}
                      </span>
                      <button className="btn btn-ghost btn-sm" disabled={idx === totalQ - 1} onClick={() => scrollToQ(idx + 1)}>
                        Next <ChevronRight size={14}/>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* bottom submit bar */}
          {!submitted && totalQ > 0 && (
            <div className="test-submit-bar">
              <div className="tsb-info">
                <TrendingUp size={15} color="#7c3aed"/>
                <span><strong>{answered}</strong> of <strong>{totalQ}</strong> answered</span>
                {unanswered > 0 && <span className="tsb-warn">· {unanswered} unanswered</span>}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <button className="btn btn-outline" onClick={() => navigate("/test")}>
                  <ChevronLeft size={14}/> Exit
                </button>
                <button
                  className="submit-btn-main"
                  style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow:"0 4px 14px rgba(124,58,237,0.4)" }}
                  onClick={() => setShowModal(true)}
                >
                  <Send size={15}/> Submit Practice
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="test-submit-bar">
              <p style={{ fontSize:14, color:"var(--text-muted)" }}>
                <Brain size={14} color="#7c3aed" style={{ display:"inline", marginRight:5 }}/>
                Practice complete — <strong>{score}/{totalQ}</strong> correct ({scorePct}%)
              </p>
              <button className="btn btn-primary" onClick={() => navigate("/test")}>
                <RotateCcw size={14}/> Back to Tests
              </button>
            </div>
          )}
        </div>
      </div>

      {/* floating submit (mobile) */}
      {!submitted && totalQ > 0 && (
        <div className="floating-submit">
          <div className="floating-submit-progress">
            <div style={{ width:`${totalQ ? (answered/totalQ)*100 : 0}%` }}/>
          </div>
          <button
            className="submit-btn-main floating-submit-btn"
            style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)" }}
            onClick={() => setShowModal(true)}
          >
            <Send size={15}/> Submit Practice
          </button>
        </div>
      )}

      {/* submit confirmation modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background:"#f5f3ff" }}>
              <Brain size={28} color="#7c3aed"/>
            </div>
            <h3 className="modal-title">Submit Practice?</h3>
            <p className="modal-body">
              You've answered <strong>{answered}</strong> of <strong>{totalQ}</strong> questions.
              {unanswered > 0 && (
                <> <span style={{ color:"var(--danger)" }}>{unanswered} question{unanswered > 1 ? "s" : ""}</span> left unanswered.</>
              )}
              {" "}AI explanations will be revealed after submission.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="submit-btn-main"
                style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                onClick={handleSubmit}
              >
                <CheckCircle size={15}/> Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
