import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ArrowRight, CheckCircle2, Loader2, Info, ChevronDown, ChevronUp, Activity } from 'lucide-react';

const STEP_MICROCOPY: Record<number, string> = {
  1: 'Connecting to your server and checking initial response...',
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
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      startAnalysis(urlInput.trim(), includeLighthouse);
    }
  };

  // Autoscroll logs box when scanning is running
  useEffect(() => {
    if (showTechnicalLogs) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs, showTechnicalLogs]);

  const isScanning = scanningUrl.length > 0;
  const activeStep = scanProgress.find((s) => s.status === 'scanning');

  return (
    <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '24px' }}>
      {!isScanning ? (
        <div style={{ maxWidth: '580px', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.12))',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-cyan)',
              margin: '0 auto 20px auto'
            }}
          >
            <Globe size={28} />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px', letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            Let's check your website
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
            Paste your URL and we'll look for speed, accessibility, SEO, and technical problems.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '8px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              marginBottom: '20px'
            }}
          >
            <input
              type="text"
              placeholder="e.g. mywebsite.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                color: 'var(--color-text-primary)',
                paddingLeft: '14px',
                fontFamily: 'var(--font-sans)'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 600 }}>
              <span>Check my website</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Secondary lighthouse option with tooltip */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <input 
              type="checkbox" 
              id="includeLighthouse" 
              checked={includeLighthouse} 
              onChange={(e) => setIncludeLighthouse(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)', cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="includeLighthouse" style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Include detailed Lighthouse checks</span>
              <span title="Adds Google's Lighthouse performance signals to the scan." style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-muted)' }}>
                <Info size={14} />
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '640px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '6px 14px', borderRadius: '20px', marginBottom: '12px' }}>
              <span className="spin" style={{ display: 'inline-flex', color: 'var(--color-accent-cyan)' }}>
                <Loader2 size={14} />
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent-cyan)' }}>
                Checking your website
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
              {scanningUrl.replace(/^https?:\/\//, '')}
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
              {activeStep ? STEP_MICROCOPY[activeStep.step] || 'Inspecting page signals...' : 'Analyzing scan signals...'}
            </p>
          </div>

          {/* Stepper Status Indicators */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {scanProgress.map((step) => {
                const isCurrent = step.status === 'scanning';
                const isDone = step.status === 'done';
                return (
                  <div
                    key={step.step}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'var(--color-surface-secondary)' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isDone ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                      ) : isCurrent ? (
                        <Loader2 size={18} className="spin" style={{ color: 'var(--color-accent-cyan)', flexShrink: 0 }} />
                      ) : (
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '1.5px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface-secondary)',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                          color: isCurrent
                            ? 'var(--color-text-primary)'
                            : isDone
                            ? 'var(--color-text-primary)'
                            : 'var(--color-muted)'
                        }}
                      >
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-accent-cyan)',
                            backgroundColor: 'rgba(6, 182, 212, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}
                        >
                          Checking now
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '30px', marginTop: '2px' }}>
                        {STEP_MICROCOPY[step.step]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progressive Technical Details Drawer */}
          <div className="card" style={{ padding: '14px 18px', borderRadius: 'var(--radius-lg)' }}>
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
                color: 'var(--color-text-secondary)',
                fontSize: '12.5px',
                fontWeight: 600,
                padding: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} style={{ color: 'var(--color-accent-cyan)' }} />
                <span>Live scan activity ({scanLogs.length} events)</span>
              </div>
              {showTechnicalLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTechnicalLogs && (
              <div style={{ marginTop: '14px' }}>
                <div className="scan-log-box" style={{ maxHeight: '180px' }}>
                  {scanLogs.length === 0 ? (
                    <div style={{ color: 'var(--color-muted)', padding: '8px 0', fontSize: '12px' }}>
                      Establishing connection to scanner node...
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

