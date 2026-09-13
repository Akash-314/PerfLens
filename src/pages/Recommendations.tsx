import React, { useState } from 'react';
import { useApp, type Recommendation } from '../context/AppContext';
import { Search, ChevronDown, ExternalLink } from 'lucide-react';

export const Recommendations: React.FC = () => {
  const { reports } = useApp();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'performance' | 'accessibility' | 'seo' | 'images' | 'js'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  // Flatten recommendations from all generated reports to populate recommendations page
  const allRecommendations: Recommendation[] = [];
  const seenIds = new Set<string>();

  reports.forEach((report) => {
    report.recommendations.forEach((rec) => {
      const uniqueKey = `${report.url}-${rec.id}`;
      if (!seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        // Include source url reference
        allRecommendations.push({ ...rec, id: uniqueKey, whyItMatters: `[Source: ${report.url}] ${rec.whyItMatters}` });
      }
    });
  });

  const toggleRec = (id: string) => {
    setExpandedRecs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'high') return 'metric-score-red';
    if (priority === 'medium') return 'metric-score-orange';
    return 'metric-score-green';
  };

  const filteredRecs = allRecommendations.filter((rec) => {
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

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Actionable Recommendations</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Categorized task boards designed to optimize web vitals.</p>
        </div>
      </div>

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
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', backgroundColor: 'var(--color-bg)' }}>
          <Search size={14} style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search optimization fixes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: 'var(--color-text-primary)' }}
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
                textTransform: 'capitalize'
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
                textTransform: 'capitalize'
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
            <div key={rec.id} className="expandable-card">
              <div
                className="expandable-card-header"
                onClick={() => toggleRec(rec.id)}
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span className={`metric-pill ${getPriorityBadgeClass(rec.priority)}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                    {rec.priority}
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rec.issue}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'capitalize' }}>
                    {rec.category}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: expandedRecs[rec.id] ? 'rotate(180deg)' : 'none',
                      transition: 'transform var(--transition-fast)',
                      color: 'var(--color-muted)'
                    }}
                  />
                </div>
              </div>

              {expandedRecs[rec.id] && (
                <div className="expandable-card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {rec.finding && (
                    <div style={{ padding: '10px 12px', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--color-text-primary)' }}>
                      <strong>Audit Finding:</strong> {rec.finding.description}
                    </div>
                  )}

                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    <strong>Potential Impact:</strong> {rec.potentialImpact || rec.whyItMatters}
                  </p>

                  {rec.evidence && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)' }}>Diagnostic Evidence:</span>
                      <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11.5px', fontFamily: 'monospace' }}>
                        {Array.isArray(rec.evidence) ? (
                          rec.evidence.map((ev: any, evIdx: number) => (
                            <div key={evIdx} style={{ marginBottom: evIdx < (rec.evidence as any[]).length - 1 ? '4px' : 0 }}>
                              • <strong>{ev.type}</strong>: {ev.resource || ev.selector || ''} {ev.duration ? `(${ev.duration}ms)` : ''} {ev.sizeKb ? `(${ev.sizeKb} KB)` : ''}
                            </div>
                          ))
                        ) : (
                          <span>{String(rec.evidence)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)' }}>Suggested Code / Architectural Fix:</span>
                    <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      <code style={{ fontSize: '12px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', background: 'none', padding: 0 }}>
                        {rec.suggestedFix}
                      </code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '11px', color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '4px' }}>
                    <span>
                      Estimate Type: <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>{rec.estimateType || rec.estimatedSavings?.type || 'not_quantified'}</strong>
                    </span>
                    <span>
                      Estimated Savings: <strong style={{ color: 'var(--color-success)' }}>{rec.estimatedSavings?.displayString || rec.estimatedImprovement || 'Not quantified'}</strong>
                    </span>
                    <span>
                      Confidence: <strong style={{ textTransform: 'uppercase' }}>{rec.confidence || 'HIGH'}</strong>
                    </span>
                    <span>
                      Difficulty: <strong style={{ textTransform: 'uppercase' }}>{rec.estimatedDifficulty || rec.difficulty || 'medium'}</strong>
                    </span>
                    <a href={rec.refUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span>Reference docs</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
