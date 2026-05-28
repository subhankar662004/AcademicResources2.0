import React, { useState, useMemo, useEffect } from 'react';
import { useAdmin } from './AdminContext';
import { EditFolderModal } from '../AdminModals';
import { Search, Folder, Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react';
import { getCategories, addCategory, removeCategory } from '../../utils/categoryStore';

export default function AdminFolders() {
  const { folders, handleFolderSave, handleDeleteFolder } = useAdmin();
  const [search,       setSearch]       = useState('');
  const [visibility,   setVisibility]   = useState('all');
  const [editFolder,   setEditFolder]   = useState(null);
  const [createFolder, setCreateFolder] = useState(false);

  const [categories,   setCategories]   = useState([]);
  const [newCatInput,  setNewCatInput]  = useState('');
  const [addingCat,    setAddingCat]    = useState(false);

  useEffect(() => { setCategories(getCategories()); }, []);

  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    const updated = addCategory(newCatInput.trim());
    setCategories(updated);
    setNewCatInput('');
    setAddingCat(false);
  };

  const handleRemoveCategory = (name) => {
    const updated = removeCategory(name);
    setCategories(updated);
  };

  const filtered = useMemo(() => folders.filter(f => {
    const byVis = visibility === 'all' || (visibility === 'public' ? f.isPublic : !f.isPublic);
    const q = search.toLowerCase();
    return byVis && (!q || f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
  }), [folders, search, visibility]);

  return (
    <div className="adm-page">
      {editFolder   && <EditFolderModal folder={editFolder}   onSave={async (id, d) => { await handleFolderSave(id, d); setEditFolder(null);    }} onClose={() => setEditFolder(null)} />}
      {createFolder && <EditFolderModal folder={null}         onSave={async (id, d) => { await handleFolderSave(id, d); setCreateFolder(false); }} onClose={() => setCreateFolder(false)} />}

      {/* ── Category Manager ── */}
      <div className="af-cat-section">
        <div className="af-cat-head">
          <div className="af-cat-title">
            <Tag size={15} color="#6366f1" />
            Exam Categories
            <span className="af-cat-count">{categories.length}</span>
          </div>
          <button className="af-cat-add-btn" onClick={() => setAddingCat(v => !v)}>
            <Plus size={13} /> Add Category
          </button>
        </div>

        {addingCat && (
          <div className="af-cat-input-row">
            <input
              className="af-cat-input"
              value={newCatInput}
              onChange={e => setNewCatInput(e.target.value)}
              placeholder="e.g. Civil Engineering, MBA, UPSC…"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <button className="af-cat-confirm-btn" onClick={handleAddCategory} disabled={!newCatInput.trim()}>
              <Check size={14} /> Add
            </button>
            <button className="af-cat-cancel-btn" onClick={() => { setAddingCat(false); setNewCatInput(''); }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="af-cat-chips">
          {categories.map(cat => (
            <div key={cat} className="af-cat-chip">
              <span>{cat}</span>
              <button className="af-cat-chip-del" onClick={() => handleRemoveCategory(cat)} title={`Remove ${cat}`}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <p className="af-cat-hint">These categories appear on the Choose Category page and in all folder/resource forms.</p>
      </div>

      {/* ── Folders ── */}
      <div className="adm-page-hdr">
        <div>
          <h1 className="adm-page-title"><Folder size={22} color="#8b5cf6" /> Folder Management</h1>
          <p className="adm-page-sub">{filtered.length} of {folders.length} folders</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => setCreateFolder(true)}><Plus size={14} /> New Folder</button>
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14} />
          <input placeholder="Search folders…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="adm-chip-group">
          {[{ v: 'all', l: 'All', dot: '#94a3b8' }, { v: 'public', l: 'Public', dot: '#10b981' }, { v: 'private', l: 'Private', dot: '#ef4444' }].map(o => (
            <button key={o.v} className={`adm-chip2 ${visibility === o.v ? 'adm-chip2-active' : ''}`} onClick={() => setVisibility(o.v)}>
              <span className="adm-chip2-dot" style={{ background: o.dot }} />
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="adm-list">
          {filtered.map(f => (
            <div key={f._id} className="adm-list-row">
              <div className="adm-list-icon" style={{ background: '#f5f3ff' }}><Folder size={15} color="#8b5cf6" /></div>
              <div className="adm-list-info">
                <div className="adm-list-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {f.name}
                  <span className="adm-pill" style={{ background: f.isPublic ? '#dcfce7' : '#fee2e2', color: f.isPublic ? '#15803d' : '#dc2626' }}>
                    {f.isPublic ? 'Public' : 'Private'}
                  </span>
                  {f.category && <span className="adm-pill" style={{ background: '#f1f5f9', color: '#475569' }}>{f.category}</span>}
                </div>
                <div className="adm-list-sub">
                  {f.description && <span>{f.description} · </span>}
                  {f.resourceCount != null && <span>{f.resourceCount} resources · </span>}
                  By {f.createdBy?.name || 'unknown'}
                </div>
              </div>
              <div className="adm-list-actions">
                <button className="adm-btn adm-btn-ghost" onClick={() => setEditFolder(f)}><Pencil size={13} /> Edit</button>
                <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteFolder(f._id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="adm-empty">
          <Folder size={48} strokeWidth={1.2} color="#d1d5db" />
          <p>No folders yet</p>
          <button className="adm-btn adm-btn-primary" style={{ marginTop: 12 }} onClick={() => setCreateFolder(true)}><Plus size={14} /> Create Folder</button>
        </div>
      )}
    </div>
  );
}
