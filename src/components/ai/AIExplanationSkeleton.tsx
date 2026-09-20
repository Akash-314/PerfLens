import React from 'react';
import { Loader2 } from 'lucide-react';

export const AIExplanationSkeleton: React.FC = () => {
  return (
    <div
      style={{
        marginTop: '12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        backgroundColor: 'rgba(168, 85, 247, 0.02)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'pulse 1.8s infinite ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Loader2 size={16} className="spin" style={{ color: '#a855f7' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Generating explanation...
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
          (Analyzing verified evidence)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            height: '10px',
            width: '28%',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            borderRadius: '4px'
          }}
        />
        <div
          style={{
            height: '14px',
            width: '92%',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '4px',
            border: '1px solid var(--color-border)'
          }}
        />
        <div
          style={{
            height: '14px',
            width: '78%',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '4px',
            border: '1px solid var(--color-border)'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
        <div
          style={{
            height: '56px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}
        />
        <div
          style={{
            height: '56px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}
        />
      </div>
    </div>
  );
};
