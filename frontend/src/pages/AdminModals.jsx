import React, { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import {
  Ban, Trash2, Mail, X, Download, ExternalLink, FileText,
  Image, Film, AlertTriangle, Info, GraduationCap, BookOpen,
  Shield, Check, Plus, Loader2, User, Calendar, Tag, Folder,
  MessageCircle, Eye, ChevronRight, Pencil, Brain, CheckCircle,
  ListChecks, Zap,
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

/* ══════════════════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════════════════ */

function Overlay({ onClick, children }) {
  return (
    <div className="md-overlay" onClick={onClick}>
      {children}
    </div>
  );
}

function ModalShell({ width = 480, onClick, children, animate = true }) {
  const [phase, setPhase] = useState('enter');
  useEffect(() => {
    const id = requestAnimationFrame(() => setPhase('idle'));
    return () => cancelAnimationFrame(id);
  }, []);

  const style = {
    maxWidth: width,
    transform: phase === 'idle' ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(32px)',
    opacity:   phase === 'idle' ? 1 : 0,
    transition: 'transform 0.38s cubic-bezier(.34,1.56,.64,1), opacity 0.26s ease-out',
  };

  return (
    <div className="md-shell" style={style} onClick={onClick}>
      {children}
    </div>
  );
}

function ModalHeader({ title, subtitle, accent = '#6366f1', onClose }) {
  return (
    <div className="md-header" style={{ '--accent': accent }}>
      <div className="md-header-bar" style={{ background: accent }} />
      <div className="md-header-content">
        <div>
          <div className="md-header-title">{title}</div>
          {subtitle && <div className="md-header-sub">{subtitle}</div>}
        </div>
        <button className="md-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ModalBody({ children, scrollable = false }) {
  return (
    <div className={`md-body${scrollable ? ' md-body-scroll' : ''}`}>
      {children}
    </div>
  );
}

function ModalFooter({ children }) {
  return <div className="md-footer">{children}</div>;
}

function MdLabel({ children }) {
  return <div className="md-label">{children}</div>;
}

function MdInput({ ...props }) {
  return <input className="md-input" {...props} />;
}

function MdTextarea({ ...props }) {
  return <textarea className="md-input md-textarea" {...props} />;
}

function MdSelect({ children, ...props }) {
  return <CustomSelect {...props}>{children}</CustomSelect>;
}

function MdField({ label, optional, children }) {
  return (
    <div className="md-field">
      {label && (
        <div className="md-label">
          {label}
          {optional && <span className="md-optional">optional</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── helpers ── */
function getFileExt(url = '') {
  return url.split('.').pop().split('?')[0].toLowerCase();
}
function getFileType(url = '') {
  const ext = getFileExt(url);
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
  if (['mp4','webm','ogg','mov'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'office';
  return 'other';
}

/* ══════════════════════════════════════════════════════
   FILE PREVIEW MODAL
══════════════════════════════════════════════════════ */
export function FilePreviewModal({ resource, onClose }) {
  useScrollLock();
  if (!resource) return null;
  const url  = resource.fileUrl || '';
  const type = getFileType(url);
  const ext  = getFileExt(url).toUpperCase();

  return (
    <Overlay onClick={onClose}>
      <div className="fp2-shell" onClick={e => e.stopPropagation()}>
        <div className="fp2-header">
          <div className="fp2-header-left">
            <span className="fp2-ext-badge">{ext}</span>
            <span className="fp2-title">{resource.title || 'File Preview'}</span>
          </div>
          <div className="fp2-header-right">
            <a href={url} download target="_blank" rel="noreferrer" className="fp2-action-btn" title="Download">
              <Download size={15} />
            </a>
            <a href={url} target="_blank" rel="noreferrer" className="fp2-action-btn" title="Open in new tab">
              <ExternalLink size={15} />
            </a>
            <button className="fp2-close" onClick={onClose}><X size={17} /></button>
          </div>
        </div>
        <div className="fp2-body">
          {type === 'image'  && <img src={url} alt={resource.title} className="fp2-image" />}
          {type === 'video'  && <video controls className="fp2-video"><source src={url} />Your browser does not support video.</video>}
          {type === 'pdf'    && <iframe src={url} className="fp2-iframe" title={resource.title} />}
          {type === 'office' && <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} className="fp2-iframe" title={resource.title} />}
          {type === 'other'  && (
            <div className="fp2-unsupported">
              <FileText size={56} strokeWidth={1.2} color="#94a3b8" />
              <p className="fp2-unsup-title">Preview not available</p>
              <p className="fp2-unsup-sub">{ext} files cannot be previewed in the browser</p>
              <a href={url} download target="_blank" rel="noreferrer" className="md-btn md-btn-primary" style={{ marginTop: 16 }}>
                <Download size={14} /> Download File
              </a>
            </div>
          )}
        </div>
        {(resource.uploadedBy?.email || resource.folder?.name || resource.category) && (
          <div className="fp2-footer">
            {resource.uploadedBy?.email && <span>By <strong>{resource.uploadedBy.email}</strong></span>}
            {resource.folder?.name && <span>· Folder: <strong>{resource.folder.name}</strong></span>}
            {resource.category && <span>· {resource.category}</span>}
          </div>
        )}
      </div>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════════ */
const CFM_META = {
  danger:  { Icon: Trash2,        color: '#dc2626', iconBg: '#fee2e2', border: '#fecaca', title: 'Are you sure?',   confirmLabel: 'Delete',  btnCls: 'md-btn-danger'   },
  warning: { Icon: AlertTriangle, color: '#d97706', iconBg: '#fef3c7', border: '#fde68a', title: 'Confirm Action',  confirmLabel: 'Confirm', btnCls: 'md-btn-warning'  },
  info:    { Icon: Info,          color: '#2563eb', iconBg: '#dbeafe', border: '#bfdbfe', title: 'Confirm Action',  confirmLabel: 'OK',      btnCls: 'md-btn-primary'  },
};

export function ConfirmModal({ message, title, type = 'danger', onConfirm, onCancel }) {
  useScrollLock();
  const [phase, setPhase] = useState('enter');
  useEffect(() => { const id = requestAnimationFrame(() => setPhase('idle')); return () => cancelAnimationFrame(id); }, []);
  const exit = (cb) => { setPhase('exit'); setTimeout(cb, 240); };
  const m = CFM_META[type] || CFM_META.danger;

  return (
    <div className="md-overlay cfm2-overlay" onClick={() => exit(onCancel)}>
      <div
        className="cfm2-card"
        onClick={e => e.stopPropagation()}
        style={{
          transform: phase === 'idle' ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(28px)',
          opacity:   phase === 'idle' ? 1 : 0,
          transition: phase === 'exit'
            ? 'transform 0.22s ease-in, opacity 0.2s ease-in'
            : 'transform 0.42s cubic-bezier(.34,1.56,.64,1), opacity 0.28s ease-out',
        }}
      >
        <div className="cfm2-icon" style={{ background: m.iconBg, border: `2px solid ${m.border}` }}>
          <m.Icon size={28} color={m.color} strokeWidth={2.2} />
        </div>
        <h3 className="cfm2-title">{title || m.title}</h3>
        <p className="cfm2-message">{message}</p>
        <div className="cfm2-actions">
          <button className="md-btn md-btn-ghost cfm2-cancel" onClick={() => exit(onCancel)}>Cancel</button>
          <button className={`md-btn ${m.btnCls}`} onClick={() => exit(onConfirm)}>{m.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   USER DETAIL + ROLE CHANGE MODAL
══════════════════════════════════════════════════════ */
const ROLE_OPTS = [
  { id: 'student', label: 'Student', Icon: GraduationCap, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', desc: 'Browse & take tests' },
  { id: 'teacher', label: 'Teacher', Icon: BookOpen,      color: '#d97706', bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7', desc: 'Upload resources' },
  { id: 'admin',   label: 'Admin',   Icon: Shield,        color: '#dc2626', bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2', desc: 'Full access' },
];

export function UserModal({ u, onClose, onRoleChange, onDelete, onEdit, onBan }) {
  useScrollLock();
  const [phase, setPhase] = useState('enter');
  useEffect(() => { const id = requestAnimationFrame(() => setPhase('idle')); return () => cancelAnimationFrame(id); }, []);

  const roleMeta = {
    admin:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    teacher: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    student: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  }[u.role] || { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };

  return (
    <div className="md-overlay" onClick={onClose}>
      <div
        className="md-shell"
        style={{
          maxWidth: 460,
          transform: phase === 'idle' ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(28px)',
          opacity:   phase === 'idle' ? 1 : 0,
          transition: 'transform 0.38s cubic-bezier(.34,1.56,.64,1), opacity 0.26s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header strip */}
        <div className="um-hero">
          <button className="md-close um-close" onClick={onClose}><X size={16} /></button>
          <div className="um-avatar">
            {u.avatar
              ? <img src={u.avatar} alt="" className="um-avatar-img" />
              : <span>{u.name?.[0]?.toUpperCase() || '?'}</span>
            }
          </div>
          <div className="um-name">{u.name}</div>
          <div className="um-email">{u.email}</div>
          <div className="um-badges">
            <span className="um-role-badge" style={{ background: roleMeta.bg, color: roleMeta.color, border: `1.5px solid ${roleMeta.border}` }}>
              {(u.role || 'student').charAt(0).toUpperCase() + (u.role || 'student').slice(1)}
            </span>
            {u.isBanned && <span className="um-banned-badge">Banned</span>}
          </div>
          {u.bio && <div className="um-bio">{u.bio}</div>}
          <div className="um-joined">
            <Calendar size={12} /> Joined {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Role change section */}
        <div className="md-body">
          <div className="um-role-section-title">
            <Shield size={14} color="#6366f1" /> Change Role
          </div>
          <div className="um-role-grid">
            {ROLE_OPTS.map(({ id, label, Icon, color, bg, border, iconBg, desc }) => {
              const active = u.role === id;
              return (
                <button
                  key={id}
                  className={`um-role-card ${active ? 'um-role-card-active' : ''}`}
                  style={active ? { background: bg, borderColor: border } : {}}
                  onClick={() => onRoleChange(u._id, id)}
                >
                  <div className="um-role-icon" style={{ background: active ? iconBg : '#f3f4f6', color: active ? color : '#9ca3af' }}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="um-role-name" style={active ? { color } : {}}>{label}</div>
                  <div className="um-role-desc">{desc}</div>
                  {active && (
                    <div className="um-role-check" style={{ background: color }}>
                      <Check size={9} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="md-footer md-footer-wrap">
          <button className="md-btn md-btn-outline" onClick={() => { onClose(); onEdit(u); }}>Edit Info</button>
          <button className={`md-btn ${u.isBanned ? 'md-btn-success' : 'md-btn-outline'}`} onClick={() => onBan(u._id, !u.isBanned)}>
            <Ban size={13} /> {u.isBanned ? 'Unban' : 'Ban'}
          </button>
          <button className="md-btn md-btn-danger" onClick={() => onDelete(u._id)}>
            <Trash2 size={13} /> Delete
          </button>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROLE CHANGE MODAL
══════════════════════════════════════════════════════ */
export function RoleChangeModal({ u, onSave, onClose }) {
  useScrollLock();
  const [selected, setSelected] = useState(u.role || 'student');
  const [saving,   setSaving]   = useState(false);
  const [phase,    setPhase]    = useState('enter');

  useEffect(() => {
    const id = requestAnimationFrame(() => setPhase('idle'));
    return () => cancelAnimationFrame(id);
  }, []);

  const currentMeta = {
    admin:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    teacher: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    student: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  }[u.role] || { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };

  const handleSave = async () => {
    if (selected === u.role) { onClose(); return; }
    setSaving(true);
    await onSave(u._id, selected);
    setSaving(false);
    onClose();
  };

  return (
    <div className="md-overlay" onClick={onClose}>
      <div
        className="md-shell"
        style={{
          maxWidth: 440,
          transform: phase === 'idle' ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)',
          opacity:   phase === 'idle' ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.28s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="md-accent-bar" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />

        {/* Header */}
        <div className="rcm-head">
          <div className="rcm-avatar">
            {u.avatar
              ? <img src={u.avatar} alt="" className="rcm-avatar-img" />
              : <span>{u.name?.[0]?.toUpperCase() || '?'}</span>}
          </div>
          <div className="rcm-user-info">
            <div className="rcm-user-name">{u.name}</div>
            <div className="rcm-user-email">{u.email}</div>
            <span className="rcm-current-role" style={{ background: currentMeta.bg, color: currentMeta.color, border: `1.5px solid ${currentMeta.border}` }}>
              Current: {(u.role || 'student').charAt(0).toUpperCase() + (u.role || 'student').slice(1)}
            </span>
          </div>
          <button className="md-close" style={{ alignSelf: 'flex-start' }} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Role cards */}
        <div className="md-body">
          <div className="rcm-section-label">
            <Shield size={13} color="#6366f1" /> Select New Role
          </div>
          <div className="rcm-role-grid">
            {ROLE_OPTS.map(({ id, label, Icon, color, bg, border, iconBg, desc }) => {
              const active  = selected === id;
              const isCurrent = u.role === id;
              return (
                <button
                  key={id}
                  className={`rcm-role-card ${active ? 'rcm-role-card-active' : ''}`}
                  style={active ? { background: bg, borderColor: border } : {}}
                  onClick={() => setSelected(id)}
                >
                  <div className="rcm-role-icon" style={{ background: active ? iconBg : '#f3f4f6' }}>
                    <Icon size={20} color={active ? color : '#9ca3af'} strokeWidth={2} />
                  </div>
                  <div className="rcm-role-label" style={active ? { color } : {}}>{label}</div>
                  <div className="rcm-role-desc">{desc}</div>
                  {isCurrent && <div className="rcm-current-tag">Current</div>}
                  {active && (
                    <div className="rcm-check" style={{ background: color }}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="md-footer">
          <button className="md-btn md-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="md-btn md-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><Loader2 size={14} className="spin" /> Updating…</>
              : selected === u.role
                ? 'No Change'
                : `Set as ${selected.charAt(0).toUpperCase() + selected.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   EDIT USER MODAL  — read-only info, no name/bio editing
══════════════════════════════════════════════════════ */
export function EditUserModal({ u, onSave, onClose }) {
  useScrollLock();

  const roleMeta = {
    admin:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    teacher: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    student: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  }[u.role] || { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };

  return (
    <Overlay onClick={onClose}>
      <ModalShell width={420} onClick={e => e.stopPropagation()}>
        <ModalHeader title="User Info" subtitle="Account details (read-only)" accent="#6366f1" onClose={onClose} />
        <ModalBody>
          <div className="eu-profile-card">
            <div className="eu-avatar">
              {u.avatar ? <img src={u.avatar} alt="" className="eu-avatar-img" /> : <span>{u.name?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <div className="eu-profile-info">
              <div className="eu-profile-name">{u.name}</div>
              <div className="eu-profile-email">{u.email}</div>
              <span className="eu-role-badge" style={{ background: roleMeta.bg, color: roleMeta.color, border: `1.5px solid ${roleMeta.border}` }}>
                {(u.role || 'student').charAt(0).toUpperCase() + (u.role || 'student').slice(1)}
              </span>
            </div>
          </div>
          {u.bio && (
            <div className="eu-bio-box">
              <div className="md-label">Bio</div>
              <p className="eu-bio-text">{u.bio}</p>
            </div>
          )}
          <div className="eu-readonly-note">
            <Info size={13} color="#94a3b8" />
            Username and bio can only be changed by the user themselves from their account settings.
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Close</button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   EDIT RESOURCE MODAL
══════════════════════════════════════════════════════ */
export function EditResourceModal({ resource, folders, onSave, onClose }) {
  useScrollLock();
  const [title,    setTitle]    = useState(resource.title || '');
  const [desc,     setDesc]     = useState(resource.description || '');
  const [folder,   setFolder]   = useState(resource.folder?._id || resource.folder || '');
  const [category, setCategory] = useState(resource.category || '');
  const [status,   setStatus]   = useState(resource.status || 'pending');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(resource._id, { title, description: desc, folder: folder || null, category, status });
    setSaving(false);
  };

  const STATUS_META = {
    pending:  { color: '#d97706', bg: '#fef3c7' },
    approved: { color: '#059669', bg: '#d1fae5' },
    rejected: { color: '#dc2626', bg: '#fee2e2' },
  };

  return (
    <Overlay onClick={onClose}>
      <ModalShell width={520} onClick={e => e.stopPropagation()}>
        <ModalHeader title="Edit Resource" subtitle={resource.title} accent="#6366f1" onClose={onClose} />
        <ModalBody>
          <MdField label="Title *">
            <MdInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title" />
          </MdField>
          <MdField label="Description" optional>
            <MdTextarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe this resource" />
          </MdField>
          <div className="md-grid-2">
            <MdField label="Category">
              <MdSelect value={category} onChange={e => setCategory(e.target.value)}>
                {['CSE','ECE','ME','CE','EEE','IT','Other'].map(c => <option key={c}>{c}</option>)}
              </MdSelect>
            </MdField>
            <MdField label="Status">
              <MdSelect value={status} onChange={e => setStatus(e.target.value)}
                style={{ color: STATUS_META[status]?.color, fontWeight: 700 }}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </MdSelect>
            </MdField>
          </div>
          <MdField label="Folder" optional>
            <MdSelect value={folder} onChange={e => setFolder(e.target.value)}>
              <option value="">— No folder —</option>
              {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </MdSelect>
          </MdField>
        </ModalBody>
        <ModalFooter>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="md-btn md-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="spin" /> Saving…</> : 'Save Changes'}
          </button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   EDIT / CREATE FOLDER MODAL
══════════════════════════════════════════════════════ */
export function EditFolderModal({ folder, onSave, onClose }) {
  useScrollLock();
  const [name,       setName]       = useState(folder?.name || '');
  const [desc,       setDesc]       = useState(folder?.description || '');
  const [isPublic,   setIsPublic]   = useState(folder?.isPublic !== false);
  const [saving,     setSaving]     = useState(false);
  const [cats,       setCats]       = useState(() => {
    try { const s = localStorage.getItem('admin_custom_categories'); return s ? JSON.parse(s) : ['CSE','SSC GD','Agniveer','Railway','WBP','Nursing']; } catch { return ['CSE','SSC GD','Agniveer','Railway','WBP','Nursing']; }
  });
  const [category,   setCategory]   = useState(() => {
    const c = folder?.category || 'CSE';
    return cats.includes(c) ? c : 'Other';
  });
  const [customCat,  setCustomCat]  = useState(() => {
    const c = folder?.category || '';
    const known = cats;
    return known.includes(c) ? '' : c;
  });

  const effectiveCategory = category === 'Other' ? customCat.trim() : category;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (category === 'Other' && !customCat.trim()) return;
    setSaving(true);
    await onSave(folder?._id || null, { name, description: desc, category: effectiveCategory, isPublic });
    setSaving(false);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalShell width={460} onClick={e => e.stopPropagation()}>
        <ModalHeader
          title={folder ? 'Edit Folder' : 'Create Folder'}
          subtitle={folder ? 'Update folder details' : 'Add a new folder to your library'}
          accent="#059669"
          onClose={onClose}
        />
        <ModalBody>
          <MdField label="Folder Name *">
            <MdInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CSE Notes Sem 3" />
          </MdField>
          <MdField label="Description" optional>
            <MdInput value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
          </MdField>
          <MdField label="Category">
            <MdSelect value={category} onChange={e => setCategory(e.target.value)}>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other (custom)</option>
            </MdSelect>
          </MdField>
          {category === 'Other' && (
            <MdField label="Custom Category Name *">
              <MdInput
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                placeholder="e.g. Civil Engineering, MBA, UPSC…"
                autoFocus
              />
            </MdField>
          )}
          <label className="md-toggle-row">
            <div className="md-toggle-info">
              <div className="md-toggle-title">Public Folder</div>
              <div className="md-toggle-sub">Visible to all users on the platform</div>
            </div>
            <div className={`md-toggle ${isPublic ? 'md-toggle-on' : ''}`} onClick={() => setIsPublic(v => !v)}>
              <div className="md-toggle-thumb" />
            </div>
          </label>
        </ModalBody>
        <ModalFooter>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="md-btn md-btn-success" onClick={handleSave}
            disabled={saving || !name.trim() || (category === 'Other' && !customCat.trim())}>
            {saving ? <><Loader2 size={14} className="spin" /> Saving…</> : folder ? 'Save Changes' : 'Create Folder'}
          </button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   QUESTIONS MODAL
══════════════════════════════════════════════════════ */
export function QuestionsModal({ test, onClose, API_URL, toast }) {
  useScrollLock();
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [q,         setQ]         = useState('');
  const [opts,      setOpts]      = useState(['','','','']);
  const [ans,       setAns]       = useState('');
  const [adding,    setAdding]    = useState(false);
  const [editingQ,  setEditingQ]  = useState(null);
  const [editText,  setEditText]  = useState('');
  const [editOpts,  setEditOpts]  = useState(['','','','']);
  const [editAns,   setEditAns]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API_URL}/api/admin/tests/${test._id}/questions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [test._id]);

  const handleAdd = async () => {
    if (!q.trim()) return;
    setAdding(true);
    const res = await fetch(`${API_URL}/api/admin/tests/${test._id}/question`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: q, options: opts, answer: ans }),
    });
    if (res.ok) {
      const newQ = await res.json();
      setQuestions(prev => [...prev, newQ]);
      setQ(''); setOpts(['','','','']); setAns('');
      toast.success('Question added');
    } else toast.error('Failed to add question');
    setAdding(false);
  };

  const handleDelete = async (qId) => {
    const res = await fetch(`${API_URL}/api/admin/tests/${test._id}/questions/${qId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) { setQuestions(prev => prev.filter(x => x._id !== qId)); toast.success('Question deleted'); }
    else toast.error('Failed to delete');
  };

  const startEdit = (qu) => {
    setEditingQ(qu._id);
    setEditText(qu.title || qu.question || '');
    setEditOpts(qu.options?.length ? [...qu.options] : ['','','','']);
    setEditAns(qu.answer || '');
  };

  const cancelEdit = () => {
    setEditingQ(null); setEditText(''); setEditOpts(['','','','']); setEditAns('');
  };

  const handleSaveEdit = async (qId) => {
    if (!editText.trim()) return;
    setSaving(true);
    const res = await fetch(`${API_URL}/api/admin/tests/${test._id}/questions/${qId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ title: editText, options: editOpts, answer: editAns }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuestions(prev => prev.map(x => x._id === qId ? updated : x));
      cancelEdit();
      toast.success('Question updated');
    } else toast.error('Failed to update question');
    setSaving(false);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalShell width={680} onClick={e => e.stopPropagation()}>
        <ModalHeader
          title="Manage Questions"
          subtitle={test.title}
          accent="#6366f1"
          onClose={onClose}
        />
        <ModalBody scrollable>
          {/* Question list */}
          {loading ? (
            <div className="md-loading"><Loader2 size={28} className="spin" color="#6366f1" /></div>
          ) : questions.length === 0 ? (
            <div className="md-empty">
              <BookOpen size={36} strokeWidth={1.2} color="#d1d5db" />
              <p>No questions yet. Add one below.</p>
            </div>
          ) : (
            <div className="qm-list">
              {questions.map((qu, i) => (
                <div key={qu._id} className="qm-item">
                  {editingQ === qu._id ? (
                    <div className="qm-edit-form">
                      <div className="qm-edit-header">
                        <span className="qm-item-num">Q{i + 1}</span>
                        <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Editing</span>
                      </div>
                      <MdField label="Question Text">
                        <MdTextarea rows={2} value={editText} onChange={e => setEditText(e.target.value)} />
                      </MdField>
                      <div className="md-grid-2" style={{ marginBottom: 10 }}>
                        {editOpts.map((o, j) => (
                          <div key={j} className="qm-opt-input-wrap">
                            <div className="qm-opt-letter">{String.fromCharCode(65 + j)}</div>
                            <MdInput
                              value={o}
                              onChange={e => setEditOpts(editOpts.map((x, k) => k === j ? e.target.value : x))}
                              placeholder={`Option ${String.fromCharCode(65 + j)}`}
                            />
                          </div>
                        ))}
                      </div>
                      <MdField label="Correct Answer">
                        <MdSelect value={editAns} onChange={e => setEditAns(e.target.value)}>
                          <option value="">— Select correct option —</option>
                          {editOpts.filter(Boolean).map((o, j) => (
                            <option key={j} value={o}>{String.fromCharCode(65 + j)}: {o}</option>
                          ))}
                        </MdSelect>
                      </MdField>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="md-btn md-btn-primary" onClick={() => handleSaveEdit(qu._id)} disabled={saving || !editText.trim()}>
                          {saving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Check size={13} /> Save</>}
                        </button>
                        <button className="md-btn md-btn-ghost" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="qm-item-num">Q{i + 1}</div>
                      <div className="qm-item-content">
                        <div className="qm-item-text">{qu.title || qu.question}</div>
                        <div className="qm-item-opts">
                          {(qu.options || []).map((o, j) => (
                            <span key={j} className={`qm-opt ${o === qu.answer ? 'qm-opt-correct' : ''}`}>
                              {String.fromCharCode(65 + j)}. {o}
                              {o === qu.answer && <Check size={10} strokeWidth={3} />}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="qm-edit-btn" onClick={() => startEdit(qu)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="qm-delete-btn" onClick={() => handleDelete(qu._id)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add question form */}
          <div className="qm-add-section">
            <div className="qm-add-title"><Plus size={14} color="#6366f1" /> Add New Question</div>
            <MdField label="Question Text">
              <MdTextarea rows={2} value={q} onChange={e => setQ(e.target.value)} placeholder="Enter the question…" />
            </MdField>
            <div className="md-grid-2">
              {opts.map((o, i) => (
                <div key={i} className="qm-opt-input-wrap">
                  <div className="qm-opt-letter">{String.fromCharCode(65 + i)}</div>
                  <MdInput
                    value={o}
                    onChange={e => setOpts(opts.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
            <MdField label="Correct Answer">
              <MdSelect value={ans} onChange={e => setAns(e.target.value)}>
                <option value="">— Select correct option —</option>
                {opts.filter(Boolean).map((o, i) => (
                  <option key={i} value={o}>{String.fromCharCode(65 + i)}: {o}</option>
                ))}
              </MdSelect>
            </MdField>
            <button className="md-btn md-btn-primary" onClick={handleAdd} disabled={adding || !q.trim()}>
              {adding ? <><Loader2 size={14} className="spin" /> Adding…</> : <><Plus size={14} /> Add Question</>}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <span className="md-footer-count">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Close</button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   MESSAGE MODAL
══════════════════════════════════════════════════════ */
export function MessageModal({ msg, onClose, onDelete, onMarkRead }) {
  useScrollLock();
  return (
    <Overlay onClick={onClose}>
      <ModalShell width={520} onClick={e => e.stopPropagation()}>
        <ModalHeader
          title={`Message from ${msg.name}`}
          subtitle={new Date(msg.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          accent="#0891b2"
          onClose={onClose}
        />
        <ModalBody>
          <div className="mm-meta-row">
            <div className="mm-meta-item">
              <div className="mm-meta-label"><User size={11} /> From</div>
              <div className="mm-meta-val">{msg.name}</div>
              <div className="mm-meta-sub">{msg.email}</div>
            </div>
            <div className="mm-meta-item">
              <div className="mm-meta-label"><Calendar size={11} /> Received</div>
              <div className="mm-meta-val">{new Date(msg.createdAt).toLocaleDateString()}</div>
              <div className="mm-meta-sub">{new Date(msg.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>

          <div className="mm-subject-box">
            <div className="mm-box-label">Subject</div>
            <div className="mm-subject-text">{msg.subject}</div>
          </div>

          <div className="mm-message-box">
            <div className="mm-box-label">Message</div>
            <div className="mm-message-text">{msg.message}</div>
          </div>

          <a
            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
            className="md-btn md-btn-primary mm-reply-btn"
            style={{ textDecoration: 'none', marginTop: 12 }}
          >
            <Mail size={13} /> Reply via Email
          </a>
        </ModalBody>
        <ModalFooter>
          <button className="md-btn md-btn-danger" onClick={() => { onDelete(msg._id); onClose(); }}>
            <Trash2 size={13} /> Delete
          </button>
          {!msg.read && (
            <button className="md-btn md-btn-outline" onClick={() => { onMarkRead(msg._id); onClose(); }}>
              Mark as Read
            </button>
          )}
          <button className="md-btn md-btn-ghost" onClick={onClose}>Close</button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}

/* ══════════════════════════════════════════════════════
   AI QUESTIONS MODAL  — read-only view of a user's AI set
══════════════════════════════════════════════════════ */
const DIFF_COLORS = {
  easy:   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  medium: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  hard:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export function AiQuestionsModal({ test, onClose }) {
  useScrollLock();
  const questions = test.questions || [];
  const diff = DIFF_COLORS[test.difficulty] || DIFF_COLORS.medium;

  return (
    <Overlay onClick={onClose}>
      <ModalShell width={680} onClick={e => e.stopPropagation()}>
        <ModalHeader onClose={onClose}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{test.moduleName || 'AI Practice Set'}</div>
              {test.user && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {test.user.name} · {test.user.email}
                </div>
              )}
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {/* Meta strip */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
              <Zap size={11} /> {test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'Medium'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
              <ListChecks size={11} /> {questions.length} Questions
            </span>
            {test.category && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                {test.category}
              </span>
            )}
            {test.createdAt && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8', padding: '4px 10px' }}>
                <Calendar size={11} /> {new Date(test.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <ListChecks size={40} strokeWidth={1.2} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0 }}>No questions in this set</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ background: 'var(--bg-white,#fff)', border: '1.5px solid var(--border,#e5e7eb)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 12, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 6, padding: '2px 8px', lineHeight: '20px' }}>Q{idx + 1}</span>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text,#1e293b)', lineHeight: 1.5 }}>{q.question}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: q.explanation ? 12 : 0 }}>
                    {(q.options || []).map((opt, oi) => {
                      const isCorrect = opt === q.answer;
                      return (
                        <div key={oi} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '8px 10px', borderRadius: 8, fontSize: 13,
                          background: isCorrect ? '#f0fdf4' : '#f8fafc',
                          border: `1.5px solid ${isCorrect ? '#86efac' : '#e5e7eb'}`,
                          color: isCorrect ? '#15803d' : 'var(--text,#374151)',
                          fontWeight: isCorrect ? 700 : 400,
                        }}>
                          {isCorrect && <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />}
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button className="md-btn md-btn-ghost" onClick={onClose}>Close</button>
        </ModalFooter>
      </ModalShell>
    </Overlay>
  );
}
