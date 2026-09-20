import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Zap,
  Globe,
  Image as ImageIcon,
  Code2,
  AlertTriangle,
  HelpCircle,
  Download,
  Share2,
  Network,
  Activity,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { HumanizedRecommendationCard } from '../components/HumanizedRecommendationCard';

// SVG circular Gauge component
const CircularGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const size = 90;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg style={{ transform: 'rotate(-90deg)', width: size, height: size }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}
        >
          {score}
        </div>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
};

export const ResultsPage: React.FC = () => {
  const { currentReport, setCurrentTab, addToast } = useApp();
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  if (!currentReport) {
    return (
      <div className="workspace-container" style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h3>No report selected</h3>
        <p style={{ color: 'var(--color-muted)', marginBottom: '20px' }}>Please perform a website scan first.</p>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          Go to Scan Page
        </button>
      </div>
    );
  }

  const toggleRec = (id: string) => {
    setExpandedRecs((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  // Pie chart helper for breakdown
  const pieData = [
    { name: 'Images', value: currentReport.breakdown.images.sizeKb, color: '#22C55E' },
    { name: 'JavaScript', value: currentReport.breakdown.js.sizeKb, color: '#F59E0B' },
    { name: 'CSS', value: currentReport.breakdown.css.sizeKb, color: '#A855F7' },
    { name: 'Fonts', value: currentReport.breakdown.fonts.sizeKb, color: '#EC4899' },
    { name: 'Third Party', value: currentReport.breakdown.thirdParty.sizeKb, color: '#EF4444' }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Report link copied to clipboard.', 'success');
  };

  const handleExportPdf = async () => {
    try {
      addToast('Generating PDF report...', 'info');
      const token = localStorage.getItem('perflens_token');

      if (token && currentReport.id) {
        const res = await fetch(`${API_BASE}/reports/${currentReport.id}/pdf`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `perflens-report-${currentReport.url.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
          addToast('PDF report downloaded successfully.', 'success');
          return;
        }
      }

      // Universal direct in-memory report export
      const res = await fetch(`${API_BASE}/analysis/export-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ report: currentReport })
      });

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `perflens-report-${currentReport.url.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        addToast('PDF report downloaded successfully.', 'success');
        return;
      }

      window.print();
    } catch {
      window.print();
    }
  };

  return (
    <div className="workspace-container fade-in" style={{ padding: '24px' }}>
      {/* Top Header Summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border)',
              padding: '2px 8px',
              borderRadius: '4px',
              color: 'var(--color-text-secondary)'
            }}
          >
            SCAN COMPLETED
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginTop: '8px', letterSpacing: '-0.03em' }}>
            {currentReport.url}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Diagnostics executed on {currentReport.timestamp} (Simulated Googlebot mobile crawler)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveSubTab('recommendations')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeSubTab === 'recommendations' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              fontWeight: 600
            }}
          >
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <span>✦ AI Recommendations ({currentReport.recommendations?.length || 0})</span>
          </button>
          <button className="btn btn-secondary" onClick={handleCopyLink}>
            <Share2 size={13} />
            <span>Share</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <Download size={13} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Results grid */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Sub-Tab Switcher (Sticky Layout) */}
        <div
          style={{
            width: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            position: 'sticky',
            top: '80px',
            flexShrink: 0
          }}
        >
          {[
            { id: 'overview', label: 'Overview', icon: Zap },
            { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles, badge: currentReport.recommendations?.length },
            { id: 'bundles', label: 'Bundle Analyzer', icon: Code2 },
            { id: 'images', label: 'Image Optimization', icon: ImageIcon },
            { id: 'css-js', label: 'CSS / JS Audits', icon: Code2 },
            { id: 'network', label: 'Network Waterfall', icon: Network },
            { id: 'accessibility', label: 'Accessibility', icon: HelpCircle },
            { id: 'seo', label: 'SEO & Meta', icon: Globe }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeSubTab === tab.id ? 'var(--color-surface-secondary)' : 'transparent',
                  color: activeSubTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === tab.id ? 600 : 400,
                  textAlign: 'left',
                  fontSize: '13px'
                }}
              >
                <Icon size={14} style={{ color: activeSubTab === tab.id ? 'var(--color-accent)' : 'inherit' }} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: activeSubTab === tab.id ? '#a855f7' : 'rgba(168, 85, 247, 0.15)',
                      color: activeSubTab === tab.id ? '#ffffff' : '#c084fc',
                      fontWeight: 700
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right subpage view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="flex-col">
              {/* circular gauges panel */}
              <div
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: '24px 12px',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <CircularGauge score={currentReport.scores.overall} label="Overall Score" />
                <CircularGauge score={currentReport.scores.performance} label="Performance" />
                <CircularGauge score={currentReport.scores.accessibility} label="Accessibility" />
                <CircularGauge score={currentReport.scores.seo} label="SEO & Tags" />
                <CircularGauge score={currentReport.scores.bestPractices} label="Best Practices" />
              </div>

              {/* ✦ AI Recommendations & Explanations Spotlight (Top of Overview) */}
              {currentReport.recommendations && currentReport.recommendations.length > 0 && (
                <div
                  className="card"
                  style={{
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    backgroundColor: 'rgba(168, 85, 247, 0.03)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(168, 85, 247, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Sparkles size={18} style={{ color: '#a855f7' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                          ✦ AI Recommendations & Verified Explanations
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0, marginTop: '2px' }}>
                          Verified engine findings translated into actionable developer explanations with copyable AI Fix Prompts.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubTab('recommendations')}
                      className="btn btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '6px 14px',
                        backgroundColor: 'rgba(168, 85, 247, 0.12)',
                        color: '#c084fc',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>View All {currentReport.recommendations.length} Recommendations</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Render top 3 prioritized recommendations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentReport.recommendations.slice(0, 3).map((rec) => (
                      <HumanizedRecommendationCard
                        key={rec.id}
                        rec={{ ...rec, sourceUrl: currentReport.url, scanTimestamp: currentReport.timestamp }}
                        expanded={expandedRecs[rec.id] !== undefined ? expandedRecs[rec.id] : false}
                        onToggle={() => toggleRec(rec.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 7: Core Web Vitals & Telemetry Verification sources */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="grid-cols-2">
                {/* Core Web Vitals Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Google Core Web Vitals</h3>
                  {currentReport.pageSpeed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Performance Score</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: (currentReport.pageSpeed.performance ?? 0) >= 90 ? 'var(--color-success)' : (currentReport.pageSpeed.performance ?? 0) >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                          {currentReport.pageSpeed.performance ?? 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Largest Contentful Paint (LCP)</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.lcp || 'N/A'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Cumulative Layout Shift (CLS)</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.cls || 'N/A'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Interaction to Next Paint (INP)</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.inp || 'Not measured'}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-muted)', fontSize: '13px', padding: '12px 0' }}>
                      Google Lighthouse / PageSpeed metrics were disabled or temporarily offline for this audit scan.
                    </div>
                  )}
                </div>

                {/* Analysis Sources Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Telemetry Verification</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
                      <span>PerfLens Analysis Engine</span>
                      <span className="metric-pill metric-score-green" style={{ marginLeft: 'auto', fontSize: '10px' }}>Primary</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: currentReport.analysisSources?.puppeteerRuntime ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                        {currentReport.analysisSources?.puppeteerRuntime ? '✓' : '✗'}
                      </span>
                      <span>Headless Puppeteer Crawler</span>
                      <span className="metric-pill metric-score-green" style={{ marginLeft: 'auto', fontSize: '10px' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: currentReport.pageSpeed ? 'var(--color-success)' : 'var(--color-muted)', fontWeight: 'bold' }}>
                        {currentReport.pageSpeed ? '✓' : '✗'}
                      </span>
                      <span style={{ color: currentReport.pageSpeed ? 'var(--color-text-primary)' : 'var(--color-muted)' }}>Google Lighthouse Insights</span>
                      <span className={currentReport.pageSpeed ? "metric-pill metric-score-green" : "metric-pill"} style={{ marginLeft: 'auto', fontSize: '10px', backgroundColor: !currentReport.pageSpeed ? 'var(--color-surface-secondary)' : undefined }}>
                        {currentReport.pageSpeed ? 'Linked' : 'Unavailable'}
                      </span>
                    </div>

                    <div style={{ marginTop: 'auto', padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', fontSize: '12px', textAlign: 'center' }}>
                      {currentReport.pageSpeed ? (
                        <span style={{ color: 'var(--color-text-secondary)' }}>PerfLens + Google Telemetry Sync: Completed</span>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>PerfLens Analysis Completed (Lighthouse unavailable)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 11: PageSpeed Comparison & Combined Diagnosis */}
              {currentReport.pageSpeed && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--color-accent)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} style={{ color: 'var(--color-accent)' }} />
                    <span>Combined Engine Diagnosis</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-cols-2">
                    {/* Left Column: PerfLens Findings */}
                    <div style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PerfLens Engine Findings
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        {currentReport.breakdown.images.sizeKb > 150 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-warning)' }}>✓</span> Large Image Payloads ({currentReport.breakdown.images.sizeKb} KB)
                          </li>
                        )}
                        {currentReport.breakdown.css.sizeKb > 50 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-warning)' }}>✓</span> Render Blocking CSS ({currentReport.breakdown.css.sizeKb} KB)
                          </li>
                        )}
                        {currentReport.images.some(img => !img.lazyLoaded && img.sizeKb > 50) && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-warning)' }}>✓</span> Missing Lazy Loading on fold
                          </li>
                        )}
                        {currentReport.breakdown.js.unusedKb > 50 && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-warning)' }}>✓</span> Unused JS script execution ({currentReport.breakdown.js.unusedKb} KB)
                          </li>
                        )}
                        {currentReport.bundleAnalysis.some(b => b.isDuplicate) && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-danger)' }}>✓</span> Duplicate Library Dependencies
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Right Column: Google PageSpeed Core Metrics */}
                    <div style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Google PageSpeed Telemetry
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Largest Contentful Paint (LCP):</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.lcp || 'N/A'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Cumulative Layout Shift (CLS):</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.cls || 'N/A'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Blocking Time (TBT):</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.pageSpeed.metrics?.tbt || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Combined Diagnosis Statement */}
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: '8px' }}>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                      <strong>Combined Diagnosis:</strong>{' '}
                      {currentReport.breakdown.images.sizeKb > 150 && currentReport.breakdown.css.sizeKb > 50
                        ? 'Large hero image payloads and blocking CSS stylesheets are the primary contributors to poor Largest Contentful Paint (LCP) and visual loading times.'
                        : currentReport.breakdown.js.unusedKb > 50 && currentReport.bundleAnalysis.some(b => b.isDuplicate)
                        ? 'Unused JavaScript modules and duplicate package dependencies increase blocking execution, raising the Total Blocking Time (TBT).'
                        : 'No critical performance bottlenecks detected between engines. Visual timelines and network assets are fully optimized.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Core Web Vitals diagnostics */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                    {currentReport.provenance?.primaryEngine === 'pagespeed' || currentReport.pageSpeed
                      ? 'Core Web Vitals — Google PageSpeed / CrUX Telemetry'
                      : 'Core Web Vitals — PerfLens Lab Measurement'}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Thresholds based on Google/web.dev guidance
                  </span>
                </div>
                <div className="grid-cols-3">
                  {[
                    { name: 'Largest Contentful Paint (LCP)', item: currentReport.vitals.lcp, desc: 'Measures perceived loading speed (2.5s threshold)' },
                    { name: 'Cumulative Layout Shift (CLS)', item: currentReport.vitals.cls, desc: 'Measures visual stability (0.1 threshold)' },
                    { 
                      name: 'Interaction to Next Paint (INP)', 
                      item: (currentReport.vitals.inp?.available && currentReport.vitals.inp.value && currentReport.vitals.inp.value !== 'N/A')
                        ? currentReport.vitals.inp
                        : (currentReport.pageSpeed?.metrics?.inp 
                          ? { value: currentReport.pageSpeed.metrics.inp, rating: 'unrated' as const, source: 'crux', mode: 'field', score: null, available: true } 
                          : { value: 'Not measured', rating: 'unrated' as const, source: 'crux', mode: 'field', score: null, available: false, reason: 'Field metric (not measured in lab)' }), 
                      desc: 'Measures responsiveness to user input (200ms threshold)' 
                    }
                  ].map((vit, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          {vit.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {vit.item?.source && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                              {vit.item?.mode ? `${vit.item.mode} • ` : ''}{vit.item.source}
                            </span>
                          )}
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor:
                                vit.item?.rating === 'good'
                                  ? 'var(--color-success)'
                                  : vit.item?.rating === 'needs-improvement'
                                  ? 'var(--color-warning)'
                                  : vit.item?.rating === 'poor'
                                  ? 'var(--color-danger)'
                                  : 'var(--color-muted)'
                            }}
                          />
                        </div>
                      </div>
                      <p 
                        style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                        title={vit.item?.unavailableReason || vit.item?.reason || undefined}
                      >
                        {vit.item?.available === false ? (vit.item?.value && vit.item.value !== 'N/A' && !vit.item.value.includes('N/A') ? vit.item.value : 'Not measured') : (vit.item?.value ?? 'Not measured')}
                      </p>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)' }} title={vit.item?.unavailableReason || vit.item?.reason || undefined}>
                        {vit.item?.available === false && (vit.item?.unavailableReason || vit.item?.reason)
                          ? (vit.item.unavailableReason || vit.item.reason)
                          : vit.desc}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Other Performance Metrics (Lab Diagnostics)</h4>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Browser Instrumentation</span>
                  </div>
                  <div className="grid-cols-3">
                    {[
                      { name: 'First Contentful Paint (FCP)', item: currentReport.vitals.fcp, desc: 'Marks first rendered text/image node (1.8s threshold)' },
                      { name: 'Total Blocking Time (TBT)', item: currentReport.vitals.tbt, desc: 'Sum of script execution tasks over 50ms (200ms threshold)' },
                      { name: 'Time to First Byte (TTFB)', item: currentReport.vitals.ttfb, desc: 'Initial server response latency (800ms threshold)' }
                    ].map((vit, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {vit.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {vit.item?.source && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                                {vit.item?.mode ? `${vit.item.mode} • ` : ''}{vit.item.source}
                              </span>
                            )}
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor:
                                  vit.item?.rating === 'good'
                                  ? 'var(--color-success)'
                                  : vit.item?.rating === 'needs-improvement'
                                  ? 'var(--color-warning)'
                                  : vit.item?.rating === 'poor'
                                  ? 'var(--color-danger)'
                                  : 'var(--color-muted)'
                              }}
                            />
                          </div>
                        </div>
                        <p 
                          style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                          title={vit.item?.unavailableReason || vit.item?.reason || undefined}
                        >
                          {vit.item?.value ?? 'N/A'}
                        </p>
                        <span style={{ fontSize: '10px', color: 'var(--color-muted)' }} title={vit.item?.unavailableReason || vit.item?.reason || undefined}>
                          {vit.item?.available === false && (vit.item?.unavailableReason || vit.item?.reason)
                            ? (vit.item.unavailableReason || vit.item.reason)
                            : vit.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Score Explainability */}
              {(currentReport.scoreExplanation || currentReport.performanceScoreDetails) && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} style={{ color: 'var(--color-accent)' }} />
                      <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Performance Score Explainability</h3>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Calculated from normalized metric scores using configured metric weights
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <th style={{ padding: '8px 12px' }}>Metric</th>
                          <th style={{ padding: '8px 12px' }}>Raw Value</th>
                          <th style={{ padding: '8px 12px' }}>Classification</th>
                          <th style={{ padding: '8px 12px' }}>Weight</th>
                          <th style={{ padding: '8px 12px' }}>Metric Score</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((currentReport.scoreExplanation || currentReport.performanceScoreDetails).breakdown || []).map((row: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.metric}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{row.raw != null && row.raw !== 'N/A' ? row.raw : '—'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  backgroundColor:
                                    row.classification === 'good' ? 'rgba(34, 197, 94, 0.1)' :
                                    row.classification === 'needs-improvement' ? 'rgba(245, 158, 11, 0.1)' :
                                    row.classification === 'poor' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                  color:
                                    row.classification === 'good' ? 'var(--color-success)' :
                                    row.classification === 'needs-improvement' ? 'var(--color-warning)' :
                                    row.classification === 'poor' ? 'var(--color-danger)' : 'var(--color-muted)'
                                }}
                              >
                                {row.classification}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                              {row.weightFormatted || (typeof row.weight === 'number' ? `${Math.round(row.weight * 100)}%` : '0%')}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{row.score ?? '—'}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>
                              {row.contribution != null ? `+${row.contribution}` : (row.available === false ? 'Excluded' : '0')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
                          <td colSpan={5} style={{ padding: '10px 12px' }}>
                            Final Performance Score
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-accent)' }}>
                            {(currentReport.scoreExplanation || currentReport.performanceScoreDetails).overallPerformanceScore} / 100
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Resource size distribution */}
              <div className="grid-cols-2">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Payload Breakdown</h3>
                  <div style={{ display: 'flex', alignItems: 'center', height: '180px' }}>
                    <div style={{ width: '50%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} KB`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* legend */}
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {pieData.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <div style={{ width: '10px', height: '10px', backgroundColor: item.color, borderRadius: '2px' }} />
                          <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                            {item.value} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Heuristic AI Audit Insights</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentReport.recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '12px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-bg)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <AlertTriangle
                          size={14}
                          style={{
                            color: rec.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)',
                            marginTop: '2px'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{rec.issue}</p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '9.5px', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                              {(rec.estimateType || rec.estimatedSavings?.type || 'not_quantified').replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{rec.estimatedSavings?.displayString || rec.estimatedImprovement || 'Not quantified'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUNDLES */}
          {activeSubTab === 'bundles' && (
            <div className="flex-col">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>JavaScript Bundle Treemap</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Visualization of parsed production package sizes.</p>
                </div>

                {/* Custom Treemap design based on real packages size */}
                <div className="treemap-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '180px' }}>
                  {currentReport.bundleAnalysis.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-muted)', fontSize: '12px' }}>
                      No script libraries cataloged in bundle payload.
                    </div>
                  ) : (
                    currentReport.bundleAnalysis.slice(0, 5).map((bundle, idx) => {
                      const totalSize = currentReport.bundleAnalysis.slice(0, 5).reduce((acc, b) => acc + b.sizeKb, 0);
                      const widthPercent = totalSize > 0 ? (bundle.sizeKb / totalSize) * 100 : 20;
                      const bgColor = bundle.isDuplicate
                        ? 'rgba(245, 158, 11, 0.08)'
                        : bundle.isUnused
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'rgba(59, 130, 246, 0.08)';

                      return (
                        <div
                          key={idx}
                          className="treemap-node"
                          style={{
                            flex: `1 1 calc(${widthPercent}% - 8px)`,
                            minWidth: '100px',
                            backgroundColor: bgColor,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            padding: '12px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          <span className="treemap-node-name" style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bundle.packageName}
                          </span>
                          <span className="treemap-node-size" style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                            {bundle.sizeKb.toFixed(1)} KB {bundle.isDuplicate ? '(Duplicate)' : bundle.isUnused ? '(Unused)' : ''}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Package weights list */}
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Module Path</th>
                      <th>Size (Gzipped)</th>
                      <th>Duplicate</th>
                      <th>Unused Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.bundleAnalysis.map((bundle, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-text-primary)' }}>{bundle.packageName}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{bundle.sizeKb} KB</td>
                        <td>
                          {bundle.isDuplicate ? (
                            <span className="metric-pill metric-score-orange">Duplicate</span>
                          ) : (
                            <span style={{ color: 'var(--color-muted)' }}>No</span>
                          )}
                        </td>
                        <td>
                          {bundle.isUnused ? (
                            <span className="metric-pill metric-score-red">100% Unused</span>
                          ) : (
                            <span style={{ color: 'var(--color-muted)' }}>0%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGES */}
          {activeSubTab === 'images' && (
            <div className="flex-col">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Unoptimized Image Audit</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Compressed formats and attributes review for active image buffers.</p>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Preview</th>
                        <th>File Name</th>
                        <th>Original Size</th>
                        <th>Optimal savings</th>
                        <th>Alt Tag</th>
                        <th>Lazy load</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.images.map((img, idx) => (
                        <tr key={idx}>
                          <td>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ImageIcon size={14} style={{ color: 'var(--color-muted)' }} />
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{img.src}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{img.sizeKb} KB ({img.format})</td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                            -{img.savingsKb} KB ({img.suggestedFormat})
                          </td>
                          <td>
                            {img.hasAlt ? (
                              <span style={{ color: 'var(--color-success)' }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--color-danger)' }}>Missing</span>
                            )}
                          </td>
                          <td>
                            {img.lazyLoaded ? (
                              <span style={{ color: 'var(--color-text-secondary)' }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--color-warning)' }}>Deactivated</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CSS / JS */}
          {activeSubTab === 'css-js' && (
            <div className="flex-col">
              <div className="grid-cols-2">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>CSS Coverage Statistics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Total Stylesheet Bytes</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{currentReport.breakdown.css.sizeKb} KB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Unused Styles (Critical CSS)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 500 }}>
                        {currentReport.breakdown.css.unusedKb} KB
                      </span>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          width: `${currentReport.breakdown.css.sizeKb > 0 ? Math.max(0, Math.min(100, 100 - (currentReport.breakdown.css.unusedKb / currentReport.breakdown.css.sizeKb) * 100)) : 100}%`,
                          height: '100%'
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      Recommendation: Extract critical stylesheets and defer the loading of global Tailwind/Bootstrap definitions.
                    </p>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>JavaScript Code splitting</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Total Javascript Bytes</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{currentReport.breakdown.js.sizeKb} KB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Unused Javascript Bytes</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 500 }}>
                        {currentReport.breakdown.js.unusedKb} KB
                      </span>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          backgroundColor: 'var(--color-warning)',
                          width: `${currentReport.breakdown.js.sizeKb > 0 ? Math.max(0, Math.min(100, 100 - (currentReport.breakdown.js.unusedKb / currentReport.breakdown.js.sizeKb) * 100)) : 100}%`,
                          height: '100%'
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      Recommendation: Utilize React.lazy / import() hooks for heavy router subpages and dynamic modales.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code recommendations list */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Actionable Asset Code Fixes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentReport.recommendations.filter(r => r.category === 'js' || r.category === 'css' || r.category === 'performance').map((rec) => (
                    <HumanizedRecommendationCard
                      key={rec.id}
                      rec={rec}
                      expanded={Boolean(expandedRecs[rec.id])}
                      onToggle={() => toggleRec(rec.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NETWORK / WATERFALL */}
          {activeSubTab === 'network' && (
            <div className="flex-col">
              {currentReport.customAnalysis?.network && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="grid-cols-2">
                  {/* Network stats summary */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Network Telemetry Summary</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Total Network Requests:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.customAnalysis.network.totalRequests}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Third-Party Requests:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.customAnalysis.network.thirdPartyRequests} ({currentReport.customAnalysis.network.thirdPartySizeKb} KB)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Compression Rate (Brotli/Gzip):</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.customAnalysis.network.compressionRate}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Cache Coverage Rate:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentReport.customAnalysis.network.cacheCoverageRate}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Largest specific files */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Largest Assets</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>LARGEST JAVASCRIPT FILE</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }} title={currentReport.customAnalysis.network.largestJs}>
                          {currentReport.customAnalysis.network.largestJs}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>LARGEST CSS FILE</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }} title={currentReport.customAnalysis.network.largestCss}>
                          {currentReport.customAnalysis.network.largestCss}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>LARGEST IMAGE FILE</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }} title={currentReport.customAnalysis.network.largestImage}>
                          {currentReport.customAnalysis.network.largestImage}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentReport.customAnalysis?.network && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="grid-cols-2">
                  {/* Largest resources */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Largest Resources (Top 5)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentReport.customAnalysis.network.largestResources.map((res: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }} title={res.url}>{res.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>{res.sizeKb.toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slowest requests */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Slowest Requests (Top 5)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentReport.customAnalysis.network.slowestRequests.map((res: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }} title={res.url}>{res.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>{res.durationMs} ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Simulated Network Timeline</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Inspect payload sequences and cache responses.</p>
                </div>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {/* table header */}
                  <div style={{ display: 'flex', padding: '8px 12px', backgroundColor: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>
                    <span style={{ width: '200px' }}>Name / Resource</span>
                    <span style={{ width: '80px' }}>Type</span>
                    <span style={{ width: '80px' }}>Size</span>
                    <span style={{ flex: 1 }}>Timeline (1.5s Load Time)</span>
                  </div>

                  {/* waterfall bars list */}
                  {currentReport.resources.map((res, idx) => {
                    // Simulating waterfall timings
                    const startPercent = Math.min(80, (idx * 12));
                    const widthPercent = Math.max(8, Math.min(90 - startPercent, (res.timeMs / 1500) * 100));

                    return (
                      <div key={idx} className="waterfall-row">
                        <span className="waterfall-name" title={res.name}>{res.name}</span>
                        <span className="waterfall-type">{res.type.toUpperCase()}</span>
                        <span className="waterfall-size">{res.sizeKb} KB</span>
                        <div className="waterfall-timeline-track">
                          <div
                            className={`waterfall-bar ${res.type}`}
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                              height: '100%',
                              borderRadius: '4px'
                            }}
                            title={`Load time: ${res.timeMs}ms, encoding: ${res.compression}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACCESSIBILITY */}
          {activeSubTab === 'accessibility' && (
            <div className="flex-col">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Accessibility Checks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentReport.accessibilityChecks.map((chk, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <span
                        className={`metric-pill ${chk.passed ? 'metric-score-green' : 'metric-score-red'}`}
                        style={{ marginTop: '2px' }}
                      >
                        {chk.passed ? 'PASSED' : 'WARNING'}
                      </span>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{chk.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{chk.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SEO & META */}
          {activeSubTab === 'seo' && (
            <div className="flex-col" style={{ gap: '20px' }}>
              {/* Framework & Target Banner */}
              {currentReport.seoChecks.detectedFramework && (
                <div
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={18} style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Verified Framework: {currentReport.seoChecks.detectedFramework.name}
                      </span>
                      <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                        Evidence: {currentReport.seoChecks.detectedFramework.evidence}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-primary)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontWeight: 600
                    }}
                  >
                    Framework-Aware AI Fixes Active
                  </span>
                </div>
              )}

              {/* Grid 1: Head Essentials & Crawlability */}
              <div className="grid-cols-2" style={{ gap: '20px' }}>
                {/* 1. Head Essentials */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Head Essentials & Meta Tags</h3>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Rendered DOM Verification</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Document Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Document &lt;title&gt;</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: currentReport.seoChecks.titlePassed ? 'var(--color-success)' : 'var(--color-danger)'
                          }}
                        >
                          {currentReport.seoChecks.titlePassed ? 'Present & Verified' : 'Missing'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-word' }}>
                        {currentReport.seoChecks.rawTitle || 'None detected in rendered DOM'}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Length: {currentReport.seoChecks.rawTitle ? currentReport.seoChecks.rawTitle.length : 0} characters (Optimal: 30–60)
                      </span>
                    </div>

                    {/* Meta Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>&lt;meta name="description"&gt;</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: currentReport.seoChecks.descPassed ? 'var(--color-success)' : 'var(--color-danger)'
                          }}
                        >
                          {currentReport.seoChecks.descPassed ? 'Present & Verified' : 'Missing'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-word' }}>
                        {currentReport.seoChecks.rawMetaDescription || 'None detected in rendered DOM'}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Length: {currentReport.seoChecks.rawMetaDescription ? currentReport.seoChecks.rawMetaDescription.length : 0} characters (Optimal: 70–160)
                      </span>
                    </div>

                    {/* Canonical URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>&lt;link rel="canonical"&gt;</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: currentReport.seoChecks.canonicalPassed ? 'var(--color-success)' : 'var(--color-warning)'
                          }}
                        >
                          {currentReport.seoChecks.canonicalDetails?.status === 'valid'
                            ? 'Valid Absolute URL'
                            : (currentReport.seoChecks.canonicalDetails?.status || 'Missing')}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all' }}>
                        {currentReport.seoChecks.canonicalDetails?.url || 'None declared in head'}
                      </div>
                      {currentReport.seoChecks.canonicalDetails?.error && (
                        <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>
                          Issue: {currentReport.seoChecks.canonicalDetails.error}
                        </span>
                      )}
                    </div>

                    {/* Viewport & Charset */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>Viewport</span>
                        <p style={{ fontSize: '12px', fontFamily: 'monospace', margin: '2px 0 0 0', color: currentReport.seoChecks.viewportPassed ? 'var(--color-text-primary)' : 'var(--color-danger)' }}>
                          {currentReport.seoChecks.viewport || 'Missing'}
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>Charset</span>
                        <p style={{ fontSize: '12px', fontFamily: 'monospace', margin: '2px 0 0 0', color: currentReport.seoChecks.charsetPassed ? 'var(--color-text-primary)' : 'var(--color-danger)' }}>
                          {currentReport.seoChecks.charset || 'Missing'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Crawlability & Indexing (Robots, Sitemap) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Crawlability & Search Indexing</h3>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Network & Header Probes</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Robots Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Robots Meta Tag</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: currentReport.seoChecks.robotsMeta?.noindex ? 'var(--color-danger)' : 'var(--color-success)'
                          }}
                        >
                          {currentReport.seoChecks.robotsMeta?.noindex ? 'Indexing Blocked (noindex)' : 'Indexable'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px' }}>
                        {currentReport.seoChecks.robotsMeta?.content || 'index, follow (default)'}
                      </div>
                    </div>

                    {/* robots.txt Probe */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>robots.txt</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: (currentReport.seoChecks.robotsTxt?.status === 'verified_exists' || currentReport.seoChecks.robotsTxt?.status === 'exists') ? 'var(--color-success)' : currentReport.seoChecks.robotsTxt?.status === 'missing' ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        >
                          {currentReport.seoChecks.robotsTxt?.status || 'unverified'}
                        </span>
                      </div>
                      {currentReport.seoChecks.robotsTxt?.snippet && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '70px', overflowY: 'auto' }}>
                          {currentReport.seoChecks.robotsTxt.snippet}
                        </div>
                      )}
                      {currentReport.seoChecks.robotsTxt?.error && (
                        <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>
                          {currentReport.seoChecks.robotsTxt.error}
                        </span>
                      )}
                    </div>

                    {/* sitemap.xml Probe */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>sitemap.xml</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: (currentReport.seoChecks.sitemapXml?.status === 'verified_exists' || currentReport.seoChecks.sitemapXml?.status === 'exists') ? 'var(--color-success)' : currentReport.seoChecks.sitemapXml?.status === 'missing' ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        >
                          {currentReport.seoChecks.sitemapXml?.status || currentReport.seoChecks.sitemap}
                        </span>
                      </div>
                      {currentReport.seoChecks.sitemapXml?.url && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all' }}>
                          {currentReport.seoChecks.sitemapXml.url}
                        </div>
                      )}
                      {currentReport.seoChecks.sitemapXml?.error && (
                        <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>
                          {currentReport.seoChecks.sitemapXml.error}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Headings Hierarchy & Structured Data */}
              <div className="grid-cols-2" style={{ gap: '20px' }}>
                {/* 3. Headings Structure */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Heading Hierarchy & Outline</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: currentReport.seoChecks.headingsHierarchy?.isHierarchyValid ? 'var(--color-success)' : 'var(--color-warning)'
                      }}
                    >
                      {currentReport.seoChecks.headingsHierarchy?.isHierarchyValid ? 'Sequential Order' : 'Skipped Levels Detected'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: '6px', textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: ((currentReport.seoChecks.headingsHierarchy?.h1Count ?? 0) >= 1) ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {currentReport.seoChecks.headingsHierarchy?.h1Count ?? 0}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>H1 Headings</span>
                    </div>

                    <div style={{ flex: 1, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {currentReport.seoChecks.headingsHierarchy?.h1 && currentReport.seoChecks.headingsHierarchy.h1.length > 0 ? (
                        <div>
                          <strong>Primary H1:</strong> "{currentReport.seoChecks.headingsHierarchy.h1[0]}"
                        </div>
                      ) : (
                        <div style={{ color: 'var(--color-danger)' }}>
                          No H1 element detected in rendered DOM structure.
                        </div>
                      )}
                    </div>
                  </div>

                  {currentReport.seoChecks.headingsHierarchy?.skippedLevels && currentReport.seoChecks.headingsHierarchy.skippedLevels.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-warning)' }}>Skipped Hierarchy Jumps:</span>
                      {currentReport.seoChecks.headingsHierarchy.skippedLevels.map((sk, idx) => (
                        <div key={idx} style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', padding: '4px 8px', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '4px' }}>
                          Skipped from &lt;{sk.from}&gt; directly to &lt;{sk.to}&gt; {sk.text ? `("${sk.text}")` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Structured Data / JSON-LD */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Structured Data (JSON-LD)</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: (currentReport.seoChecks.structuredData?.validCount ?? 0) > 0 ? 'var(--color-success)' : 'var(--color-muted)'
                      }}
                    >
                      {currentReport.seoChecks.structuredData?.validCount ?? 0} Schemas Validated
                    </span>
                  </div>

                  {currentReport.seoChecks.structuredData?.schemaTypes && currentReport.seoChecks.structuredData.schemaTypes.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {currentReport.seoChecks.structuredData.schemaTypes.map((st, idx) => (
                        <span key={idx} style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontFamily: 'monospace' }}>
                          @type: {st}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12.5px', color: 'var(--color-muted)', margin: 0 }}>
                      No JSON-LD structured data schemas declared on this page.
                    </p>
                  )}

                  {currentReport.seoChecks.structuredData?.syntaxErrors && currentReport.seoChecks.structuredData.syntaxErrors.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-danger)' }}>Syntax Errors Detected:</span>
                      {currentReport.seoChecks.structuredData.syntaxErrors.map((err, idx) => (
                        <div key={idx} style={{ fontSize: '11.5px', color: 'var(--color-danger)', padding: '6px 8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '4px', fontFamily: 'monospace' }}>
                          {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 3: OpenGraph & Twitter Social Cards */}
              <div className="grid-cols-2" style={{ gap: '20px' }}>
                {/* OpenGraph Card Mockup */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>OpenGraph Sharing Preview</h3>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      {currentReport.seoChecks.openGraph?.coveragePercentage ?? 0}% Complete
                    </span>
                  </div>

                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        height: '110px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-muted)',
                        fontSize: '12px',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage: currentReport.seoChecks.ogImage ? `url(${currentReport.seoChecks.ogImage})` : 'none'
                      }}
                    >
                      {!currentReport.seoChecks.ogImage && '[No OpenGraph Banner Image]'}
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>{currentReport.url}</span>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {currentReport.seoChecks.ogTitle || currentReport.url}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineClamp: 2 }}>
                        {currentReport.seoChecks.ogDescription || 'No description available'}
                      </p>
                    </div>
                  </div>

                  {currentReport.seoChecks.openGraph?.missingTags && currentReport.seoChecks.openGraph.missingTags.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      Missing tags: {currentReport.seoChecks.openGraph.missingTags.join(', ')}
                    </div>
                  )}
                </div>

                {/* Twitter Card Mockup */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Twitter Card Preview</h3>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      {currentReport.seoChecks.twitterCard?.coveragePercentage ?? 0}% Complete
                    </span>
                  </div>

                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        height: '110px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-muted)',
                        fontSize: '12px',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage: currentReport.seoChecks.twitterCard?.image ? `url(${currentReport.seoChecks.twitterCard.image})` : (currentReport.seoChecks.ogImage ? `url(${currentReport.seoChecks.ogImage})` : 'none')
                      }}
                    >
                      {!currentReport.seoChecks.twitterCard?.image && !currentReport.seoChecks.ogImage && '[No Twitter Card Image]'}
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                        Type: {currentReport.seoChecks.twitterCard?.card || 'summary'}
                      </span>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {currentReport.seoChecks.twitterCard?.title || currentReport.seoChecks.ogTitle || currentReport.url}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineClamp: 2 }}>
                        {currentReport.seoChecks.twitterCard?.description || currentReport.seoChecks.ogDescription || 'No description available'}
                      </p>
                    </div>
                  </div>

                  {currentReport.seoChecks.twitterCard?.missingTags && currentReport.seoChecks.twitterCard.missingTags.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      Missing tags: {currentReport.seoChecks.twitterCard.missingTags.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 6: Actionable SEO Recommendations & AI Fix Prompts */}
              {currentReport.recommendations.filter(r => r.category === 'seo').length > 0 && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Actionable SEO Recommendations & AI Fix Engine</h3>
                      <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '2px 0 0 0' }}>
                        Evidence-verified audit findings with copy-ready AI coding prompts.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentReport.recommendations.filter(r => r.category === 'seo').map(rec => (
                      <HumanizedRecommendationCard
                        key={rec.id}
                        rec={rec}
                        expanded={Boolean(expandedRecs[rec.id])}
                        onToggle={() => toggleRec(rec.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AI RECOMMENDATIONS */}
          {activeSubTab === 'recommendations' && (
            <div className="flex-col" style={{ gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '4px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} style={{ color: '#a855f7' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                      AI Recommendations & Verified Explanations
                    </h2>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-muted)', margin: '4px 0 0 0' }}>
                    Every finding is verified by the deterministic engine. Click <strong>[ ✦ AI Explain ]</strong> to generate grounded developer explanations.
                  </p>
                </div>
              </div>

              {currentReport.recommendations && currentReport.recommendations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentReport.recommendations.map((rec) => (
                    <HumanizedRecommendationCard
                      key={rec.id}
                      rec={{ ...rec, sourceUrl: currentReport.url, scanTimestamp: currentReport.timestamp }}
                      expanded={expandedRecs[rec.id] !== undefined ? expandedRecs[rec.id] : true}
                      onToggle={() => toggleRec(rec.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <p style={{ color: 'var(--color-muted)', margin: 0 }}>
                    No actionable recommendations for {currentReport.url}. All audited metrics passed within target thresholds!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
