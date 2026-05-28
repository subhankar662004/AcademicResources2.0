import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from './AdminContext';
import {
  LayoutDashboard, Clock, BookOpen, Users, Folder,
  Mail, ClipboardList, Megaphone, RefreshCw, ChevronRight, Globe,
} from 'lucide-react';

const HOME_NAV = [
  { to: '/admin/overview',  label: 'Overview',  Icon: LayoutDashboard },
  { to: '/admin/pending',   label: 'Approvals', Icon: Clock },
  { to: '/admin/resources', label: 'Resources', Icon: BookOpen },
  { to: '/admin/folders',   label: 'Folders',   Icon: Folder },
  { to: '/admin/messages',  label: 'Messages',  Icon: Mail },
];

const PANEL_NAV = [
  { to: '/admin/users',     label: 'Users',            Icon: Users },
  { to: '/admin/tests',     label: 'Tests',            Icon: ClipboardList },
  { to: '/admin/publish',   label: 'Publish Requests', Icon: Globe },
  { to: '/admin/broadcast', label: 'Broadcast',        Icon: Megaphone },
];

function AdminNav() {
  const { pendingResources, messages, publishRequests, fetchAll, fetchTests, fetchPublishRequests } = useAdmin();
  const location = useLocation();

  const badges = {
    '/admin/pending':  pendingResources.length || null,
    '/admin/messages': messages.filter(m => !m.read).length || null,
    '/admin/publish':  publishRequests.length || null,
  };

  const isHomeSection = HOME_NAV.some(n => location.pathname === n.to);
  const activeGroup = isHomeSection ? HOME_NAV : PANEL_NAV;
  const activeTitle = isHomeSection ? 'Site Management' : 'Admin Panel';
  const inactiveTitle = isHomeSection ? 'Admin Panel' : 'Site Management';
  const inactiveLink = isHomeSection ? '/admin/users' : '/admin/overview';

  return (
    <aside className="adm-sidebar">
      <div className="adm-sidebar-head">
        <span className="adm-sidebar-title">{activeTitle}</span>
        <button className="adm-sidebar-refresh" onClick={() => { fetchAll(); fetchTests(); fetchPublishRequests(); }} title="Refresh">
          <RefreshCw size={14}/>
        </button>
      </div>
      <nav className="adm-sidebar-nav">
        {activeGroup.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `adm-sidebar-link ${isActive ? 'adm-sidebar-link-active' : ''}`}>
            <Icon size={16} strokeWidth={2}/>
            <span>{label}</span>
            {badges[to]
              ? <span className="adm-sidebar-badge">{badges[to]}</span>
              : <ChevronRight size={13} className="adm-sidebar-arrow"/>}
          </NavLink>
        ))}
      </nav>
      <div className="adm-sidebar-switch">
        <NavLink to={inactiveLink} className="adm-sidebar-switch-btn">
          {inactiveTitle} →
        </NavLink>
      </div>
    </aside>
  );
}

function AdminLayoutInner({ children }) {
  return (
    <div className="adm-layout">
      <AdminNav/>
      <main className="adm-main">
        {children ?? <Outlet/>}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}
