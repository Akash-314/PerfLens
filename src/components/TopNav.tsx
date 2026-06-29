import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, User, AlertCircle, Play } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { setGlobalSearchOpen, startAnalysis, currentTab } = useApp();
  const [quickUrl, setQuickUrl] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, text: 'Audit of github.com completed with score 88.', time: '2h ago', read: false },
    { id: 2, text: 'Vercel deployment check passed (96/100).', time: '1d ago', read: true },
    { id: 3, text: 'New recommendations available for stripe.com', time: '2d ago', read: true }
  ];

  const handleQuickAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      startAnalysis(quickUrl.trim());
      setQuickUrl('');
    }
  };

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button className="search-trigger" onClick={() => setGlobalSearchOpen(true)}>
          <Search size={14} />
          <span>Search or command...</span>
          <kbd className="search-shortcut">⌘K</kbd>
        </button>

        {currentTab !== 'analyze' && (
          <form
            onSubmit={handleQuickAnalyze}
            style={{ display: 'flex', gap: '8px', flex: 1, marginLeft: '16px' }}
          >
            <input
              type="text"
              placeholder="Quick scan URL (e.g. google.com)"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              className="form-input"
              style={{
                height: '32px',
                padding: '0 12px',
                fontSize: '13px',
                flex: 1,
                backgroundColor: 'var(--color-bg)'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
            >
              <Play size={10} fill="currentColor" />
              <span>Scan</span>
            </button>
          </form>
        )}
      </div>

      <div className="top-nav-right">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="sidebar-toggle-btn"
            style={{ position: 'relative' }}
            onClick={() => {
              setShowNotif(!showNotif);
              setShowProfile(false);
            }}
          >
            <Bell size={16} />
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-danger)'
              }}
            />
          </button>

          {showNotif && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '280px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 100
              }}
            >
              <div
                style={{
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-muted)',
                  borderBottom: '1px solid var(--color-border)'
                }}
              >
                Notifications
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      backgroundColor: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <AlertCircle size={14} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '12px' }}>{n.text}</p>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="sidebar-toggle-btn"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotif(false);
            }}
          >
            <User size={16} />
          </button>

          {showProfile && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '180px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '6px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 100
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: '4px'
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Developer Team
                </p>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>developer@perflens.com</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px' }}
                  onClick={() => setShowProfile(false)}
                >
                  Account Settings
                </div>
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px' }}
                  onClick={() => setShowProfile(false)}
                >
                  Usage Billing
                </div>
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-danger)' }}
                  onClick={() => setShowProfile(false)}
                >
                  Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
