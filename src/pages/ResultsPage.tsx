import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Zap,
  Globe,
  Image as ImageIcon,
  Code2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Download,
  Share2,
  Network
} from 'lucide-react';

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Report link copied to clipboard.', 'success');
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleCopyLink}>
            <Share2 size={13} />
            <span>Share</span>
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
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

              {/* Core Web Vitals diagnostics */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Core Web Vitals Telemetry</h3>
                <div className="grid-cols-3">
                  {[
                    { name: 'Largest Contentful Paint (LCP)', item: currentReport.vitals.lcp, desc: 'Renders the largest image or block text' },
                    { name: 'First Contentful Paint (FCP)', item: currentReport.vitals.fcp, desc: 'Time until browser renders first DOM node' },
                    { name: 'Cumulative Layout Shift (CLS)', item: currentReport.vitals.cls, desc: 'Measures visual stability of page components' },
                    { name: 'First Input Delay (FID)', item: currentReport.vitals.fid, desc: 'Measures interactive response latency' },
                    { name: 'Time to First Byte (TTFB)', item: currentReport.vitals.ttfb, desc: 'Server responsiveness metric' },
                    { name: 'Total Blocking Time (TBT)', item: currentReport.vitals.tbt, desc: 'Sum of script execution blocks over 50ms' }
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
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor:
                              vit.item.rating === 'good'
                                ? 'var(--color-success)'
                                : vit.item.rating === 'needs-improvement'
                                ? 'var(--color-warning)'
                                : 'var(--color-danger)'
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {vit.item.value}
                      </p>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{vit.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{rec.issue}</p>
                          <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Est. Improvement: {rec.estimatedImprovement}</span>
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

                {/* Custom SVG/JSX Treemap design */}
                <div className="treemap-container">
                  <div className="treemap-node" style={{ gridColumn: 'span 4', gridRow: 'span 2', backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>
                    <span className="treemap-node-name">moment.js</span>
                    <span className="treemap-node-size">280.1 KB (Duplicate)</span>
                  </div>
                  <div className="treemap-node" style={{ gridColumn: 'span 3', gridRow: 'span 2', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                    <span className="treemap-node-name">core-js</span>
                    <span className="treemap-node-size">154.2 KB</span>
                  </div>
                  <div className="treemap-node" style={{ gridColumn: 'span 3', gridRow: 'span 1', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                    <span className="treemap-node-name">framer-motion</span>
                    <span className="treemap-node-size">142.3 KB</span>
                  </div>
                  <div className="treemap-node" style={{ gridColumn: 'span 2', gridRow: 'span 1', backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                    <span className="treemap-node-name">lodash</span>
                    <span className="treemap-node-size">71.2 KB (Unused)</span>
                  </div>
                  <div className="treemap-node" style={{ gridColumn: 'span 5', gridRow: 'span 1', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                    <span className="treemap-node-name">react-dom.production.min.js</span>
                    <span className="treemap-node-size">124.5 KB</span>
                  </div>
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
                          width: `${100 - (currentReport.breakdown.css.unusedKb / currentReport.breakdown.css.sizeKb) * 100}%`,
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
                          width: `${100 - (currentReport.breakdown.js.unusedKb / currentReport.breakdown.js.sizeKb) * 100}%`,
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
                  {currentReport.recommendations.filter(r => r.category === 'js' || r.category === 'css').map((rec) => (
                    <div key={rec.id} className="expandable-card">
                      <div className="expandable-card-header" onClick={() => toggleRec(rec.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`metric-pill ${rec.priority === 'high' ? 'metric-score-red' : 'metric-score-orange'}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{rec.issue}</span>
                        </div>
                        <ChevronDown size={14} style={{ transform: expandedRecs[rec.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </div>
                      {expandedRecs[rec.id] && (
                        <div className="expandable-card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            <strong>Why it matters:</strong> {rec.whyItMatters}
                          </p>
                          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                            <code style={{ fontSize: '12px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', background: 'none', padding: 0 }}>
                              {rec.suggestedFix}
                            </code>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-muted)' }}>
                            <span>Difficulty: <strong>{rec.difficulty.toUpperCase()}</strong></span>
                            <span>Est. Improvement: <strong>{rec.estimatedImprovement}</strong></span>
                            <a href={rec.refUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <span>Docs</span> <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NETWORK / WATERFALL */}
          {activeSubTab === 'network' && (
            <div className="flex-col">
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
                  {[
                    { title: 'Color Contrast check', passed: false, text: 'Some text elements on the footer container do not meet the minimum contrast standard of 4.5:1.' },
                    { title: 'Image Alt Attributes check', passed: false, text: 'Two primary image resources (/images/hero-banner.png, /images/avatar-group.png) do not contain aria-label or alt tags.' },
                    { title: 'Heading Structure hierarchy check', passed: true, text: 'Proper structural header hierarchy from H1 to H3 verified.' },
                    { title: 'Screen reader accessibility checks', passed: true, text: 'Interactive buttons contain matching accessible descriptors.' }
                  ].map((chk, idx) => (
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
            <div className="flex-col">
              {/* Meta information checks */}
              <div className="grid-cols-2">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Meta & Tags Compliance</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Title Tag</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Verified (54 chars)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Meta Description</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Verified (150 chars)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Canonical Tag</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Verified</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Sitemap.xml</span>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>No reference in robots.txt</span>
                    </div>
                  </div>
                </div>

                {/* OpenGraph social card preview */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>OpenGraph Card Mockup</h3>
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
                        borderBottom: '1px solid var(--color-border)'
                      }}
                    >
                      [OpenGraph Banner Image Preview]
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>{currentReport.url}</span>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {currentReport.url.split('.')[0].toUpperCase()} - The developer performance inspector dashboard
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineClamp: 2 }}>
                        Inspect page speeds, tree-shake bundles and dynamic import dependencies seamlessly in real-time diagnostics.
                      </p>
                    </div>
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
