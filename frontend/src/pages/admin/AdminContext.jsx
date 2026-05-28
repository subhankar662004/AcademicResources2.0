import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../App';
import { API_URL } from '../../config';
import { useToast } from '../../components/Toast';
import { ConfirmModal } from '../AdminModals';

const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const [pendingResources, setPendingResources] = useState([]);
  const [allResources,     setAllResources]     = useState([]);
  const [folders,          setFolders]          = useState([]);
  const [users,            setUsers]            = useState([]);
  const [messages,         setMessages]         = useState([]);
  const [stats,            setStats]            = useState(null);
  const [tests,            setTests]            = useState([]);
  const [publishRequests,  setPublishRequests]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [confirmDlg,       setConfirmDlg]       = useState(null);

  const token      = () => localStorage.getItem('token');
  const authHeader = () => ({ Authorization: `Bearer ${token()}` });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const h = authHeader();
      const [pendR, allR, foldR, usrR, msgR, stR] = await Promise.all([
        fetch(`${API_URL}/api/resources/pending`, { headers: h }),
        fetch(`${API_URL}/api/resources/all`,     { headers: h }),
        fetch(`${API_URL}/api/folders`,           { headers: h }),
        fetch(`${API_URL}/api/users`,             { headers: h }),
        fetch(`${API_URL}/api/messages`,          { headers: h }),
        fetch(`${API_URL}/api/admin/stats`,       { headers: h }),
      ]);
      if (pendR.ok) setPendingResources(await pendR.json());
      if (allR.ok)  setAllResources(await allR.json());
      if (foldR.ok) setFolders(await foldR.json());
      if (usrR.ok)  setUsers(await usrR.json());
      if (msgR.ok)  setMessages(await msgR.json());
      if (stR.ok)   setStats(await stR.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchTests = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/tests`);
    if (res.ok) setTests(await res.json());
  }, []);

  const fetchPublishRequests = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/tests/publish-requests?status=pending`, { headers: authHeader() });
    if (res.ok) setPublishRequests(await res.json());
  }, []);

  useEffect(() => { fetchAll(); fetchTests(); fetchPublishRequests(); }, []);

  const confirm = (msg, fn, type = 'danger') => setConfirmDlg({ msg, fn, type });

  const handleApprove = async (id) => {
    const res = await fetch(`${API_URL}/api/resources/${id}/approve`, { method:'PUT', headers: authHeader() });
    if (res.ok) { toast.success('Resource approved'); fetchAll(); } else toast.error('Failed');
  };
  const handleReject = async (id) => {
    const res = await fetch(`${API_URL}/api/resources/${id}/reject`, { method:'PUT', headers: authHeader() });
    if (res.ok) { toast.success('Resource rejected'); fetchAll(); } else toast.error('Failed');
  };
  const handleApproveAll = async () => {
    const ids = pendingResources.map(r => r._id);
    if (!ids.length) return;
    await Promise.all(ids.map(id => fetch(`${API_URL}/api/resources/${id}/approve`, { method:'PUT', headers: authHeader() })));
    toast.success(`Approved all ${ids.length} resources`); fetchAll();
  };
  const handleDeleteResource = (id) => confirm('Delete this resource permanently?', async () => {
    const res = await fetch(`${API_URL}/api/resources/${id}`, { method:'DELETE', headers: authHeader() });
    if (res.ok) { setAllResources(r => r.filter(x => x._id !== id)); setPendingResources(r => r.filter(x => x._id !== id)); toast.delete('Resource deleted'); }
    else toast.error('Failed to delete resource');
  });
  const handleEditResourceSave = async (id, updates) => {
    const res = await fetch(`${API_URL}/api/resources/${id}`, { method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify(updates) });
    if (res.ok) { const u = await res.json(); setAllResources(r => r.map(x => x._id===id?u:x)); setPendingResources(r => r.map(x => x._id===id?u:x)); toast.edit('Resource updated'); fetchAll(); }
    else toast.error('Failed to update resource');
  };
  const handleChangeRole = async (id, role) => {
    const res = await fetch(`${API_URL}/api/users/${id}/role`, { method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify({role}) });
    if (res.ok) { setUsers(u => u.map(x => x._id===id?{...x,role}:x)); toast.edit(`Role changed to ${role}`); }
    else toast.error('Failed to change role');
  };
  const handleDeleteUser = (id) => confirm('Delete this user permanently?', async () => {
    const res = await fetch(`${API_URL}/api/users/${id}`, { method:'DELETE', headers: authHeader() });
    if (res.ok) { setUsers(u => u.filter(x => x._id !== id)); toast.delete('User deleted'); } else toast.error('Failed to delete user');
  });
  const handleBanUser = async (id, isBanned) => {
    const res = await fetch(`${API_URL}/api/users/${id}/ban`, { method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify({isBanned}) });
    if (res.ok) { setUsers(u => u.map(x => x._id===id?{...x,isBanned}:x)); toast.warning(isBanned ? 'User has been banned' : 'User has been unbanned'); } else toast.error('Failed to update ban status');
  };
  const handleEditUserSave = async (id, updates) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, { method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify(updates) });
    if (res.ok) { const u = await res.json(); setUsers(us => us.map(x => x._id===id?u:x)); toast.edit('User updated successfully'); } else toast.error('Failed to update user');
  };
  const handleFolderSave = async (id, data) => {
    if (id) {
      const res = await fetch(`${API_URL}/api/folders/${id}`, { method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify(data) });
      if (res.ok) { const f = await res.json(); setFolders(fl => fl.map(x => x._id===id?f:x)); toast.edit('Folder updated'); } else toast.error('Failed to update folder');
    } else {
      const res = await fetch(`${API_URL}/api/folders`, { method:'POST', headers:{...authHeader(),'Content-Type':'application/json'}, body:JSON.stringify(data) });
      if (res.ok) { const f = await res.json(); setFolders(fl => [f,...fl]); toast.success('Folder created'); fetchAll(); } else toast.error('Failed to create folder');
    }
  };
  const handleDeleteFolder = (id) => confirm('Delete folder?', async () => {
    const res = await fetch(`${API_URL}/api/folders/${id}`, { method:'DELETE', headers: authHeader() });
    if (res.ok) { setFolders(fl => fl.filter(x => x._id !== id)); toast.delete('Folder deleted'); } else toast.error('Failed to delete folder');
  });
  const handleMarkRead = async (id) => {
    const res = await fetch(`${API_URL}/api/messages/${id}/read`, { method:'PUT', headers: authHeader() });
    if (res.ok) setMessages(m => m.map(x => x._id===id?{...x,read:true}:x));
  };
  const handleMarkAllRead = async () => {
    const res = await fetch(`${API_URL}/api/messages/read-all`, { method:'PUT', headers: authHeader() });
    if (res.ok) { setMessages(m => m.map(x => ({...x,read:true}))); toast.success('All messages marked as read'); } else toast.error('Failed to mark messages as read');
  };
  const handleDeleteMessage = (id) => confirm('Delete this message?', async () => {
    const res = await fetch(`${API_URL}/api/messages/${id}`, { method:'DELETE', headers: authHeader() });
    if (res.ok) { setMessages(m => m.filter(x => x._id !== id)); toast.delete('Message deleted'); } else toast.error('Failed to delete message');
  });

  return (
    <AdminCtx.Provider value={{
      loading, stats, pendingResources, allResources, folders, users, messages, tests, publishRequests,
      fetchAll, fetchTests, fetchPublishRequests,
      handleApprove, handleReject, handleApproveAll, handleDeleteResource, handleEditResourceSave,
      handleChangeRole, handleDeleteUser, handleBanUser, handleEditUserSave,
      handleFolderSave, handleDeleteFolder,
      handleMarkRead, handleMarkAllRead, handleDeleteMessage,
      setTests, toast,
      token, authHeader,
      user,
    }}>
      {children}
      {confirmDlg && (
        <ConfirmModal
          message={confirmDlg.msg}
          type={confirmDlg.type}
          onConfirm={() => { confirmDlg.fn(); setConfirmDlg(null); }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </AdminCtx.Provider>
  );
}
