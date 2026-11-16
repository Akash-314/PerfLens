import React, { useState } from 'react';
import { useApp, type Recommendation } from '../context/AppContext';
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { HumanizedRecommendationCard } from '../components/HumanizedRecommendationCard';

export const Recommendations: React.FC = () => {
  const { reports, setCurrentTab } = useApp();
  const [selectedScanFilter, setSelectedScanFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'performance' | 'accessibility' | 'seo' | 'images' | 'js'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  const targetReports = selectedScanFilter === 'all'
    ? reports
    : reports.filter((r) => r.id === selectedScanFilter);

  const scopedRecommendations: Recommendation[] = [];
  const seenKeys = new Set<string>();

  targetReports.forEach((report) => {
    report.recommendations?.forEach((rec) => {
      const uniqueKey = `${report.id || report.url}-${rec.id}`;
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        scopedRecommendations.push({
          ...rec,
          id: uniqueKey,
          sourceUrl: report.url,
          scanTimestamp: report.timestamp,
          scanId: report.id
        });
      }
    });
  });

  const toggleRec = (id: string) => {
    setExpandedRecs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRecs = scopedRecommendations.filter((rec) => {
    const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
    const matchesCategory =
      categoryFilter === 'all' ||
      rec.category === categoryFilter ||
      (categoryFilter === 'performance' && ['js', 'css', 'images', 'performance'].includes(rec.category));
    const matchesSearch =
      rec.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.suggestedFix.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesCategory && matchesSearch;
  });

  const selectedReport = reports.find((r) => r.id === selectedScanFilter);

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
            Fixes
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
            {selectedReport
              ? `Recommended speed, accessibility, and SEO improvements for ${selectedReport.url.replace(/^https?:\/\//, '')}.`
              : `Found ${scopedRecommendations.length} potential improvements across ${reports.length} monitored websites.`}
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
          Check another website
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="gh-box" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <AlertCircle size={32} style={{ color: 'var(--color-fg-subtle)', margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '6px' }}>
            No fixes found yet
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            Check a website first so PerfLens can find the highest-impact improvements for you.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            Check a website
          </button>
        </div>
      ) : (
        <>
          {/* GitHub Issues-Style Filter Bar */}
          <div className="gh-box" style={{ padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Website Selector */}
              <select
                className="form-input"
                value={selectedScanFilter}
                onChange={(e) => setSelectedScanFilter(e.target.value)}
                style={{ height: '32px', fontSize: '12.5px', maxWidth: '220px' }}
              >
                <option value="all">All websites ({reports.length})</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.url.replace(/^https?:\/\//, '')}
                  </option>
                ))}
              </select>

              {/* Search input (GitHub issues filter input) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  minWidth: '200px',
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
                  placeholder="Filter fixes by keyword or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

              {/* Severity / Impact Buttons */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={`btn btn-sm ${priorityFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: priorityFilter === 'all' ? 'var(--color-border-strong)' : 'transparent' }}
                >
                  All impact
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`btn btn-sm ${priorityFilter === 'high' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    color: priorityFilter === 'high' ? 'var(--color-danger-fg)' : 'inherit',
                    borderColor: priorityFilter === 'high' ? 'var(--color-danger-fg)' : 'transparent'
                  }}
                >
                  High impact
                </button>
                <button
                  onClick={() => setPriorityFilter('medium')}
                  className={`btn btn-sm ${priorityFilter === 'medium' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    color: priorityFilter === 'medium' ? 'var(--color-attention-fg)' : 'inherit',
                    borderColor: priorityFilter === 'medium' ? 'var(--color-attention-fg)' : 'transparent'
                  }}
                >
                  Medium
                </button>
                <button
                  onClick={() => setPriorityFilter('low')}
                  className={`btn btn-sm ${priorityFilter === 'low' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    color: priorityFilter === 'low' ? 'var(--color-success-fg)' : 'inherit',
                    borderColor: priorityFilter === 'low' ? 'var(--color-success-fg)' : 'transparent'
                  }}
                >
                  Low
                </button>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: categoryFilter === 'all' ? 'var(--color-border-strong)' : 'transparent' }}
                >
                  All categories
                </button>
                <button
                  onClick={() => setCategoryFilter('performance')}
                  className={`btn btn-sm ${categoryFilter === 'performance' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: categoryFilter === 'performance' ? 'var(--color-accent-fg)' : 'transparent' }}
                >
                  Speed
                </button>
                <button
                  onClick={() => setCategoryFilter('accessibility')}
                  className={`btn btn-sm ${categoryFilter === 'accessibility' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: categoryFilter === 'accessibility' ? 'var(--color-accent-fg)' : 'transparent' }}
                >
                  Accessibility
                </button>
                <button
                  onClick={() => setCategoryFilter('seo')}
                  className={`btn btn-sm ${categoryFilter === 'seo' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ borderColor: categoryFilter === 'seo' ? 'var(--color-accent-fg)' : 'transparent' }}
                >
                  SEO
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Issues Container */}
          <div className="gh-box" style={{ padding: 0 }}>
            {/* GitHub Issues Box Header */}
            <div className="gh-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={15} style={{ color: 'var(--color-attention-fg)' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                  {filteredRecs.length} Open issues & fixes
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>
                Sorted by highest impact
              </span>
            </div>

            {/* Issue Rows */}
            <div>
              {filteredRecs.map((rec) => (
                <HumanizedRecommendationCard
                  key={rec.id}
                  rec={rec}
                  expanded={expandedRecs[rec.id]}
                  onToggle={() => toggleRec(rec.id)}
                />
              ))}

              {filteredRecs.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--color-success-fg)', margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-fg-default)' }}>
                    No matching fixes found
                  </p>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                    Try clearing or adjusting your search filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
