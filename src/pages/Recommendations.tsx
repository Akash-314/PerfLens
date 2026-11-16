import React, { useState } from 'react';
import { useApp, type Recommendation } from '../context/AppContext';
import { Search, Sparkles, Filter } from 'lucide-react';
import { HumanizedRecommendationCard } from '../components/HumanizedRecommendationCard';

export const Recommendations: React.FC = () => {
  const { reports, setCurrentTab } = useApp();
  const [selectedScanFilter, setSelectedScanFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'performance' | 'accessibility' | 'seo' | 'images' | 'js'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  // Scoped reports based on user selector
  const targetReports = selectedScanFilter === 'all'
    ? reports
    : reports.filter((r) => r.id === selectedScanFilter);

  // Compile recommendations with deterministic scan and host ownership
  const scopedRecommendations: Recommendation[] = [];
  const seenKeys = new Set<string>();

  targetReports.forEach((report) => {
    report.recommendations.forEach((rec) => {
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
  const pageTitle = selectedReport
    ? `Fixes for ${selectedReport.url.replace(/^https?:\/\//, '')}`
    : 'Fixes for your website';
  const pageSubtitle = selectedReport
    ? `We've grouped the problems by impact so you can start with the changes that matter most.`
    : `We've grouped the problems across all ${reports.length} websites by impact so you can start with the changes that matter most.`;

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {pageSubtitle}
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-secondary)' }}>
          <Sparkles size={36} style={{ color: 'var(--color-accent-cyan)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            No fixes found yet
          </h2>
          <p style={{ fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            Check a website first so PerfLens can find the highest-impact improvements for you.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            Check a website
          </button>
        </div>
      ) : (
        <>
          {/* Friendly Filter Toolbar */}
          <div
            className="card"
            style={{
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '14px 18px',
              marginBottom: '24px',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            {/* Website Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Website:
              </span>
              <select
                className="form-input"
                value={selectedScanFilter}
                onChange={(e) => setSelectedScanFilter(e.target.value)}
                style={{
                  fontSize: '12.5px',
                  padding: '5px 10px',
                  height: '34px',
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-md)',
                  maxWidth: '240px'
                }}
              >
                <option value="all">All Sites ({reports.length} scans)</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.url.replace(/^https?:\/\//, '')} ({r.timestamp.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '5px 12px', backgroundColor: 'var(--color-surface-secondary)', height: '34px' }}>
              <Search size={14} style={{ color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search fixes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: 'var(--color-text-primary)' }}
              />
            </div>

            {/* Friendly Impact Filter */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => setPriorityFilter('all')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: priorityFilter === 'all' ? 'var(--color-surface-secondary)' : 'transparent',
                  borderColor: priorityFilter === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                All impact
              </button>
              <button
                onClick={() => setPriorityFilter('high')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: priorityFilter === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  borderColor: priorityFilter === 'high' ? 'var(--color-danger)' : 'var(--color-border)',
                  color: priorityFilter === 'high' ? '#fca5a5' : 'inherit',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                High impact
              </button>
              <button
                onClick={() => setPriorityFilter('medium')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: priorityFilter === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  borderColor: priorityFilter === 'medium' ? 'var(--color-warning)' : 'var(--color-border)',
                  color: priorityFilter === 'medium' ? '#fcd34d' : 'inherit',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                Worth fixing
              </button>
              <button
                onClick={() => setPriorityFilter('low')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: priorityFilter === 'low' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  borderColor: priorityFilter === 'low' ? 'var(--color-success)' : 'var(--color-border)',
                  color: priorityFilter === 'low' ? '#86efac' : 'inherit',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                Nice improvement
              </button>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => setCategoryFilter('all')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: categoryFilter === 'all' ? 'var(--color-surface-secondary)' : 'transparent',
                  borderColor: categoryFilter === 'all' ? 'var(--color-accent-cyan)' : 'var(--color-border)',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                All categories
              </button>
              <button
                onClick={() => setCategoryFilter('performance')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: categoryFilter === 'performance' ? 'var(--color-surface-secondary)' : 'transparent',
                  borderColor: categoryFilter === 'performance' ? 'var(--color-accent-cyan)' : 'var(--color-border)',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                Speed
              </button>
              <button
                onClick={() => setCategoryFilter('accessibility')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: categoryFilter === 'accessibility' ? 'var(--color-surface-secondary)' : 'transparent',
                  borderColor: categoryFilter === 'accessibility' ? 'var(--color-accent-cyan)' : 'var(--color-border)',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                Accessibility
              </button>
              <button
                onClick={() => setCategoryFilter('seo')}
                className="btn btn-secondary btn-sm"
                style={{
                  backgroundColor: categoryFilter === 'seo' ? 'var(--color-surface-secondary)' : 'transparent',
                  borderColor: categoryFilter === 'seo' ? 'var(--color-accent-cyan)' : 'var(--color-border)',
                  fontSize: '11.5px',
                  height: '32px'
                }}
              >
                Search & Sharing
              </button>
            </div>
          </div>

          {/* Recommendations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredRecs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-xl)' }}>
                <Filter size={28} style={{ color: 'var(--color-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>No matching fixes</p>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  Try changing your search term or selecting "All impact".
                </p>
              </div>
            ) : (
              filteredRecs.map((rec) => (
                <HumanizedRecommendationCard
                  key={rec.id}
                  rec={rec}
                  expanded={Boolean(expandedRecs[rec.id])}
                  onToggle={() => toggleRec(rec.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

