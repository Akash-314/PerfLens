import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, LayoutDashboard, Globe, GitCompare, Sparkles, Settings, FileBarChart } from 'lucide-react';

export const CommandMenu: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    setCurrentTab,
    reports,
    setCurrentReport,
    startAnalysis
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [globalSearchOpen]);

  // Command configurations
  const items = [
    { type: 'action', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => setCurrentTab('dashboard'), shortcut: '↵' },
    { type: 'action', label: 'Start New Performance Audit', icon: Globe, action: () => setCurrentTab('analyze'), shortcut: '↵' },
    { type: 'action', label: 'Compare Two Websites Side-by-Side', icon: GitCompare, action: () => setCurrentTab('comparisons'), shortcut: '↵' },
    { type: 'action', label: 'Open Optimization Recommendations', icon: Sparkles, action: () => setCurrentTab('recommendations'), shortcut: '↵' },
    { type: 'action', label: 'Configure Scanning Settings', icon: Settings, action: () => setCurrentTab('settings'), shortcut: '↵' }
  ];

  // Map reports to command items
  const reportItems = reports.map((r) => ({
    type: 'report',
    label: `Open Report: ${r.url} (${r.scores.overall}/100)`,
    icon: FileBarChart,
    action: () => {
      setCurrentReport(r);
      setCurrentTab('results');
    },
    shortcut: 'Report'
  }));

  const allItems = [...items, ...reportItems];

  // Fuzzy filter
  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setGlobalSearchOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setGlobalSearchOpen(false);
      } else if (query.includes('.') && query.length > 3) {
        // Quick trigger audit on direct domain input
        startAnalysis(query);
        setGlobalSearchOpen(false);
      }
    }
  };

  if (!globalSearchOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setGlobalSearchOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-input-container">
          <Search size={18} style={{ color: 'var(--color-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a screen, paste a URL to scan, or find reports..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="command-input"
          />
          <span style={{ fontSize: '10px', color: 'var(--color-muted)', border: '1px solid var(--color-border)', padding: '2px 4px', borderRadius: '4px' }}>ESC</span>
        </div>

        <div className="command-list">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-muted)' }}>
              {query.includes('.') ? (
                <p style={{ fontSize: '13px' }}>
                  Press <kbd style={{ padding: '2px 4px', background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Enter</kbd> to analyze <strong style={{ color: 'var(--color-text-primary)' }}>{query}</strong>
                </p>
              ) : (
                'No commands or reports found'
              )}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    item.action();
                    setGlobalSearchOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Icon size={15} style={{ color: idx === selectedIndex ? 'var(--color-accent)' : 'var(--color-muted)' }} />
                  <span style={{ fontSize: '13px' }}>{item.label}</span>
                  <span className="command-item-shortcut">{item.shortcut}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
