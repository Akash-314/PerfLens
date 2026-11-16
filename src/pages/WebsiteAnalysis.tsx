import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Globe,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Terminal,
  Play
} from 'lucide-react';

const STEP_MICROCOPY: Record<number, string> = {
  1: 'Connecting to server and checking initial response...',
  2: 'Looking at page structure, headings, and images...',
  3: 'Checking how quickly the page becomes usable...',
  4: 'Testing readability, color contrast, and navigation structure...',
  5: 'Checking whether search engines and social previews can read your page...',
  6: 'Finding the fixes that will make the biggest difference...'
};

export const WebsiteAnalysis: React.FC = () => {
  const { startAnalysis, scanningUrl, scanProgress, scanLogs } = useApp();
  const [urlInput, setUrlInput] = useState('');
  const [includeLighthouse, setIncludeLighthouse] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deviceEmulation, setDeviceEmulation] = useState<'desktop' | 'mobile'>('desktop');
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      startAnalysis(urlInput.trim(), includeLighthouse);
    }
  };

  useEffect(() => {
    if (showTechnicalLogs) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs, showTechnicalLogs]);

  const isScanning = scanningUrl.length > 0;
  const activeStep = scanProgress.find((s) => s.status === 'scanning');
  const completedCount = scanProgress.filter((s) => s.status === 'done').length;
  const progressPercent = Math.round((completedCount / Math.max(1, scanProgress.length)) * 100);

  return (
    <div className="workspace-container fade-in" style={{ maxWidth: '780px' }}>
      {!isScanning ? (
        <div>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
              Check a website
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
              Enter a website address to find speed, accessibility, and SEO improvements.
            </p>
          </div>

          {/* GitHub-style Main Form Box */}
          <div className="gh-box">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="site-url">
                  Website URL
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Globe
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      color: 'var(--color-fg-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    id="site-url"
                    type="text"
                    placeholder="https://example.com or yourdomain.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="form-input"
                    style={{
                      paddingLeft: '34px',
                      height: '36px',
                      fontSize: '14px',
                      width: '100%'
                    }}
                    autoFocus
                  />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-fg-subtle)' }}>
                  PerfLens connects via headless browser to inspect Core Web Vitals, resources, and accessibility.
                </span>
              </div>

              {/* Scan Options */}
              <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13px',
                    color: 'var(--color-fg-default)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeLighthouse}
                    onChange={(e) => setIncludeLighthouse(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent-fg)', marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>Include Google PageSpeed & Lighthouse telemetry</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>
                      Gathers field data and standardized performance score comparisons.
                    </div>
                  </div>
                </label>
              </div>

              {/* Advanced Settings Collapsible */}
              <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    color: 'var(--color-accent-fg)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <Sliders size={13} />
                  <span>Advanced scan settings</span>
                  {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: 'var(--color-canvas-subtle)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
                    <div className="form-group">
                      <label className="form-label">Emulated device</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${deviceEmulation === 'desktop' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setDeviceEmulation('desktop')}
                        >
                          Desktop (1920x1080)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${deviceEmulation === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setDeviceEmulation('mobile')}
                        >
                          Mobile (Moto G4 4G)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-default)', paddingTop: '14px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!urlInput.trim()}
                  style={{ minWidth: '140px' }}
                >
                  <Play size={13} fill="currentColor" />
                  <span>Check website</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* GitHub-style Scan Progress Experience */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Progress Box */}
          <div className="gh-box" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="spin" style={{ color: 'var(--color-accent-fg)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    Checking {scanningUrl.replace(/^https?:\/\//, '')}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
                  {activeStep ? STEP_MICROCOPY[activeStep.step] || 'Analyzing website signals...' : 'Processing audit...'}
                </p>
              </div>

              <span className="badge badge-info" style={{ fontSize: '12px', padding: '2px 8px' }}>
                {progressPercent}% completed
              </span>
            </div>

            {/* Subtle GitHub Blue Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '20px'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: 'var(--color-accent-fg)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Step List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scanProgress.map((step) => {
                const isCurrent = step.status === 'scanning';
                const isDone = step.status === 'done';
                return (
                  <div
                    key={step.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'var(--color-surface-secondary)' : 'transparent',
                      border: isCurrent ? '1px solid var(--color-border-default)' : '1px solid transparent'
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--color-success-fg)', flexShrink: 0 }} />
                    ) : isCurrent ? (
                      <Loader2 size={16} className="spin" style={{ color: 'var(--color-accent-fg)', flexShrink: 0 }} />
                    ) : (
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: '1.5px solid var(--color-border-strong)',
                          backgroundColor: 'transparent',
                          flexShrink: 0
                        }}
                      />
                    )}

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent
                          ? 'var(--color-fg-default)'
                          : isDone
                          ? 'var(--color-fg-default)'
                          : 'var(--color-fg-subtle)'
                      }}
                    >
                      {step.title}
                    </span>

                    {isCurrent && (
                      <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '11px', padding: '0 6px' }}>
                        Running
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Terminal Logs */}
          <div className="gh-box">
            <button
              type="button"
              onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--color-fg-muted)',
                fontSize: '13px',
                fontWeight: 500,
                padding: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} style={{ color: 'var(--color-fg-muted)' }} />
                <span>Live audit telemetry ({scanLogs.length} events)</span>
              </div>
              {showTechnicalLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showTechnicalLogs && (
              <div style={{ marginTop: '12px' }}>
                <div className="scan-log-box" style={{ maxHeight: '180px', backgroundColor: 'var(--color-canvas-subtle)' }}>
                  {scanLogs.length === 0 ? (
                    <div style={{ color: 'var(--color-fg-subtle)', padding: '6px 0', fontSize: '12px' }}>
                      Initializing Puppeteer headless scanner session...
                    </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
