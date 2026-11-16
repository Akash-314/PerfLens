import React, { useState } from 'react';
import { useApp, type Report } from '../context/AppContext';
import { Search, ArrowUpRight, Share2, Trash2, Sparkles, Play } from 'lucide-react';
import { getScoreCoaching, humanizeFinding } from '../utils/developerCoach';

export const ReportsList: React.FC = () => {
  const { reports, setCurrentReport, setCurrentTab, addToast, deleteReport } = useApp();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'timestamp' | 'url' | 'overall'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleInspect = (report: Report) => {
    setCurrentReport(report);
    setCurrentTab('results');
  };

  const handleShare = (url: string) => {
    navigator.clipboard.writeText(`https://perflens.com/reports/${url}`);
    addToast(`Link to report for ${url} copied!`, 'success');
  };

  // Sort and filter logic
  const filteredReports = reports.filter((r) =>
    r.url.toLowerCase().includes(search.toLowerCase())
  );

  const sortedReports = [...filteredReports].sort((a, b) => {
    let fieldA: any;
    let fieldB: any;

    if (sortField === 'overall') {
      fieldA = a.scores.overall;
      fieldB = b.scores.overall;
    } else {
      fieldA = a[sortField as 'timestamp' | 'url'];
      fieldB = b[sortField as 'timestamp' | 'url'];
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'timestamp' | 'url' | 'overall') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            Your recent scans
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Open a previous scan to see what changed and what to fix.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          <Play size={14} fill="currentColor" />
          <span>Check a website</span>
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-xl)' }}>
          <Sparkles size={36} style={{ color: 'var(--color-accent-cyan)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            No scans saved yet
          </h2>
          <p style={{ fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            Check a website to inspect speed, accessibility, SEO, and get actionable recommendations.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            Check your first website
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar Search / Filter */}
          <div
            className="card"
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              padding: '14px 18px',
              marginBottom: '20px',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', backgroundColor: 'var(--color-surface-secondary)' }}>
              <Search size={14} style={{ color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search scans by URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: 'var(--color-text-primary)' }}
              />
            </div>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              Showing {sortedReports.length} of {reports.length} scans
            </span>
          </div>

          {/* Reports Table list */}
          <div className="table-container" style={{ borderRadius: 'var(--radius-xl)' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('url')} style={{ cursor: 'pointer' }}>Website</th>
                  <th onClick={() => handleSort('overall')} style={{ cursor: 'pointer' }}>Health</th>
                  <th>Main Issue to Fix</th>
                  <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>Scanned</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-muted)' }}>
                      No scans match your search query.
                    </td>
                  </tr>
                ) : (
                  sortedReports.map((report) => {
                    const coaching = getScoreCoaching(report.scores.overall);
                    const topRec = report.recommendations?.[0];
                    const topIssue = topRec ? humanizeFinding(topRec.issue, topRec.category) : null;
                    return (
                      <tr key={report.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          <div>
                            <span style={{ fontSize: '13.5px' }}>{report.url.replace(/^https?:\/\//, '')}</span>
                            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                              Speed: {report.scores.performance}% • Accessibility: {report.scores.accessibility}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`metric-pill ${coaching.badgeClass}`}>
                            {report.scores.overall}/100 • {coaching.pillText}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px' }}>
                          {topIssue ? (
                            <div>
                              <p style={{ fontSize: '12.5px', color: 'var(--color-text-primary)', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                                {topIssue.headline}
                              </p>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                {report.recommendations.length} total fix{report.recommendations.length > 1 ? 'es' : ''}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500 }}>
                              ✓ All clear
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {report.timestamp.split(',')[0]}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleInspect(report)}
                              title="Open scan"
                              style={{ gap: '4px' }}
                            >
                              <span>Open scan</span>
                              <ArrowUpRight size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleShare(report.url)}
                              title="Copy shareable link"
                            >
                              <Share2 size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove the scan for ${report.url}?`)) {
                                  deleteReport(report.id);
                                }
                              }}
                              title="Delete scan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

