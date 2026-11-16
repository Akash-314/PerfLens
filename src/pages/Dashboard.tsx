import React, { useState } from 'react';
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
import {
  Sparkles,
  Search,
  Globe,
  GitCompare,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Play
} from 'lucide-react';
import { humanizeFinding, humanizeSeverity } from '../utils/developerCoach';
import { getUserNameFromEmail } from '../services/auth/auth.helpers';

export const Dashboard: React.FC = () => {
  const {
    reports,
    setCurrentReport,
    setCurrentTab,
    loading,
    error,
    fetchData,
    startAnalysis,
    user
  } = useApp();

  const [promptUrl, setPromptUrl] = useState('');
  const [includePageSpeed, setIncludePageSpeed] = useState(true);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptUrl.trim()) {
      startAnalysis(promptUrl.trim(), includePageSpeed);
      setPromptUrl('');
    }
  };

  const handleOpenReport = (r: Report) => {
    setCurrentReport(r);
    setCurrentTab('results');
  };

  const handleOpenFixes = (r: Report) => {
    setCurrentReport(r);
    setCurrentTab('recommendations');
  };

  // Determine time-of-day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.name || getUserNameFromEmail(user?.email || 'Akash-314');

  // Loading state
  if (loading) {
    return (
      <div className="workspace-container fade-in">
        <div style={{ marginBottom: '24px' }}>
          <div className="skeleton-shimmer" style={{ height: '28px', width: '280px', marginBottom: '8px' }} />
          <div className="skeleton-shimmer" style={{ height: '16px', width: '400px' }} />
        </div>
        <div className="skeleton-shimmer" style={{ height: '140px', marginBottom: '24px', borderRadius: '6px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div className="skeleton-shimmer" style={{ height: '320px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ height: '320px', borderRadius: '6px' }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="workspace-container fade-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-danger-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <AlertCircle size={24} style={{ color: 'var(--color-danger-fg)' }} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '8px' }}>
          Unable to load website overview
        </h2>
        <p style={{ color: 'var(--color-fg-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px auto' }}>
          {error || 'Could not fetch your website scan history. Please check your network connection.'}
        </p>
        <button className="btn btn-secondary" onClick={fetchData}>
          Try again
        </button>
      </div>
    );
  }

  // Pick latest report & metrics
  const latestReport = reports[0];

  // Trend Recharts Data
  const trendData = reports
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      date: r.timestamp.split(',')[0],
      score: r.scores?.overall ?? 0
    }));

  // Trend Diff
  let trendHeadline = 'Consistent performance across recent scans.';
  let trendIcon = <Minus size={14} style={{ color: 'var(--color-fg-subtle)' }} />;
  if (reports.length > 1) {
    const diff = reports[0].scores.overall - reports[1].scores.overall;
    if (diff > 0) {
      trendHeadline = `+${diff} points improvement since last scan.`;
      trendIcon = <TrendingUp size={14} style={{ color: 'var(--color-success-fg)' }} />;
    } else if (diff < 0) {
      trendHeadline = `${diff} points lower than previous scan.`;
      trendIcon = <TrendingDown size={14} style={{ color: 'var(--color-attention-fg)' }} />;
    }
  }

  // Collect top issues across recent reports
  const allIssues: Array<{ issue: string; category: string; priority: string; url: string; report: Report }> = [];
  reports.slice(0, 3).forEach((r) => {
    r.recommendations?.slice(0, 2).forEach((rec) => {
      allIssues.push({
        issue: rec.issue,
        category: rec.category,
        priority: rec.priority || 'medium',
        url: r.url,
        report: r
      });
    });
  });

  return (
    <div className="workspace-container fade-in">
      {/* GitHub Greeting Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: 'var(--color-purple-fg)' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
            {timeGreeting}, {displayName}!
          </h1>
          <span className="badge badge-purple" style={{ fontSize: '11px', padding: '1px 6px' }}>
            Preview
          </span>
        </div>

        {reports.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>Latest monitored:</span>
            <span
              style={{
                fontSize: '12.5px',
                color: 'var(--color-accent-fg)',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onClick={() => handleOpenReport(latestReport)}
            >
              {latestReport.url.replace(/^https?:\/\//, '')}
            </span>
            <span className={`badge ${latestReport.scores.overall >= 90 ? 'badge-green' : latestReport.scores.overall >= 70 ? 'badge-yellow' : 'badge-red'}`} style={{ fontSize: '11px', padding: '0 5px' }}>
              {latestReport.scores.overall}/100
            </span>
          </div>
        )}
      </div>

      {/* Prominent GitHub-Style Prompt & Scan Box */}
      <div className="gh-prompt-box" style={{ marginBottom: '24px' }}>
        <form onSubmit={handlePromptSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Search size={16} style={{ color: 'var(--color-fg-muted)' }} />
            <input
              type="text"
              placeholder="What website should we check? Paste your URL (e.g. mywebsite.com)..."
              value={promptUrl}
              onChange={(e) => setPromptUrl(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: 'var(--color-fg-default)',
                flex: 1,
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-default)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--color-fg-muted)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={includePageSpeed}
                  onChange={(e) => setIncludePageSpeed(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent-fg)' }}
                />
                <span>Include Google PageSpeed telemetry</span>
              </label>

              <span style={{ color: 'var(--color-border-strong)', fontSize: '12px' }}>•</span>
              <span style={{ fontSize: '12px', color: 'var(--color-fg-subtle)' }}>
                Inspects speed, accessibility, and SEO
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!promptUrl.trim()}
              >
                <Play size={12} fill="currentColor" />
                <span>Check website</span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick action shortcuts below prompt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--color-fg-subtle)', marginRight: '4px' }}>Quick actions:</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentTab('reports')}
          >
            <Clock size={12} />
            <span>View recent scans</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentTab('comparisons')}
          >
            <GitCompare size={12} />
            <span>Compare websites</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentTab('recommendations')}
          >
            <Sparkles size={12} />
            <span>Explore fixes</span>
          </button>
        </div>
      </div>

      {/* GitHub Dashboard Two-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '24px' }}>
        {/* Left Column: Your websites & Things worth fixing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* Section: Your websites (GitHub Repositories List Style) */}
          <div className="gh-box" style={{ padding: 0 }}>
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={15} style={{ color: 'var(--color-fg-muted)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Your websites
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '0 5px' }}>
                  {reports.length}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentTab('reports')}
                style={{ fontSize: '12px' }}
              >
                View all scans
              </button>
            </div>

            <div>
              {reports.slice(0, 5).map((r) => {
                const domain = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const score = r.scores?.overall ?? 0;
                const scoreBadge = score >= 90 ? 'badge-green' : score >= 70 ? 'badge-yellow' : 'badge-red';
                const statusText = score >= 90 ? 'Healthy' : score >= 70 ? 'Needs attention' : 'Critical fixes';
                return (
                  <div key={r.id} className="gh-box-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-surface-secondary)',
                          border: '1px solid var(--color-border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-accent-fg)',
                          flexShrink: 0
                        }}
                      >
                        {domain[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            onClick={() => handleOpenReport(r)}
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: 'var(--color-accent-fg)',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={domain}
                          >
                            {domain}
                          </span>
                          <span className={`badge ${scoreBadge}`} style={{ fontSize: '11px', padding: '0 6px' }}>
                            {score} / 100
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                          <span>{statusText}</span>
                          <span>•</span>
                          <span>LCP: {r.vitals?.lcp?.value || '2.4s'}</span>
                          <span>•</span>
                          <span>Scanned {r.timestamp.split(',')[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenReport(r)}
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })}

              {reports.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
                  <p style={{ fontSize: '13px', marginBottom: '12px' }}>No websites scanned yet.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('analyze')}>
                    Check your first website
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section: Things worth fixing (GitHub Issues Style) */}
          <div className="gh-box" style={{ padding: 0 }}>
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} style={{ color: 'var(--color-attention-fg)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  Things worth fixing
                </span>
                <span className="badge badge-yellow" style={{ fontSize: '11px', padding: '0 5px' }}>
                  Open issues
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentTab('recommendations')}
                style={{ fontSize: '12px' }}
              >
                View all fixes
              </button>
            </div>

            <div>
              {allIssues.slice(0, 4).map((issueItem, idx) => {
                const coach = humanizeFinding(issueItem.issue, issueItem.category);
                const impact = humanizeSeverity(issueItem.priority);
                const isHigh = issueItem.priority === 'high';
                return (
                  <div
                    key={idx}
                    className="gh-box-row"
                    onClick={() => handleOpenFixes(issueItem.report)}
                    style={{ cursor: 'pointer', gap: '12px' }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      <AlertCircle
                        size={15}
                        style={{
                          color: isHigh ? 'var(--color-danger-fg)' : 'var(--color-attention-fg)'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                          {coach.headline}
                        </span>
                        <span className={impact.badgeClass}>
                          {impact.label}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                          {issueItem.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', margin: '3px 0 0 0', lineHeight: '1.4' }}>
                        {coach.summary}
                      </p>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-fg-subtle)', marginTop: '4px' }}>
                        Target: {issueItem.url.replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--color-fg-subtle)', flexShrink: 0 }} />
                  </div>
                );
              })}

              {allIssues.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: '13px' }}>
                  No issues to show right now. Run a website check above to uncover fixes.
                </div>
              )}
            </div>
          </div>

          {/* Section: Website Health Trends (GitHub Style Area Chart) */}
          {trendData.length > 1 && (
            <div className="gh-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                    Website health trends
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Historical score trajectory across audits.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-fg-muted)' }}>
                  {trendIcon}
                  <span>{trendHeadline}</span>
                </div>
              </div>

              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ghAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-fg)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-accent-fg)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="var(--color-fg-subtle)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-fg-subtle)"
                      fontSize={11}
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--color-fg-default)'
                      }}
                      itemStyle={{ color: 'var(--color-accent-hover)' }}
                      labelStyle={{ color: 'var(--color-fg-muted)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-accent-fg)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#ghAreaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Activity, Summary, Getting Started (GitHub Right Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Website Health Summary Card */}
          <div className="gh-box">
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '12px' }}>
              Overview metrics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)' }}>Monitored domains</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>{reports.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)' }}>Average health score</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  {reports.length > 0
                    ? Math.round(reports.reduce((acc, curr) => acc + (curr.scores?.overall || 0), 0) / reports.length)
                    : 0} / 100
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)' }}>Open high impact fixes</span>
                <span className="badge badge-red" style={{ fontSize: '11px', padding: '0 6px' }}>
                  {allIssues.filter((i) => i.priority === 'high').length}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline (GitHub "Latest from GitHub" Style) */}
          <div className="gh-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                Recent activity
              </h3>
              <Clock size={13} style={{ color: 'var(--color-fg-subtle)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
              {reports.slice(0, 4).map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: r.scores?.overall >= 90 ? 'var(--color-success-fg)' : r.scores?.overall >= 70 ? 'var(--color-attention-fg)' : 'var(--color-danger-fg)',
                      marginTop: '5px',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-fg-subtle)' }}>
                      {r.timestamp.split(',')[0]}
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--color-accent-fg)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleOpenReport(r)}
                    >
                      Audit for {r.url.replace(/^https?:\/\//, '')}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-fg-muted)' }}>
                      Scored {r.scores?.overall}/100 • {r.recommendations?.length || 0} fixes found
                    </div>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--color-fg-subtle)' }}>
                  No recent scan activity recorded.
                </div>
              )}
            </div>
          </div>

          {/* Getting Started Guide */}
          <div className="gh-box">
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '8px' }}>
              Getting started with PerfLens
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-fg-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Keep your websites fast, responsive, and readable with beginner-friendly developer tools.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-fg-default)' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--color-success-fg)' }} />
                <span>Check URL for Core Web Vitals</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-fg-default)' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--color-success-fg)' }} />
                <span>Fix high-impact bottlenecks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-fg-default)' }}>
                <CheckCircle2 size={13} style={{ color: 'var(--color-success-fg)' }} />
                <span>Export executive PDF reports</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
