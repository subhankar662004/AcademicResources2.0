import React, { useState, useMemo } from 'react';
import { useAdmin } from './AdminContext';
import { EditResourceModal, FilePreviewModal } from '../AdminModals';
import { Search, BookOpen, Eye, Pencil, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';

const STATUS_OPTS = [
  { v: 'all',      l: 'All',      dot: '#94a3b8' },
  { v: 'approved', l: 'Approved', dot: '#10b981' },
  { v: 'pending',  l: 'Pending',  dot: '#f59e0b' },
  { v: 'rejected', l: 'Rejected', dot: '#ef4444' },
];

const statusPill = {
  approved: { bg: '#dcfce7', c: '#15803d' },
  pending:  { bg: '#fef3c7', c: '#b45309' },
  rejected: { bg: '#fee2e2', c: '#dc2626' },
};

export default function AdminResources() {
  const { allResources, folders, handleApprove, handleReject, handleDeleteResource, handleEditResourceSave } = useAdmin();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editRes,      setEditRes]      = useState(null);
  const [previewRes,   setPreviewRes]   = useState(null);

  const filtered = useMemo(() => allResources.filter(r => {
    const byStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = search.toLowerCase();
    const bySearch = !q || r.title?.toLowerCase().includes(q) || r.uploadedBy?.email?.toLowerCase().includes(q);
    return byStatus && bySearch;
  }), [allResources, search, statusFilter]);
  const pgRes = usePagination(filtered, 12);

  return (
    <div className="adm-page">
      {editRes    && <EditResourceModal resource={editRes} folders={folders} onSave={async (id, d) => { await handleEditResourceSave(id, d); setEditRes(null); }} onClose={() => setEditRes(null)} />}
      {previewRes && <FilePreviewModal resource={previewRes} onClose={() => setPreviewRes(null)} />}

      <div className="adm-page-hdr">
        <div>
          <h1 className="adm-page-title"><BookOpen size={22} color="#10b981" /> All Resources</h1>
          <p className="adm-page-sub">{filtered.length} of {allResources.length} resources</p>
        </div>
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14} />
          <input placeholder="Search by title or uploader…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="adm-chip-group">
          {STATUS_OPTS.map(o => (
            <button
              key={o.v}
              className={`adm-chip2 ${statusFilter === o.v ? 'adm-chip2-active' : ''}`}
              style={statusFilter === o.v ? { '--dot': o.dot } : {}}
              onClick={() => setStatusFilter(o.v)}
            >
              <span className="adm-chip2-dot" style={{ background: o.dot }} />
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="adm-list">
          {pgRes.slice.map(r => (
            <div key={r._id} className="adm-list-row">
              <div className="adm-list-icon" style={{ background: '#f0fdf4' }}><BookOpen size={15} color="#10b981" /></div>
              <div className="adm-list-info">
                <div className="adm-list-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {r.title}
                  <span className="adm-pill" style={statusPill[r.status] || statusPill.pending}>{r.status}</span>
                </div>
                <div className="adm-list-sub">{r.category || '—'} · {r.folder?.name || 'Uncategorized'} · {r.uploadedBy?.email || 'unknown'}</div>
              </div>
              <div className="adm-list-actions">
                {r.fileUrl && <button className="adm-btn adm-btn-ghost" onClick={() => setPreviewRes(r)}><Eye size={13} /> Preview</button>}
                <button className="adm-btn adm-btn-ghost" onClick={() => setEditRes(r)}><Pencil size={13} /></button>
                {r.status !== 'approved' && <button className="adm-btn adm-btn-success" onClick={() => handleApprove(r._id)}><CheckCircle size={12} /> Approve</button>}
                {r.status !== 'rejected' && <button className="adm-btn adm-btn-ghost" onClick={() => handleReject(r._id)}><XCircle size={12} /> Reject</button>}
                <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteResource(r._id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          <Pagination {...pgRes} />
        </div>
      ) : (
        <div className="adm-empty"><BookOpen size={48} strokeWidth={1.2} color="#d1d5db" /><p>No resources found</p></div>
      )}
    </div>
  );
}
