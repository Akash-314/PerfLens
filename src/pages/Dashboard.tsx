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
import { Zap, Search, AlertCircle, ArrowUpRight, Play, FileText } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { reports, setCurrentReport, setCurrentTab, loading, error, fetchData } = useApp();

  // Skeleton Loader UI
  if (loading) {
    return (
      <div className="workspace-container fade-in" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: '32px', width: '240px', backgroundColor: 'var(--color-surface)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '16px', width: '400px', backgroundColor: 'var(--color-surface)', borderRadius: '4px' }} />
        </div>
        <div className="grid-cols-4" style={{ marginBottom: '24px', animation: 'pulse 1.5s infinite' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: '100px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ height: '12px', width: '80px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: '2px' }} />
              <div style={{ height: '28px', width: '50px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: '2px' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', animation: 'pulse 1.5s infinite' }}>
          <div className="card" style={{ height: '280px', backgroundColor: 'var(--color-surface)' }} />
          <div className="card" style={{ height: '280px', backgroundColor: 'var(--color-surface)' }} />
        </div>
      </div>
    );
  }

  // Error State UI
  if (error) {
    return (
      <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--color-danger)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Connection Failure</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', maxWidth: '400px', marginBottom: '20px', lineHeight: '1.5' }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={fetchData}>
          Retry Connection
        </button>
      </div>
    );
  }

  // Empty State UI
  if (reports.length === 0) {
    return (
      <div className="workspace-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <Zap size={40} style={{ color: 'var(--color-muted)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Audits Saved Yet</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', maxWidth: '420px', marginBottom: '20px', lineHeight: '1.5' }}>
          Analyze a public target URL to generate performance diagrams, duplicate JS bundle inspections, and Core Web Vitals roadmaps.
        </p>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          Run First Scan
        </button>
      </div>
    );
  }

  // Pick the latest report
  const latestReport = reports[0];

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

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'metric-score-green';
    if (score >= 70) return 'metric-score-orange';
    return 'metric-score-red';
  };

  // Compile issues dynamically from recommendations of the latest audit report
  const mostCommonIssues = latestReport?.recommendations?.slice(0, 4).map((rec) => ({
    title: rec.issue,
    category: rec.category.toUpperCase(),
    severity: rec.priority.toLowerCase() === 'high' || rec.priority.toLowerCase() === 'critical' ? 'High' : 'Medium',
    code: rec.id
  })) || [];

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Workspace Overview</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Continuous performance telemetry and diagnostics.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          <Play size={12} fill="currentColor" />
          <span>New Diagnostics Scan</span>
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      {latestReport && (
        <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Overall Score</span>
              <span className={`metric-pill ${getScoreColorClass(latestReport.scores.overall)}`}>
                {latestReport.scores.overall}/100
              </span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {latestReport.scores.overall}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Average of all core categories</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Performance</span>
              <span className={`metric-pill ${getScoreColorClass(latestReport.scores.performance)}`}>
                {latestReport.scores.performance}%
              </span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {latestReport.scores.performance}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>LCP, TBT, Speed Index</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Accessibility</span>
              <span className={`metric-pill ${getScoreColorClass(latestReport.scores.accessibility)}`}>
                {latestReport.scores.accessibility}%
              </span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {latestReport.scores.accessibility}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Contrast, Aria patterns</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>SEO / Standards</span>
              <span className={`metric-pill ${getScoreColorClass(latestReport.scores.seo)}`}>
                {latestReport.scores.seo}%
              </span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {latestReport.scores.seo}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Meta tag & OpenGraph validity</span>
          </div>
        </div>
      )}

      <div className="grid-cols-3" style={{ marginBottom: '24px' }}>
        {/* Performance Trend Area Chart */}
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Performance Score Trend</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Historical telemetry scores over successive audits.</p>
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2}/>
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
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--color-text-primary)'
                  }}
                  itemStyle={{ color: 'var(--color-accent)' }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 12px', width: '100%' }}
              onClick={() => setCurrentTab('analyze')}
            >
              <Search size={14} />
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Run new website audit</p>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Scan any public url instantly</span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 12px', width: '100%' }}
              onClick={() => setCurrentTab('comparisons')}
            >
              <Zap size={14} />
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Compare side-by-side</p>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Test performance of two target hosts</span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 12px', width: '100%' }}
              onClick={() => setCurrentTab('reports')}
            >
              <FileText size={14} />
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Export performance reports</p>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Retrieve generated diagnostics logs</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Recent Audits Table */}
        <div className="table-container" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Recent Diagnostics History</h3>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Overall</th>
                <th>FCP</th>
                <th>LCP</th>
                <th>Scanned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 4).map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{r.url}</td>
                  <td>
                    <span className={`metric-pill ${getScoreColorClass(r.scores.overall)}`}>
                      {r.scores.overall}
                    </span>
                  </td>
                  <td>{r.vitals.fcp.value}</td>
                  <td>{r.vitals.lcp.value}</td>
                  <td style={{ fontSize: '12px' }}>{r.timestamp.split(',')[0]}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: '4px' }}
                      onClick={() => handleReportView(r)}
                    >
                      <span>Inspect</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Most Common Issues */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Frequent Warnings</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Core bottlenecks grouped across your sites.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mostCommonIssues.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', padding: '12px' }}>
                No active performance warnings detected.
              </p>
            ) : (
              mostCommonIssues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    paddingBottom: '12px',
                    borderBottom: idx !== mostCommonIssues.length - 1 ? '1px solid var(--color-border)' : 'none'
                  }}
                >
                  <AlertCircle
                    size={14}
                    style={{
                      color: issue.severity === 'High' ? 'var(--color-danger)' : 'var(--color-warning)',
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-primary)',
                        lineHeight: '1.4',
                        fontWeight: 500
                      }}
                    >
                      {issue.title}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10px' }}>
                      <span style={{ color: 'var(--color-accent)' }}>{issue.category}</span>
                      <span style={{ color: 'var(--color-muted)' }}>•</span>
                      <span style={{ color: 'var(--color-muted)' }}>Severity: {issue.severity}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
