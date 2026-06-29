import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ArrowRight, CheckCircle2, Loader2, Terminal } from 'lucide-react';

export const WebsiteAnalysis: React.FC = () => {
  const { startAnalysis, scanningUrl, scanProgress, scanLogs } = useApp();
  const [urlInput, setUrlInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      startAnalysis(urlInput.trim());
    }
  };

  // Autoscroll logs box when scanning is running
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scanLogs]);

  const isScanning = scanningUrl.length > 0;

  return (
    <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
      {!isScanning ? (
        <div style={{ maxWidth: '540px', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              margin: '0 auto 24px auto'
            }}
          >
            <Globe size={24} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Run Website Performance Audit
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: '1.5' }}>
            Inspect core performance metrics, unused CSS styles, bundle duplicates, compression statuses, and accessibility parameters for any public host.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '6px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          >
            <input
              type="text"
              placeholder="e.g. stripe.com or github.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                paddingLeft: '12px',
                fontFamily: 'var(--font-sans)'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <span>Analyze URL</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ maxWidth: '640px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
              Auditing <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{scanningUrl}</span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Running server-crawled virtual lighthouse checks.</p>
          </div>

          {/* Stepper Status Indicators */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {scanProgress.map((step) => (
                <div key={step.step} style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', gap: '12px' }}>
                  {step.status === 'done' ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  ) : step.status === 'scanning' ? (
                    <Loader2 size={16} className="spin" style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  ) : (
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface-secondary)',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: step.status === 'scanning' ? 600 : 400,
                      color:
                        step.status === 'pending'
                          ? 'var(--color-muted)'
                          : 'var(--color-text-primary)'
                    }}
                  >
                    {step.title}
                  </span>
                  {step.status === 'scanning' && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: 'var(--color-accent)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Console Logger box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Terminal size={12} />
              <span>Inspector Stream Log</span>
            </div>
            <div className="scan-log-box">
              {scanLogs.length === 0 ? (
                <div style={{ color: 'var(--color-muted)', padding: '12px 0' }}>Establishing socket connection to telemetry node...</div>
              ) : (
                scanLogs.map((log, idx) => (
                  <div key={idx} className="scan-log-line">
                    <span className="scan-log-time">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                    <span className="scan-log-message">{log}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Spinner Custom Rotation CSS injected inside inline tag for quick helper */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
