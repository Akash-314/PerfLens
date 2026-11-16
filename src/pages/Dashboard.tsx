import React from 'react';
import { useApp, type Report } from '../context/AppContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Zap, Search, AlertCircle, ArrowUpRight, Play, FileText, CheckCircle2, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getScoreCoaching, humanizeFinding, humanizeSeverity, humanizeCategory } from '../utils/developerCoach';

export const Dashboard: React.FC = () => {
  const { reports, setCurrentReport, setCurrentTab, loading, error, fetchData } = useApp();

  // Skeleton Loader UI
  if (loading) {
    return (
      <div className="workspace-container fade-in" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div className="skeleton-shimmer" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '10px' }} />
          <div className="skeleton-shimmer" style={{ height: '18px', width: '420px', borderRadius: '6px' }} />
        </div>
        <div className="grid-cols-4" style={{ marginBottom: '28px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card skeleton-shimmer" style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div className="card skeleton-shimmer" style={{ height: '280px', borderRadius: 'var(--radius-xl)' }} />
          <div className="card skeleton-shimmer" style={{ height: '280px', borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  // Error State UI
  if (error) {
    return (
      <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '32px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <AlertCircle size={28} style={{ color: 'var(--color-danger)' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.02em' }}>We couldn't reach your website data</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '440px', marginBottom: '24px', lineHeight: '1.6' }}>
          {error || 'An unexpected issue occurred while fetching your website overview. Check your network or try again.'}
        </p>
        <button className="btn btn-primary" onClick={fetchData}>
          Try again
        </button>
      </div>
    );
  }

  // Empty State UI
  if (reports.length === 0) {
    return (
      <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center', padding: '32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.12))', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <Sparkles size={32} style={{ color: 'var(--color-accent-cyan)' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px', letterSpacing: '-0.02em' }}>Let's check your first website</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', maxWidth: '480px', marginBottom: '28px', lineHeight: '1.6' }}>
          Paste your website URL and PerfLens will inspect speed, accessibility, search readiness, and tell you exactly what to fix.
        </p>
        <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }} onClick={() => setCurrentTab('analyze')}>
          <Play size={16} fill="currentColor" />
          <span>Check a website</span>
        </button>
      </div>
    );
  }

  // Pick the latest report
  const latestReport = reports[0];
  const coaching = getScoreCoaching(latestReport.scores.overall);

  // Score comparison with previous report if available
  let trendHeadline = 'Consistent performance across recent scans.';
  let trendIcon = <Minus size={14} style={{ color: 'var(--color-muted)' }} />;
  if (reports.length > 1) {
    const diff = latestReport.scores.overall - reports[1].scores.overall;
    if (diff > 0) {
      trendHeadline = `Your score improved by ${diff} point${diff > 1 ? 's' : ''} compared to the previous scan.`;
      trendIcon = <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />;
    } else if (diff < 0) {
      trendHeadline = `Your score dipped by ${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} since the last scan. Let's fix the new issues.`;
      trendIcon = <TrendingDown size={14} style={{ color: 'var(--color-warning)' }} />;
    }
  }

  // Dynamic Performance trends from user's report history
  const trendData = reports
    .slice()
    .reverse()
    .map((r) => ({
      date: r.timestamp.split(',')[0],
      score: r.scores?.overall ?? 0
    }));

  const handleReportView = (report: Report) => {
    setCurrentReport(report);
    setCurrentTab('results');
  };

  const handleFixesView = (report: Report) => {
    setCurrentReport(report);
    setCurrentTab('recommendations');
  };

  // Top opportunity for "Start here"
  const topRecommendations = latestReport?.recommendations || [];
  const topOpportunity = topRecommendations[0];
  const topOpportunityCoach = topOpportunity ? humanizeFinding(topOpportunity.issue, topOpportunity.category) : null;
  const topOpportunitySeverity = topOpportunity ? humanizeSeverity(topOpportunity.priority) : null;

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            How is your website doing?
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Here's a quick look at your site's health and the things worth fixing for <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{latestReport.url}</strong>.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          <Play size={14} fill="currentColor" />
          <span>Check a website</span>
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid-cols-4" style={{ marginBottom: '28px' }}>
        {/* Website Health */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Website Health</span>
            <span className={`metric-pill ${coaching.badgeClass}`}>
              {coaching.pillText}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
                {latestReport.scores.overall}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              {coaching.summary}
            </p>
          </div>
        </div>

        {/* Speed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Speed</span>
            <span className={`metric-pill ${latestReport.scores.performance >= 90 ? 'metric-score-green' : latestReport.scores.performance >= 70 ? 'metric-score-orange' : 'metric-score-red'}`}>
              {latestReport.scores.performance >= 90 ? 'Fast' : latestReport.scores.performance >= 70 ? 'Moderate' : 'Sluggish'}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
                {latestReport.scores.performance}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              Main content appears in {latestReport.vitals.lcp.value || 'good time'}.
            </p>
          </div>
        </div>

        {/* Accessibility */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Accessibility</span>
            <span className={`metric-pill ${latestReport.scores.accessibility >= 90 ? 'metric-score-green' : latestReport.scores.accessibility >= 70 ? 'metric-score-orange' : 'metric-score-red'}`}>
              {latestReport.scores.accessibility >= 90 ? 'Inclusive' : latestReport.scores.accessibility >= 70 ? 'Needs tweaks' : 'Fix contrast'}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
                {latestReport.scores.accessibility}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              Checks readability, contrast, and navigation structure.
            </p>
          </div>
        </div>

        {/* Search & Sharing */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Search & Sharing</span>
            <span className={`metric-pill ${latestReport.scores.seo >= 90 ? 'metric-score-green' : latestReport.scores.seo >= 70 ? 'metric-score-orange' : 'metric-score-red'}`}>
              {latestReport.scores.seo >= 90 ? 'Search-ready' : latestReport.scores.seo >= 70 ? 'Good shape' : 'Needs meta'}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
                {latestReport.scores.seo}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              Headings, meta tags, and social preview cards.
            </p>
          </div>
        </div>
      </div>

      {/* Start Here: Next Best Action Banner */}
      {topOpportunity && topOpportunityCoach && (
        <div
          className="card"
          style={{
            marginBottom: '28px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '20px 24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-accent-cyan)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent-cyan)' }}>
                Start here • Your biggest opportunity
              </span>
            </div>
            {topOpportunitySeverity && (
              <span className={topOpportunitySeverity.badgeClass}>
                {topOpportunitySeverity.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '780px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {topOpportunityCoach.headline}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                {topOpportunityCoach.summary} {topOpportunityCoach.whyItMatters}
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => handleFixesView(latestReport)}
            >
              <span>See the fix</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Two Columns: Trend & Quick Actions */}
      <div className="grid-cols-3" style={{ marginBottom: '28px' }}>
        {/* Trend Area Chart */}
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Is your site getting better?</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                See how your website's health has changed over time.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-secondary)', padding: '6px 12px', borderRadius: '20px' }}>
              {trendIcon}
              <span>{trendHeadline}</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-text-primary)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                  itemStyle={{ color: 'var(--color-accent-cyan)' }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>What do you want to do?</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Common tasks to keep your website fast.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 14px', width: '100%', borderRadius: 'var(--radius-lg)' }}
              onClick={() => setCurrentTab('analyze')}
            >
              <Search size={16} style={{ color: 'var(--color-accent-cyan)' }} />
              <div style={{ textAlign: 'left', marginLeft: '10px' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Check a website</p>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>Inspect any page URL in seconds</span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 14px', width: '100%', borderRadius: 'var(--radius-lg)' }}
              onClick={() => setCurrentTab('comparisons')}
            >
              <Zap size={16} style={{ color: 'var(--color-accent)' }} />
              <div style={{ textAlign: 'left', marginLeft: '10px' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Compare two websites</p>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>See how you stack up against competitors</span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 14px', width: '100%', borderRadius: 'var(--radius-lg)' }}
              onClick={() => setCurrentTab('reports')}
            >
              <FileText size={16} style={{ color: '#a855f7' }} />
              <div style={{ textAlign: 'left', marginLeft: '10px' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>View previous scans</p>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>Browse history and download reports</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Scans & Key Findings */}
      <div className="grid-cols-3">
        {/* Recent Scans Table */}
        <div className="table-container" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Your recent scans</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Open any scan to see what changed and what to fix.
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentTab('reports')}
            >
              <span>View all ({reports.length})</span>
            </button>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Website</th>
                <th>Health</th>
                <th>Speed</th>
                <th>Main content</th>
                <th>Scanned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 5).map((r) => {
                const rCoach = getScoreCoaching(r.scores.overall);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {r.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </td>
                    <td>
                      <span className={`metric-pill ${rCoach.badgeClass}`}>
                        {r.scores.overall}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{r.scores.performance}%</span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                      {r.vitals.lcp.value || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {r.timestamp.split(',')[0]}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ gap: '4px' }}
                        onClick={() => handleReportView(r)}
                      >
                        <span>Open scan</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Things Worth Fixing */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Things worth fixing
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Biggest opportunities from <strong style={{ color: 'var(--color-text-primary)' }}>{latestReport.url.replace(/^https?:\/\//, '')}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topRecommendations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--color-text-secondary)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--color-success)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>All clean!</p>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>No urgent issues detected on this scan.</p>
              </div>
            ) : (
              topRecommendations.slice(0, 4).map((rec, idx) => {
                const hFinding = humanizeFinding(rec.issue, rec.category);
                const hSev = humanizeSeverity(rec.priority);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      paddingBottom: '12px',
                      borderBottom: idx !== Math.min(topRecommendations.length, 4) - 1 ? '1px solid var(--color-border)' : 'none'
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      <span className={hSev.badgeClass} style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        {hSev.label}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-text-primary)',
                          lineHeight: '1.4',
                          fontWeight: 600
                        }}
                      >
                        {hFinding.headline}
                      </p>
                      <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                        {hFinding.summary}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '11px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 500 }}>
                          {humanizeCategory(rec.category)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {topRecommendations.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: '4px' }}
                onClick={() => handleFixesView(latestReport)}
              >
                <span>View all fixes ({topRecommendations.length})</span>
                <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

