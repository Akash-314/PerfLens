import React, { useState } from 'react';
import { useApp, type Recommendation } from '../context/AppContext';
import { Search } from 'lucide-react';
import { HumanizedRecommendationCard } from '../components/HumanizedRecommendationCard';

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
            <HumanizedRecommendationCard
              key={rec.id}
              rec={rec}
              expanded={Boolean(expandedRecs[rec.id])}
              onToggle={() => toggleRec(rec.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
