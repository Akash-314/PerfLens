import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, User, Play } from 'lucide-react';
import { getUserNameFromEmail } from '../services/auth/auth.helpers';

export const TopNav: React.FC = () => {
  const { setGlobalSearchOpen, startAnalysis, currentTab, user, logout, setCurrentTab, setProfileTab } = useApp();
  const [quickUrl, setQuickUrl] = useState('');
  const [showProfile, setShowProfile] = useState(false);

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
        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setShowProfile(!showProfile)}
            aria-label="User profile"
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
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || getUserNameFromEmail(user?.email || '')}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {user?.email}
                </span>
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
                  style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => {
                    setProfileTab('account');
                    setCurrentTab('settings');
                    setShowProfile(false);
                  }}
                >
                  Account Profile
                </div>
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer', color: '#a855f7' }}
                  onClick={() => {
                    setProfileTab('ai');
                    setCurrentTab('settings');
                    setShowProfile(false);
                  }}
                >
                  ✦ AI Configuration
                </div>
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => {
                    setProfileTab('scanning');
                    setCurrentTab('settings');
                    setShowProfile(false);
                  }}
                >
                  Scanning Specifications
                </div>
                <div
                  className="command-item"
                  style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-danger)', cursor: 'pointer' }}
                  onClick={() => {
                    logout();
                    setShowProfile(false);
                  }}
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
