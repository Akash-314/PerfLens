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
  ChevronUp,
  AlertTriangle
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

  const tabs: Array<{ id: 'account' | 'ai' | 'scanning' | 'advanced'; label: string; icon: any }> = [
    { id: 'account', label: 'Profile', icon: User },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'scanning', label: 'Scanning', icon: ShieldCheck },
    { id: 'advanced', label: 'Advanced', icon: Server }
  ];

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Manage your profile, AI preferences, and scanning options.
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
                fontSize: '13px',
                padding: '8px 16px',
                fontWeight: isActive ? 600 : 500,
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'inherit' : tab.id === 'ai' ? '#c084fc' : 'inherit' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Tab 1: Profile */}
        {profileTab === 'account' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} style={{ color: 'var(--color-accent-cyan)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Your Profile</h3>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.name || (user?.email ? getUserNameFromEmail(user.email) : 'Guest User')}
                  readOnly
                  style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Email Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.email || 'Not Signed In'}
                  readOnly
                  style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <span className="metric-pill metric-score-green" style={{ fontSize: '11.5px', textTransform: 'capitalize' }}>
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
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: AI */}
        {profileTab === 'ai' && (
          <div id="ai-configuration">
            <AIConfigurationSection />
          </div>
        )}

        {/* Tab 3: Scanning */}
        {profileTab === 'scanning' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>How PerfLens checks your website</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Three layers of checks inspect your page from speed to search readiness.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Google Lighthouse</span>
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5', display: 'block' }}>
                  Measures important page performance signals like LCP, CLS, and Total Blocking Time.
                </span>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Browser Scanner</span>
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5', display: 'block' }}>
                  Checks your page as a real browser would, looking for heavy scripts, images, and layout jumps.
                </span>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Evidence Checks</span>
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5', display: 'block' }}>
                  Makes sure all recommendations are strictly backed by real scan data before showing them.
                </span>
              </div>
            </div>

            {/* Progressive disclosure: How does this work? */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
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
                  color: 'var(--color-text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                <span>How does this work behind the scenes?</span>
                {showHowItWorks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showHowItWorks && (
                <div style={{ marginTop: '10px', padding: '14px 16px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.6' }}>
                    PerfLens crawls the target URL using a headless browser engine, captures asset waterfalls, evaluates DOM element structures, checks accessibility contracts (ARIA, contrast), and queries Google Lighthouse APIs. Findings are verified against evidence tokens before generating human-friendly fixes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Advanced */}
        {profileTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Caution banner for beginners */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--color-warning)',
                fontSize: '12.5px'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Advanced setting:</strong> Only change these options if you are troubleshooting or know what they do.
              </span>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>API & Diagnostics</h3>
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

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Session Storage & Data Sync</h3>
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
