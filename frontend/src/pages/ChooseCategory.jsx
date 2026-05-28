import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Shield, Flag, Train, ShieldCheck, Heart, Plus, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { getCategories } from '../utils/categoryStore';

const DEFAULT_ICON_MAP = {
  'CSE':      { Icon: Monitor,     gradient: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', iconColor: '#2563eb', border: '#93c5fd' },
  'SSC GD':   { Icon: Shield,      gradient: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', iconColor: '#059669', border: '#6ee7b7' },
  'Agniveer': { Icon: Flag,        gradient: 'linear-gradient(135deg,#fef9c3,#fde68a)', iconColor: '#d97706', border: '#fcd34d' },
  'Railway':  { Icon: Train,       gradient: 'linear-gradient(135deg,#f3e8ff,#ddd6fe)', iconColor: '#7c3aed', border: '#c4b5fd' },
  'WBP':      { Icon: ShieldCheck, gradient: 'linear-gradient(135deg,#ffedd5,#fed7aa)', iconColor: '#ea580c', border: '#fdba74' },
  'Nursing':  { Icon: Heart,       gradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', iconColor: '#db2777', border: '#f9a8d4' },
};
const FALLBACK = { Icon: GraduationCap, gradient: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', iconColor: '#6366f1', border: '#c7d2fe' };

const FULL_NAMES = {
  'CSE':      'Computer Science & Engineering',
  'SSC GD':   'SSC GD Exam',
  'Agniveer': 'Agniveer',
  'Railway':  'Railway Exams',
  'WBP':      'West Bengal Police',
  'Nursing':  'Nursing',
};

function ChooseCategory() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const handleSelect = (name) => {
    localStorage.setItem('selectedCategory', name);
    navigate('/');
  };

  return (
    <div className="cc2-page">
      <div className="cc2-hero">
        <div className="cc2-hero-icon">
          <Sparkles size={28} color="#6366f1" strokeWidth={1.8} />
        </div>
        <h1 className="cc2-hero-title">Choose Your Category</h1>
        <p className="cc2-hero-sub">Select your exam category to access resources, upload files, and take practice tests</p>
      </div>

      <div className="cc2-grid">
        {categories.map((name) => {
          const meta = DEFAULT_ICON_MAP[name] || FALLBACK;
          const { Icon } = meta;
          const fullName = FULL_NAMES[name] || name;

          return (
            <button
              key={name}
              className="cc2-card"
              style={{ '--grad': meta.gradient, '--border': meta.border, '--icon': meta.iconColor }}
              onClick={() => handleSelect(name)}
            >
              <div className="cc2-card-glow" />
              <div className="cc2-icon-wrap">
                <Icon size={30} color={meta.iconColor} strokeWidth={1.7} />
              </div>
              <div className="cc2-card-body">
                <div className="cc2-code">{name}</div>
                <div className="cc2-name">{fullName}</div>
              </div>
              <div className="cc2-arrow">
                <ArrowRight size={16} color={meta.iconColor} />
              </div>
            </button>
          );
        })}
      </div>

      <p className="cc2-hint">
        <Plus size={13} /> Admins can add custom categories from the admin panel
      </p>
    </div>
  );
}

export default ChooseCategory;
