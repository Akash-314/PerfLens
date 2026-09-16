import React, { useState } from 'react';
import type { Recommendation } from '../context/AppContext';
import {
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface Props {
  rec: Recommendation;
  expanded?: boolean;
  onToggle?: () => void;
}

export const HumanizedRecommendationCard: React.FC<Props> = ({
  rec,
  expanded = false,
  onToggle
}) => {
  const [copied, setCopied] = useState(false);

  const std = rec.standardFinding;
  const problemText = std?.explanation?.problem || rec.finding?.description || rec.issue;
  const whyItMatters = std?.explanation?.whyItMatters || rec.potentialImpact || rec.whyItMatters;
  const observedEvidence = std?.explanation?.observedEvidence || (
    typeof rec.evidence === 'string'
      ? rec.evidence
      : Array.isArray(rec.evidence) && rec.evidence.length > 0
        ? rec.evidence.map((e: any) => `${e.resource || e.selector || e.type} ${e.duration ? `(${e.duration}ms)` : ''}`).join(', ')
        : 'Target element state observed in rendered DOM'
  );
  const fixStrategy = std?.fixStrategy || rec.suggestedFix;
  const validationSteps: string[] = std?.validationSteps || rec.validationSteps || [
    'Rerun the inspection audit after making the change.',
    'Verify that the targeted issue is no longer reported and no regression occurred.'
  ];
  const aiPrompt = rec.aiFixPrompt || std?.aiFixPrompt;

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!aiPrompt) return;
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy AI prompt:', err);
    }
  };

  const getSeverityBadgeClass = (sev?: string) => {
    if (sev === 'critical') return 'metric-score-red';
    if (sev === 'high') return 'metric-score-red';
    if (sev === 'medium') return 'metric-score-orange';
    return 'metric-score-green';
  };

  const isVerified = std?.confidence === 'verified' || rec.confidence === 'high';

  return (
    <div className="expandable-card" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div
        className="expandable-card-header"
        onClick={onToggle}
        style={{
          padding: '16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span
            className={`metric-pill ${getSeverityBadgeClass(rec.severity || rec.priority)}`}
            style={{ textTransform: 'uppercase', fontSize: '10.5px', fontWeight: 700 }}
          >
            {rec.severity || rec.priority}
          </span>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {rec.issue}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
          {isVerified && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--color-success)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontWeight: 600
              }}
            >
              <ShieldCheck size={12} />
              Verified
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'capitalize' }}>
            {rec.category}
          </span>
          <ChevronDown
            size={14}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              color: 'var(--color-muted)'
            }}
          />
        </div>
      </div>

      {expanded && (
        <div
          className="expandable-card-body"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* 1. What is wrong? */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-danger)' }}>
              1. What Is Wrong?
            </span>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
              {problemText}
            </p>
          </div>

          {/* 2. Why does it matter? */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)' }}>
              2. Why Does It Matter?
            </span>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {whyItMatters}
            </p>
          </div>

          {/* 3. What did PerfLens actually find? */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
              3. What Did PerfLens Actually Find?
            </span>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--color-text-primary)',
                wordBreak: 'break-word',
                lineHeight: 1.5
              }}
            >
              {observedEvidence}
            </div>
          </div>

          {/* 4. How should it be fixed? */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)' }}>
              4. How Should It Be Fixed?
            </span>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {fixStrategy}
              </p>
            </div>
          </div>

          {/* 5. How to verify the fix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)' }}>
              5. How To Verify The Fix
            </span>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {validationSteps.map((step, sIdx) => (
                <li key={sIdx} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Code-Editor Fix Prompt Box */}
          {aiPrompt && (
            <div
              style={{
                marginTop: '6px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                backgroundColor: 'rgba(147, 51, 234, 0.04)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} style={{ color: '#a855f7' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    AI Code-Editor Fix Prompt
                  </span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', fontWeight: 600 }}>
                    Cursor / Antigravity / Claude Code
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="btn btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    padding: '4px 10px',
                    backgroundColor: copied ? 'var(--color-success)' : 'var(--color-surface)',
                    color: copied ? '#ffffff' : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                </button>
              </div>

              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.45
                }}
              >
                {aiPrompt}
              </div>
            </div>
          )}

          {/* Card Footer: Metadata & Reference */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--color-muted)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '14px',
              marginTop: '4px'
            }}
          >
            <span>
              Difficulty: <strong style={{ textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>{rec.estimatedDifficulty || rec.difficulty || 'medium'}</strong>
            </span>
            <span>
              Time: <strong style={{ color: 'var(--color-text-primary)' }}>{rec.estimatedImplementationTime || '15 mins'}</strong>
            </span>
            {rec.estimatedSavings && rec.estimatedSavings.displayString && (
              <span>
                Estimated Savings: <strong style={{ color: 'var(--color-success)' }}>{rec.estimatedSavings.displayString}</strong>
              </span>
            )}
            <a
              href={rec.refUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-primary)',
                textDecoration: 'none'
              }}
            >
              <span>Reference documentation</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
