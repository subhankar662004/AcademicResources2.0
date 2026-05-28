import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminContext';
import { UserModal, EditUserModal, RoleChangeModal } from '../AdminModals';
import { Search, Users, Trash2, Ban, CheckCircle, Shield } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';

const ROLE_META = {
  admin:   { c: '#dc2626', bg: '#fef2f2', b: '#fecaca' },
  teacher: { c: '#d97706', bg: '#fffbeb', b: '#fde68a' },
  student: { c: '#2563eb', bg: '#eff6ff', b: '#bfdbfe' },
};
const rm = (role) => ROLE_META[role] || ROLE_META.student;

export default function AdminUsers() {
  const { users, handleChangeRole, handleDeleteUser, handleBanUser, handleEditUserSave } = useAdmin();
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewUser,   setViewUser]   = useState(null);
  const [editUser,   setEditUser]   = useState(null);
  const [roleUser,   setRoleUser]   = useState(null);

  const filtered = useMemo(() => users.filter(u => {
    const byRole   = roleFilter === 'all' || u.role === roleFilter;
    const q        = search.toLowerCase();
    const bySearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return byRole && bySearch;
  }), [users, roleFilter, search]);
  const pgUsers = usePagination(filtered, 12);

  return (
    <div className="adm-page">
      {viewUser && (
        <UserModal
          u={viewUser}
          onClose={() => setViewUser(null)}
          onRoleChange={handleChangeRole}
          onDelete={handleDeleteUser}
          onEdit={u => { setViewUser(null); setEditUser(u); }}
          onBan={handleBanUser}
        />
      )}
      {editUser && (
        <EditUserModal
          u={editUser}
          onSave={async (id, d) => { await handleEditUserSave(id, d); setEditUser(null); }}
          onClose={() => setEditUser(null)}
        />
      )}
      {roleUser && (
        <RoleChangeModal
          u={roleUser}
          onSave={handleChangeRole}
          onClose={() => setRoleUser(null)}
        />
      )}

      <div className="adm-page-hdr">
        <div>
          <h1 className="adm-page-title"><Users size={22} color="#6366f1" /> User Management</h1>
          <p className="adm-page-sub">{filtered.length} of {users.length} users</p>
        </div>
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14} />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="adm-chip-group">
          {[
            { v: 'all',     l: 'All',      dot: '#94a3b8' },
            { v: 'student', l: 'Students', dot: '#2563eb' },
            { v: 'teacher', l: 'Teachers', dot: '#d97706' },
            { v: 'admin',   l: 'Admins',   dot: '#dc2626' },
          ].map(f => (
            <button
              key={f.v}
              className={`adm-chip2 ${roleFilter === f.v ? 'adm-chip2-active' : ''}`}
              onClick={() => setRoleFilter(f.v)}
            >
              <span className="adm-chip2-dot" style={{ background: f.dot }} />
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="adm-users-grid">
          {pgUsers.slice.map(u => {
            const meta = rm(u.role);
            return (
              <motion.div
                key={u._id}
                className="adm-user-card"
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setViewUser(u)}
              >
                <div className="adm-user-avatar" style={{ background: `linear-gradient(135deg,${meta.bg},${meta.b})` }}>
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} />
                    : <span style={{ color: meta.c, fontWeight: 700, fontSize: 18 }}>{u.name?.[0]?.toUpperCase()}</span>}
                </div>

                <div className="adm-user-info">
                  <div className="adm-user-name">{u.name}</div>
                  <div className="adm-user-email">{u.email}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="adm-pill" style={{ background: meta.bg, color: meta.c, border: `1px solid ${meta.b}` }}>
                      {u.role || 'student'}
                    </span>
                    {u.isBanned && (
                      <span className="adm-pill" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        Banned
                      </span>
                    )}
                  </div>
                </div>

                <div className="adm-user-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="adm-user-action-btn adm-user-action-role"
                    onClick={() => setRoleUser(u)}
                    title="Change Role"
                  >
                    <Shield size={13} />
                    <span>Role</span>
                  </button>
                  <button
                    className="adm-user-action-btn"
                    style={{ color: u.isBanned ? '#059669' : '#f59e0b' }}
                    onClick={() => handleBanUser(u._id, !u.isBanned)}
                    title={u.isBanned ? 'Unban' : 'Ban'}
                  >
                    {u.isBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                  </button>
                  <button
                    className="adm-user-action-btn adm-user-action-danger"
                    onClick={() => handleDeleteUser(u._id)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          <Pagination {...pgUsers} />
        </div>
      ) : (
        <div className="adm-empty">
          <Users size={48} strokeWidth={1.2} color="#d1d5db" />
          <p>No users found</p>
        </div>
      )}
    </div>
  );
}
