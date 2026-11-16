import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Menu,
  Sparkles,
  GitCompare,
  AlertCircle,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Globe,
  FolderGit,
  Sliders
} from 'lucide-react';
import { getUserInitials, getUserNameFromEmail } from '../services/auth/auth.helpers';

export const TopNav: React.FC = () => {
  const {
    setGlobalSearchOpen,
    currentTab,
    setCurrentTab,
    user,
    logout,
    setProfileTab,
    sidebarCollapsed,
    setSidebarCollapsed
  } = useApp();

  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile]);

  const userName = user?.name || getUserNameFromEmail(user?.email || 'Akash-314');
  const userHandle = user?.email ? user.email.split('@')[0] : 'Akash-314';

  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'analyze':
        return 'Check a website';
      case 'results':
        return 'Scan results';
      case 'recommendations':
        return 'Fixes';
      case 'comparisons':
        return 'Compare websites';
      case 'reports':
      case 'history':
        return 'Recent scans';
      case 'projects':
        return 'Projects';
      case 'settings':
        return 'Settings';
      case 'support':
        return 'Help';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="top-nav">
      {/* Left: Hamburger menu, Logo & Breadcrumb */}
      <div className="top-nav-left">
        <button
          className="gh-icon-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/favicon.svg"
            alt="PerfLens"
            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            onClick={() => setCurrentTab('dashboard')}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-fg-default)',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentTab('dashboard')}
          >
            PerfLens
          </span>
          <span style={{ color: 'var(--color-border-strong)', fontSize: '14px' }}>/</span>
          <span style={{ fontSize: '14px', color: 'var(--color-fg-muted)', fontWeight: 400 }}>
            {getBreadcrumb()}
          </span>
        </div>
      </div>

      {/* Center/Right: GitHub-style search, action icons, user dropdown */}
      <div className="top-nav-right">
        {/* GitHub search trigger */}
        <div
          className="gh-search-input"
          onClick={() => setGlobalSearchOpen(true)}
          title="Search or jump to... (/) or (⌘K)"
        >
          <Search size={14} style={{ color: 'var(--color-fg-muted)' }} />
          <span>Type <span style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}>/</span> to search</span>
          <span className="gh-kbd-shortcut">/</span>
        </div>

        {/* Action icons like GitHub Dashboard */}
        <button
          className="gh-icon-btn"
          onClick={() => setCurrentTab('recommendations')}
          title="Fixes & Issues"
          aria-label="Fixes & Issues"
        >
          <AlertCircle size={15} />
        </button>

        <button
          className="gh-icon-btn"
          onClick={() => setCurrentTab('comparisons')}
          title="Compare Websites"
          aria-label="Compare Websites"
        >
          <GitCompare size={15} />
        </button>

        <button
          className="gh-icon-btn"
          onClick={() => {
            setProfileTab('ai');
            setCurrentTab('settings');
          }}
          title="AI Assistant & Explainer"
          aria-label="AI Assistant"
        >
          <Sparkles size={15} style={{ color: 'var(--color-purple-fg)' }} />
        </button>

        <button
          className="gh-icon-btn"
          onClick={() => setCurrentTab('reports')}
          title="Recent Activity & Notifications"
          aria-label="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={15} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--color-accent-fg)',
              borderRadius: '50%'
            }}
          />
        </button>

        {/* User profile avatar & dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            onClick={() => setShowProfile(!showProfile)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-accent-fg)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            title={`${userName} (${user?.email || 'Signed in'})`}
          >
            {getUserInitials(userName)}
          </div>

          {/* GitHub-style dropdown */}
          {showProfile && (
            <div className="gh-dropdown" style={{ width: '250px' }}>
              {/* Profile Header */}
              <div className="gh-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface-secondary)',
                      border: '1px solid var(--color-border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-accent-fg)'
                    }}
                  >
                    {getUserInitials(userName)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-fg-default)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userHandle}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userName}
                    </div>
                  </div>
                </div>

                {/* Status pill (like GitHub Focusing pill) */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '2em',
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border-default)',
                    fontSize: '11px',
                    color: 'var(--color-fg-muted)',
                    marginTop: '10px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success-fg)' }} />
                  <span>Ready to inspect</span>
                </div>
              </div>

              <div className="gh-dropdown-divider" />

              {/* Navigation items */}
              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setProfileTab('account');
                  setCurrentTab('settings');
                  setShowProfile(false);
                }}
              >
                <Sliders size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Your profile</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('reports');
                  setShowProfile(false);
                }}
              >
                <Globe size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Your websites</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('recommendations');
                  setShowProfile(false);
                }}
              >
                <AlertCircle size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Fixes & Issues</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('comparisons');
                  setShowProfile(false);
                }}
              >
                <GitCompare size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Compare websites</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('projects');
                  setShowProfile(false);
                }}
              >
                <FolderGit size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Your projects</span>
              </div>

              <div className="gh-dropdown-divider" />

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('settings');
                  setShowProfile(false);
                }}
              >
                <Settings size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Settings</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setProfileTab('ai');
                  setCurrentTab('settings');
                  setShowProfile(false);
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--color-purple-fg)' }} />
                <span style={{ flex: 1 }}>AI Explainer</span>
                <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 5px' }}>Copilot</span>
              </div>

              <div
                className="gh-dropdown-item"
                onClick={() => {
                  setCurrentTab('support');
                  setShowProfile(false);
                }}
              >
                <HelpCircle size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Help & Documentation</span>
              </div>

              <div className="gh-dropdown-divider" />

              <div
                className="gh-dropdown-item danger"
                onClick={() => {
                  logout();
                  setShowProfile(false);
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
