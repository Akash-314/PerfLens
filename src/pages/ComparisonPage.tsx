import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GitCompare, CheckCircle2 } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const { runComparison, comparedReports } = useApp();
  const [url1, setUrl1] = useState('vercel.com');
  const [url2, setUrl2] = useState('github.com');

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    runComparison(url1, url2);
  };

  const getVitalsDiff = () => {
    if (!comparedReports) return null;
    const { report1, report2 } = comparedReports;
    const scoreDiff = report1.scores.overall - report2.scores.overall;
    const faster = scoreDiff >= 0 ? report1.url : report2.url;
    const diffPct = Math.abs(scoreDiff);
    return { faster, diffPct };
  };

  const diffSummary = getVitalsDiff();

  // Recharts structured comparison bar chart data
  const getChartData = () => {
    if (!comparedReports) return [];
    return [
      { name: 'Overall Score', [comparedReports.report1.url]: comparedReports.report1.scores.overall, [comparedReports.report2.url]: comparedReports.report2.scores.overall },
      { name: 'Performance', [comparedReports.report1.url]: comparedReports.report1.scores.performance, [comparedReports.report2.url]: comparedReports.report2.scores.performance },
      { name: 'Accessibility', [comparedReports.report1.url]: comparedReports.report1.scores.accessibility, [comparedReports.report2.url]: comparedReports.report2.scores.accessibility },
      { name: 'SEO Index', [comparedReports.report1.url]: comparedReports.report1.scores.seo, [comparedReports.report2.url]: comparedReports.report2.scores.seo }
    ];
  };

  const barChartData = getChartData();

  return (
    <div className="workspace-container fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Website Comparison</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Benchmark performance side-by-side between two domains.</p>
      </div>

      {/* Forms */}
      <form
        onSubmit={handleCompare}
        className="card"
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          backgroundColor: 'var(--color-surface)',
          padding: '20px',
          marginBottom: '24px'
        }}
      >
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label">Base URL (Domain A)</label>
          <input
            type="text"
            className="form-input"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            placeholder="e.g. vercel.com"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', color: 'var(--color-muted)' }}>
          <GitCompare size={16} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label">Compare Against (Domain B)</label>
          <input
            type="text"
            className="form-input"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            placeholder="e.g. netlify.com"
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ height: '40px' }}>
          <span>Run Comparison</span>
        </button>
      </form>

      {/* Comparison Results Area */}
      {!comparedReports ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-muted)' }}>
          <GitCompare size={32} style={{ color: 'var(--color-border)', marginBottom: '16px' }} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>No comparison loaded yet.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Select two domains and trigger side-by-side diagnostics above.</p>
        </div>
      ) : (
        <div className="flex-col">
          {/* Comparison summary statement */}
          {diffSummary && (
            <div
              className="card"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.04)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px'
              }}
            >
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', margin: 0 }}>
                <strong>Benchmark complete:</strong>{' '}
                <span style={{ color: 'var(--color-accent)' }}>{diffSummary.faster}</span> is{' '}
                <strong>{diffSummary.diffPct} points</strong> faster overall than the compared domain.
              </p>
            </div>
          )}

          {/* Vitals Side by Side */}
          <div className="grid-cols-2">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{comparedReports.report1.url}</h3>
                <span className="metric-pill metric-score-green">{comparedReports.report1.scores.overall}/100</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>First Contentful Paint (FCP)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.fcp.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Largest Contentful Paint (LCP)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.lcp.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Cumulative Layout Shift (CLS)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.cls.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Total JS Payload Weight</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.breakdown.js.sizeKb} KB</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{comparedReports.report2.url}</h3>
                <span className="metric-pill metric-score-orange">{comparedReports.report2.scores.overall}/100</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>First Contentful Paint (FCP)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.fcp.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Largest Contentful Paint (LCP)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.lcp.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Cumulative Layout Shift (CLS)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.cls.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Total JS Payload Weight</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.breakdown.js.sizeKb} KB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts chart overlay */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Metrics Side-by-Side</h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted)" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey={comparedReports.report1.url} fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={comparedReports.report2.url} fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
