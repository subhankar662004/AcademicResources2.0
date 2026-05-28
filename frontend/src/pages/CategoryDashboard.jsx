import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { BookOpen, UploadCloud, ClipboardList, Brain, ChevronLeft, ArrowRight } from 'lucide-react';

const CARDS = (cat) => [
  { title: 'Resources',       desc: `Browse ${cat} notes, PDFs and materials`,       Icon: BookOpen,      path: '/resources',     color: '#2563eb', bg: '#eff6ff' },
  { title: 'Upload Resource', desc: `Share your ${cat} files with the community`,     Icon: UploadCloud,   path: '/upload',        color: '#059669', bg: '#f0fdf4' },
  { title: 'Practice Tests',  desc: `Attempt ${cat} mock tests`,                     Icon: ClipboardList, path: '/test',          color: '#7c3aed', bg: '#f5f3ff' },
  { title: 'AI Generator',    desc: `Generate AI-powered tests for ${cat}`,           Icon: Brain,         path: '/ai-generator',  color: '#d97706', bg: '#fffbeb' },
];

function CategoryDashboard() {
  const navigate = useNavigate();
  const selectedCategory = localStorage.getItem('selectedCategory');

  if (!selectedCategory) {
    return <Navigate to="/choose-category" replace />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{selectedCategory} Dashboard</h1>
        <p>Everything you need to study and prepare for {selectedCategory}</p>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/choose-category')}>
            <ChevronLeft size={14} /> Change Category
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="action-grid">
          {CARDS(selectedCategory).map(({ title, desc, Icon, path, color, bg }) => (
            <div
              key={title}
              className="action-card"
              onClick={() => navigate(path)}
            >
              <div className="action-icon-wrap" style={{ background: bg }}>
                <Icon size={26} color={color} strokeWidth={1.8} />
              </div>
              <div className="action-title">{title}</div>
              <div className="action-desc">{desc}</div>
              <div className="action-arrow">
                <ArrowRight size={16} color={color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CategoryDashboard;
