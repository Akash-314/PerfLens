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
      addToast('Please complete all form descriptors.', 'warning');
      return;
    }
    addToast('Developer support ticket received. Our team will contact you.', 'success');
    setSubject('');
    setMsg('');
  };

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Developer Support & Docs</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Get direct technical guidance, open tickets, or explore performance guidelines.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Support Request Form */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSubmitTicket} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: 'var(--color-accent)' }} />
              <span>Submit Debug Request</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Subject / Issue Area</label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Image optimization analyzer timeout"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Console Errors / Details</label>
              <textarea
                className="form-input"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={5}
                placeholder="Paste logs or steps to reproduce..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
              <Send size={13} />
              <span>Send Ticket</span>
            </button>
          </form>
        </div>

        {/* Documentation Links */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={15} style={{ color: 'var(--color-accent)' }} />
              <span>Quick References</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <a href="https://web.dev/vitals/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Core Web Vitals Guide</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
              <a href="https://github.com/google/lighthouse" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Lighthouse Audits Engine</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
              <a href="https://web.dev/fast/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Frontend Speed Best Practices</span>
                <Terminal size={12} style={{ color: 'var(--color-muted)' }} />
              </a>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Mail size={16} style={{ color: 'var(--color-success)' }} />
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Direct Developer Contact</p>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>support@perflens.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
