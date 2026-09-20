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
  Sparkles
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { getUserNameFromEmail } from '../services/auth/auth.helpers';
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

  const tabs: Array<{ id: 'account' | 'ai' | 'scanning' | 'advanced'; label: string; icon: any }> = [
    { id: 'account', label: 'Account Profile', icon: User },
    { id: 'ai', label: 'AI Configuration', icon: Sparkles },
    { id: 'scanning', label: 'Scanning Engine', icon: ShieldCheck },
    { id: 'advanced', label: 'Advanced & System', icon: Server }
  ];

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Profile & Account Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
          Manage your account credentials, AI provider configuration, scanning engine parameters, and diagnostic tools.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '12px',
          marginBottom: '24px',
          overflowX: 'auto'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = profileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProfileTab(tab.id)}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                gap: '6px',
                fontSize: '12.5px',
                padding: '7px 14px',
                fontWeight: isActive ? 600 : 500
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'inherit' : tab.id === 'ai' ? '#a855f7' : 'inherit' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Tab 1: Account Profile */}
        {profileTab === 'account' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Account Profile</h3>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.name || (user?.email ? getUserNameFromEmail(user.email) : 'Guest User')}
                  readOnly
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.email || 'Not Signed In'}
                  readOnly
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-muted)' }}>Authentication Status:</span>
                <span className="metric-pill metric-score-green" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                  {user?.role === 'admin' ? 'Administrator' : isAuthenticated ? 'Active Member' : 'Guest Session'}
                </span>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={logout}
                  style={{ color: 'var(--color-danger)', gap: '6px' }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: AI Configuration */}
        {profileTab === 'ai' && (
          <div id="ai-configuration">
            <AIConfigurationSection />
          </div>
        )}

        {/* Tab 3: Scanning Engine Architecture */}
        {profileTab === 'scanning' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Scanning Engine Specifications</h3>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
              PerfLens executes deterministic performance, accessibility, and SEO audits directly against target endpoints without heuristic approximations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Google Lighthouse</span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: '1.4', display: 'block' }}>
                  Lab Core Web Vitals telemetry (LCP, TBT, CLS, FCP) and performance scoring.
                </span>
              </div>

              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Puppeteer Engine</span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: '1.4', display: 'block' }}>
                  Headless browser DOM traversal, asset payload inspections, and resource waterfalls.
                </span>
              </div>

              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Evidence Gate</span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: '1.4', display: 'block' }}>
                  Strict mathematical proof gate: AI Explainer is strictly isolated to explain verified evidence.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Advanced & System Diagnostics */}
        {profileTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>API & Backend Diagnostics</h3>
              </div>

              <div className="grid-cols-2">
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Backend Service Endpoint</span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', marginTop: '4px', color: 'var(--color-text-primary)' }}>
                    {API_BASE}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Client Environment</span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', marginTop: '4px', color: 'var(--color-text-primary)' }}>
                    {import.meta.env.MODE || 'production'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Session Storage & Data Synchronization</h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                  <span>Loaded in session: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{reports.length} report(s)</strong>
                  <span>, </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{projects.length} project(s)</strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleClearCache}
                    style={{ fontSize: '12px' }}
                  >
                    Clear Session Cache
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleRefreshData}
                    disabled={isRefreshing}
                    style={{ gap: '6px', fontSize: '12px' }}
                  >
                    <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
                    <span>Sync Server Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
