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
  const { reports, setCurrentReport, setCurrentTab } = useApp();

  // Pick the latest report or default to a mock report structure
  const latestReport = reports[0];

  // Performance trends data points (mock)
  const trendData = [
    { date: 'Jun 20', score: 85 },
    { date: 'Jun 21', score: 87 },
    { date: 'Jun 22', score: 86 },
    { date: 'Jun 23', score: 90 },
    { date: 'Jun 24', score: 88 },
    { date: 'Jun 25', score: 92 },
    { date: 'Jun 26', score: 94 }
  ];

  const handleReportView = (report: Report) => {
    setCurrentReport(report);
    setCurrentTab('results');
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'metric-score-green';
    if (score >= 70) return 'metric-score-orange';
    return 'metric-score-red';
  };

  const mostCommonIssues = [
    { title: 'Duplicate libraries moment.js loaded in framework bundles', category: 'JS Bundle', severity: 'High', code: 'rec-2' },
    { title: 'Uncompressed PNG background assets found on initial paint', category: 'Images', severity: 'High', code: 'rec-1' },
    { title: 'Render-blocking CSS styles delaying main content paint', category: 'Styles', severity: 'Medium', code: 'rec-3' },
    { title: 'Insufficient color contrast ratios in footer text links', category: 'A11y', severity: 'Medium', code: 'rec-4' }
  ];

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
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Historical telemetry scores over the past 7 audits.</p>
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
                  domain={[60, 100]}
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
            {mostCommonIssues.map((issue, idx) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
