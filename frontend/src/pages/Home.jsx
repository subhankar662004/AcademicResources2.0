import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import StudentHome from './StudentHome';
import {
  BookOpen, CheckCircle, Users, Brain, Folder, Bell,
  ArrowRight, GraduationCap, LayoutDashboard, Upload,
  Download, Search, Sparkles,
} from 'lucide-react';
import heroVideo from '../assets/hero-bg.mp4';
import heroImage from '../assets/hero-bg.jpg';

const features = [
  { Icon: BookOpen,    title: 'Vast Resource Library',  desc: 'Access thousands of notes, question papers, books and tutorials across multiple subjects and categories.' },
  { Icon: CheckCircle, title: 'Quality Controlled',     desc: 'Every resource goes through admin approval to ensure accuracy and usefulness for all learners.' },
  { Icon: Users,       title: 'Community Driven',       desc: 'A trusted community of friends and classmates sharing knowledge and growing together.' },
  { Icon: Brain,       title: 'AI-Powered Tests',       desc: 'Generate custom practice tests using AI to prepare smarter and more effectively.' },
  { Icon: Folder,      title: 'Smart Organisation',     desc: 'Resources organised in folders and categories for quick, easy navigation and discovery.' },
  { Icon: Bell,        title: 'Live Notifications',     desc: 'Get instant alerts when your uploads are approved or when new resources are added.' },
];

const steps = [
  { n: 1, Icon: GraduationCap,   title: 'Create Account',   desc: 'Sign up for free and verify your email with OTP' },
  { n: 2, Icon: LayoutDashboard, title: 'Choose Category',  desc: 'Pick your exam category — CSE, SSC, Railway and more' },
  { n: 3, Icon: Upload,          title: 'Upload Resources', desc: 'Share your notes and study materials with the community' },
  { n: 4, Icon: Download,        title: 'Access & Download', desc: 'Browse, search and download approved resources anytime' },
];

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const easeOut = [0.25, 0.46, 0.45, 0.94];

function Home() {
  const { user } = useAuth();
  const { scrollY, scrollYProgress } = useScroll();

  const progressScaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const heroY       = useTransform(scrollY, [0, 520], [0, -90]);
  const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);
  const videoScale  = useTransform(scrollY, [0, 600], [1, 1.12]);

  if (user && user.role === 'student') return <StudentHome />;

  const handleVideoError = (e) => {
    e.target.style.display = 'none';
    const fallback = e.target.closest('.hero')?.querySelector('.hero-image');
    if (fallback) fallback.style.display = 'block';
  };

  return (
    <div>
      {/* ── Scroll progress bar ── */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)',
          backgroundSize: '200% 100%',
          transformOrigin: '0%',
          scaleX: progressScaleX,
          zIndex: 9999,
        }}
      />

      {/* ── Hero ── */}
      <section className="hero">
        <motion.video
          autoPlay loop muted playsInline preload="auto"
          className="hero-video"
          onError={handleVideoError}
          style={{ scale: videoScale }}
        >
          <source src={heroVideo} type="video/mp4" />
        </motion.video>
        <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />

        <motion.div
          className="hero-content"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Badge with looping float */}
            <motion.div variants={heroItem}>
              <motion.div
                className="hero-badge"
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <GraduationCap size={14} />
                Trusted Academic Platform
              </motion.div>
            </motion.div>

            <motion.h1 variants={heroItem}>
              Access &amp; Share<br />
              <span>Academic Resources</span>
            </motion.h1>

            <motion.p variants={heroItem}>
              Your go-to platform for notes, question papers, books and practice tests.
              Join thousands of learners and educators growing together.
            </motion.p>

            <motion.div className="hero-buttons" variants={heroItem}>
              {user ? (
                <Link to="/category-dashboard" className="btn btn-primary btn-xl">
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn btn-primary btn-xl">
                    Get Started Free <ArrowRight size={16} />
                  </Link>
                  <Link to="/resources" className="btn btn-outline btn-xl">
                    <Search size={16} /> Browse Resources
                  </Link>
                </>
              )}
            </motion.div>

            <motion.div className="hero-stats" variants={heroItem}>
              {[
                { num: '500+', label: 'Resources' },
                { num: '6',    label: 'Categories' },
                { num: '100%', label: 'Free' },
              ].map((s, i) => (
                <motion.div
                  className="hero-stat"
                  key={s.label}
                  whileHover={{ scale: 1.12, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <span className="stat-num">{s.num}</span>
                  <span className="stat-label">{s.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="section section-white">
        <div className="section-inner">
          <motion.div
            className="section-title"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <span className="section-label">Why Choose Us</span>
            <h2>Everything You Need to Succeed</h2>
            <p>A complete academic resource hub built for students preparing for competitive exams</p>
          </motion.div>

          <div className="features-grid" style={{ perspective: '1200px' }}>
            {features.map(({ Icon, title, desc }, i) => (
              <motion.div
                className="feature-card"
                key={title}
                initial={{ opacity: 0, y: 56, rotateX: 22 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.65, delay: i * 0.09, ease: easeOut }}
                whileHover={{
                  y: -10,
                  rotateY: 4,
                  rotateX: -4,
                  scale: 1.03,
                  boxShadow: '0 24px 48px rgba(37, 99, 235, 0.14)',
                  borderColor: '#2563eb',
                  transition: { duration: 0.22 },
                }}
                style={{ transformPerspective: 900, willChange: 'transform' }}
              >
                <motion.div
                  className="feature-icon-wrap"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon size={22} color="var(--primary)" strokeWidth={2} />
                </motion.div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="section section-light">
        <div className="section-inner">
          <motion.div
            className="section-title"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <span className="section-label">How It Works</span>
            <h2>Get Started in 4 Simple Steps</h2>
            <p>From signup to downloading your first resource in minutes</p>
          </motion.div>

          <div className="steps-grid" style={{ perspective: '1000px' }}>
            {steps.map(({ n, Icon, title, desc }, i) => {
              const fromLeft = i % 2 === 0;
              return (
                <motion.div
                  className="step-card"
                  key={n}
                  initial={{ opacity: 0, x: fromLeft ? -50 : 50, rotateY: fromLeft ? 15 : -15 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: easeOut }}
                  whileHover={{ y: -8, scale: 1.04, transition: { duration: 0.2 } }}
                  style={{ transformPerspective: 800, willChange: 'transform' }}
                >
                  <motion.div
                    className="step-number"
                    initial={{ scale: 0.5, rotate: -20 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 18,
                      delay: i * 0.12 + 0.28,
                    }}
                    whileHover={{ rotate: 10, scale: 1.15 }}
                  >
                    <Icon size={22} color="white" strokeWidth={2} />
                  </motion.div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-light">
        <div className="section-inner">
          <motion.div
            className="cta-banner"
            initial={{ opacity: 0, scale: 0.92, y: 48 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.75, ease: easeOut }}
            style={{ transformPerspective: 1000 }}
          >
            <motion.div
              animate={{ y: [0, -14, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block', marginBottom: 16 }}
            >
              <Sparkles size={36} color="rgba(255,255,255,0.85)" />
            </motion.div>

            <h2>Ready to Start Learning?</h2>
            <p>Join our growing community and access hundreds of free academic resources today</p>

            {user ? (
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                <Link to="/upload" className="btn btn-xl" style={{ background: 'white', color: '#2563eb' }}>
                  <Upload size={16} /> Upload Your First Resource
                </Link>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signup" className="btn btn-xl" style={{ background: 'white', color: '#2563eb' }}>
                  <ArrowRight size={16} /> Create Free Account
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Home;
