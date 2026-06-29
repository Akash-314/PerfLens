import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sliders, ShieldAlert, KeyRound, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const { addToast } = useApp();
  const [userAgent, setUserAgent] = useState('mobile');
  const [throttling, setThrottling] = useState('slow-3g');
  const [apiKey] = useState('pl_live_948a37f02d99d817bca889ffc71a39d2');
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://api.perflens.com/webhooks/v1');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Scanner diagnostics settings saved successfully.', 'success');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    addToast('API Key copied to clipboard.', 'success');
  };

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Developer Settings</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Configure automated crawlers, throttling simulators, and integrations.</p>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Crawler configuration */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Crawler Simulation Parameters</h3>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">User Agent Simulation</label>
              <select
                className="form-input"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <option value="mobile">Chrome Light Mobile (Android)</option>
                <option value="desktop">Chrome Desktop (macOS)</option>
                <option value="googlebot">Googlebot Smartphone (Mobile crawler)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Network Link Throttling</label>
              <select
                className="form-input"
                value={throttling}
                onChange={(e) => setThrottling(e.target.value)}
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <option value="broadband">Broadband Throttling (Offline deactivated)</option>
                <option value="fast-3g">Simulate Fast 3G Link (1.6 Mbps latency)</option>
                <option value="slow-3g">Simulate Slow 3G Link (780 Kbps latency)</option>
                <option value="4g">Simulate Mobile 4G Link (4.0 Mbps latency)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Integrations API keys */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>CI/CD Pipeline API Access</h3>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Use your personal access credentials to execute audits from your deployment pipelines (e.g. GitHub Actions, Vercel Integrations, or local CLI builders).
          </p>

          <div className="form-group">
            <label className="form-label">Active Private Key</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                value={apiKey}
                readOnly
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowKey(!showKey)}
                style={{ fontSize: '12px' }}
              >
                {showKey ? 'Hide' : 'Reveal'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyKey}
                style={{ fontSize: '12px' }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trigger webhook URL endpoints on completed PR audit</label>
            <input
              type="text"
              className="form-input"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="e.g. https://api.yoursite.com/perf-webhook"
            />
          </div>
        </div>

        {/* Section 3: Safe security headers */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.02)' }}>
          <ShieldAlert size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
            PerfLens crawler automatically honors <code>robots.txt</code> instructions unless custom bypass headers are configured. Web domains under local VPN networks require open tunnels.
          </p>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
            <Save size={14} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
