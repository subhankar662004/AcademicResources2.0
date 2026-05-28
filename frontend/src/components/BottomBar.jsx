import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../App';
import {
  LayoutDashboard, BookOpen, ClipboardList, User,
  Shield, Home, Folder, Bell,
} from 'lucide-react';

const TABS_STUDENT = [
  { icon: Home,            label: 'Home',      to: '/',                   match: ['/', '/category-dashboard', '/choose-category'] },
  { icon: BookOpen,        label: 'Resources', to: '/resources',          match: ['/resources'] },
  { icon: ClipboardList,   label: 'Tests',     to: '/official-tests',     match: ['/official-tests'] },
  { icon: User,            label: 'Account',   to: '/my-account',         match: ['/my-account'] },
];

const TABS_TEACHER = [
  { icon: Home,          label: 'Home',      to: '/teacher',       match: ['/teacher'] },
  { icon: ClipboardList, label: 'My Tests',  to: '/teacher/tests', match: ['/teacher/tests'] },
  { icon: BookOpen,      label: 'Resources', to: '/resources',     match: ['/resources'] },
  { icon: User,          label: 'Account',   to: '/my-account',    match: ['/my-account'] },
];

const TABS_ADMIN = [
  { icon: LayoutDashboard, label: 'Overview',  to: '/admin/overview',  match: ['/admin/overview'] },
  { icon: ClipboardList,   label: 'Approvals', to: '/admin/pending',   match: ['/admin/pending'] },
  { icon: BookOpen,        label: 'Resources', to: '/admin/resources', match: ['/admin/resources'] },
  { icon: Shield,          label: 'Admin',     to: '/admin',           match: ['/admin', '/admin/users', '/admin/tests', '/admin/broadcast', '/admin/publish', '/admin/folders', '/admin/messages'] },
];

export default function BottomBar() {
  const { user, isAdmin, isTeacher } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const show = !!user;

  const tabs = isAdmin ? TABS_ADMIN : isTeacher ? TABS_TEACHER : TABS_STUDENT;

  useEffect(() => {
    if (show) {
      document.body.classList.add('has-bottom-bar');
    } else {
      document.body.classList.remove('has-bottom-bar');
    }
    return () => document.body.classList.remove('has-bottom-bar');
  }, [show]);

  if (!show) return null;

  const activeIdx = tabs.reduce((bestIdx, tab, i) => {
    const matchedPath = tab.match.find(
      m => location.pathname === m || location.pathname.startsWith(m + '/')
    );
    if (!matchedPath) return bestIdx;
    if (bestIdx === -1) return i;
    const bestMatchedPath = tabs[bestIdx].match.find(
      m => location.pathname === m || location.pathname.startsWith(m + '/')
    );
    return matchedPath.length > bestMatchedPath.length ? i : bestIdx;
  }, -1);

  return (
    <nav className="btm-bar" aria-label="Main navigation">
      <div className="btm-bar-inner">
        {tabs.map((tab, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={tab.to}
              className={`btm-tab${isActive ? ' btm-tab--active' : ''}`}
              onClick={() => navigate(tab.to)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  className="btm-pill"
                  layoutId="btm-active-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}

              <motion.div
                className="btm-tab-icon"
                animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              >
                <tab.icon size={20} strokeWidth={isActive ? 2.3 : 1.7} />
              </motion.div>

              <motion.span
                className="btm-tab-label"
                animate={{ opacity: isActive ? 1 : 0.55 }}
                transition={{ duration: 0.2 }}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
