import React, { useState } from 'react';
import { useApp, type Report } from '../context/AppContext';
import { Search, ArrowUpRight, Share2, Trash2, Clock, Play, FileText } from 'lucide-react';

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

  const filteredReports = reports.filter((r) =>
    r.url.toLowerCase().includes(search.toLowerCase())
  );

  const sortedReports = [...filteredReports].sort((a, b) => {
    let fieldA: any;
    let fieldB: any;

    if (sortField === 'overall') {
      fieldA = a.scores?.overall ?? 0;
      fieldB = b.scores?.overall ?? 0;
    } else {
      fieldA = a[sortField as 'timestamp' | 'url'] || '';
      fieldB = b[sortField as 'timestamp' | 'url'] || '';
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
            Recent scans
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
            Historical audit records, performance scores, and downloadable summaries.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          <Play size={12} fill="currentColor" />
          <span>Check a website</span>
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="gh-box" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Clock size={32} style={{ color: 'var(--color-fg-subtle)', margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '6px' }}>
            No scans saved yet
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
            Check a website to inspect speed, accessibility, SEO, and get actionable recommendations.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            Check your first website
          </button>
        </div>
      ) : (
        <>
          {/* GitHub-Style Search & Filter Bar */}
          <div className="gh-box" style={{ padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  minWidth: '220px',
                  backgroundColor: 'var(--color-canvas-default)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 10px',
                  height: '32px'
                }}
              >
                <Search size={13} style={{ color: 'var(--color-fg-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter scans by domain name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '13px',
                    color: 'var(--color-fg-default)',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>Sort by:</span>
                <select
                  className="form-input"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  style={{ height: '32px', fontSize: '12.5px', padding: '0 8px' }}
                >
                  <option value="timestamp">Scan date</option>
                  <option value="overall">Health score</option>
                  <option value="url">Domain name</option>
                </select>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title="Toggle sort direction"
                >
                  {sortOrder === 'desc' ? 'Desc ↓' : 'Asc ↑'}
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Repository / File Listing Box */}
          <div className="gh-box" style={{ padding: 0 }}>
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} style={{ color: 'var(--color-fg-muted)' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  {filteredReports.length} Scans recorded
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>
                Sorted by {sortField} ({sortOrder})
              </span>
            </div>

            <div>
              {sortedReports.map((r) => {
                const domain = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const score = r.scores?.overall ?? 0;
                const scoreBadge = score >= 90 ? 'badge-green' : score >= 70 ? 'badge-yellow' : 'badge-red';
                const statusText = score >= 90 ? 'Healthy' : score >= 70 ? 'Needs attention' : 'Critical fixes';
                return (
                  <div
                    key={r.id}
                    className="gh-box-row"
                    style={{ justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: 1 }}>
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
                            onClick={() => handleInspect(r)}
                            style={{
                              fontSize: '14px',
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
                          <span className={`badge ${scoreBadge}`}>
                            {score} / 100
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)', display: 'flex', gap: '8px', marginTop: '3px' }}>
                          <span>{statusText}</span>
                          <span>•</span>
                          <span>Speed: {r.scores?.performance ?? 0}%</span>
                          <span>•</span>
                          <span>Main content: {r.vitals?.lcp?.value || '—'}</span>
                          <span>•</span>
                          <span>{r.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleInspect(r)}
                        style={{ gap: '4px' }}
                      >
                        <span>Inspect</span>
                        <ArrowUpRight size={12} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleShare(r.url)}
                        title="Share link"
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteReport(r.id)}
                        style={{ color: 'var(--color-danger-fg)' }}
                        title="Delete scan"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredReports.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: '13px' }}>
                  No scans matching "{search}".
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
