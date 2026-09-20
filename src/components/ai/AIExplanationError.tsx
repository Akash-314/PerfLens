import React from 'react';
import { AlertCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';

interface Props {
  onRetry?: () => void;
  message?: string;
  code?: string;
  onGoToByok?: () => void;
}

export const AIExplanationError: React.FC<Props> = ({
  onRetry,
  message = 'AI explanation is temporarily unavailable.',
  code,
  onGoToByok
}) => {
  const isQuotaExceeded = code === 'MANAGED_AI_QUOTA_EXCEEDED';
  const isByokNotConfigured = code === 'BYOK_NOT_CONFIGURED';

  return (
    <div
      style={{
        marginTop: '12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isQuotaExceeded ? 'rgba(234, 179, 8, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
        backgroundColor: isQuotaExceeded ? 'rgba(234, 179, 8, 0.05)' : 'rgba(239, 68, 68, 0.04)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertCircle
          size={16}
          style={{ color: isQuotaExceeded ? 'var(--color-warning)' : 'var(--color-danger)' }}
        />
        <div>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              display: 'block'
            }}
          >
            {isQuotaExceeded
              ? "You've used your included PerfLens AI explanations."
              : isByokNotConfigured
                ? 'No AI provider configured for Bring-Your-Own-Key.'
                : message}
          </span>
          {isQuotaExceeded && (
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
              Connect your own Google Gemini, OpenAI, or Anthropic API key in Settings to get unlimited explanations.
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {(isQuotaExceeded || isByokNotConfigured) && onGoToByok && (
          <button
            type="button"
            onClick={onGoToByok}
            className="btn btn-primary btn-sm"
            style={{
              gap: '6px',
              fontSize: '11.5px',
              padding: '5px 12px'
            }}
          >
            <KeyRound size={12} />
            <span>Use My Own API</span>
            <ArrowRight size={11} />
          </button>
        )}

        {!isQuotaExceeded && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '4px 10px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};
