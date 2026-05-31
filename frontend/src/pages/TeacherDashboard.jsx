import { useState, useEffect, useRef, useMemo } from "react";
import CustomSelect from "../components/CustomSelect";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../App";
import { API_URL } from "../config";
import {
  Plus, ClipboardList, BarChart2, Trash2, Copy, Check,
  ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle,
  Clock, Users, BookOpen, Link2, Eye, Send,
  Timer, X, GraduationCap, Trophy, Target,
  Globe, AlertCircle, BadgeCheck, Pencil, Download, Files, FlaskConical, ShieldAlert,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "./AdminModals";

const LETTERS = ["A", "B", "C", "D"];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function ShareCodePanel({ code, shareUrl }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="sc-panel">
      <div className="sc-panel-top">
        <div className="sc-label-row">
          <Link2 size={13} color="#d97706" />
          <span className="sc-label">Test Code</span>
        </div>
        <div className="sc-code-wrap">
          <span className="sc-code">{code}</span>
          <button className="sc-copy-code" onClick={copyCode}>
            {copiedCode ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> Copy Code</>}
          </button>
        </div>
      </div>
      <div className="sc-panel-bottom">
        <span className="sc-hint">
          <Users size={11}/> Students enter this code on the home screen
        </span>
        <div className="sc-link-row">
          <span className="sc-url">{shareUrl}</span>
          <button className="sc-copy-link" onClick={copyLink}>
            {copiedLink ? <><Check size={12}/> Done</> : <><Copy size={12}/> Copy Link</>}
          </button>
          <a className="sc-open-btn" href={`/#/take-test/${code}`} target="_blank" rel="noreferrer">
            <Eye size={12}/> Open
          </a>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score, total }) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const color = pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="td-score-bar-wrap">
      <div className="td-score-bar-track">
        <div className="td-score-bar-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="td-score-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const authH = { Authorization: `Bearer ${token}` };
  const [searchParams] = useSearchParams();

  const toast = useToast();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get("tab");
    return (t === "create" || t === "results") ? t : "tests";
  });
  const [tests, setTests]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* create form */
  const [title, setTitle]   = useState("");
  const [desc,  setDesc]    = useState("");
  const [cat,   setCat]     = useState("General");
  const [subj,  setSubj]    = useState("");
  const [dur,   setDur]     = useState("");
  const [start, setStart]   = useState("");
  const [end,   setEnd]     = useState("");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdTest, setCreatedTest] = useState(null);

  /* question form */
  const [qText, setQText]       = useState("");
  const [opts,  setOpts]        = useState(["", "", "", ""]);
  const [answerIdx, setAnswerIdx] = useState(0);
  const [expl, setExpl]         = useState("");
  const [addingQ, setAddingQ]   = useState(false);
  const [questions, setQuestions] = useState([]);

  /* results */
  const [resTestId, setResTestId]   = useState(null);
  const [results,   setResults]     = useState([]);
  const [resLoading, setResLoading] = useState(false);

  const [confirmDlg, setConfirmDlg] = useState(null);

  /* bulk upload */
  const [bulkMode,    setBulkMode]    = useState(false);
  const [bulkText,    setBulkText]    = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult,  setBulkResult]  = useState(null);

  /* expanded question list per test card */
  const [expandedTest, setExpandedTest] = useState(null);
  const [testQs,       setTestQs]       = useState({});

  /* edit test inline */
  const [editTestId,     setEditTestId]     = useState(null);
  const [editTestForm,   setEditTestForm]   = useState({});
  const [editTestSaving, setEditTestSaving] = useState(false);

  /* edit question modal */
  const [editQModal,  setEditQModal]  = useState(null); // { q, testId }
  const [editQSaving, setEditQSaving] = useState(false);

  /* student detail modal */
  const [studentDetail,  setStudentDetail]  = useState(null); // { result, questions }
  const [detailLoading,  setDetailLoading]  = useState(false);

  /* submission counts per test */
  const [subCounts,  setSubCounts]  = useState({});

  /* questions for current result test (difficulty analysis + student detail) */
  const [resQuestions, setResQuestions] = useState([]);

  /* duplicating state */
  const [duplicating, setDuplicating] = useState(null);

  /* add question to existing test (My Tests tab) */
  const [addToTestId,  setAddToTestId]  = useState(null);
  const [addToQText,   setAddToQText]   = useState('');
  const [addToOpts,    setAddToOpts]    = useState(['', '', '', '']);
  const [addToAnsIdx,  setAddToAnsIdx]  = useState(0);
  const [addToExpl,    setAddToExpl]    = useState('');
  const [addToSaving,  setAddToSaving]  = useState(false);

  const notify = (type, msg) => type === "success" ? toast.success(msg) : toast.error(msg);

  const shareUrl = (code) =>
    `${window.location.origin}/#/take-test/${code}`;

  const sortedResults = useMemo(() => [...results].sort((a, b) => {
    const pA = a.total ? a.score / a.total : 0;
    const pB = b.total ? b.score / b.total : 0;
    return pB - pA;
  }), [results]);
  const pgMyTests  = usePagination(tests, 6);
  const pgResults  = usePagination(sortedResults, 15);

  /* ── Load my tests ── */
  useEffect(() => {
    fetchTests();
    fetchSubCounts();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests`, { headers: authH });
      if (res.ok) setTests(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchSubCounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/submission-counts`, { headers: authH });
      if (res.ok) setSubCounts(await res.json());
    } catch { /* silent */ }
  };

  /* ── Create test ── */
  const handleCreateTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests`, {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({
  title,
  description: desc,
  category: cat,
  subject: subj,
  duration: dur,
  startTime: start ? new Date(start).toISOString() : null,
  endTime: end ? new Date(end).toISOString() : null,
  allowMultipleAttempts,
}),
      });
      const data = await res.json();
      if (!res.ok) { notify("error", data.message || "Failed to create test"); return; }
      setCreatedTest(data);
      setTests(prev => [data, ...prev]);
      notify("success", "Test created! Now add questions below.");
    } catch { notify("error", "Connection error"); }
    finally { setSaving(false); }
  };

  /* ── Add question ── */
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!createdTest) return;
    const filled = opts.filter(o => o.trim());
    if (filled.length < 2) { notify("error", "Add at least 2 options"); return; }
    if (!opts[answerIdx]?.trim()) { notify("error", "Select a valid answer"); return; }
    setAddingQ(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/${createdTest._id}/questions`, {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({
          question: qText.trim(),
          options: opts.filter(o => o.trim()),
          answer: opts[answerIdx].trim(),
          explanation: expl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { notify("error", data.message || "Failed"); return; }
      setQuestions(prev => [...prev, data]);
      setQText(""); setOpts(["", "", "", ""]); setAnswerIdx(0); setExpl("");
      notify("success", "Question added!");
    } catch { notify("error", "Connection error"); }
    finally { setAddingQ(false); }
  };

  /* ── Delete question (works in both Create flow and My-Tests tab) ── */
  const handleDeleteQ = async (qOrId, testId) => {
    const qid = typeof qOrId === 'string' ? qOrId : qOrId._id;
    const preview = typeof qOrId === 'object' ? `"${qOrId.question.slice(0, 80)}"` : '';
    setConfirmDlg({
      msg: preview ? `Delete this question?\n${preview}` : 'Delete this question?',
      onConfirm: async () => {
        try {
          const res  = await fetch(`${API_URL}/api/teacher/questions/${qid}`, { method: 'DELETE', headers: authH });
          const data = await res.json();
          if (!res.ok) { toast.error(data.message || 'Failed to delete'); return; }
          if (testId) {
            setTestQs(prev => ({ ...prev, [testId]: (prev[testId] || []).filter(x => x._id !== qid) }));
          } else {
            setQuestions(prev => prev.filter(x => x._id !== qid));
          }
          toast.delete('Question deleted');
        } catch { toast.error('Connection error'); }
      },
    });
  };

  /* ── Delete test ── */
  const handleDeleteTest = (id) => setConfirmDlg({ id });
  const doDeleteTest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/${id}`, { method: "DELETE", headers: authH });
      if (res.ok) { setTests(prev => prev.filter(t => t._id !== id)); toast.delete('Test deleted'); }
    } catch { /* silent */ }
  };

  /* ── Toggle question list ── */
  const toggleExpand = async (testId) => {
    if (expandedTest === testId) { setExpandedTest(null); return; }
    setExpandedTest(testId);
    if (!testQs[testId]) {
      const res = await fetch(`${API_URL}/api/teacher/tests/${testId}/questions`, { headers: authH });
      if (res.ok) {
        const data = await res.json();
        setTestQs(prev => ({ ...prev, [testId]: data }));
      }
    }
  };

  /* ── Load results ── */
  const loadResults = async (testId) => {
    setResTestId(testId);
    setTab("results");
    setResLoading(true);
    setResQuestions([]);
    try {
      const [rRes, qRes] = await Promise.all([
        fetch(`${API_URL}/api/teacher/tests/${testId}/results`, { headers: authH }),
        fetch(`${API_URL}/api/teacher/tests/${testId}/questions`, { headers: authH }),
      ]);
      if (rRes.ok) setResults(await rRes.json());
      if (qRes.ok) setResQuestions(await qRes.json());
    } catch { /* silent */ }
    finally { setResLoading(false); }
  };

  /* ── Bulk upload ── */
  const handleFileRead = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkText(ev.target.result || '');
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (!createdTest || !bulkText.trim()) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/${createdTest._id}/questions/bulk`, {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText }),
      });
      const data = await res.json();
      if (!res.ok) { notify('error', data.message || 'Bulk upload failed'); setBulkResult({ error: data.message }); return; }
      setBulkResult(data);
      setQuestions(prev => [...prev, ...(data.questions || [])]);
      setBulkText('');
      notify('success', `${data.inserted} question${data.inserted !== 1 ? 's' : ''} added!`);
    } catch { notify('error', 'Connection error'); }
    finally { setBulkLoading(false); }
  };

  /* ── Edit test (inline) ── */
  const startEditTest = (t) => {
    const toLocal = (iso) => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    setEditTestId(t._id);
   setEditTestForm({
  title: t.title,
  desc: t.description || '',
  cat: t.category || '',
  subj: t.subject || '',
  dur: t.duration || '',
  start: toLocal(t.startTime),
  end: toLocal(t.endTime),
  allowMultipleAttempts: t.allowMultipleAttempts !== false,
});
  };
  const handleSaveEditTest = async (testId) => {
    setEditTestSaving(true);
    try {
      const { title, desc, cat, subj, dur, start, end, allowMultipleAttempts } = editTestForm;
      const res = await fetch(`${API_URL}/api/teacher/tests/${testId}`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({
  title,
  description: desc,
  category: cat,
  subject: subj,
  duration: dur,
  startTime: start ? new Date(start).toISOString() : null,
  endTime: end ? new Date(end).toISOString() : null,
  allowMultipleAttempts,
}),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to save'); return; }
      setTests(prev => prev.map(t => t._id === testId ? { ...t, ...data } : t));
      setEditTestId(null);
      toast.edit('Test updated!');
    } catch { toast.error('Connection error'); }
    finally { setEditTestSaving(false); }
  };

  /* ── Edit question (modal) ── */
  const openEditQ = (q) => setEditQModal({ ...q, editText: q.question, editOpts: [...q.options], editAnswer: q.answer });
  const handleSaveEditQ = async () => {
    if (!editQModal) return;
    setEditQSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/questions/${editQModal._id}`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: editQModal.editText, options: editQModal.editOpts, answer: editQModal.editAnswer }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed'); return; }
      setTestQs(prev => {
        const updated = { ...prev };
        for (const tid in updated) {
          updated[tid] = updated[tid].map(q => q._id === data._id ? data : q);
        }
        return updated;
      });
      setQuestions(prev => prev.map(q => q._id === data._id ? data : q));
      setEditQModal(null);
      toast.success('Question updated!');
    } catch { toast.error('Connection error'); }
    finally { setEditQSaving(false); }
  };

  /* ── Student detail (modal) ── */
  const openStudentDetail = async (result) => {
    setDetailLoading(true);
    setStudentDetail({ result, questions: resQuestions });
    setDetailLoading(false);
  };

  /* ── Export CSV ── */
  const exportCsv = () => {
    if (!results.length) return;
    const testTitle = tests.find(t => t._id === resTestId)?.title || 'test';
    const rows = [['#', 'Student Name', 'Email', 'Score', 'Total', 'Percentage', 'Grade', 'Submitted At']];
    [...results].sort((a, b) => (b.total ? b.score / b.total : 0) - (a.total ? a.score / a.total : 0))
      .forEach((r, i) => {
        const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
        const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
        rows.push([i + 1, r.userId?.name || 'Unknown', r.userId?.email || '', r.score, r.total, `${pct}%`, grade, new Date(r.submittedAt || r.createdAt).toLocaleString()]);
      });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${testTitle.replace(/[^a-z0-9]/gi, '_')}_results.csv`;
    a.click();
    toast.info('CSV downloaded!');
  };

  /* ── Duplicate test ── */
  const handleDuplicate = async (testId) => {
    setDuplicating(testId);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/${testId}/duplicate`, { method: 'POST', headers: authH });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to duplicate'); return; }
      setTests(prev => [data.test, ...prev]);
      fetchSubCounts();
      toast.success(`Duplicated with ${data.questionsCopied} question${data.questionsCopied !== 1 ? 's' : ''}!`);
    } catch { toast.error('Connection error'); }
    finally { setDuplicating(null); }
  };

  /* ── Add question to an already-existing test (My Tests tab) ── */
  const handleAddToTest = async (testId) => {
    if (!addToQText.trim()) { toast.error('Enter a question'); return; }
    const filled = addToOpts.filter(o => o.trim());
    if (filled.length < 2) { toast.error('Add at least 2 options'); return; }
    if (!addToOpts[addToAnsIdx]?.trim()) { toast.error('Select a valid answer'); return; }
    setAddToSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/tests/${testId}/questions`, {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: addToQText.trim(),
          options: addToOpts.filter(o => o.trim()),
          answer: addToOpts[addToAnsIdx].trim(),
          explanation: addToExpl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to add question'); return; }
      setTestQs(prev => ({ ...prev, [testId]: [...(prev[testId] || []), data] }));
      setAddToQText(''); setAddToOpts(['', '', '', '']); setAddToAnsIdx(0); setAddToExpl('');
      toast.success('Question added!');
    } catch { toast.error('Connection error'); }
    finally { setAddToSaving(false); }
  };

  /* ── Publish request ── */
  const handlePublishRequest = async (testId, currentStatus) => {
    try {
      if (currentStatus === 'pending') {
        // Cancel
        const res = await fetch(`${API_URL}/api/teacher/tests/${testId}/publish-request`, { method: 'DELETE', headers: authH });
        if (res.ok) {
          setTests(prev => prev.map(t => t._id === testId ? { ...t, publishStatus: 'none' } : t));
          toast.success('Publish request cancelled');
        }
      } else {
        // Submit new request
        const res = await fetch(`${API_URL}/api/teacher/tests/${testId}/publish-request`, { method: 'POST', headers: authH });
        const data = await res.json();
        if (!res.ok) { toast.error(data.message || 'Failed'); return; }
        setTests(prev => prev.map(t => t._id === testId ? { ...t, publishStatus: 'pending' } : t));
        toast.success('Publish request sent to admin!');
      }
    } catch { toast.error('Connection error'); }
  };

  const resetCreate = () => {
    setTitle(""); setDesc(""); setCat("General"); setSubj("");
    setDur(""); setStart(""); setEnd("");
setAllowMultipleAttempts(true);
    setCreatedTest(null); setQuestions([]);
    setQText(""); setOpts(["", "", "", ""]); setAnswerIdx(0); setExpl("");
    setBulkMode(false); setBulkText(''); setBulkResult(null);
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 style={{ display:"flex", alignItems:"center", gap:10 }}>
          <BookOpen size={26} color="var(--primary)"/> Teacher Dashboard
        </h1>
        <p>Create and share tests with your students</p>
      </div>

      {/* Tabs */}
      <div className="td-tabs">
        {[
          { id:"tests",   label:"My Tests",     Icon:ClipboardList },
          { id:"create",  label:"Create Test",  Icon:Plus },
          { id:"results", label:"Student Results", Icon:BarChart2 },
        ].map(({ id, label, Icon }) => (
          <button key={id} className={`td-tab${tab===id?" td-tab-active":""}`} onClick={() => setTab(id)}>
            <Icon size={15}/> {label}
          </button>
        ))}
      </div>

      {/* ════ MY TESTS ════ */}
      {tab === "tests" && (
        <div className="td-panel">
          <div className="td-panel-hdr">
            <div>
              <h2>My Tests <span className="count-badge">{tests.length}</span></h2>
              <p style={{ fontSize:13, color:"var(--text-muted)" }}>Share the link with your students to let them take the test</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { resetCreate(); setTab("create"); }}>
              <Plus size={13}/> New Test
            </button>
          </div>

          {loading ? (
            <div className="loading-state"><Loader2 size={28} className="spin" color="var(--primary)"/><p>Loading…</p></div>
          ) : tests.length === 0 ? (
            <div className="empty-state" style={{ padding:"60px 24px" }}>
              <div className="empty-state-icon"><ClipboardList size={42} color="var(--primary)" strokeWidth={1.5}/></div>
              <h3>No tests yet</h3>
              <p>Create your first test and share it with students</p>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setTab("create")}>
                <Plus size={14}/> Create First Test
              </button>
            </div>
          ) : (
            <div className="td-test-grid">
              {pgMyTests.slice.map(t => (
                <div key={t._id} className="td-test-card">
                  <div className="td-tc-top">
                    <div className="td-tc-icon"><ClipboardList size={18} color="var(--primary)"/></div>
                    <div className="td-tc-info">
                      <div className="td-tc-title">{t.title}</div>
                      <div className="td-tc-meta">
                        <Timer size={11}/> {t.duration} min
                        {t.subject && <> · <BookOpen size={11}/> {t.subject}</>}
                        {t.category && <> · {t.category}</>}
                        {subCounts[t._id] > 0 && (
                          <span style={{ marginLeft:6, background:'#eff6ff', color:'var(--primary)', borderRadius:4, padding:'1px 7px', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:3 }}>
                            <Users size={11}/> {subCounts[t._id]} submitted
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn-icon-ghost" onClick={() => editTestId === t._id ? setEditTestId(null) : startEditTest(t)} title="Edit test">
                        <Pencil size={13} color="var(--primary)"/>
                      </button>
                      <button className="btn-icon-ghost" onClick={() => handleDuplicate(t._id)} title="Duplicate test" disabled={duplicating === t._id}>
                        {duplicating === t._id ? <Loader2 size={13} className="spin"/> : <Files size={13} color="#7c3aed"/>}
                      </button>
                      <button className="btn-icon-ghost" onClick={() => handleDeleteTest(t._id)} title="Delete">
                        <Trash2 size={14} color="#dc2626"/>
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editTestId === t._id && (
                    <div style={{ background:'var(--bg-secondary,#f8fafc)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px', margin:'10px 0' }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'var(--text)' }}>Edit Test</div>
                      <div className="td-inline-edit-grid">
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Title *</label>
                          <input value={editTestForm.title||''} onChange={e=>setEditTestForm(f=>({...f,title:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Subject</label>
                          <input value={editTestForm.subj||''} onChange={e=>setEditTestForm(f=>({...f,subj:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Category</label>
                          <input value={editTestForm.cat||''} onChange={e=>setEditTestForm(f=>({...f,cat:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Duration (min) *</label>
                          <input type="number" min="1" value={editTestForm.dur||''} onChange={e=>setEditTestForm(f=>({...f,dur:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Start Time</label>
                          <input type="datetime-local" value={editTestForm.start||''} onChange={e=>setEditTestForm(f=>({...f,start:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>End Time</label>
                          <input type="datetime-local" value={editTestForm.end||''} onChange={e=>setEditTestForm(f=>({...f,end:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
  <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:6 }}>
    Attempt Permission
  </label>

  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <button
      type="button"
      className={`btn btn-sm ${editTestForm.allowMultipleAttempts !== false ? 'btn-primary' : 'btn-outline'}`}
      onClick={() => setEditTestForm(f => ({ ...f, allowMultipleAttempts: true }))}
    >
      Multiple Attempts
    </button>

    <button
      type="button"
      className={`btn btn-sm ${editTestForm.allowMultipleAttempts === false ? 'btn-primary' : 'btn-outline'}`}
      onClick={() => setEditTestForm(f => ({ ...f, allowMultipleAttempts: false }))}
    >
      Only One Attempt
    </button>
  </div>
</div>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:12 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveEditTest(t._id)} disabled={editTestSaving}>
                          {editTestSaving ? <><Loader2 size={12} className="spin"/> Saving…</> : <><Check size={12}/> Save Changes</>}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditTestId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Share code panel */}
                  <ShareCodePanel code={t.shareCode} shareUrl={shareUrl(t.shareCode)} />

                  {/* Publish status badge */}
                  {t.publishStatus === 'approved' && (
                    <div className="td-publish-badge td-publish-approved">
                      <BadgeCheck size={13}/> Officially Published
                    </div>
                  )}
                  {t.publishStatus === 'pending' && (
                    <div className="td-publish-badge td-publish-pending">
                      <Clock size={13}/> Awaiting Admin Approval
                    </div>
                  )}
                  {t.publishStatus === 'rejected' && (
                    <div className="td-publish-badge td-publish-rejected">
                      <AlertCircle size={13}/> Rejected{t.publishNote ? `: ${t.publishNote}` : ''}
                    </div>
                  )}

                  <div className="td-tc-footer">
                    <button className="btn btn-outline btn-sm" onClick={() => toggleExpand(t._id)}>
                      {expandedTest === t._id ? <><ChevronUp size={13}/> Hide Qs</> : <><Eye size={13}/> View Qs</>}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => loadResults(t._id)}>
                      <BarChart2 size={13}/> Results
                    </button>
                    <a className="btn btn-primary btn-sm" href={`/#/take-test/${t.shareCode}`} target="_blank" rel="noreferrer">
                      <Eye size={13}/> Preview
                    </a>
                    {t.publishStatus !== 'approved' && (
                      <button
                        className={`btn btn-sm ${t.publishStatus === 'pending' ? 'btn-outline' : 'btn-publish'}`}
                        onClick={() => handlePublishRequest(t._id, t.publishStatus)}
                        title={t.publishStatus === 'pending' ? 'Cancel publish request' : 'Request to publish on platform'}
                      >
                        <Globe size={13}/>
                        {t.publishStatus === 'pending' ? 'Cancel Request' : t.publishStatus === 'rejected' ? 'Re-request Publish' : 'Publish on Platform'}
                      </button>
                    )}
                  </div>

                  {/* Expanded questions */}
                  {expandedTest === t._id && (
                    <div className="td-qs-list">
                      {(testQs[t._id] || []).length === 0 ? (
                        <p style={{ fontSize:13, color:"var(--text-muted)", padding:"12px 0" }}>No questions added yet.</p>
                      ) : (testQs[t._id] || []).map((q, idx) => (
                        <div key={q._id} className="td-q-item">
                          <div className="td-q-num">Q{idx+1}</div>
                          <div className="td-q-body">
                            <p className="td-q-text">{q.question}</p>
                            <div className="td-q-opts">
                              {q.options.map((o, j) => (
                                <span key={j} className={`td-q-opt${o===q.answer?" td-q-opt-correct":""}`}>
                                  {LETTERS[j]}. {o}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                            <button className="btn-icon-ghost" onClick={() => openEditQ(q)} title="Edit question">
                              <Pencil size={12} color="var(--primary)"/>
                            </button>
                            <button className="btn-icon-ghost" onClick={() => handleDeleteQ(q, t._id)} title="Delete question">
                              <Trash2 size={12} color="#dc2626"/>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* ── Add question to this test ── */}
                      {addToTestId !== t._id ? (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginTop:10, alignSelf:'flex-start' }}
                          onClick={() => {
                            setAddToTestId(t._id);
                            setAddToQText(''); setAddToOpts(['','','','']); setAddToAnsIdx(0); setAddToExpl('');
                          }}
                        >
                          <Plus size={13}/> Add Question
                        </button>
                      ) : (
                        <div style={{ marginTop:12, background:'var(--bg-secondary,#f8fafc)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                            <Plus size={14} color="var(--primary)"/> Add New Question
                          </div>
                          <div style={{ marginBottom:10 }}>
                            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Question *</label>
                            <textarea
                              rows={2}
                              value={addToQText}
                              onChange={e => setAddToQText(e.target.value)}
                              placeholder="Type the question here…"
                              style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}
                            />
                          </div>
                          <div className="td-options-grid" style={{ marginBottom:10 }}>
                            {addToOpts.map((o, i) => (
                              <div key={i} className="td-opt-row">
                                <button
                                  type="button"
                                  className={`td-opt-letter${addToAnsIdx===i?' td-opt-letter-selected':''}`}
                                  onClick={() => setAddToAnsIdx(i)}
                                  title="Mark as correct answer"
                                >
                                  {LETTERS[i]}
                                </button>
                                <input
                                  value={o}
                                  onChange={e => { const n=[...addToOpts]; n[i]=e.target.value; setAddToOpts(n); }}
                                  placeholder={`Option ${LETTERS[i]}`}
                                />
                                {addToAnsIdx===i && <CheckCircle size={14} color="#059669"/>}
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom:12 }}>
                            <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Explanation <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(optional)</span></label>
                            <input
                              value={addToExpl}
                              onChange={e => setAddToExpl(e.target.value)}
                              placeholder="Why this answer is correct…"
                              style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}
                            />
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAddToTest(t._id)}
                              disabled={addToSaving || !addToQText.trim()}
                            >
                              {addToSaving ? <><Loader2 size={13} className="spin"/> Adding…</> : <><Plus size={13}/> Add Question</>}
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => setAddToTestId(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Pagination {...pgMyTests} />
            </div>
          )}
        </div>
      )}

      {/* ════ CREATE TEST ════ */}
      {tab === "create" && (
        <div className="td-panel">
          {!createdTest ? (
            <>
              <h2 className="td-panel-title">Create New Test</h2>
              <form onSubmit={handleCreateTest} className="td-create-form">
                <div className="td-form-grid">
                  <div className="form-group td-span2">
                    <label>Test Title *</label>
                    <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Chapter 5 — Algebra Quiz" required/>
                  </div>
                  <div className="form-group td-span2">
                    <label>Description</label>
                    <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Brief description for students"/>
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <input value={subj} onChange={e=>setSubj(e.target.value)} placeholder="e.g. Mathematics"/>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="e.g. General, CSE, Science"/>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes) *</label>
                    <input type="number" value={dur} onChange={e=>setDur(e.target.value)} placeholder="30" min="1" required/>
                  </div>
                  <div className="form-group"/>
                  <div className="form-group">
                    <label>Start Time (optional)</label>
                    <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label>End Time (optional)</label>
                    <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/>
                  </div>

<div className="form-group td-span2">
  <label>Attempt Permission</label>

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <button
      type="button"
      className={`btn btn-sm ${allowMultipleAttempts ? "btn-primary" : "btn-outline"}`}
      onClick={() => setAllowMultipleAttempts(true)}
    >
      Multiple Attempts
    </button>

    <button
      type="button"
      className={`btn btn-sm ${!allowMultipleAttempts ? "btn-primary" : "btn-outline"}`}
      onClick={() => setAllowMultipleAttempts(false)}
    >
      Only One Attempt
    </button>
  </div>

  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
    Default: Multiple attempts allowed. Only One Attempt will enable fullscreen and anti-cheat restrictions.
  </p>
</div>

                </div>
                <div style={{ display:"flex", gap:12, marginTop:8 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><Loader2 size={14} className="spin"/> Creating…</> : <><Plus size={14}/> Create Test & Add Questions</>}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={resetCreate}>Reset</button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Test created — add questions */}
              <div className="td-created-banner">
                <div className="td-created-info">
                  <CheckCircle size={18} color="#059669"/>
                  <div>
                    <div className="td-created-title">"{createdTest.title}" created!</div>
                    <div className="td-created-sub">{questions.length} question{questions.length!==1?"s":""} added so far</div>
                  </div>
                </div>
              </div>
              <ShareCodePanel code={createdTest.shareCode} shareUrl={shareUrl(createdTest.shareCode)} />

              {/* Existing questions */}
              {questions.length > 0 && (
                <div className="td-qs-added">
                  <div className="td-qs-hdr">Questions added ({questions.length})</div>
                  {questions.map((q, idx) => (
                    <div key={q._id} className="td-q-item">
                      <div className="td-q-num">Q{idx+1}</div>
                      <div className="td-q-body">
                        <p className="td-q-text">{q.question}</p>
                        <div className="td-q-opts">
                          {q.options.map((o, j) => (
                            <span key={j} className={`td-q-opt${o===q.answer?" td-q-opt-correct":""}`}>
                              {LETTERS[j]}. {o}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                        <button className="btn-icon-ghost" onClick={() => openEditQ(q)} title="Edit question">
                          <Pencil size={12} color="var(--primary)"/>
                        </button>
                        <button className="btn-icon-ghost" onClick={() => handleDeleteQ(q._id)} title="Delete question">
                          <Trash2 size={13} color="#dc2626"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode toggle: single vs bulk */}
              <div style={{ display:'flex', gap:0, margin:'20px 0 0', borderRadius:8, overflow:'hidden', border:'1.5px solid var(--border)', width:'fit-content' }}>
                {[{id:false,label:'One by One'},{id:true,label:'Bulk Upload (.txt)'}].map(m => (
                  <button key={String(m.id)} type="button"
                    style={{ padding:'8px 18px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', background: bulkMode===m.id ? 'var(--primary)' : 'transparent', color: bulkMode===m.id ? '#fff' : 'var(--text-muted)', transition:'all 0.2s' }}
                    onClick={() => { setBulkMode(m.id); setBulkResult(null); }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Bulk upload section */}
              {bulkMode && (
                <div className="td-add-q-form" style={{ marginTop:14 }}>
                  <h3 className="td-aq-title" style={{ marginBottom:12 }}>Bulk Upload MCQ Questions</h3>

                  {/* Format guide + AI prompt helper */}
                  <div style={{ background:'var(--bg-secondary)', borderRadius:8, padding:'14px 16px', marginBottom:14, fontSize:12, color:'var(--text-muted)', lineHeight:1.8, border:'1.5px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                      <strong style={{ fontSize:13, color:'var(--text)', display:'flex', alignItems:'center', gap:5 }}><ClipboardList size={13} /> Required Format</strong>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize:12, padding:'4px 10px' }}
                          onClick={() => {
                            const example = `1. What is the capital of France?\nA) Berlin\nB) Madrid\nC) Paris\nD) Rome\nAnswer: C\n\n2. Which data structure uses LIFO order?\nA) Queue\nB) Stack\nC) Array\nD) Tree\nAnswer: B\n\n3. What does CPU stand for?\nA) Central Processing Unit\nB) Computer Personal Unit\nC) Central Program Utility\nD) Core Processing Unit\nAnswer: A`;
                            setBulkText(example);
                          }}
                        >
                          Load Example
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize:12, padding:'4px 10px' }}
                          onClick={async () => {
                            const prompt = `Generate 10 MCQ questions in exactly this format (separate each question with a blank line):\n\n1. Question text here?\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nAnswer: A\n\n2. Next question?\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: B`;
                            await navigator.clipboard.writeText(prompt);
                            notify('success', 'AI prompt copied! Paste it in ChatGPT or any AI.');
                          }}
                        >
                          Copy AI Prompt
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily:'monospace', fontSize:12, margin:0, whiteSpace:'pre-wrap', color:'var(--text-muted)' }}>{`1. Question text here?\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nAnswer: A\n\n2. Next question?\n...`}</pre>
                    <div style={{ marginTop:8, padding:'8px 10px', background:'#fffbeb', borderRadius:6, border:'1px solid #fde68a', fontSize:12, color:'#92400e', display:'flex', alignItems:'flex-start', gap:6 }}>
                      <BookOpen size={13} style={{ flexShrink:0, marginTop:1 }} /> <span><strong>Tip:</strong> Click <em>Copy AI Prompt</em>, paste it into ChatGPT or Gemini, add your topic, and paste the result here.</span>
                    </div>
                  </div>

                  <div style={{ marginBottom:10 }}>
                    <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Upload file (.txt, .csv, .md, etc.)</label>
                    <input type="file" accept=".txt,.csv,.md,.text" onChange={handleFileRead}
                      style={{ fontSize:13, padding:'6px', border:'1.5px solid var(--border)', borderRadius:8, width:'100%', cursor:'pointer' }}/>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Or paste questions here</label>
                    <textarea className="form-input" rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)}
                      placeholder={'Paste your questions here, or click "Load Example" above to see the format…'} style={{ fontFamily:'monospace', fontSize:13, resize:'vertical' }}/>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleBulkUpload}
                    disabled={bulkLoading || !bulkText.trim()} style={{ marginBottom: bulkResult ? 12 : 0 }}>
                    {bulkLoading ? <><Loader2 size={13} className="spin"/> Processing…</> : 'Upload Questions'}
                  </button>
                  {bulkResult && !bulkResult.error && (
                    <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'#f0fdf4', border:'1px solid #86efac', fontSize:13 }}>
                      <strong style={{ color:'#059669' }}>✓ {bulkResult.inserted} question{bulkResult.inserted!==1?'s':''} added!</strong>
                      {bulkResult.skipped > 0 && <span style={{ color:'#d97706', marginLeft:10 }}>{bulkResult.skipped} skipped</span>}
                      {bulkResult.errors?.map((e, i) => <div key={i} style={{ color:'#d97706', fontSize:11, marginTop:4 }}>{e}</div>)}
                    </div>
                  )}
                </div>
              )}

              {/* Add question form */}
              {!bulkMode && (
              <div className="td-add-q-form">
                <h3 className="td-aq-title"><Plus size={16}/> Add Question</h3>
                <form onSubmit={handleAddQuestion}>
                  <div className="form-group">
                    <label>Question *</label>
                    <textarea value={qText} onChange={e=>setQText(e.target.value)} rows={2} placeholder="Type the question here…" required/>
                  </div>
                  <div className="td-options-grid">
                    {opts.map((o, i) => (
                      <div key={i} className="td-opt-row">
                        <button
                          type="button"
                          className={`td-opt-letter${answerIdx===i?" td-opt-letter-selected":""}`}
                          onClick={() => setAnswerIdx(i)}
                          title="Mark as correct answer"
                        >
                          {LETTERS[i]}
                        </button>
                        <input
                          value={o}
                          onChange={e => { const n=[...opts]; n[i]=e.target.value; setOpts(n); }}
                          placeholder={`Option ${LETTERS[i]}`}
                        />
                        {answerIdx===i && <CheckCircle size={14} color="#059669"/>}
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label>Explanation (shown after submit)</label>
                    <input value={expl} onChange={e=>setExpl(e.target.value)} placeholder="Optional — explain why the answer is correct"/>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={addingQ}>
                      {addingQ ? <><Loader2 size={13} className="spin"/> Adding…</> : <><Plus size={13}/> Add Question</>}
                    </button>
                    <span style={{ fontSize:12, color:"var(--text-muted)" }}>Click a letter button to mark the correct answer</span>
                  </div>
                </form>
              </div>
              )}

              <div style={{ display:"flex", gap:12, marginTop:20 }}>
                <button className="btn btn-primary" onClick={() => { setTab("tests"); resetCreate(); fetchTests(); }}>
                  <CheckCircle size={14}/> Done — View My Tests
                </button>
                <button className="btn btn-outline" onClick={resetCreate}>Create Another Test</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════ RESULTS ════ */}
      {tab === "results" && (
        <div className="td-panel">
          <div className="td-panel-hdr">
            <div>
              <h2>Student Results</h2>
              {resTestId && (
                <p style={{ fontSize:13, color:"var(--text-muted)" }}>
                  {tests.find(t=>t._id===resTestId)?.title} · {results.length} submission{results.length!==1?"s":""}
                </p>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {results.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={exportCsv}>
                  <Download size={13}/> Export CSV
                </button>
              )}
              {resTestId && (
                <button className="btn btn-outline btn-sm" onClick={() => setTab("tests")}>
                  <ChevronDown size={13}/> Back to Tests
                </button>
              )}
            </div>
          </div>

          {/* Test selector dropdown */}
          {tests.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'var(--text-muted)' }}>Select a test to view results:</label>
              <CustomSelect
                style={{ maxWidth:480 }}
                value={resTestId || ''}
                onChange={e => { if(e.target.value) loadResults(e.target.value); }}
              >
                <option value="">— Choose a test —</option>
                {tests.map(t => <option key={t._id} value={t._id}>{t.title} ({t.duration} min)</option>)}
              </CustomSelect>
            </div>
          )}

          {!resTestId ? (
            <div className="empty-state" style={{ padding:"40px 24px" }}>
              <div className="empty-state-icon"><BarChart2 size={42} color="var(--primary)" strokeWidth={1.5}/></div>
              <h3>Select a test above to view results</h3>
              <p>Choose from the dropdown or go to My Tests and click "Results"</p>
            </div>
          ) : resLoading ? (
            <div className="loading-state"><Loader2 size={28} className="spin" color="var(--primary)"/><p>Loading results…</p></div>
          ) : results.length === 0 ? (
            <div className="empty-state" style={{ padding:"60px 24px" }}>
              <div className="empty-state-icon"><Users size={42} color="var(--primary)" strokeWidth={1.5}/></div>
              <h3>No submissions yet</h3>
              <p>Share the test link with your students to get started</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="td-results-stats">
                <div className="td-rs-pill">
                  <Users size={16} color="var(--primary)"/>
                  <div><div className="td-rs-num">{results.length}</div><div className="td-rs-lbl">Students</div></div>
                </div>
                <div className="td-rs-pill">
                  <Trophy size={16} color="#059669"/>
                  <div>
                    <div className="td-rs-num">{Math.round(results.reduce((a,r)=>a+(r.total?r.score/r.total:0),0)/results.length*100)}%</div>
                    <div className="td-rs-lbl">Avg Score</div>
                  </div>
                </div>
                <div className="td-rs-pill">
                  <Target size={16} color="#d97706"/>
                  <div>
                    <div className="td-rs-num">{Math.max(...results.map(r=>r.total?Math.round(r.score/r.total*100):0))}%</div>
                    <div className="td-rs-lbl">Top Score</div>
                  </div>
                </div>
                <div className="td-rs-pill">
                  <CheckCircle size={16} color="#7c3aed"/>
                  <div>
                    <div className="td-rs-num">{results.filter(r=>r.total && r.score/r.total>=0.4).length}</div>
                    <div className="td-rs-lbl">Passed</div>
                  </div>
                </div>
              </div>

              {/* Results table */}
              <div className="td-results-table-wrap">
                <table className="td-results-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Score</th>
                      <th>Progress</th>
                      <th>Grade</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pgResults.slice.map((r, i) => {
                      const pct = r.total ? Math.round((r.score/r.total)*100) : 0;
                      const grade = pct>=90?"A+":pct>=80?"A":pct>=70?"B":pct>=60?"C":pct>=40?"D":"F";
                      const gradeColor = pct>=70?"#059669":pct>=40?"#d97706":"#dc2626";
                      return (
                        <tr key={r._id} className={i%2===0?"td-tr-even":""}>
                          <td className="td-rank">{pgResults.from + i}</td>
                          <td>
                            <div className="td-student-cell" onClick={() => openStudentDetail(r)} style={{ cursor:'pointer' }} title="View detailed answers">
                              <div className="td-student-avatar">{r.userId?.name?.[0]?.toUpperCase()||"?"}</div>
                              <div>
                                <div className="td-student-name" style={{ color:'var(--primary)', textDecoration:'underline dotted' }}>{r.userId?.name||"Unknown"}</div>
                                <div className="td-student-email">{r.userId?.email||""}</div>
                              </div>
                            </div>
                          </td>
                          <td className="td-score-cell"><strong>{r.score}</strong>/{r.total}</td>
                          <td style={{ minWidth:140 }}><ScoreBar score={r.score} total={r.total}/></td>
                          <td><span className="td-grade-badge" style={{ color:gradeColor, background:pct>=70?"#f0fdf4":pct>=40?"#fffbeb":"#fef2f2", border:`1px solid ${pct>=70?"#bbf7d0":pct>=40?"#fde68a":"#fecaca"}` }}>{grade}</span></td>
                          <td className="td-submitted">{new Date(r.submittedAt||r.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination {...pgResults} />

              {/* Difficulty Analysis */}
              {resQuestions.length > 0 && results.length > 0 && (
                <div style={{ marginTop:28 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <FlaskConical size={16} color="#7c3aed"/>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'var(--text)' }}>Question Difficulty Analysis</h3>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>· {results.length} student{results.length!==1?'s':''}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {resQuestions.map((q, idx) => {
                      const total = results.length;
                      const correct = results.filter(r => r.answers?.[q._id.toString()] === q.answer).length;
                      const wrong = total - correct;
                      const wrongPct = total ? Math.round((wrong / total) * 100) : 0;
                      const diffColor = wrongPct >= 70 ? '#dc2626' : wrongPct >= 40 ? '#d97706' : '#059669';
                      const diffLabel = wrongPct >= 70 ? 'Hard' : wrongPct >= 40 ? 'Medium' : 'Easy';
                      return (
                        <div key={q._id} style={{ background:'var(--bg-white)', border:'1.5px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:8 }}>
                            <div style={{ display:'flex', gap:8, flex:1 }}>
                              <span style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>Q{idx+1}</span>
                              <span style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{q.question}</span>
                            </div>
                            <span style={{ flexShrink:0, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, background: wrongPct>=70?'#fef2f2':wrongPct>=40?'#fffbeb':'#f0fdf4', color:diffColor, border:`1px solid ${wrongPct>=70?'#fecaca':wrongPct>=40?'#fde68a':'#bbf7d0'}` }}>
                              {diffLabel}
                            </span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:999, overflow:'hidden' }}>
                              <div style={{ width:`${wrongPct}%`, height:'100%', background:diffColor, borderRadius:999, transition:'width 0.4s' }}/>
                            </div>
                            <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{wrong}/{total} wrong ({wrongPct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Edit Question Modal ═══ */}
      {editQModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-white)', borderRadius:14, padding:24, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--text)' }}>Edit Question</h3>
              <button onClick={() => setEditQModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={18}/></button>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>Question text *</label>
              <textarea rows={3} value={editQModal.editText||''} onChange={e=>setEditQModal(m=>({...m,editText:e.target.value}))}
                style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}/>
            </div>
            {(editQModal.editOpts||[]).map((opt, j) => (
              <div key={j} style={{ marginBottom:8 }}>
                <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>{LETTERS[j]}. Option {LETTERS[j]}</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input value={opt} onChange={e=>setEditQModal(m=>{const o=[...m.editOpts];o[j]=e.target.value;return {...m,editOpts:o};})}
                    style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13 }}/>
                  <button onClick={()=>setEditQModal(m=>({...m,editAnswer:opt}))}
                    style={{ padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', border:'1.5px solid', flexShrink:0,
                      background: editQModal.editAnswer===opt?'#059669':'transparent',
                      color: editQModal.editAnswer===opt?'#fff':'var(--text-muted)',
                      borderColor: editQModal.editAnswer===opt?'#059669':'var(--border)' }}>
                    {editQModal.editAnswer===opt ? '✓ Correct' : 'Set Correct'}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop:4, padding:'8px 12px', borderRadius:7, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:12, color:'#059669', marginBottom:16 }}>
              Correct answer: <strong>{editQModal.editAnswer || 'Not set'}</strong>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setEditQModal(null)} style={{ padding:'9px 18px', borderRadius:8, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSaveEditQ} disabled={editQSaving} style={{ padding:'9px 18px', borderRadius:8, background:'var(--primary)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', opacity:editQSaving?0.6:1 }}>
                {editQSaving ? <><Loader2 size={13} className="spin"/> Saving…</> : <><Check size={13}/> Save Question</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Student Detail Modal ═══ */}
      {studentDetail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-white)', borderRadius:14, padding:24, width:'100%', maxWidth:600, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--text)' }}>
                {studentDetail.result.userId?.name || 'Student'}'s Answers
              </h3>
              <button onClick={() => setStudentDetail(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={18}/></button>
            </div>
            {(() => {
              const r = studentDetail.result;
              const pct = r.total ? Math.round((r.score/r.total)*100) : 0;
              const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=40?'D':'F';
              const gColor = pct>=70?'#059669':pct>=40?'#d97706':'#dc2626';
              return (
                <>
                  <div style={{ display:'flex', gap:14, alignItems:'center', padding:'10px 14px', background:'var(--bg-secondary,#f8fafc)', borderRadius:9, marginBottom:18 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16 }}>
                      {r.userId?.name?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{r.userId?.name||'Unknown'}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{r.userId?.email||''}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, fontSize:18, color:gColor }}>{r.score}/{r.total}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:gColor }}>Grade {grade} · {pct}%</div>
                    </div>
                  </div>
                  {/* ── Suspicious Activity Log ── */}
                  {r.violations && r.violations.length > 0 ? (
                    <div style={{ marginBottom:16, border:'1.5px solid #fca5a5', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ background:'#fef2f2', padding:'8px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #fecaca' }}>
                        <ShieldAlert size={15} color="#dc2626"/>
                        <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>
                          Suspicious Activity — {r.violations.length} violation{r.violations.length !== 1 ? 's' : ''} detected
                        </span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                        {r.violations.map((v, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'7px 14px', borderBottom: i < r.violations.length - 1 ? '1px solid #fee2e2' : 'none', background:'#fff5f5' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#dc2626', flexShrink:0, marginTop:1 }}>#{i+1}</span>
                            <span style={{ fontSize:12, color:'#7f1d1d', flex:1 }}>{v.reason}</span>
                            <span style={{ fontSize:11, color:'#b91c1c', flexShrink:0, whiteSpace:'nowrap' }}>
                              {v.at ? new Date(v.at).toLocaleTimeString() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom:16, padding:'8px 14px', background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, display:'flex', alignItems:'center', gap:8 }}>
                      <ShieldAlert size={14} color="#059669"/>
                      <span style={{ fontSize:12, fontWeight:600, color:'#059669' }}>No suspicious activity detected</span>
                    </div>
                  )}

                  {studentDetail.questions.length === 0 ? (
                    <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:20 }}>Question details not available.</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {studentDetail.questions.map((q, idx) => {
                        const given = r.answers?.[q._id.toString()];
                        const isCorrect = given === q.answer;
                        const rowBg = isCorrect ? '#f0fdf4' : given ? '#fef2f2' : '#fffbeb';
                        const rowBorder = isCorrect ? '#bbf7d0' : given ? '#fecaca' : '#fde68a';
                        return (
                          <div key={q._id} style={{ border:`1.5px solid ${rowBorder}`, background:rowBg, borderRadius:10, padding:'12px 14px' }}>
                            <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                              <span style={{ fontWeight:800, fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>Q{idx+1}</span>
                              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.4 }}>{q.question}</span>
                              <span style={{ marginLeft:'auto', flexShrink:0 }}>
                                {isCorrect ? <CheckCircle size={16} color="#059669"/> : given ? <XCircle size={16} color="#dc2626"/> : <AlertCircle size={16} color="#d97706"/>}
                              </span>
                            </div>
                            <div style={{ fontSize:12, display:'flex', flexDirection:'column', gap:4 }}>
                              <div style={{ color: isCorrect?'#059669':'#dc2626', fontWeight:600 }}>
                                Student answered: <strong>{given || '(no answer)'}</strong>
                              </div>
                              {!isCorrect && (
                                <div style={{ color:'#059669', fontWeight:600 }}>
                                  Correct answer: <strong>{q.answer}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {confirmDlg && (
        <ConfirmModal
          message={confirmDlg.msg || 'Delete this test and all its questions/results? This cannot be undone.'}
          type="danger"
          onConfirm={() => {
            if (confirmDlg.onConfirm) confirmDlg.onConfirm();
            else doDeleteTest(confirmDlg.id);
            setConfirmDlg(null);
          }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </div>
  );
}
