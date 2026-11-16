import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GitCompare, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { getScoreCoaching } from '../utils/developerCoach';

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

    // Speed comparison
    const speed1 = report1.scores.performance;
    const speed2 = report2.scores.performance;
    let speedInsight = '';
    if (speed1 > speed2) {
      speedInsight = `${report1.url.replace(/^https?:\/\//, '')} loads its main content faster (${report1.vitals.lcp.value || 'faster'} vs ${report2.vitals.lcp.value || 'slower'}).`;
    } else if (speed2 > speed1) {
      speedInsight = `${report2.url.replace(/^https?:\/\//, '')} loads its main content faster (${report2.vitals.lcp.value || 'faster'} vs ${report1.vitals.lcp.value || 'slower'}).`;
    } else {
      speedInsight = `Both websites perform similarly on loading speeds.`;
    }

    return { higherHealth, diffPct, speedInsight };
  };

  const insights = getComparisonInsights();

  // Recharts structured comparison bar chart data with friendly labels
  const getChartData = () => {
    if (!comparedReports) return [];
    const name1 = comparedReports.report1.url.replace(/^https?:\/\//, '');
    const name2 = comparedReports.report2.url.replace(/^https?:\/\//, '');
    return [
      { name: 'Website Health', [name1]: comparedReports.report1.scores.overall, [name2]: comparedReports.report2.scores.overall },
      { name: 'Speed', [name1]: comparedReports.report1.scores.performance, [name2]: comparedReports.report2.scores.performance },
      { name: 'Accessibility', [name1]: comparedReports.report1.scores.accessibility, [name2]: comparedReports.report2.scores.accessibility },
      { name: 'Search & Sharing', [name1]: comparedReports.report1.scores.seo, [name2]: comparedReports.report2.scores.seo }
    ];
  };

  const barChartData = getChartData();
  const name1 = comparedReports ? comparedReports.report1.url.replace(/^https?:\/\//, '') : '';
  const name2 = comparedReports ? comparedReports.report2.url.replace(/^https?:\/\//, '') : '';

  return (
    <div className="workspace-container fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Compare two websites
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          See which parts of each website are faster, healthier, or easier to improve.
        </p>
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
          padding: '24px',
          marginBottom: '28px',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
          <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            First website
          </label>
          <input
            type="text"
            className="form-input"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            placeholder="e.g. yourwebsite.com"
            style={{ height: '42px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', color: 'var(--color-muted)' }}>
          <GitCompare size={20} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
          <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Second website
          </label>
          <input
            type="text"
            className="form-input"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            placeholder="e.g. competitor.com"
            style={{ height: '42px', fontSize: '14px' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px', fontSize: '14px' }}>
          <span>Compare websites</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Comparison Results Area */}
      {!comparedReports ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-xl)' }}>
          <Sparkles size={36} style={{ color: 'var(--color-accent-cyan)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Choose two websites
          </h2>
          <p style={{ fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
            We'll compare their speed, accessibility, SEO, and key issues side by side.
          </p>
        </div>
      ) : (
        <div className="flex-col" style={{ gap: '24px' }}>
          {/* Lead Human Insight statement */}
          {insights && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '20px 24px',
                borderRadius: 'var(--radius-xl)'
              }}
            >
              <CheckCircle2 size={22} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  {insights.diffPct > 0 ? (
                    <>
                      <strong style={{ color: 'var(--color-accent-cyan)' }}>{insights.higherHealth.replace(/^https?:\/\//, '')}</strong> leads in overall health by {insights.diffPct} points.
                    </>
                  ) : (
                    <>Both websites have identical overall health scores.</>
                  )}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  {insights.speedInsight}
                </p>
              </div>
            </div>
          )}

          {/* Vitals Side by Side Cards */}
          <div className="grid-cols-2">
            {/* Website 1 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {comparedReports.report1.url.replace(/^https?:\/\//, '')}
                </h3>
                <span className={`metric-pill ${getScoreCoaching(comparedReports.report1.scores.overall).badgeClass}`}>
                  Health: {comparedReports.report1.scores.overall}/100
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Main content appears (LCP)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.lcp.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Visual stability (CLS)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.cls.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>First visible content (FCP)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.vitals.fcp.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>JavaScript size</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report1.breakdown.js.sizeKb} KB</strong>
                </div>
              </div>
            </div>

            {/* Website 2 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {comparedReports.report2.url.replace(/^https?:\/\//, '')}
                </h3>
                <span className={`metric-pill ${getScoreCoaching(comparedReports.report2.scores.overall).badgeClass}`}>
                  Health: {comparedReports.report2.scores.overall}/100
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Main content appears (LCP)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.lcp.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Visual stability (CLS)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.cls.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>First visible content (FCP)</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.vitals.fcp.value || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>JavaScript size</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{comparedReports.report2.breakdown.js.sizeKb} KB</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts chart overlay */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-xl)' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Side-by-side comparison</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Scores across Health, Speed, Accessibility, and Search & Sharing.
              </p>
            </div>
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
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  />
                  <Bar dataKey={name1} fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={name2} fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

