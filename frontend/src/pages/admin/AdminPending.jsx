import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminContext';
import { EditResourceModal, FilePreviewModal } from '../AdminModals';
import { Search, Clock, FileText, Eye, Pencil, CheckCircle } from 'lucide-react';

export default function AdminPending() {
  const { pendingResources, folders, handleApprove, handleReject, handleApproveAll, handleEditResourceSave } = useAdmin();
  const [search,    setSearch]    = useState('');
  const [editRes,   setEditRes]   = useState(null);
  const [previewRes,setPreviewRes]= useState(null);

  const filtered = useMemo(() => pendingResources.filter(r => {
    const q = search.toLowerCase();
    return !q || r.title?.toLowerCase().includes(q) || r.uploadedBy?.email?.toLowerCase().includes(q);
  }), [pendingResources, search]);

  return (
    <div className="adm-page">
      {editRes    && <EditResourceModal resource={editRes} folders={folders} onSave={async(id,d)=>{await handleEditResourceSave(id,d);setEditRes(null);}} onClose={()=>setEditRes(null)}/>}
      {previewRes && <FilePreviewModal resource={previewRes} onClose={()=>setPreviewRes(null)}/>}

      <div className="adm-page-hdr">
        <div>
          <h1 className="adm-page-title"><Clock size={22} color="#f59e0b"/> Pending Approvals</h1>
          <p className="adm-page-sub">{filtered.length} of {pendingResources.length} awaiting review</p>
        </div>
        {pendingResources.length > 1 && (
          <button className="adm-btn adm-btn-success" onClick={handleApproveAll}>
            <CheckCircle size={14}/> Approve All ({pendingResources.length})
          </button>
        )}
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14}/>
          <input placeholder="Search by title or uploader…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="adm-list">
          {filtered.map(r => (
            <motion.div key={r._id} className="adm-list-row" layout initial={{opacity:0}} animate={{opacity:1}}>
              <div className="adm-list-icon" style={{background:'#fef3c7'}}><FileText size={15} color="#f59e0b"/></div>
              <div className="adm-list-info">
                <div className="adm-list-title">{r.title}</div>
                <div className="adm-list-sub">
                  <span className="adm-pill" style={{background:'#f1f5f9',color:'#475569'}}>{r.fileType}</span>
                  {r.folder?.name||'Uncategorized'} · {r.category||'—'} · <strong>{r.uploadedBy?.email}</strong>
                </div>
              </div>
              <div className="adm-list-actions">
                {r.fileUrl && <button className="adm-btn adm-btn-ghost" onClick={()=>setPreviewRes(r)}><Eye size={13}/> Preview</button>}
                <button className="adm-btn adm-btn-success" onClick={()=>handleApprove(r._id)}>✓ Approve</button>
                <button className="adm-btn adm-btn-danger"  onClick={()=>handleReject(r._id)}>✕ Reject</button>
                <button className="adm-btn adm-btn-ghost"   onClick={()=>setEditRes(r)}><Pencil size={13}/></button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="adm-empty"><CheckCircle size={48} strokeWidth={1.2} color="#10b981"/><p>All caught up! No pending resources.</p></div>
      )}
    </div>
  );
}
