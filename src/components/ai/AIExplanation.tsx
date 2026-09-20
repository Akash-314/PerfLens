import React from 'react';
import { Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

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
  const isFallback = data.source === 'deterministic_fallback' || data.isFallback === true;

  if (isFallback) {
    return (
      <div
        style={{
          marginTop: '12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-secondary)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
            AI explanation unavailable — showing the original finding.
          </span>
          <span className="metric-pill metric-score-blue" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
            Deterministic Engine
          </span>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {data.whatIsHappening || 'The verified engine recommendation and observed evidence remain visible above.'}
        </p>
      </div>
    );
  }

  const getConfidenceBadgeClass = (conf: string) => {
    if (conf === 'high') return 'metric-score-green';
    if (conf === 'medium') return 'metric-score-orange';
    return 'metric-score-blue';
  };

  const getProviderAttribution = () => {
    if (data.provider === 'managed') {
      return 'Powered by PerfLens AI';
    }
    if (data.provider === 'gemini') {
      return 'Using your Gemini API';
    }
    if (data.provider === 'openai') {
      return 'Using your OpenAI API';
    }
    if (data.provider === 'anthropic') {
      return 'Using your Anthropic API';
    }
    if (data.provider === 'openai-compatible') {
      return 'Using your OpenAI-Compatible API';
    }
    return `Using your ${data.provider || 'AI'} API`;
  };

  return (
    <div
      style={{
        marginTop: '12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        backgroundColor: 'rgba(168, 85, 247, 0.03)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: '#a855f7' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-text-primary)' }}>
            ✦ AI Explanation
          </span>
          <span
            className={`metric-pill ${getConfidenceBadgeClass(data.confidence)}`}
            style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}
          >
            Confidence: {data.confidence}
          </span>
        </div>

        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 500 }}>
          {getProviderAttribution()}
        </span>
      </div>

      {/* 1. What Is Happening */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c084fc' }}>
          What Is Happening
        </span>
        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
          {data.whatIsHappening}
        </p>
      </div>

      {/* 2. Why It Matters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)' }}>
          Why It Matters
        </span>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {data.whyItMatters}
        </p>
      </div>

      {/* 3. Facts vs Unknowns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '2px' }}>
        {/* What PerfLens Knows */}
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-primary)' }}>
              What PerfLens Knows
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

        {/* What Is Not Known */}
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <HelpCircle size={13} style={{ color: 'var(--color-muted)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-muted)' }}>
              What Is Not Known
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
      </div>
    </div>
  );
};
