import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: 'calc(100vh - var(--header-h))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'var(--bg)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ textAlign: 'center', maxWidth: 480 }}
      >
        <div style={{
          width: 96, height: 96,
          borderRadius: '50%',
          background: 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <BookOpen size={44} color="var(--primary)" strokeWidth={1.5} />
        </div>

        <p style={{
          fontSize: 96, fontWeight: 800, lineHeight: 1,
          color: 'var(--border-strong)',
          marginBottom: 8, letterSpacing: '-4px',
        }}>
          404
        </p>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 36 }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={15} /> Go Back
          </button>
          <Link to="/" className="btn btn-primary" aria-label="Go to home page">
            <Home size={15} /> Home
          </Link>
          <Link to="/resources" className="btn btn-outline" aria-label="Browse resources">
            <Search size={15} /> Browse Resources
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
