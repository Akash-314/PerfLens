import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GitCompare, CheckCircle2, ArrowLeftRight } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const { runComparison, comparedReports } = useApp();
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (url1.trim() && url2.trim()) {
      runComparison(url1.trim(), url2.trim());
    }
  };

  const getComparisonInsights = () => {
    if (!comparedReports) return null;
    const { report1, report2 } = comparedReports;
    const scoreDiff = report1.scores.overall - report2.scores.overall;
    const higherHealth = scoreDiff >= 0 ? report1.url : report2.url;
    const diffPct = Math.abs(scoreDiff);

    const speed1 = report1.scores.performance;
    const speed2 = report2.scores.performance;
    let speedInsight = '';
    if (speed1 > speed2) {
      speedInsight = `${report1.url.replace(/^https?:\/\//, '')} loads its main content faster (${report1.vitals?.lcp?.value || 'faster'} vs ${report2.vitals?.lcp?.value || 'slower'}).`;
    } else if (speed2 > speed1) {
      speedInsight = `${report2.url.replace(/^https?:\/\//, '')} loads its main content faster (${report2.vitals?.lcp?.value || 'faster'} vs ${report1.vitals?.lcp?.value || 'slower'}).`;
    } else {
      speedInsight = `Both websites perform similarly on loading speeds.`;
    }

    return { higherHealth, diffPct, speedInsight, scoreDiff };
  };

  const insights = getComparisonInsights();

  const getChartData = () => {
    if (!comparedReports) return [];
    const name1 = comparedReports.report1.url.replace(/^https?:\/\//, '');
    const name2 = comparedReports.report2.url.replace(/^https?:\/\//, '');
    return [
      { name: 'Health', [name1]: comparedReports.report1.scores.overall, [name2]: comparedReports.report2.scores.overall },
      { name: 'Speed', [name1]: comparedReports.report1.scores.performance, [name2]: comparedReports.report2.scores.performance },
      { name: 'Accessibility', [name1]: comparedReports.report1.scores.accessibility, [name2]: comparedReports.report2.scores.accessibility },
      { name: 'Search & SEO', [name1]: comparedReports.report1.scores.seo, [name2]: comparedReports.report2.scores.seo }
    ];
  };

  const barChartData = getChartData();
  const name1 = comparedReports ? comparedReports.report1.url.replace(/^https?:\/\//, '') : '';
  const name2 = comparedReports ? comparedReports.report2.url.replace(/^https?:\/\//, '') : '';

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
          Compare websites
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
          Compare performance, accessibility, SEO, and resource payloads across two websites.
        </p>
      </div>

      {/* GitHub Compare / Diff Bar */}
      <form onSubmit={handleCompare} className="gh-box" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '12px', color: 'var(--color-fg-muted)' }}>
              Base website
            </label>
            <input
              type="text"
              className="form-input"
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="e.g. yourwebsite.com"
              style={{ width: '100%', height: '34px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '22px' }}>
            <ArrowLeftRight size={16} style={{ color: 'var(--color-fg-muted)' }} />
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '12px', color: 'var(--color-fg-muted)' }}>
              Compare with
            </label>
            <input
              type="text"
              className="form-input"
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="e.g. competitor.com"
              style={{ width: '100%', height: '34px' }}
            />
          </div>

          <div style={{ marginTop: '22px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!url1.trim() || !url2.trim()}
              style={{ height: '34px' }}
            >
              <GitCompare size={14} />
              <span>Compare</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comparison Results */}
      {!comparedReports ? (
        <div className="gh-box" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-fg-muted)' }}>
          <GitCompare size={32} style={{ color: 'var(--color-fg-subtle)', margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '6px' }}>
            Choose two website addresses to compare
          </h2>
          <p style={{ fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px auto', color: 'var(--color-fg-muted)' }}>
            We'll calculate score differences, Core Web Vitals deltas, and highlight where each site wins.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Comparison summary banner */}
          {insights && (
            <div
              className="gh-box"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: 'var(--color-canvas-subtle)',
                borderLeft: '4px solid var(--color-accent-fg)'
              }}
            >
              <CheckCircle2 size={18} style={{ color: 'var(--color-success-fg)', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)', margin: 0 }}>
                  {insights.diffPct > 0 ? (
                    <>
                      <strong>{insights.higherHealth.replace(/^https?:\/\//, '')}</strong> leads by {insights.diffPct} overall health points.
                    </>
                  ) : (
                    <>Both websites have identical overall health scores.</>
                  )}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', margin: '2px 0 0 0' }}>
                  {insights.speedInsight}
                </p>
              </div>
            </div>
          )}

          {/* Side by side comparison table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Metric & Check</th>
                  <th style={{ width: '30%' }}>{name1} (Base)</th>
                  <th style={{ width: '30%' }}>{name2}</th>
                  <th style={{ width: '5%' }}>Diff</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>Overall Health Score</td>
                  <td>
                    <span className="badge badge-info">{comparedReports.report1.scores.overall} / 100</span>
                  </td>
                  <td>
                    <span className="badge badge-info">{comparedReports.report2.scores.overall} / 100</span>
                  </td>
                  <td>
                    {comparedReports.report1.scores.overall >= comparedReports.report2.scores.overall ? (
                      <span className="badge badge-green">+{comparedReports.report1.scores.overall - comparedReports.report2.scores.overall}</span>
                    ) : (
                      <span className="badge badge-red">-{comparedReports.report2.scores.overall - comparedReports.report1.scores.overall}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>Speed (Performance)</td>
                  <td>{comparedReports.report1.scores.performance} / 100</td>
                  <td>{comparedReports.report2.scores.performance} / 100</td>
                  <td>
                    {comparedReports.report1.scores.performance >= comparedReports.report2.scores.performance ? (
                      <span className="badge badge-green">+{comparedReports.report1.scores.performance - comparedReports.report2.scores.performance}</span>
                    ) : (
                      <span className="badge badge-red">-{comparedReports.report2.scores.performance - comparedReports.report1.scores.performance}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>Accessibility</td>
                  <td>{comparedReports.report1.scores.accessibility} / 100</td>
                  <td>{comparedReports.report2.scores.accessibility} / 100</td>
                  <td>
                    {comparedReports.report1.scores.accessibility >= comparedReports.report2.scores.accessibility ? (
                      <span className="badge badge-green">+{comparedReports.report1.scores.accessibility - comparedReports.report2.scores.accessibility}</span>
                    ) : (
                      <span className="badge badge-red">-{comparedReports.report2.scores.accessibility - comparedReports.report1.scores.accessibility}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>Search & Sharing (SEO)</td>
                  <td>{comparedReports.report1.scores.seo} / 100</td>
                  <td>{comparedReports.report2.scores.seo} / 100</td>
                  <td>
                    {comparedReports.report1.scores.seo >= comparedReports.report2.scores.seo ? (
                      <span className="badge badge-green">+{comparedReports.report1.scores.seo - comparedReports.report2.scores.seo}</span>
                    ) : (
                      <span className="badge badge-red">-{comparedReports.report2.scores.seo - comparedReports.report1.scores.seo}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>Main content load (LCP)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals?.lcp?.value || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals?.lcp?.value || '—'}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>JavaScript Payload Size</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.breakdown?.js?.sizeKb || 0} KB</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.breakdown?.js?.sizeKb || 0} KB</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Side-by-side Bar Chart */}
          <div className="gh-box">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '14px' }}>
              Comparison metrics breakdown
            </h3>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-fg-subtle)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-fg-subtle)" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--color-fg-default)'
                    }}
                  />
                  <Bar dataKey={name1} fill="var(--color-accent-fg)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={name2} fill="var(--color-accent-hover)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
