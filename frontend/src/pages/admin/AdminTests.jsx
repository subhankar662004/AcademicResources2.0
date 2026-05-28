import React, { useState, useMemo, useEffect, useRef } from 'react';
import CustomSelect from '../../components/CustomSelect';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';
import { useAdmin } from './AdminContext';
import { QuestionsModal, ConfirmModal, AiQuestionsModal } from '../AdminModals';
import {
  Search, ClipboardList, Plus, Eye, Pencil, Trash2,
  TrendingUp, Clock, Tag, BookOpen, ChevronRight, X,
  BarChart2, CheckCircle, XCircle, Target, ChevronDown,
  Upload, FileText, AlertCircle, Copy, Check, Link2, Users,
  Brain, Zap, ListChecks, Calendar, GraduationCap, Timer,
} from 'lucide-react';

function AdminShareCode({ code }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const url = `${window.location.origin}/#/take-test/${code}`;
  const copyCode = async () => { await navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); };
  const copyLink = async () => { await navigator.clipboard.writeText(url); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); };
  return (
    <div className="sc-panel sc-panel-compact">
      <div className="sc-panel-top">
        <div className="sc-label-row"><Link2 size={12} color="#d97706"/><span className="sc-label">Test Code</span></div>
        <div className="sc-code-wrap">
          <span className="sc-code">{code}</span>
          <button className="sc-copy-code" onClick={copyCode}>{copiedCode?<><Check size={12}/>Copied!</>:<><Copy size={12}/>Copy Code</>}</button>
        </div>
      </div>
      <div className="sc-panel-bottom">
        <span className="sc-hint"><Users size={11}/> Students enter this code on the home screen</span>
        <div className="sc-link-row">
          <span className="sc-url" style={{fontSize:10}}>{url}</span>
          <button className="sc-copy-link" onClick={copyLink}>{copiedLink?<><Check size={11}/>Done</>:<><Copy size={11}/>Link</>}</button>
          <a className="sc-open-btn" href={`/#/take-test/${code}`} target="_blank" rel="noreferrer"><Eye size={11}/>Open</a>
        </div>
      </div>
    </div>
  );
}
import { API_URL } from '../../config';
import { getCategories } from '../../utils/categoryStore';

const CAT_COLORS = {
  'CSE':      { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  'SSC GD':   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  'Agniveer': { bg: '#fce7f3', color: '#db2777', border: '#fbcfe8' },
  'Nursing':  { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  'WBP':      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Railway':  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
};
const CAT_FALLBACK = { bg: '#f1f5f9', color: '#6366f1', border: '#c7d2fe' };

const TABS = ['Create', 'Questions', 'Results', 'AI Sets', 'Teacher Tests'];

const DIFF_META = {
  easy:   { color: '#059669', bg: '#ecfdf5', label: 'Easy' },
  medium: { color: '#d97706', bg: '#fffbeb', label: 'Medium' },
  hard:   { color: '#dc2626', bg: '#fef2f2', label: 'Hard' },
};

export default function AdminTests() {
  const { tests, setTests, fetchTests, toast, user } = useAdmin();
  const [categories, setCategories] = useState([]);

  useEffect(() => { setCategories(getCategories()); }, []);

  const [activeTab,      setActiveTab]      = useState('Create');
  const [search,         setSearch]         = useState('');
  const [title,          setTitle]          = useState('');
  const [desc,           setDesc]           = useState('');
  const [category,       setCategory]       = useState('CSE');
  const [subject,        setSubject]        = useState('');
  const [duration,       setDuration]       = useState('');
  const [startTime,      setStartTime]      = useState('');
  const [endTime,        setEndTime]        = useState('');
  const [editingId,      setEditingId]      = useState('');
  const [question,       setQuestion]       = useState('');
  const [options,        setOptions]        = useState(['', '', '', '']);
  const [answer,         setAnswer]         = useState('');
  const [selectedTest,   setSelectedTest]   = useState('');
  const [resultTestId,   setResultTestId]   = useState('');
  const [testResults,    setTestResults]    = useState([]);
  const [questionsModal, setQuestionsModal] = useState(null);
  const [confirmDlg,     setConfirmDlg]     = useState(null);
  const [testDropOpen,   setTestDropOpen]   = useState(false);
  const [bulkMode,       setBulkMode]       = useState(false);
  const [bulkText,       setBulkText]       = useState('');
  const [bulkPreview,    setBulkPreview]    = useState([]);
  const [bulkError,      setBulkError]      = useState('');
  const bulkFileRef = useRef(null);

  /* AI Sets state */
  const [allAiTests,  setAllAiTests]  = useState([]);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiSearch,    setAiSearch]    = useState('');
  const [viewAiSet,   setViewAiSet]   = useState(null);

  /* Teacher Tests state */
  const [teacherTests,    setTeacherTests]    = useState([]);
  const [teacherLoading,  setTeacherLoading]  = useState(false);
  const [teacherSearch,   setTeacherSearch]   = useState('');
  const [teacherCatFilter,setTeacherCatFilter]= useState('all');

  useEffect(() => {
    if (activeTab !== 'AI Sets') return;
    setAiLoading(true);
    fetch(`${API_URL}/api/ai-tests/admin/all`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => setAllAiTests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'Teacher Tests') return;
    setTeacherLoading(true);
    fetch(`${API_URL}/api/admin/tests/teacher-all`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => setTeacherTests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setTeacherLoading(false));
  }, [activeTab]);

  const deleteAiTest = async (id) => {
    await fetch(`${API_URL}/api/ai-tests/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    }).catch(() => {});
    setAllAiTests(prev => prev.filter(t => t._id !== id));
    toast.delete('AI test deleted');
  };

  const filteredTeacher = useMemo(() => {
    const q = teacherSearch.toLowerCase();
    return teacherTests.filter(t => {
      const bySearch = !q ||
        t.title?.toLowerCase().includes(q) ||
        t.teacherId?.name?.toLowerCase().includes(q) ||
        t.teacherId?.email?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q);
      const byCat = teacherCatFilter === 'all' || t.category === teacherCatFilter;
      return bySearch && byCat;
    });
  }, [teacherTests, teacherSearch, teacherCatFilter]);
  const pgTeacher = usePagination(filteredTeacher, 15);

  const filteredAi = useMemo(() => {
    const q = aiSearch.toLowerCase();
    return allAiTests.filter(t =>
      !q ||
      t.moduleName?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.user?.name?.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q)
    );
  }, [allAiTests, aiSearch]);
  const pgAi = usePagination(filteredAi, 12);

  const filtered = useMemo(() => tests.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
  }), [tests, search]);
  const pgTests = usePagination(filtered, 12);

  const resetForm = () => {
    setEditingId(''); setTitle(''); setDesc(''); setCategory(categories[0] || 'CSE');
    setSubject(''); setDuration(''); setStartTime(''); setEndTime('');
  };

  const createTest = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    if (!duration)     { toast.error('Duration required'); return; }
    const res = await fetch(`${API_URL}/api/admin/tests/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, category, subject, duration: Number(duration), startTime: startTime || null, endTime: endTime || null, createdBy: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message || 'Failed'); return; }
    setTests(t => [data, ...t]); resetForm(); toast.success('Test created!');
  };

  const updateTest = async () => {
    const res = await fetch(`${API_URL}/api/admin/tests/${editingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, category, subject, duration: Number(duration), startTime: startTime || null, endTime: endTime || null }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message || 'Failed'); return; }
    toast.edit('Test updated!'); resetForm(); fetchTests();
  };

  const startEdit = (t) => {
    setEditingId(t._id); setTitle(t.title || ''); setDesc(t.description || '');
    setCategory(t.category || categories[0] || 'CSE'); setSubject(t.subject || '');
    setDuration(t.duration || '');
    setStartTime(t.startTime ? t.startTime.slice(0, 16) : '');
    setEndTime(t.endTime   ? t.endTime.slice(0, 16)   : '');
    setActiveTab('Create');
  };

  const deleteTest = (id) => setConfirmDlg({ id });

  const addQuestion = async () => {
    if (!selectedTest)     { toast.warning('Select a test first'); return; }
    if (!question.trim())  { toast.warning('Enter a question');    return; }
    if (!answer)           { toast.warning('Select correct answer'); return; }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/admin/tests/${selectedTest}/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ title: question, options, answer }),
    });
    if (res.ok) {
      toast.success('Question added!'); setQuestion(''); setOptions(['', '', '', '']); setAnswer('');
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Failed to add question');
    }
  };

  const fetchResults = async (testId) => {
    setResultTestId(testId); setTestResults([]);
    const res = await fetch(`${API_URL}/api/admin/tests/${testId}/results`);
    if (res.ok) setTestResults(await res.json()); else toast.error('Failed to fetch results');
    setActiveTab('Results');
  };

  const parseBulkJSON = (text) => {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const result = arr.map((q, i) => {
        if (!q.title && !q.question) throw new Error(`Item ${i + 1}: missing "title" or "question" field`);
        if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Item ${i + 1}: "options" must be an array with at least 2 items`);
        if (!q.answer) throw new Error(`Item ${i + 1}: missing "answer" field`);
        return { title: q.title || q.question, options: q.options, answer: q.answer };
      });
      return { ok: true, questions: result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const parseBulkCSV = (text) => {
    try {
      const lines = text.trim().split('\n').filter(Boolean);
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const qIdx = headers.indexOf('question') !== -1 ? headers.indexOf('question') : headers.indexOf('title');
      const aIdx = headers.indexOf('answer');
      const oIdxs = ['optiona','optionb','optionc','optiond','option_a','option_b','option_c','option_d']
        .map(h => headers.indexOf(h)).filter(i => i !== -1);
      if (qIdx === -1) throw new Error('CSV must have a "question" or "title" column');
      if (aIdx === -1) throw new Error('CSV must have an "answer" column');
      if (oIdxs.length < 2) throw new Error('CSV must have at least OptionA and OptionB columns');
      const questions = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const opts = oIdxs.map(oi => cols[oi] || '').filter(Boolean);
        if (!cols[qIdx]) throw new Error(`Row ${i + 2}: empty question`);
        if (!cols[aIdx]) throw new Error(`Row ${i + 2}: empty answer`);
        return { title: cols[qIdx], options: opts, answer: cols[aIdx] };
      });
      return { ok: true, questions };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setBulkText(text);
      const isCSV = file.name.endsWith('.csv');
      const result = isCSV ? parseBulkCSV(text) : parseBulkJSON(text);
      if (result.ok) { setBulkPreview(result.questions); setBulkError(''); }
      else { setBulkPreview([]); setBulkError(result.error); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkTextChange = (text) => {
    setBulkText(text);
    if (!text.trim()) { setBulkPreview([]); setBulkError(''); return; }
    const trimmed = text.trim();
    const result = trimmed.startsWith('[') || trimmed.startsWith('{') ? parseBulkJSON(trimmed) : parseBulkCSV(trimmed);
    if (result.ok) { setBulkPreview(result.questions); setBulkError(''); }
    else { setBulkPreview([]); setBulkError(result.error); }
  };

  const submitBulkQuestions = async () => {
    if (!selectedTest) { toast.warning('Select a test first'); return; }
    if (bulkPreview.length === 0) { toast.warning('No valid questions to upload'); return; }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let successCount = 0;
    for (const q of bulkPreview) {
      const res = await fetch(`${API_URL}/api/admin/tests/${selectedTest}/question`, {
        method: 'POST', headers,
        body: JSON.stringify(q),
      });
      if (res.ok) successCount++;
    }
    toast.success(`${successCount} of ${bulkPreview.length} questions uploaded!`);
    setBulkText(''); setBulkPreview([]); setBulkError(''); setBulkMode(false);
  };

  const totalQuestions = tests.reduce((s, t) => s + (t.questions?.length || 0), 0);
  const catCount = [...new Set(tests.map(t => t.category).filter(Boolean))].length;
  const selectedTestObj = tests.find(t => t._id === selectedTest);

  return (
    <div className="adm-page">
      {questionsModal && (
        <QuestionsModal test={questionsModal} onClose={() => setQuestionsModal(null)} API_URL={API_URL} toast={toast} />
      )}

      {/* Header */}
      <div className="at2-header">
        <div className="at2-header-left">
          <div className="at2-header-icon"><ClipboardList size={20} strokeWidth={2} /></div>
          <div>
            <h1 className="at2-title">Tests</h1>
            <p className="at2-subtitle">Create and manage practice tests</p>
          </div>
        </div>
        <div className="at2-stats-strip">
          <div className="at2-stat-item"><span className="at2-stat-val">{tests.length}</span><span className="at2-stat-lbl">Tests</span></div>
          <div className="at2-stat-sep" />
          <div className="at2-stat-item"><span className="at2-stat-val">{totalQuestions}</span><span className="at2-stat-lbl">Questions</span></div>
          <div className="at2-stat-sep" />
          <div className="at2-stat-item"><span className="at2-stat-val">{catCount}</span><span className="at2-stat-lbl">Categories</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="at2-tabs">
        {TABS.map(t => (
          <button key={t} className={`at2-tab ${activeTab === t ? 'at2-tab-active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'Create'         && <Plus          size={14} />}
            {t === 'Questions'      && <BookOpen      size={14} />}
            {t === 'Results'        && <BarChart2     size={14} />}
            {t === 'AI Sets'        && <Brain         size={14} />}
            {t === 'Teacher Tests'  && <GraduationCap size={14} />}
            {t}
            {t === 'AI Sets' && allAiTests.length > 0 && (
              <span style={{ marginLeft: 4, background: '#f5f3ff', color: '#7c3aed', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                {allAiTests.length}
              </span>
            )}
            {t === 'Teacher Tests' && teacherTests.length > 0 && (
              <span style={{ marginLeft: 4, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                {teacherTests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Create / Edit ── */}
      {activeTab === 'Create' && (
        <div className="at2-card">
          <div className="at2-card-head">
            <div className="at2-card-title">
              {editingId ? <><Pencil size={15} color="#6366f1" /> Edit Test</> : <><Plus size={15} color="#6366f1" /> New Test</>}
            </div>
            {editingId && <button className="at2-cancel-btn" onClick={resetForm}><X size={14} /> Cancel</button>}
          </div>

          <div className="at2-form-grid">
            <div className="at2-field at2-span2">
              <label className="at2-label">Test Title <span className="at2-required">*</span></label>
              <input className="at2-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Structures Mid Term" />
            </div>
            <div className="at2-field at2-span2">
              <label className="at2-label">Description <span className="at2-optional">optional</span></label>
              <textarea className="at2-input at2-textarea" rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of this test" />
            </div>

            {/* Category pill picker */}
            <div className="at2-field at2-span2">
              <label className="at2-label">Category</label>
              <div className="at2-cat-picker">
                {categories.map(c => {
                  const meta = CAT_COLORS[c] || CAT_FALLBACK;
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      className={`at2-cat-pill ${active ? 'at2-cat-pill-active' : ''}`}
                      style={active ? { background: meta.bg, color: meta.color, borderColor: meta.border } : {}}
                      onClick={() => setCategory(c)}
                      type="button"
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="at2-field">
              <label className="at2-label">Subject</label>
              <input className="at2-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Data Structures" />
            </div>
            <div className="at2-field">
              <label className="at2-label">Duration (mins) <span className="at2-required">*</span></label>
              <input className="at2-input" type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" />
            </div>
            <div className="at2-field">
              <label className="at2-label">Start Time <span className="at2-optional">optional</span></label>
              <input className="at2-input" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="at2-field">
              <label className="at2-label">End Time <span className="at2-optional">optional</span></label>
              <input className="at2-input" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="at2-form-actions">
            {editingId ? (
              <>
                <button className="at2-btn-primary" onClick={updateTest}><CheckCircle size={14} /> Update Test</button>
                <button className="at2-btn-ghost" onClick={resetForm}>Cancel</button>
              </>
            ) : (
              <button className="at2-btn-primary" onClick={createTest}><Plus size={14} /> Create Test</button>
            )}
          </div>
        </div>
      )}

      {/* ── Add Question ── */}
      {activeTab === 'Questions' && (
        <div className="at2-card">
          <div className="at2-card-head">
            <div className="at2-card-title"><BookOpen size={15} color="#6366f1" /> Add Question</div>
            <button
              className={`at2-bulk-toggle ${bulkMode ? 'at2-bulk-toggle-active' : ''}`}
              onClick={() => { setBulkMode(m => !m); setBulkText(''); setBulkPreview([]); setBulkError(''); }}
              type="button"
            >
              <Upload size={13} /> Bulk Upload
            </button>
          </div>

          {/* Custom test selector */}
          <div className="at2-field at2-span2" style={{ marginBottom: 18 }}>
            <label className="at2-label">Select Test</label>
            <div className="at2-custom-select" onClick={() => setTestDropOpen(o => !o)}>
              <span className={selectedTest ? 'at2-cs-value' : 'at2-cs-placeholder'}>
                {selectedTestObj ? selectedTestObj.title : '— Choose a test —'}
              </span>
              <ChevronDown size={14} className={`at2-cs-arrow ${testDropOpen ? 'at2-cs-arrow-open' : ''}`} />
              {testDropOpen && (
                <div className="at2-cs-dropdown" onClick={e => e.stopPropagation()}>
                  {tests.length === 0 && <div className="at2-cs-empty">No tests yet</div>}
                  {tests.map(t => {
                    const meta = CAT_COLORS[t.category] || CAT_FALLBACK;
                    return (
                      <div
                        key={t._id}
                        className={`at2-cs-option ${selectedTest === t._id ? 'at2-cs-option-active' : ''}`}
                        onClick={() => { setSelectedTest(t._id); setTestDropOpen(false); }}
                      >
                        <span className="at2-cs-opt-badge" style={{ background: meta.bg, color: meta.color }}>{t.category}</span>
                        <span className="at2-cs-opt-title">{t.title}</span>
                        {selectedTest === t._id && <CheckCircle size={13} color="#6366f1" style={{ marginLeft: 'auto' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="at2-field at2-span2" style={{ marginBottom: 16 }}>
            <label className="at2-label">Question Text</label>
            <input className="at2-input" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Enter the question…" />
          </div>

          <div className="at2-options-grid">
            {options.map((o, i) => (
              <div key={i} className="at2-option-wrap">
                <div className="at2-option-badge">{String.fromCharCode(65 + i)}</div>
                <input
                  className="at2-input"
                  value={o}
                  onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
          </div>

          {/* Correct answer — clickable option buttons */}
          {options.some(Boolean) && (
            <div className="at2-field" style={{ marginTop: 16, marginBottom: 20 }}>
              <label className="at2-label">Correct Answer</label>
              <div className="at2-answer-picker">
                {options.map((o, i) => o.trim() ? (
                  <button
                    key={i}
                    type="button"
                    className={`at2-answer-opt ${answer === o ? 'at2-answer-opt-active' : ''}`}
                    onClick={() => setAnswer(o)}
                  >
                    <span className="at2-answer-letter">{String.fromCharCode(65 + i)}</span>
                    <span>{o}</span>
                    {answer === o && <CheckCircle size={13} style={{ marginLeft: 'auto', color: '#059669' }} />}
                  </button>
                ) : null)}
              </div>
            </div>
          )}

          {!bulkMode && (
            <button className="at2-btn-primary" onClick={addQuestion}><Plus size={14} /> Add Question</button>
          )}

          {/* Bulk upload section */}
          {bulkMode && (
            <div className="at2-bulk-section">
              <div className="at2-bulk-info">
                <FileText size={13} color="#6366f1" />
                <span>Upload a <strong>CSV</strong> or <strong>JSON</strong> file, or paste content below.</span>
              </div>
              <div className="at2-bulk-format-cards">
                <div className="at2-bulk-fmt">
                  <div className="at2-bulk-fmt-title">JSON format</div>
                  <pre className="at2-bulk-fmt-code">{`[{"question":"Q?","options":["A","B","C","D"],"answer":"A"}]`}</pre>
                </div>
                <div className="at2-bulk-fmt">
                  <div className="at2-bulk-fmt-title">CSV format</div>
                  <pre className="at2-bulk-fmt-code">{`question,OptionA,OptionB,OptionC,OptionD,answer\nWhat is 2+2?,1,2,4,8,4`}</pre>
                </div>
              </div>

              <div className="at2-bulk-upload-area" onClick={() => bulkFileRef.current?.click()}>
                <Upload size={20} color="#6366f1" />
                <span>Click to upload .json or .csv file</span>
                <input ref={bulkFileRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={handleBulkFileUpload} />
              </div>

              <div className="at2-field" style={{ marginTop: 12 }}>
                <label className="at2-label">Or paste JSON / CSV here</label>
                <textarea
                  className="at2-input at2-textarea"
                  rows={5}
                  value={bulkText}
                  onChange={e => handleBulkTextChange(e.target.value)}
                  placeholder={'[{"question":"...","options":["A","B","C","D"],"answer":"A"}]'}
                />
              </div>

              {bulkError && (
                <div className="at2-bulk-error">
                  <AlertCircle size={13} /> {bulkError}
                </div>
              )}

              {bulkPreview.length > 0 && (
                <div className="at2-bulk-preview">
                  <div className="at2-bulk-preview-head">
                    <CheckCircle size={13} color="#059669" />
                    <span>{bulkPreview.length} question{bulkPreview.length !== 1 ? 's' : ''} ready to upload</span>
                  </div>
                  <div className="at2-bulk-preview-list">
                    {bulkPreview.slice(0, 5).map((q, i) => (
                      <div key={i} className="at2-bulk-preview-item">
                        <span className="at2-bulk-q-num">{i + 1}</span>
                        <span className="at2-bulk-q-text">{q.title}</span>
                        <span className="at2-bulk-q-ans">✓ {q.answer}</span>
                      </div>
                    ))}
                    {bulkPreview.length > 5 && (
                      <div className="at2-bulk-preview-more">+{bulkPreview.length - 5} more questions…</div>
                    )}
                  </div>
                </div>
              )}

              <button
                className="at2-btn-primary"
                onClick={submitBulkQuestions}
                disabled={bulkPreview.length === 0 || !selectedTest}
                style={{ marginTop: 16 }}
              >
                <Upload size={14} /> Upload {bulkPreview.length > 0 ? `${bulkPreview.length} Questions` : 'Questions'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {activeTab === 'Results' && (
        <div className="at2-card">
          <div className="at2-card-head">
            <div className="at2-card-title"><BarChart2 size={15} color="#6366f1" /> Test Results</div>
          </div>
          {resultTestId ? (
            testResults.length > 0 ? (
              <div className="at2-results-list">
                {testResults.map((r, i) => {
                  const pct = Math.round((r.score / r.total) * 100);
                  const pass = pct >= 60;
                  return (
                    <div key={i} className="at2-result-row">
                      <div className={`at2-result-rank ${i === 0 ? 'at2-rank-gold' : i === 1 ? 'at2-rank-silver' : i === 2 ? 'at2-rank-bronze' : ''}`}>#{i + 1}</div>
                      <div className="at2-result-info">
                        <div className="at2-result-name">{r.user?.name || r.user?.email || 'Unknown'}</div>
                        <div className="at2-result-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="at2-result-bar-wrap">
                        <div className="at2-result-bar" style={{ width: `${pct}%`, background: pass ? '#10b981' : '#f43f5e' }} />
                      </div>
                      <div className={`at2-result-badge ${pass ? 'at2-badge-pass' : 'at2-badge-fail'}`}>
                        {pass ? <CheckCircle size={12} /> : <XCircle size={12} />}{pct}%
                      </div>
                      <div className="at2-result-score">{r.score}/{r.total}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="adm-empty"><TrendingUp size={40} strokeWidth={1.2} color="#d1d5db" /><p>No results yet for this test</p></div>
            )
          ) : (
            <div className="adm-empty"><BarChart2 size={40} strokeWidth={1.2} color="#d1d5db" /><p>Select a test below to view results</p></div>
          )}
        </div>
      )}

      {viewAiSet && <AiQuestionsModal test={viewAiSet} onClose={() => setViewAiSet(null)} />}

      {/* ── AI Sets ── */}
      {activeTab === 'AI Sets' && (
        <div className="at2-card">
          <div className="at2-card-head">
            <div className="at2-card-title" style={{ color: '#7c3aed' }}>
              <Brain size={15} color="#7c3aed" /> All User AI Practice Sets
            </div>
            <div className="at2-search-box" style={{ maxWidth: 260 }}>
              <Search size={13} color="#9ca3af" />
              <input placeholder="Search by name, user, category…" value={aiSearch} onChange={e => setAiSearch(e.target.value)} />
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ display: 'flex', gap: 20, padding: '10px 0 16px', borderBottom: '1px solid #f1f5f9', marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Sets', val: allAiTests.length, color: '#7c3aed' },
              { label: 'Total Questions', val: allAiTests.reduce((s, t) => s + (t.questions?.length || 0), 0), color: '#2563eb' },
              { label: 'Easy', val: allAiTests.filter(t => t.difficulty === 'easy').length, color: '#059669' },
              { label: 'Medium', val: allAiTests.filter(t => t.difficulty === 'medium').length, color: '#d97706' },
              { label: 'Hard', val: allAiTests.filter(t => t.difficulty === 'hard').length, color: '#dc2626' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{val}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {aiLoading ? (
            <div className="loading-state" style={{ padding: '40px 0' }}>
              <Brain size={28} className="spin-slow" color="#7c3aed"/><p style={{ color: '#7c3aed' }}>Loading AI sets…</p>
            </div>
          ) : filteredAi.length === 0 ? (
            <div className="adm-empty">
              <Brain size={44} strokeWidth={1.2} color="#d1d5db"/>
              <p>{aiSearch ? 'No sets match your search' : 'No AI-generated sets yet'}</p>
            </div>
          ) : (
            <div className="at2-grid">
              {pgAi.slice.map(t => {
                const diff = DIFF_META[t.difficulty] || DIFF_META.medium;
                return (
                  <div key={t._id} className="at2-test-card" style={{ borderTop: `3px solid #7c3aed` }}>
                    <div className="at2-test-card-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: diff.bg, color: diff.color }}>
                          {diff.label}
                        </span>
                        {t.category && (
                          <span className="at2-cat-badge" style={{ ...(CAT_COLORS[t.category] || CAT_FALLBACK) }}>
                            {t.category}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="at2-icon-btn" onClick={() => setViewAiSet(t)} title="View Questions">
                          <Eye size={13}/>
                        </button>
                        <button className="at2-icon-btn at2-icon-danger" onClick={() => deleteAiTest(t._id)} title="Delete">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    <h3 className="at2-test-title">{t.moduleName || 'AI Practice Set'}</h3>

                    <div className="at2-test-meta">
                      <span className="at2-meta-chip"><ListChecks size={11}/> {t.questions?.length || 0} Qs</span>
                      {t.createdAt && (
                        <span className="at2-meta-chip"><Calendar size={11}/> {new Date(t.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {t.user && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                          {t.user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.user.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.user.email}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination {...pgAi} />
            </div>
          )}
        </div>
      )}

      {/* ── Teacher Tests ── */}
      {activeTab === 'Teacher Tests' && (
        <div className="at2-card">
          <div className="at2-card-head">
            <div className="at2-card-title" style={{ color: '#059669' }}>
              <GraduationCap size={15} color="#059669" /> All Teacher Tests
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <CustomSelect
                value={teacherCatFilter}
                onChange={e => setTeacherCatFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {[...new Set(teacherTests.map(t => t.category).filter(Boolean))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </CustomSelect>
              <div className="at2-search-box" style={{ maxWidth: 280 }}>
                <Search size={13} color="#9ca3af" />
                <input
                  placeholder="Search by title, teacher, category…"
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ display: 'flex', gap: 20, padding: '10px 0 16px', borderBottom: '1px solid #f1f5f9', marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Tests',     val: teacherTests.length,                                                    color: '#059669' },
              { label: 'Total Questions', val: teacherTests.reduce((s, t) => s + (t.questionCount || 0), 0),           color: '#2563eb' },
              { label: 'Pending Publish', val: teacherTests.filter(t => t.publishStatus === 'pending').length,         color: '#d97706' },
              { label: 'Published',       val: teacherTests.filter(t => t.publishStatus === 'approved').length,        color: '#7c3aed' },
              { label: 'Teachers',        val: new Set(teacherTests.map(t => t.teacherId?._id).filter(Boolean)).size,  color: '#0891b2' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{val}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {teacherLoading ? (
            <div className="loading-state" style={{ padding: '40px 0' }}>
              <GraduationCap size={28} className="spin-slow" color="#059669" />
              <p style={{ color: '#059669' }}>Loading teacher tests…</p>
            </div>
          ) : filteredTeacher.length === 0 ? (
            <div className="adm-empty">
              <GraduationCap size={44} strokeWidth={1.2} color="#d1d5db" />
              <p>{teacherSearch || teacherCatFilter !== 'all' ? 'No tests match your search' : 'No teacher tests yet'}</p>
            </div>
          ) : (
            <div className="tt-table-wrap">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Test</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Duration</th>
                    <th style={{ textAlign: 'center' }}>Questions</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pgTeacher.slice.map((t, i) => {
                    const cat = CAT_COLORS[t.category] || CAT_FALLBACK;
                    const pub = t.publishStatus || 'none';
                    const pubStyle = pub === 'approved'
                      ? { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Published' }
                      : pub === 'pending'
                      ? { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Pending' }
                      : pub === 'rejected'
                      ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Rejected' }
                      : { bg: '#f8fafc', color: '#94a3b8', border: '#e5e7eb', label: 'Private' };
                    const teacher = t.teacherId;
                    return (
                      <tr key={t._id} className={i % 2 === 0 ? 'tt-tr-even' : ''}>
                        <td>
                          <div className="tt-teacher-cell">
                            <div className="tt-avatar">
                              {teacher?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="tt-teacher-info">
                              <div className="tt-teacher-name">{teacher?.name || t.teacherName || 'Unknown'}</div>
                              <div className="tt-teacher-email">{teacher?.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="tt-test-title">{t.title}</div>
                          {t.subject && <div className="tt-test-sub">{t.subject}</div>}
                        </td>
                        <td>
                          <span className="at2-cat-badge" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
                            {t.category || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="at2-meta-chip"><Timer size={11} /> {t.duration} min</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="at2-meta-chip"><BookOpen size={11} /> {t.questionCount || 0}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: pubStyle.bg, color: pubStyle.color, border: `1px solid ${pubStyle.border}`, whiteSpace: 'nowrap' }}>
                            {pubStyle.label}
                          </span>
                        </td>
                        <td className="tt-date">
                          <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="at2-icon-btn" onClick={() => setQuestionsModal(t)} title="View Questions"><Eye size={13} /></button>
                            <button className="at2-icon-btn at2-icon-danger" onClick={() => setConfirmDlg({ id: t._id, onConfirm: () => {
                              fetch(`${API_URL}/api/admin/tests/${t._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                                .then(() => setTeacherTests(prev => prev.filter(x => x._id !== t._id)));
                              setConfirmDlg(null);
                            }})} title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination {...pgTeacher} />
            </div>
          )}
        </div>
      )}

      {/* ── Tests List ── (hidden on AI Sets / Teacher Tests tabs) */}
      {activeTab !== 'AI Sets' && activeTab !== 'Teacher Tests' && (
        <div className="at2-list-section">
          <div className="at2-list-head">
            <h2 className="at2-list-title">All Tests<span className="at2-list-count">{filtered.length}</span></h2>
            <div className="at2-search-box">
              <Search size={13} color="#9ca3af" />
              <input placeholder="Search tests…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="at2-grid">
              {pgTests.slice.map(t => {
                const cat    = CAT_COLORS[t.category] || CAT_FALLBACK;
                const qCount = t.questions?.length || 0;
                return (
                  <div key={t._id} className="at2-test-card">
                    <div className="at2-test-card-top">
                      <span className="at2-cat-badge" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>{t.category}</span>
                      <div className="at2-test-actions">
                        <button className="at2-icon-btn" onClick={() => setQuestionsModal(t)} title="View Questions"><Eye size={13} /></button>
                        <button className="at2-icon-btn" onClick={() => startEdit(t)} title="Edit"><Pencil size={13} /></button>
                        <button className="at2-icon-btn at2-icon-danger" onClick={() => deleteTest(t._id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <h3 className="at2-test-title">{t.title}</h3>
                    {t.description && <p className="at2-test-desc">{t.description}</p>}
                    <div className="at2-test-meta">
                      <span className="at2-meta-chip"><Clock size={11} /> {t.duration} mins</span>
                      <span className="at2-meta-chip"><BookOpen size={11} /> {qCount} Q{qCount !== 1 ? 's' : ''}</span>
                      {t.subject && <span className="at2-meta-chip"><Tag size={11} /> {t.subject}</span>}
                    </div>
                    {t.shareCode && <AdminShareCode code={t.shareCode} />}
                    <div className="at2-test-footer">
                      <button className="at2-results-btn" onClick={() => fetchResults(t._id)}>
                        <TrendingUp size={12} /> View Results <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <Pagination {...pgTests} />
            </div>
          ) : (
            <div className="adm-empty"><ClipboardList size={48} strokeWidth={1.2} color="#d1d5db" /><p>{search ? 'No tests match your search' : 'No tests yet — create one above'}</p></div>
          )}
        </div>
      )}

      {confirmDlg && (
        <ConfirmModal
          message="Delete this test and all its questions/results? This cannot be undone."
          type="danger"
          onConfirm={() => {
            fetch(`${API_URL}/api/admin/tests/${confirmDlg.id}`, { method: 'DELETE' })
              .then(() => { fetchTests(); toast.delete('Test deleted'); });
            setConfirmDlg(null);
          }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </div>
  );
}
