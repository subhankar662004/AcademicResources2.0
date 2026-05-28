import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Trash2, Pencil, Bell } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const META = {
  success: { Icon: CheckCircle,   label: 'Success', color: '#059669', bg: '#f0fdf4', border: '#86efac', iconBg: '#dcfce7', bar: '#059669', glow: 'rgba(5,150,105,0.15)' },
  error:   { Icon: XCircle,       label: 'Error',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2', bar: '#dc2626', glow: 'rgba(220,38,38,0.15)'  },
  warning: { Icon: AlertTriangle, label: 'Warning', color: '#d97706', bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7', bar: '#d97706', glow: 'rgba(217,119,6,0.15)'  },
  info:    { Icon: Info,          label: 'Info',    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', bar: '#2563eb', glow: 'rgba(37,99,235,0.15)'  },
  delete:  { Icon: Trash2,        label: 'Deleted', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2', bar: '#dc2626', glow: 'rgba(220,38,38,0.15)'  },
  edit:    { Icon: Pencil,        label: 'Updated', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', iconBg: '#ede9fe', bar: '#7c3aed', glow: 'rgba(124,58,237,0.15)' },
  notify:  { Icon: Bell,          label: 'Notice',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', iconBg: '#cffafe', bar: '#0891b2', glow: 'rgba(8,145,178,0.15)'  },
};

function ToastItem({ id, type, message, onClose }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t = requestAnimationFrame(() => setPhase('idle'));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = useCallback(() => {
    setPhase('exit');
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  useEffect(() => {
    const t = setTimeout(close, 4400);
    return () => clearTimeout(t);
  }, [close]);

  const m = META[type] || META.info;

  const transforms = {
    enter: 'scale(0.78) translateY(-20px)',
    idle:  'scale(1) translateY(0)',
    exit:  'scale(0.84) translateY(-12px)',
  };
  const opacities = { enter: 0, idle: 1, exit: 0 };

  const transition = phase === 'exit'
    ? 'transform 0.26s ease-in, opacity 0.22s ease-in, box-shadow 0.2s'
    : 'transform 0.46s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease-out, box-shadow 0.3s';

  return (
    <div
      className="toast2-item"
      style={{
        background: m.bg,
        borderColor: m.border,
        boxShadow: phase === 'idle'
          ? `0 0 0 1px ${m.border}, 0 24px 60px rgba(0,0,0,0.18), 0 8px 20px ${m.glow}`
          : '0 4px 16px rgba(0,0,0,0.08)',
        transform: transforms[phase],
        opacity:   opacities[phase],
        transition,
      }}
    >
      {/* Top accent bar */}
      <div className="toast2-accent" style={{ background: m.bar }} />

      {/* Icon */}
      <div className="toast2-icon" style={{ background: m.iconBg, boxShadow: `0 0 0 6px ${m.glow}` }}>
        <m.Icon size={26} color={m.color} strokeWidth={2.2} />
      </div>

      {/* Label + message */}
      <div className="toast2-body">
        <div className="toast2-label" style={{ color: m.color }}>{m.label}</div>
        <div className="toast2-msg">{message}</div>
      </div>

      {/* Close */}
      <button className="toast2-close" onClick={close} aria-label="Dismiss">
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="toast2-bar-track" style={{ background: m.border }}>
        <div className="toast2-bar-fill" style={{ background: m.bar, animationDuration: '4.4s' }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((type, message) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  toast.success = (msg) => toast('success', msg);
  toast.error   = (msg) => toast('error',   msg);
  toast.warning = (msg) => toast('warning', msg);
  toast.info    = (msg) => toast('info',    msg);
  toast.delete  = (msg) => toast('delete',  msg);
  toast.edit    = (msg) => toast('edit',    msg);
  toast.notify  = (msg) => toast('notify',  msg);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && <div className="toast2-backdrop" />}
      <div className="toast2-container" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
