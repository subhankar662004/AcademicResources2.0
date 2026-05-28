import React, { useState } from 'react';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import contactVideo from '../assets/contact.mp4';

const INFO = [
  { Icon: Mail,    label: 'Email',        value: 'subhadas662004@gmail.com' },
  { Icon: Phone,   label: 'Phone',        value: '+91 7602284873' },
  { Icon: MapPin,  label: 'Address',      value: 'Kolkata, West Bengal, India' },
  { Icon: Clock,   label: 'Office Hours', value: 'Mon – Fri: 9 AM – 6 PM' },
];

function ContactUs() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message)
      return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Message sent! We'll get back to you soon.");
        setForm(f => ({ ...f, subject: '', message: '' }));
      } else {
        toast.error(data.message || 'Failed to send message');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <div className="contact-hero">
        <video autoPlay muted loop playsInline>
          <source src={contactVideo} type="video/mp4" />
        </video>
        <div className="contact-hero-text">
          <h1>Get In Touch</h1>
          <p>We're here to help with any questions or support you need</p>
        </div>
      </div>

      <div className="contact-layout">
        {/* Info Panel */}
        <div className="contact-info-card">
          <h3>Contact Information</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: -8 }}>
            Reach out through any of the channels below
          </p>
          {INFO.map(({ Icon, label, value }) => (
            <div className="contact-item" key={label}>
              <div className="contact-item-icon">
                <Icon size={18} color="var(--primary)" strokeWidth={1.8} />
              </div>
              <div className="contact-item-text">
                <strong>{label}</strong>
                <p>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form Panel */}
        <div className="contact-form-card">
          <h3>Send Us a Message</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Your Name *</label>
                <input type="text" value={form.name} onChange={set('name')} placeholder="Full name" required />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </div>
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <CustomSelect value={form.subject} onChange={set('subject')} required>
                <option value="">Select a topic…</option>
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="feedback">Feedback</option>
                <option value="bug">Report a Bug</option>
                <option value="other">Other</option>
              </CustomSelect>
            </div>
            <div className="form-group">
              <label>Message *</label>
              <textarea value={form.message} onChange={set('message')} placeholder="How can we help you?" rows={5} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading
                ? <><Loader2 size={14} className="spin" /> Sending…</>
                : <><Send size={14} /> Send Message</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
