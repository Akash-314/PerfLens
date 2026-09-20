import React, { useState } from 'react';
import { useApp, type Recommendation } from '../context/AppContext';
import { Search, Sparkles } from 'lucide-react';
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
    ? `Recommendations — ${selectedReport.url}`
    : 'Recommendations Across Audited Sites';
  const pageSubtitle = selectedReport
    ? `Actionable findings from scan on ${selectedReport.timestamp} (Score: ${selectedReport.scores.overall}/100)`
    : `Categorized optimization roadmap aggregated across ${reports.length} audited sites.`;

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>{pageTitle}</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{pageSubtitle}</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-muted)' }}>
          <Sparkles size={32} style={{ color: 'var(--color-border)', marginBottom: '16px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>No Recommendations Yet</p>
          <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '420px', margin: '6px auto 20px auto' }}>
            Run an audit scan on any domain to inspect performance issues and generate actionable fixes.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            Run First Audit
          </button>
        </div>
      ) : (
        <>
          {/* Filter Toolbar */}
          <div
            className="card"
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '16px',
              marginBottom: '24px',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            {/* Scan scope dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Scope:
              </span>
              <select
                className="form-input"
                value={selectedScanFilter}
                onChange={(e) => setSelectedScanFilter(e.target.value)}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  height: '32px',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  maxWidth: '240px'
                }}
              >
                <option value="all">All Sites ({reports.length} scans)</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.url} ({r.timestamp.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 10px', backgroundColor: 'var(--color-bg)', height: '32px' }}>
              <Search size={13} style={{ color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search fixes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '12.5px', color: 'var(--color-text-primary)' }}
              />
            </div>

            {/* Priority Filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    backgroundColor: priorityFilter === p ? 'var(--color-surface-secondary)' : 'transparent',
                    borderColor: priorityFilter === p ? 'var(--color-muted)' : 'var(--color-border)',
                    textTransform: 'capitalize',
                    height: '32px',
                    fontSize: '11.5px'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'performance', 'accessibility', 'seo'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    backgroundColor: categoryFilter === c ? 'var(--color-surface-secondary)' : 'transparent',
                    borderColor: categoryFilter === c ? 'var(--color-muted)' : 'var(--color-border)',
                    textTransform: 'capitalize',
                    height: '32px',
                    fontSize: '11.5px'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                No recommendations match your active filter configuration.
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
