import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, MapPin, FileText, Users, GraduationCap,
  BookOpen, ChevronRight, ArrowUp, Layers,
} from 'lucide-react';
import logo from '../assets/logo.png';

const STATS = [
  { value: '2,000+', label: 'Resources',  Icon: FileText       },
  { value: '1,500+', label: 'Students',   Icon: Users          },
  { value: '50+',    label: 'Educators',  Icon: GraduationCap  },
  { value: '6',      label: 'Categories', Icon: Layers         },
];

const NAV_LINKS = [
  { label: 'Home',      to: '/'                   },
  { label: 'Dashboard', to: '/category-dashboard'  },
  { label: 'Upload',    to: '/upload'              },
  { label: 'Contact',   to: '/contact'             },
];

const RES_LINKS = [
  { label: 'Notes',          to: '/resources' },
  { label: 'Question Papers', to: '/resources' },
  { label: 'Books',          to: '/resources' },
  { label: 'Practice Tests', to: '/test'      },
];

function FooterLink({ label, to }) {
  return (
    <li>
      <Link to={to} className="ft-link">
        <ChevronRight size={11} className="ft-link-arrow" strokeWidth={2.5} />
        <span>{label}</span>
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="ft-root">
      {/* decorative top bar */}
      <div className="ft-topbar" />

      <div className="ft-inner">

        {/* ── Stats row ── */}
        <div className="ft-stats-row">
          {STATS.map(({ value, label, Icon }, i) => (
            <React.Fragment key={label}>
              <div className="ft-stat">
                <div className="ft-stat-icon-wrap">
                  <Icon size={17} strokeWidth={1.8} />
                </div>
                <div className="ft-stat-val">{value}</div>
                <div className="ft-stat-lbl">{label}</div>
              </div>
              {i < STATS.length - 1 && <div className="ft-stat-sep" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="ft-grid">

          {/* Brand */}
          <div className="ft-brand">
            <div className="ft-brand-logo">
              <img src={logo} alt="AcadHub" className="ft-logo-img" />
              <span className="ft-logo-text">AcadHub</span>
            </div>
            <p className="ft-brand-tagline">
              Your trusted platform for sharing and accessing quality academic resources.
              Empowering thousands of learners and educators every day.
            </p>
            <div className="ft-contact-stack">
              <a href="mailto:subhadas662004@gmail.com" className="ft-contact-item">
                <span className="ft-ci-icon"><Mail size={13} strokeWidth={2} /></span>
                subhadas662004@gmail.com
              </a>
              <a href="tel:+917602284873" className="ft-contact-item">
                <span className="ft-ci-icon"><Phone size={13} strokeWidth={2} /></span>
                +91 7602284873
              </a>
              <div className="ft-contact-item no-hover">
                <span className="ft-ci-icon"><MapPin size={13} strokeWidth={2} /></span>
                Kolkata, West Bengal
              </div>
            </div>
          </div>

          {/* Navigate */}
          <div className="ft-col">
            <h4 className="ft-col-head">Navigate</h4>
            <ul className="ft-link-list">
              {NAV_LINKS.map(l => <FooterLink key={l.label} {...l} />)}
            </ul>
          </div>

          {/* Resources */}
          <div className="ft-col">
            <h4 className="ft-col-head">Resources</h4>
            <ul className="ft-link-list">
              {RES_LINKS.map(l => <FooterLink key={l.label} {...l} />)}
            </ul>
          </div>

          {/* CTA */}
          <div className="ft-cta-col">
            <h4 className="ft-col-head">Start Learning</h4>
            <p className="ft-cta-desc">
              Access thousands of notes, question papers, and practice tests — completely free.
            </p>
            <Link to="/category-dashboard" className="ft-btn-primary">
              Browse Resources <ChevronRight size={14} strokeWidth={2.5} />
            </Link>
            <Link to="/signup" className="ft-btn-ghost">
              Create Account <ChevronRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="ft-divider" />
        <div className="ft-bottom">
          <p className="ft-copy">© {new Date().getFullYear()} Academic Resources Hub. All rights reserved.</p>
          <p className="ft-made">Built for learners, by learners.</p>
          <button
            className="ft-scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </footer>
  );
}
