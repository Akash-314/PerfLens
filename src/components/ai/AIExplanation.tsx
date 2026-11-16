import React, { useState } from 'react';
import { Sparkles, CheckCircle, HelpCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export interface ExplanationData {
  title: string;
  whatIsHappening: string;
  whyItMatters: string;
  evidenceExplanation: string;
  knownFacts: string[];
  unknowns: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'ai' | 'deterministic_fallback';
  model?: string;
  provider?: string;
  findingId?: string;
  generatedAt?: string;
  isFallback?: boolean;
}

interface Props {
  data: ExplanationData;
}

export const AIExplanation: React.FC<Props> = ({ data }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const isFallback = data.source === 'deterministic_fallback' || data.isFallback === true;

  if (isFallback) {
    return (
      <div
        style={{
          marginTop: '12px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-secondary)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-muted)' }}>
            AI explanation unavailable — showing verified engine finding.
          </span>
          <span className="metric-pill metric-score-blue" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
            Verified Finding
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {data.whatIsHappening || 'The verified engine recommendation and observed evidence remain visible above.'}
        </p>
      </div>
    );
  }

  const getProviderAttribution = () => {
    if (data.provider === 'managed') {
      return 'PerfLens Coach AI';
    }
    if (data.provider === 'gemini') {
      return 'Google Gemini';
    }
    if (data.provider === 'openai') {
      return 'OpenAI';
    }
    if (data.provider === 'anthropic') {
      return 'Anthropic Claude';
    }
    return data.provider || 'AI Assistant';
  };

  return (
    <div
      style={{
        marginTop: '14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        backgroundColor: 'rgba(168, 85, 247, 0.04)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: '#c084fc' }} />
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Plain-English AI Explanation
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              color: 'var(--color-success)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '10px',
              padding: '1px 7px',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={11} />
            Verified
          </span>
        </div>

        <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', fontWeight: 500 }}>
          {getProviderAttribution()}
        </span>
      </div>

      {/* 1. What We Found */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c084fc' }}>
          What We Found
        </span>
        <p style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
          {data.whatIsHappening}
        </p>
      </div>

      {/* 2. Why It Matters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)' }}>
          Why It Matters
        </span>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {data.whyItMatters}
        </p>
      </div>

      {/* 3. What You Can Do / Evidence Interpretation */}
      {data.evidenceExplanation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)' }}>
            What You Can Do
          </span>
          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
            {data.evidenceExplanation}
          </p>
        </div>
      )}

      {/* Collapsible Technical Details (Known Facts vs Unknowns) */}
      <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.2)', paddingTop: '10px' }}>
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          <span>Technical evidence & verification signals</span>
          {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showTechnicalDetails && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {/* What PerfLens Verified */}
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-primary)' }}>
                  Verified Facts
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {data.knownFacts.map((fact, idx) => (
                  <li key={idx} style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>

            {/* What Is Outside Scan Scope */}
            {data.unknowns && data.unknowns.length > 0 && (
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <HelpCircle size={13} style={{ color: 'var(--color-muted)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-muted)' }}>
                    Requires Server / Code Context
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {data.unknowns.map((unknown, idx) => (
                    <li key={idx} style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                      {unknown}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

