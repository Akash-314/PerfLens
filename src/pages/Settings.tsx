import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Server,
  Database,
  RefreshCw,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { getUserNameFromEmail, getUserInitials } from '../services/auth/auth.helpers';
import { AIConfigurationSection } from '../components/ai/AIConfigurationSection';

export const Settings: React.FC = () => {
  const {
    user,
    isAuthenticated,
    logout,
    fetchData,
    addToast,
    reports,
    projects,
    profileTab,
    setProfileTab
  } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      addToast('Application data refreshed from server.', 'success');
    } catch {
      addToast('Failed to refresh data from server.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    addToast('Client session cache cleared successfully.', 'info');
  };

  const navItems = [
    { id: 'account', label: 'Public profile', icon: User },
    { id: 'ai', label: 'AI & Copilot', icon: Sparkles, badge: 'AI' },
    { id: 'scanning', label: 'Scanning options', icon: ShieldCheck },
    { id: 'advanced', label: 'Advanced & API', icon: Server }
  ];

  const userName = user?.name || (user?.email ? getUserNameFromEmail(user.email) : 'Akash-314');

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
          Personal settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
          Manage your account profile, AI preferences, scanning configurations, and diagnostics.
        </p>
      </div>

      {/* GitHub Settings Layout: Left Sub-navigation + Right Form Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Sub-nav Column */}
        <div className="gh-box" style={{ padding: '8px' }}>
          <div style={{ padding: '8px 10px 12px 10px', borderBottom: '1px solid var(--color-border-default)', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-accent-fg)'
                }}
              >
                {getUserInitials(userName)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Your personal account
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = profileTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setProfileTab(item.id as any)}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="badge badge-purple" style={{ fontSize: '10px', padding: '0 5px' }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Form Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Section 1: Account Profile */}
          {profileTab === 'account' && (
            <div className="gh-box">
              <div className="gh-box-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--color-border-default)', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    Public profile
                  </h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Information visible in reports and team projects.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userName}
                    readOnly
                    style={{ backgroundColor: 'var(--color-canvas-subtle)', color: 'var(--color-fg-default)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={user?.email || 'Not Signed In'}
                    readOnly
                    style={{ backgroundColor: 'var(--color-canvas-subtle)', color: 'var(--color-fg-default)' }}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--color-fg-subtle)' }}>
                    Primary email for notifications and audit updates.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-default)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--color-fg-muted)' }}>Account tier:</span>
                    <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                      {user?.role === 'admin' ? 'Administrator' : isAuthenticated ? 'Active Member' : 'Guest Session'}
                    </span>
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={logout}
                    >
                      <LogOut size={13} />
                      <span>Sign out</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: AI Settings */}
          {profileTab === 'ai' && (
            <div id="ai-configuration">
              <AIConfigurationSection />
            </div>
          )}

          {/* Section 3: Scanning Options */}
          {profileTab === 'scanning' && (
            <div className="gh-box">
              <div className="gh-box-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--color-border-default)', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    Scanning specifications
                  </h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    How PerfLens inspects web pages for speed, accessibility, and SEO.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-canvas-subtle)', border: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-success-fg)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>Google Lighthouse</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)', lineHeight: '1.4', display: 'block' }}>
                    Standardized metrics including LCP, CLS, and Total Blocking Time.
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-canvas-subtle)', border: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-success-fg)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>Browser Scanner</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)', lineHeight: '1.4', display: 'block' }}>
                    Headless Chrome evaluates DOM trees, network waterfalls, and assets.
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-canvas-subtle)', border: '1px solid var(--color-border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-success-fg)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>Evidence Checks</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)', lineHeight: '1.4', display: 'block' }}>
                    Every finding is verified against actual DOM telemetry before display.
                  </span>
                </div>
              </div>

              {/* Behind the scenes drawer */}
              <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    cursor: 'pointer',
                    padding: '4px 0',
                    color: 'var(--color-fg-muted)',
                    fontSize: '12.5px',
                    fontWeight: 500
                  }}
                >
                  <span>How does this work behind the scenes?</span>
                  {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showHowItWorks && (
                  <div style={{ marginTop: '10px', padding: '12px 14px', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-fg-muted)', margin: 0, lineHeight: '1.6' }}>
                      PerfLens crawls the target URL using a headless browser engine, captures asset waterfalls, evaluates DOM element structures, checks accessibility contracts (ARIA, contrast), and queries Google Lighthouse APIs. Findings are verified against evidence tokens before generating human-friendly fixes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Advanced */}
          {profileTab === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="gh-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Server size={15} style={{ color: 'var(--color-accent-fg)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    API gateway & environment
                  </h3>
                </div>

                <div className="grid-cols-2">
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-fg-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>Endpoint Base</span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginTop: '2px', color: 'var(--color-fg-default)' }}>
                      {API_BASE}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-fg-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>Client Environment</span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginTop: '2px', color: 'var(--color-fg-default)' }}>
                      {import.meta.env.MODE || 'production'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="gh-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Database size={15} style={{ color: 'var(--color-accent-fg)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    Session storage & synchronization
                  </h3>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>
                    <span>Loaded in session: </span>
                    <strong style={{ color: 'var(--color-fg-default)' }}>{reports.length} report(s)</strong>
                    <span>, </span>
                    <strong style={{ color: 'var(--color-fg-default)' }}>{projects.length} project(s)</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearCache}
                    >
                      Clear session cache
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      style={{ gap: '6px' }}
                    >
                      <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
                      <span>Sync server data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
