import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ value, onChange, children, className = '', disabled = false, required = false, style = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = React.Children.toArray(children)
    .filter(child => child.type === 'option')
    .map(child => ({
      value: child.props.value ?? '',
      label: child.props.children,
      disabled: child.props.disabled,
    }));

  const selected = options.find(o => String(o.value) === String(value));
  const displayLabel = selected?.label || options[0]?.label || 'Select…';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    onChange({ target: { value: opt.value } });
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = options.findIndex(o => String(o.value) === String(value));
      const next = options[idx + 1];
      if (next && !next.disabled) onChange({ target: { value: next.value } });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = options.findIndex(o => String(o.value) === String(value));
      const prev = options[idx - 1];
      if (prev && !prev.disabled) onChange({ target: { value: prev.value } });
    }
  };

  return (
    <div
      ref={ref}
      className={`csel-wrap ${className} ${disabled ? 'csel-disabled' : ''}`}
      style={style}
    >
      <button
        type="button"
        className={`csel-trigger ${open ? 'csel-open' : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        tabIndex={0}
      >
        <span className="csel-value">{displayLabel}</span>
        <ChevronDown size={15} className={`csel-chevron ${open ? 'csel-chevron-up' : ''}`} />
      </button>

      {open && (
        <div className="csel-dropdown" role="listbox">
          {options.map((opt) => {
            const isActive = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                className={`csel-option ${isActive ? 'csel-option-active' : ''} ${opt.disabled ? 'csel-option-disabled' : ''}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={() => handleSelect(opt)}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={13} className="csel-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
