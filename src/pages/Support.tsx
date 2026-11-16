import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, MessageSquare, ExternalLink, BookOpen, Send, CheckCircle2 } from 'lucide-react';

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
    <div className="workspace-container fade-in" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--color-border-default)', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-fg-default)' }}>
          Help & Support
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
          Have a question about a scan result or need help understanding a performance fix? Get in touch with our team.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        {/* Support Request Form */}
        <div>
          <form onSubmit={handleSubmitTicket} className="gh-box" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={14} style={{ color: 'var(--color-accent-fg)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Submit an issue or feedback
                </span>
              </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. How do I fix Cumulative Layout Shift (CLS)?"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description or website URL</label>
                <textarea
                  className="form-input"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={6}
                  placeholder="Describe what you are trying to optimize, paste your website URL, or provide any error messages..."
                  style={{ height: 'auto', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                  <Send size={13} />
                  <span>Send message</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Documentation & Resources Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="gh-box" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Developer Guides
                </span>
              </div>
            </div>

            <div>
              <a
                href="https://web.dev/vitals/"
                target="_blank"
                rel="noopener noreferrer"
                className="gh-box-row"
                style={{ textDecoration: 'none', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--color-accent-fg)' }}>
                    Core Web Vitals Guide
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Google LCP, CLS, and INP metrics
                  </div>
                </div>
                <ExternalLink size={12} style={{ color: 'var(--color-fg-subtle)' }} />
              </a>

              <a
                href="https://github.com/google/lighthouse"
                target="_blank"
                rel="noopener noreferrer"
                className="gh-box-row"
                style={{ textDecoration: 'none', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--color-accent-fg)' }}>
                    Google Lighthouse
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Automated auditing criteria
                  </div>
                </div>
                <ExternalLink size={12} style={{ color: 'var(--color-fg-subtle)' }} />
              </a>

              <a
                href="https://web.dev/fast/"
                target="_blank"
                rel="noopener noreferrer"
                className="gh-box-row"
                style={{ textDecoration: 'none', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--color-accent-fg)' }}>
                    Fast Load Times
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Modern asset delivery best practices
                  </div>
                </div>
                <ExternalLink size={12} style={{ color: 'var(--color-fg-subtle)' }} />
              </a>
            </div>
          </div>

          <div className="gh-box">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Mail size={15} style={{ color: 'var(--color-success-fg)' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Email Support
                </div>
                <a
                  href="mailto:support@perflens.com"
                  style={{ fontSize: '12px', color: 'var(--color-accent-fg)', textDecoration: 'none' }}
                >
                  support@perflens.com
                </a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '11px', color: 'var(--color-fg-subtle)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--color-success-fg)' }} />
              <span>Typical response time: under 24 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
