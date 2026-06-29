import React, { useState } from 'react';
import { useApp, type Report } from '../context/AppContext';
import { Search, ArrowUpRight, Share2, Trash2 } from 'lucide-react';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Saved Reports</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Historical logs and audits generated across domains.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          Run Audit Scan
        </button>
      </div>

      {/* Toolbar Search / Filter */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '12px 16px',
          marginBottom: '20px',
          backgroundColor: 'var(--color-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', backgroundColor: 'var(--color-bg)' }}>
          <Search size={14} style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search report URLs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      {/* Reports Table list */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('url')} style={{ cursor: 'pointer' }}>Host URL</th>
              <th onClick={() => handleSort('overall')} style={{ cursor: 'pointer' }}>Score</th>
              <th>FCP</th>
              <th>LCP</th>
              <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>Audited At</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedReports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)' }}>
                  No saved audits found. Enter a domain on the analyze tab.
                </td>
              </tr>
            ) : (
              sortedReports.map((report) => (
                <tr key={report.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{report.url}</td>
                  <td>
                    <span
                      className={`metric-pill ${
                        report.scores.overall >= 90
                          ? 'metric-score-green'
                          : report.scores.overall >= 70
                          ? 'metric-score-orange'
                          : 'metric-score-red'
                      }`}
                    >
                      {report.scores.overall}/100
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{report.vitals.fcp.value}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{report.vitals.lcp.value}</td>
                  <td>{report.timestamp}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleInspect(report)}
                        title="Open report"
                      >
                        <ArrowUpRight size={13} />
                        <span>Inspect</span>
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
                          if (confirm(`Are you sure you want to delete the performance report for ${report.url}?`)) {
                            deleteReport(report.id);
                          }
                        }}
                        title="Delete report"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
