import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Recommendation } from '../context/AppContext';
import { API_BASE } from '../config/api';
import { AIExplanation, AIExplanationSkeleton, AIExplanationError } from './ai';
import type { ExplanationData } from './ai';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Wrench,
  HelpCircle,
  Code,
  AlertCircle
} from 'lucide-react';
import { humanizeFinding, humanizeSeverity, humanizeCategory } from '../utils/developerCoach';

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
  const { setCurrentTab } = useApp();
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<ExplanationData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const std = rec.standardFinding;
  const observedEvidence = std?.explanation?.observedEvidence || (
    typeof rec.evidence === 'string'
      ? rec.evidence
      : Array.isArray(rec.evidence) && rec.evidence.length > 0
        ? rec.evidence.map((e: any) => `${e.resource || e.selector || e.type} ${e.duration ? `(${e.duration}ms)` : ''}`).join(', ')
        : 'Target element state observed in rendered DOM'
  );

  const coach = humanizeFinding(rec.issue, rec.category);
  const impact = humanizeSeverity(rec.priority || rec.severity);

  const handleExplain = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowAi(true);
    if (aiExplanation) return;
    setAiLoading(true);
    setAiError(null);
    setAiErrorCode(null);

    const token = localStorage.getItem('perflens_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const safeEvidence = (Array.isArray(rec.evidence) && rec.evidence.length > 0)
      ? rec.evidence
      : typeof rec.evidence === 'string' && rec.evidence.trim().length > 0
        ? rec.evidence
        : (observedEvidence ? [{ source: 'perflens-engine', details: { text: observedEvidence } }] : undefined);

    try {
      const resp = await fetch(`${API_BASE}/ai/explain`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          finding: {
            ...rec,
            evidence: safeEvidence
          },
          context: {
            url: rec.sourceUrl
          }
        })
      });
      let data: any;
      try {
        data = await resp.json();
      } catch {
        data = { success: false, message: `Server returned status ${resp.status}. Please check backend service.` };
      }
      if (!resp.ok || !data.success) {
        setAiError(data.message || data.error?.message || 'AI explanation is temporarily unavailable.');
        setAiErrorCode(data.code || null);
      } else {
        setAiExplanation(data.data);
      }
    } catch {
      setAiError('AI explanation is temporarily unavailable.');
      setAiErrorCode(null);
    } finally {
      setAiLoading(false);
    }
  };

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

  const isVerified = std?.confidence === 'verified' || rec.confidence === 'high';
  const isHigh = rec.priority === 'high' || rec.severity === 'high';
  const isMed = rec.priority === 'medium' || rec.severity === 'medium';
  const iconColor = isHigh ? 'var(--color-danger-fg)' : isMed ? 'var(--color-attention-fg)' : 'var(--color-success-fg)';

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border-muted)',
        backgroundColor: expanded ? 'var(--color-canvas-subtle)' : 'transparent',
        transition: 'background-color var(--transition-fast)'
      }}
    >
      {/* GitHub Issue Row (Header) */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          userSelect: 'none'
        }}
      >
        {/* Issue Icon */}
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          <AlertCircle size={16} style={{ color: iconColor }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-fg-default)',
                lineHeight: '1.4'
              }}
            >
              {coach.headline}
            </span>

            {/* GitHub-style labels */}
            <span className={impact.badgeClass}>
              {impact.label}
            </span>
            <span className="badge badge-neutral">
              {humanizeCategory(rec.category)}
            </span>
            {isVerified && (
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                <ShieldCheck size={11} />
                Verified
              </span>
            )}
            {rec.sourceUrl && (
              <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {rec.sourceUrl.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--color-fg-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
            {coach.summary}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!expanded && onToggle) onToggle();
              handleExplain(e);
            }}
            disabled={aiLoading}
            className="btn btn-secondary btn-sm"
            style={{
              gap: '6px',
              color: 'var(--color-purple-fg)',
              borderColor: 'rgba(163, 113, 247, 0.3)'
            }}
          >
            {aiLoading ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <Sparkles size={12} style={{ color: 'var(--color-purple-fg)' }} />
            )}
            <span>{aiLoading ? 'Explaining...' : 'Explain with AI'}</span>
          </button>

          <ChevronDown
            size={16}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform var(--transition-fast)',
              color: 'var(--color-fg-muted)'
            }}
          />
        </div>
      </div>

      {/* Expanded Details Body */}
      {expanded && (
        <div
          style={{
            padding: '16px 20px 20px 44px',
            borderTop: '1px solid var(--color-border-default)',
            backgroundColor: 'var(--color-canvas-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Why it matters & What to do */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div className="gh-box" style={{ padding: '12px 14px', backgroundColor: 'var(--color-canvas-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <HelpCircle size={13} style={{ color: 'var(--color-attention-fg)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-attention-fg)', letterSpacing: '0.04em' }}>
                  Why it matters
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-fg-default)', margin: 0, lineHeight: '1.5' }}>
                {coach.whyItMatters}
              </p>
            </div>

            <div className="gh-box" style={{ padding: '12px 14px', backgroundColor: 'var(--color-canvas-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Wrench size={13} style={{ color: 'var(--color-success-fg)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-success-fg)', letterSpacing: '0.04em' }}>
                  What to do
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-fg-default)', margin: 0, lineHeight: '1.5' }}>
                {coach.whatToDo}
              </p>
            </div>
          </div>

          {/* AI Explanation Result */}
          {showAi && (
            <div style={{ marginTop: '4px' }}>
              {aiLoading && <AIExplanationSkeleton />}
              {aiError && (
                <AIExplanationError
                  onRetry={() => handleExplain()}
                  message={aiError}
                  code={aiErrorCode || undefined}
                  onGoToByok={() => {
                    setCurrentTab('settings');
                    setTimeout(() => {
                      document.getElementById('ai-configuration')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                />
              )}
              {aiExplanation && <AIExplanation data={aiExplanation} />}
            </div>
          )}

          {/* Technical Details & Evidence Drawer */}
          <div className="gh-box" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--color-fg-muted)',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={13} style={{ color: 'var(--color-accent-fg)' }} />
                <span>Technical details & verified evidence</span>
              </div>
              {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showTechnicalDetails && (
              <div
                style={{
                  padding: '14px',
                  borderTop: '1px solid var(--color-border-default)',
                  backgroundColor: 'var(--color-canvas-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fg-subtle)', textTransform: 'uppercase' }}>
                    Engine Finding
                  </span>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-fg-default)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {rec.issue}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fg-subtle)', textTransform: 'uppercase' }}>
                    Observed Evidence
                  </span>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-canvas-default)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-fg-default)',
                      wordBreak: 'break-word',
                      marginTop: '4px',
                      lineHeight: '1.5'
                    }}
                  >
                    {observedEvidence}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fg-subtle)', textTransform: 'uppercase' }}>
                    Recommended Fix Strategy
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--color-fg-muted)', marginTop: '2px', lineHeight: '1.5' }}>
                    {fixStrategy}
                  </p>
                </div>

                {validationSteps && validationSteps.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fg-subtle)', textTransform: 'uppercase' }}>
                      Validation Steps
                    </span>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {validationSteps.map((step, sIdx) => (
                        <li key={sIdx} style={{ fontSize: '11.5px', color: 'var(--color-fg-muted)', lineHeight: '1.4' }}>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Fix Prompt for code editor */}
                {aiPrompt && (
                  <div
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(163, 113, 247, 0.3)',
                      backgroundColor: 'rgba(163, 113, 247, 0.05)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                        AI Fix Prompt for Cursor / VSCode / Claude
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '4px', padding: '2px 8px', fontSize: '11px' }}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '6px 8px',
                        backgroundColor: 'var(--color-canvas-default)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: 'var(--color-fg-muted)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {aiPrompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              fontSize: '11.5px',
              color: 'var(--color-fg-muted)',
              borderTop: '1px solid var(--color-border-default)',
              paddingTop: '10px'
            }}
          >
            <span>
              Difficulty: <strong style={{ textTransform: 'capitalize', color: 'var(--color-fg-default)' }}>{rec.estimatedDifficulty || rec.difficulty || 'medium'}</strong>
            </span>
            <span>
              Estimated time: <strong style={{ color: 'var(--color-fg-default)' }}>{rec.estimatedImplementationTime || '15 mins'}</strong>
            </span>
            {rec.estimatedSavings && rec.estimatedSavings.displayString && (
              <span>
                Estimated savings: <strong style={{ color: 'var(--color-success-fg)' }}>{rec.estimatedSavings.displayString}</strong>
              </span>
            )}
            {rec.refUrl && (
              <a
                href={rec.refUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-accent-fg)',
                  fontWeight: 500
                }}
              >
                <span>Documentation</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
