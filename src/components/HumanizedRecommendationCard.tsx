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
  Code
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

  // Friendly Coach translations
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

  return (
    <div
      className="card"
      style={{
        padding: 0,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)'
      }}
    >
      {/* Top Header / Collapsed view */}
      <div
        onClick={onToggle}
        style={{
          padding: '18px 22px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className={impact.badgeClass}>
              {impact.label}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-accent-cyan)', fontWeight: 600 }}>
              {humanizeCategory(rec.category)}
            </span>
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
                  borderRadius: '12px',
                  padding: '1px 8px',
                  fontWeight: 600
                }}
              >
                <ShieldCheck size={12} />
                Verified
              </span>
            )}
            {rec.sourceUrl && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {rec.sourceUrl.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                borderColor: 'rgba(168, 85, 247, 0.35)',
                color: '#c084fc',
                backgroundColor: showAi ? 'rgba(168, 85, 247, 0.12)' : 'transparent'
              }}
            >
              {aiLoading ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <Sparkles size={12} style={{ color: '#c084fc' }} />
              )}
              <span>{aiLoading ? 'Explaining...' : 'Explain simply'}</span>
            </button>

            <ChevronDown
              size={18}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--color-text-secondary)'
              }}
            />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '3px' }}>
            {coach.headline}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
            {coach.summary}
          </p>
        </div>
      </div>

      {/* Expanded Coaching Body */}
      {expanded && (
        <div
          style={{
            padding: '22px',
            backgroundColor: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* Level 1 & 2: Why It Matters & What To Do */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Why It Matters */}
            <div
              className="coach-box"
              style={{
                borderColor: 'rgba(245, 158, 11, 0.25)',
                backgroundColor: 'rgba(245, 158, 11, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <HelpCircle size={14} style={{ color: 'var(--color-warning)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)' }}>
                  Why it matters
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.5' }}>
                {coach.whyItMatters}
              </p>
            </div>

            {/* What To Do */}
            <div
              className="coach-box"
              style={{
                borderColor: 'rgba(34, 197, 94, 0.25)',
                backgroundColor: 'rgba(34, 197, 94, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Wrench size={14} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)' }}>
                  What to do
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.5' }}>
                {coach.whatToDo}
              </p>
            </div>
          </div>

          {/* AI Explanation Section */}
          {showAi && (
            <div>
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

          {/* Level 3 & 4: Progressive Disclosure Collapsible Technical Details */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={14} style={{ color: 'var(--color-accent)' }} />
                <span>Technical details & evidence</span>
              </div>
              {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTechnicalDetails && (
              <div
                style={{
                  padding: '16px',
                  borderTop: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                    Engine Finding
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {rec.issue}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                    Observed Evidence
                  </span>
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-primary)',
                      wordBreak: 'break-word',
                      marginTop: '4px',
                      lineHeight: '1.5'
                    }}
                  >
                    {observedEvidence}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                    Recommended Fix Strategy
                  </span>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: '1.5' }}>
                    {fixStrategy}
                  </p>
                </div>

                {validationSteps && validationSteps.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                      Validation Steps
                    </span>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {validationSteps.map((step, sIdx) => (
                        <li key={sIdx} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Code-Editor Fix Prompt */}
                {aiPrompt && (
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      backgroundColor: 'rgba(168, 85, 247, 0.05)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        AI Fix Prompt for your editor (Cursor / VSCode / Claude)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '4px', padding: '3px 8px', fontSize: '11px' }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '8px 10px',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)',
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
              gap: '16px',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '12px'
            }}
          >
            <span>
              Difficulty: <strong style={{ textTransform: 'capitalize', color: 'var(--color-text-primary)' }}>{rec.estimatedDifficulty || rec.difficulty || 'medium'}</strong>
            </span>
            <span>
              Estimated time: <strong style={{ color: 'var(--color-text-primary)' }}>{rec.estimatedImplementationTime || '15 mins'}</strong>
            </span>
            {rec.estimatedSavings && rec.estimatedSavings.displayString && (
              <span>
                Estimated savings: <strong style={{ color: 'var(--color-success)' }}>{rec.estimatedSavings.displayString}</strong>
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
                  color: 'var(--color-accent-cyan)',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                <span>Documentation</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

