import React, { useState } from 'react';
import { useApp, type Report } from '../context/AppContext';
import { getUserInitials, getUserNameFromEmail } from '../services/auth/auth.helpers';
import {
  Home,
  Globe,
  Clock,
  GitCompare,
  Sparkles,
  FolderGit,
  Settings,
  HelpCircle,
  Plus,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    reports,
    setCurrentReport,
    user,
    setProfileTab
  } = useApp();

  const [showPinCallout, setShowPinCallout] = useState(true);
  const [siteFilter, setSiteFilter] = useState('');

  // Primary GitHub navigation items
  const mainNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'analyze', label: 'Check a website', icon: Globe },
    { id: 'reports', label: 'Recent scans', icon: Clock },
    { id: 'comparisons', label: 'Compare websites', icon: GitCompare },
    { id: 'recommendations', label: 'Fixes', icon: Sparkles }
  ];

  // Workspace items
  const workspaceItems = [
    { id: 'projects', label: 'Projects', icon: FolderGit },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Help', icon: HelpCircle }
  ];

  // Distinct recent websites from reports (like GitHub Top Repositories)
  const uniqueSites: Report[] = [];
  const seenUrls = new Set<string>();
  for (const r of reports) {
    const cleanUrl = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      uniqueSites.push(r);
    }
  }

  const filteredSites = uniqueSites.filter((r) =>
    r.url.toLowerCase().includes(siteFilter.toLowerCase())
  );

  const handleOpenReport = (report: Report) => {
    setCurrentReport(report);
    setCurrentTab('results');
  };

  const userName = user?.name || getUserNameFromEmail(user?.email || 'Akash-314');

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            src="/favicon.svg"
            alt="PerfLens"
            style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
          />
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => setCurrentTab('dashboard')}
          >
            PerfLens
          </span>
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle Sidebar"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation Body */}
      <nav className="sidebar-nav">
        {/* Main Section */}
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
              title={item.label}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </div>
          );
        })}

        {/* GitHub "Pin your homepage" subtle callout card */}
        {!sidebarCollapsed && showPinCallout && (
          <div
            style={{
              margin: '12px 0 8px 0',
              padding: '12px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Pin your homepage
                </span>
                <span className="badge badge-info" style={{ fontSize: '10px', padding: '0 5px' }}>
                  New
                </span>
              </div>
              <button
                onClick={() => setShowPinCallout(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-fg-subtle)', cursor: 'pointer', padding: 0 }}
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-fg-muted)', lineHeight: '1.4', margin: '4px 0 10px 0' }}>
              Choose whether PerfLens opens to Home or Check Website. Select the pin next to either one.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '3px 10px' }}
              onClick={() => setShowPinCallout(false)}
            >
              Got it
            </button>
          </div>
        )}

        {/* Your Websites Section (GitHub "Top repositories" pattern) */}
        {!sidebarCollapsed && (
          <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border-default)', paddingTop: '12px' }}>
            <div className="sidebar-section-title">
              <span>Your websites</span>
              <button
                onClick={() => setCurrentTab('analyze')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-fg-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
                title="Check a new website"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Compact Search Filter for Websites */}
            {uniqueSites.length > 4 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--color-canvas-default)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  margin: '4px 0 8px 0'
                }}
              >
                <Search size={11} style={{ color: 'var(--color-fg-subtle)' }} />
                <input
                  type="text"
                  placeholder="Find a website..."
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '11.5px',
                    color: 'var(--color-fg-default)',
                    width: '100%'
                  }}
                />
              </div>
            )}

            {/* List of Websites */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredSites.slice(0, 7).map((r) => {
                const domain = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const score = r.scores?.overall ?? 0;
                const scoreClass = score >= 90 ? 'badge-green' : score >= 70 ? 'badge-yellow' : 'badge-red';
                return (
                  <div
                    key={r.id || r.url}
                    onClick={() => handleOpenReport(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      color: 'var(--color-fg-default)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-surface-secondary)',
                          border: '1px solid var(--color-border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9.5px',
                          fontWeight: 600,
                          color: 'var(--color-accent-fg)',
                          flexShrink: 0
                        }}
                      >
                        {domain[0].toUpperCase()}
                      </div>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--color-fg-default)',
                          fontSize: '12px'
                        }}
                        title={domain}
                      >
                        {domain}
                      </span>
                    </div>
                    <span className={`badge ${scoreClass}`} style={{ fontSize: '10px', padding: '0 4px', fontWeight: 600 }}>
                      {score}
                    </span>
                  </div>
                );
              })}

              {uniqueSites.length === 0 && (
                <div style={{ padding: '8px', fontSize: '12px', color: 'var(--color-fg-subtle)' }}>
                  No websites checked yet.
                </div>
              )}

              {uniqueSites.length > 7 && (
                <div
                  onClick={() => setCurrentTab('reports')}
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--color-accent-fg)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    marginTop: '2px'
                  }}
                >
                  Show more ({uniqueSites.length - 7})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workspace Section */}
        {!sidebarCollapsed && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border-default)', paddingTop: '12px' }}>
            <div className="sidebar-section-title">
              <span>Workspace</span>
            </div>
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentTab(item.id)}
                  title={item.label}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer Profile Block */}
      <div
        className="sidebar-footer"
        onClick={() => {
          setProfileTab('account');
          setCurrentTab('settings');
        }}
        title="View Profile & Settings"
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-accent-fg)',
            flexShrink: 0
          }}
        >
          {getUserInitials(userName)}
        </div>
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-fg-default)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-fg-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {user?.email || 'Guest User'}
            </span>
          </div>
        )}
        {!sidebarCollapsed && <ChevronRight size={14} style={{ color: 'var(--color-fg-subtle)' }} />}
      </div>
    </aside>
  );
};
