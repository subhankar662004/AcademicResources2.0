import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminContext';
import {
  BookOpen, Clock, Folder, ChevronRight,
  AlertCircle, CheckCircle, FileText, TrendingUp,
  Upload, Star, BarChart2, Activity,
} from 'lucide-react';

const STAT_CARDS = [
  { key:'resources', label:'Total Resources', Icon:BookOpen,  color:'#10b981', path:'/admin/resources', val:(s,p,t,u,r)=>s?.resources?.total??r.length,       sub:(s)=>`${s?.resources?.approved??0} approved · ${s?.resources?.rejected??0} rejected` },
  { key:'pending',   label:'Pending Review',  Icon:Clock,     color:'#f59e0b', path:'/admin/pending',   val:(s,p)=>s?.resources?.pending??p.length,             sub:()=>'Awaiting approval' },
  { key:'folders',   label:'Folders',         Icon:Folder,    color:'#8b5cf6', path:'/admin/folders',   val:(s,p,t,u,r,fl)=>s?.folders??fl.length,              sub:()=>'Resource categories' },
];

const QUICK_ACTIONS = [
  { label:'Review Pending',  path:'/admin/pending',   color:'#f59e0b', Icon:Clock,     desc:'Approve or reject uploads' },
  { label:'All Resources',   path:'/admin/resources', color:'#10b981', Icon:BookOpen,  desc:'Browse & manage resources' },
  { label:'Folders',         path:'/admin/folders',   color:'#8b5cf6', Icon:Folder,    desc:'Organise resource folders' },
];

export default function AdminOverview() {
  const navigate = useNavigate();
  const { stats, pendingResources, allResources, folders, users, messages, tests, handleApprove, handleReject } = useAdmin();

  const approvedCount  = stats?.resources?.approved  ?? allResources.filter(r => r.status === 'approved').length;
  const rejectedCount  = stats?.resources?.rejected  ?? allResources.filter(r => r.status === 'rejected').length;
  const totalResources = stats?.resources?.total     ?? allResources.length;

  return (
    <div className="adm-page">
      {/* Header */}
      <div className="ov-header">
        <div>
          <h1 className="ov-title">Resource Overview</h1>
          <p className="ov-sub">Monitor and manage all platform content from here</p>
        </div>
        <div className="ov-activity-pill">
          <Activity size={13} />
          <span>Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="ov-stat-grid">
        {STAT_CARDS.map(({ key, label, Icon, color, path, val, sub }, i) => {
          const value   = val(stats, pendingResources, tests, users, allResources, folders, messages);
          const subText = sub(stats, users, messages);
          return (
            <motion.div
              key={key}
              className="ov-stat-card"
              style={{ '--c': color }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(path)}
            >
              <div className="ov-stat-icon"><Icon size={20} color={color} /></div>
              <div className="ov-stat-val">{value ?? '—'}</div>
              <div className="ov-stat-label">{label}</div>
              <div className="ov-stat-sub">{subText}</div>
              <div className="ov-stat-glow" />
            </motion.div>
          );
        })}
      </div>

      {/* Resource health bar */}
      {totalResources > 0 && (
        <div className="ov-health-card">
          <div className="ov-health-head">
            <div className="ov-health-title"><BarChart2 size={15} color="#6366f1" /> Resource Health</div>
            <span className="ov-health-total">{totalResources} total</span>
          </div>
          <div className="ov-health-bar-wrap">
            <div className="ov-health-seg" style={{ width: `${(approvedCount/totalResources)*100}%`, background: '#10b981' }} title={`${approvedCount} approved`} />
            <div className="ov-health-seg" style={{ width: `${(pendingResources.length/totalResources)*100}%`, background: '#f59e0b' }} title={`${pendingResources.length} pending`} />
            <div className="ov-health-seg" style={{ width: `${(rejectedCount/totalResources)*100}%`, background: '#ef4444' }} title={`${rejectedCount} rejected`} />
          </div>
          <div className="ov-health-legend">
            <span className="ov-legend-dot" style={{ background: '#10b981' }} /> Approved ({approvedCount})
            <span className="ov-legend-dot" style={{ background: '#f59e0b', marginLeft: 14 }} /> Pending ({pendingResources.length})
            <span className="ov-legend-dot" style={{ background: '#ef4444', marginLeft: 14 }} /> Rejected ({rejectedCount})
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="adm-section">
        <h2 className="adm-section-title">Quick Actions</h2>
        <div className="ov-qa-grid">
          {QUICK_ACTIONS.map(({ label, path, color, Icon, desc }) => (
            <button key={path} className="ov-qa-card" style={{ '--c': color }} onClick={() => navigate(path)}>
              <div className="ov-qa-icon"><Icon size={20} color={color} /></div>
              <div className="ov-qa-info">
                <div className="ov-qa-label">{label}</div>
                <div className="ov-qa-desc">{desc}</div>
              </div>
              <ChevronRight size={16} className="ov-qa-arrow" />
            </button>
          ))}
        </div>
      </div>

      {/* Pending approvals */}
      {pendingResources.length > 0 && (
        <div className="adm-section">
          <div className="adm-section-hdr2">
            <h2 className="adm-section-title">
              <AlertCircle size={16} color="#f59e0b" /> Pending Approvals
              <span className="ov-count-badge" style={{ background: '#fef3c7', color: '#d97706' }}>{pendingResources.length}</span>
            </h2>
            <button className="ov-link-btn" onClick={() => navigate('/admin/pending')}>View all →</button>
          </div>
          <div className="adm-list">
            {pendingResources.slice(0, 4).map(r => (
              <motion.div key={r._id} className="adm-list-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="adm-list-icon" style={{ background: '#fef3c7' }}><FileText size={15} color="#f59e0b" /></div>
                <div className="adm-list-info">
                  <div className="adm-list-title">{r.title}</div>
                  <div className="adm-list-sub">{r.fileType} · {r.folder?.name || 'Uncategorized'} · {r.uploadedBy?.email}</div>
                </div>
                <div className="adm-list-actions">
                  <button className="ov-approve-btn" onClick={() => handleApprove(r._id)}>
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button className="ov-reject-btn" onClick={() => handleReject(r._id)}>
                    ✕ Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent approved resources */}
      {allResources.filter(r => r.status === 'approved').length > 0 && (
        <div className="adm-section">
          <div className="adm-section-hdr2">
            <h2 className="adm-section-title"><Star size={16} color="#10b981" /> Recently Approved</h2>
            <button className="ov-link-btn" onClick={() => navigate('/admin/resources')}>View all →</button>
          </div>
          <div className="adm-list">
            {allResources.filter(r => r.status === 'approved').slice(0, 4).map(r => (
              <div key={r._id} className="adm-list-row">
                <div className="adm-list-icon" style={{ background: '#dcfce7' }}><CheckCircle size={15} color="#10b981" /></div>
                <div className="adm-list-info">
                  <div className="adm-list-title">{r.title}</div>
                  <div className="adm-list-sub">{r.fileType} · {r.folder?.name || 'Uncategorized'} · {r.uploadedBy?.email}</div>
                </div>
                <span className="ov-approved-badge">Approved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allResources.length === 0 && pendingResources.length === 0 && (
        <div className="adm-empty" style={{ marginTop: 32 }}>
          <Upload size={48} strokeWidth={1.2} color="#d1d5db" />
          <p>No resources yet — they'll appear here once users upload them</p>
        </div>
      )}
    </div>
  );
}
