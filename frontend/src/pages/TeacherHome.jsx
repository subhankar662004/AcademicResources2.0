import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";
import { API_URL } from "../config";
import {
  ClipboardList, Plus, BarChart2, Users, Timer,
  BookOpen, Trophy, TrendingUp, ArrowRight, Loader2,
  CheckCircle, Clock, Target, Zap,
} from "lucide-react";

const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const pctColor = (p) => p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--danger)";

export default function TeacherHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authH = { Authorization: `Bearer ${token}` };

  const [tests, setTests] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/tests`, { headers: authH });
        if (!res.ok) return;
        const data = await res.json();
        setTests(data);

        const maps = {};
        await Promise.all(
          data.slice(0, 5).map(async (t) => {
            const r = await fetch(`${API_URL}/api/teacher/tests/${t._id}/results`, { headers: authH });
            if (r.ok) maps[t._id] = await r.json();
          })
        );
        setResultsMap(maps);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const totalAttempts = Object.values(resultsMap).reduce((s, rs) => s + rs.length, 0);
  const allScores = Object.values(resultsMap).flatMap(rs =>
    rs.map(r => r.total ? Math.round((r.score / r.total) * 100) : 0)
  );
  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const recentTests = [...tests].slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="th-page">

      {/* ── Welcome banner ── */}
      <div className="th-banner">
        <div className="th-banner-text">
          <div className="th-greeting">{greeting},</div>
          <h1 className="th-name">{user?.name || "Teacher"}</h1>
          <p className="th-sub">Here's what's happening with your tests today.</p>
        </div>
        <div className="th-banner-actions">
          <button className="btn btn-primary" onClick={() => navigate("/teacher/tests?tab=create")}>
            <Plus size={15}/> Create New Test
          </button>
          <Link to="/teacher/tests" className="btn btn-outline">
            <ClipboardList size={15}/> Manage Tests
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="th-loading">
          <Loader2 size={32} className="spin" color="var(--primary)"/>
          <p>Loading your dashboard…</p>
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="th-stats">
            {[
              { label: "Total Tests",      value: tests.length,   Icon: ClipboardList, color: "#2563eb" },
              { label: "Total Attempts",   value: totalAttempts,  Icon: Users,         color: "#7c3aed" },
              { label: "Average Score",    value: avgScore ? `${avgScore}%` : "—", Icon: TrendingUp, color: "#059669" },
              { label: "Questions Created",value: tests.reduce((s, t) => s + (t.questionCount || 0), 0) || "—", Icon: BookOpen, color: "#d97706" },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="th-stat-card">
                <div className="th-stat-icon" style={{ background: color + "18" }}>
                  <Icon size={20} color={color}/>
                </div>
                <div className="th-stat-body">
                  <div className="th-stat-val">{value}</div>
                  <div className="th-stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick actions ── */}
          <div className="th-section">
            <h2 className="th-section-title">Quick Actions</h2>
            <div className="th-quick-grid">
              {[
                { label: "Create a Test",    desc: "Build a new quiz for your students", Icon: Plus,         color: "#2563eb", to: "/teacher/tests?tab=create" },
                { label: "My Tests",         desc: "View, edit and share all your tests", Icon: ClipboardList, color: "#7c3aed", to: "/teacher/tests" },
                { label: "Student Results",  desc: "See how students performed",         Icon: BarChart2,     color: "#059669", to: "/teacher/tests?tab=results" },
                { label: "AI Generator",     desc: "Generate tests with AI assistance",  Icon: Zap,           color: "#d97706", to: "/ai-generator" },
              ].map(({ label, desc, Icon, color, to }) => (
                <Link key={label} to={to} className="th-quick-card">
                  <div className="th-qc-icon" style={{ background: color + "15" }}>
                    <Icon size={22} color={color}/>
                  </div>
                  <div>
                    <div className="th-qc-label">{label}</div>
                    <div className="th-qc-desc">{desc}</div>
                  </div>
                  <ArrowRight size={16} className="th-qc-arrow" color="var(--text-muted)"/>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Recent Tests ── */}
          <div className="th-section">
            <div className="th-section-hdr">
              <h2 className="th-section-title">Recent Tests</h2>
              <Link to="/teacher/tests" className="th-see-all">View all <ArrowRight size={13}/></Link>
            </div>

            {tests.length === 0 ? (
              <div className="th-empty">
                <ClipboardList size={38} color="var(--text-light)" strokeWidth={1.5}/>
                <p>No tests yet. Create your first one!</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/teacher/tests?tab=create")}>
                  <Plus size={13}/> Create Test
                </button>
              </div>
            ) : (
              <div className="th-test-list">
                {recentTests.map((t) => {
                  const results = resultsMap[t._id] || [];
                  const attempts = results.length;
                  const avg = attempts
                    ? Math.round(results.reduce((s, r) => s + (r.total ? (r.score / r.total) * 100 : 0), 0) / attempts)
                    : null;
                  return (
                    <div key={t._id} className="th-test-row">
                      <div className="th-tr-icon">
                        <ClipboardList size={18} color="var(--primary)"/>
                      </div>
                      <div className="th-tr-info">
                        <div className="th-tr-title">{t.title}</div>
                        <div className="th-tr-meta">
                          <span><Timer size={11}/> {t.duration} min</span>
                          {t.subject && <span><BookOpen size={11}/> {t.subject}</span>}
                          <span><Clock size={11}/> {fmt(t.createdAt)}</span>
                        </div>
                      </div>
                      <div className="th-tr-stats">
                        <div className="th-tr-pill">
                          <Users size={12}/> {attempts} attempt{attempts !== 1 ? "s" : ""}
                        </div>
                        {avg !== null && (
                          <div className="th-tr-pill" style={{ color: pctColor(avg), borderColor: pctColor(avg) + "40", background: pctColor(avg) + "10" }}>
                            <Target size={12}/> Avg {avg}%
                          </div>
                        )}
                      </div>
                      <Link to={`/teacher/tests?tab=results&testId=${t._id}`} className="th-tr-btn btn btn-outline btn-sm">
                        <BarChart2 size={13}/> Results
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Performance summary ── */}
          {allScores.length > 0 && (
            <div className="th-section">
              <h2 className="th-section-title">Performance Overview</h2>
              <div className="th-perf-row">
                {[
                  { label: "Excellent (≥70%)", val: allScores.filter(s => s >= 70).length, color: "#059669" },
                  { label: "Average (40–69%)", val: allScores.filter(s => s >= 40 && s < 70).length, color: "#d97706" },
                  { label: "Needs Work (<40%)", val: allScores.filter(s => s < 40).length, color: "#dc2626" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="th-perf-card" style={{ borderTop: `3px solid ${color}` }}>
                    <div className="th-perf-val" style={{ color }}>{val}</div>
                    <div className="th-perf-label">{label}</div>
                    <div className="th-perf-bar">
                      <div className="th-perf-fill" style={{ width: `${allScores.length ? (val/allScores.length)*100 : 0}%`, background: color }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
