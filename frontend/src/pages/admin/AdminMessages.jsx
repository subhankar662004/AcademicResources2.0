import React, { useState, useMemo } from 'react';
import { useAdmin } from './AdminContext';
import { MessageModal } from '../AdminModals';
import { Search, Mail, Trash2 } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';

export default function AdminMessages() {
  const { messages, handleMarkRead, handleMarkAllRead, handleDeleteMessage } = useAdmin();
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [viewMsg,    setViewMsg]    = useState(null);

  const filtered = useMemo(() => messages.filter(m => {
    const byRead = filter==='all'?true:filter==='unread'?!m.read:m.read;
    const q = search.toLowerCase();
    const bySearch = !q || m.name?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q) || m.message?.toLowerCase().includes(q);
    return byRead && bySearch;
  }), [messages, filter, search]);
  const pgMsgs = usePagination(filtered, 10);

  const unreadCount = messages.filter(m=>!m.read).length;

  return (
    <div className="adm-page">
      {viewMsg && <MessageModal msg={viewMsg} onClose={()=>setViewMsg(null)} onDelete={handleDeleteMessage} onMarkRead={handleMarkRead}/>}

      <div className="adm-page-hdr">
        <div>
          <h1 className="adm-page-title"><Mail size={22} color="#ec4899"/> Contact Messages</h1>
          <p className="adm-page-sub">{filtered.length} shown · {unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button className="adm-btn adm-btn-ghost" onClick={handleMarkAllRead}>✓ Mark All Read</button>
        )}
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14}/>
          <input placeholder="Search by name, subject or message…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="adm-role-chips">
          {['all','unread','read'].map(f=>(
            <button key={f} className={`adm-chip ${filter===f?'adm-chip-active':''}`} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="adm-list">
          {pgMsgs.slice.map(msg => (
            <div key={msg._id} className={`adm-list-row ${!msg.read?'adm-list-row-unread':''}`}
              style={{cursor:'pointer'}}
              onClick={()=>{ setViewMsg(msg); if(!msg.read) handleMarkRead(msg._id); }}>
              <div className="adm-list-icon" style={{background:'#fdf2f8'}}><Mail size={15} color="#ec4899"/></div>
              <div className="adm-list-info">
                <div className="adm-list-title" style={{display:'flex',alignItems:'center',gap:8}}>
                  {msg.name}
                  {!msg.read && <span className="adm-pill" style={{background:'#dbeafe',color:'#1d4ed8'}}>New</span>}
                </div>
                <div className="adm-list-sub" style={{fontWeight:500}}>{msg.subject}</div>
                <div className="adm-list-sub" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:480}}>{msg.message}</div>
              </div>
              <div className="adm-list-actions" onClick={e=>e.stopPropagation()}>
                {!msg.read && <button className="adm-btn adm-btn-ghost" onClick={()=>handleMarkRead(msg._id)}>Mark Read</button>}
                <button className="adm-btn adm-btn-danger" onClick={()=>handleDeleteMessage(msg._id)}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          <Pagination {...pgMsgs} />
        </div>
      ) : (
        <div className="adm-empty"><Mail size={48} strokeWidth={1.2} color="#d1d5db"/><p>No messages</p></div>
      )}
    </div>
  );
}
