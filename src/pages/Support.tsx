import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, MessageSquare, Terminal, FileText, Send } from 'lucide-react';

export const Support: React.FC = () => {
  const { addToast } = useApp();
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !msg.trim()) {
      addToast('Please fill in the subject and message so we can help.', 'warning');
      return;
    }
    addToast('Message received! We will be in touch soon to help you out.', 'success');
    setSubject('');
    setMsg('');
  };

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Help & Guidance</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Have a question about your scan or need help understanding a fix? We are here to help.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Support Request Form */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSubmitTicket} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: 'var(--color-accent)' }} />
              <span>Ask a Question or Send Feedback</span>
            </h3>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>What can we help you with?</label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. How do I fix my main content load time?"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Details or question</label>
              <textarea
                className="form-input"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={5}
                placeholder="Tell us what you're trying to do, or paste your website URL..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
              <Send size={13} />
              <span>Send Message</span>
            </button>
          </form>
        </div>

        {/* Documentation Links */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={15} style={{ color: 'var(--color-accent)' }} />
              <span>Helpful Guides</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <a href="https://web.dev/vitals/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
                <span>Understanding Web Vitals</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
              <a href="https://github.com/google/lighthouse" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
                <span>Google Lighthouse Checks</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
              <a href="https://web.dev/fast/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
                <span>Making Websites Faster</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRadius: 'var(--radius-xl)' }}>
            <Mail size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Reach Out Directly</p>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>support@perflens.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
