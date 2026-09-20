import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Cpu,
  Globe2,
  ShieldCheck
} from 'lucide-react';
import { API_BASE } from '../../config/api';

export type SupportedProvider = 'gemini' | 'openai' | 'anthropic' | 'openai-compatible';

interface AIConfigData {
  mode: 'managed' | 'byok';
  provider: SupportedProvider;
  model: string;
  baseUrl?: string | null;
  configured: boolean;
  maskedKey: string | null;
  configuredAt?: string | null;
  usage: {
    used: number;
    limit: number;
    period: string;
  };
}

const PROVIDER_MODELS: Record<SupportedProvider, Array<{ id: string; label: string }>> = {
  gemini: [
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite (Fastest & Cost-Efficient)' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' }
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
    { id: 'gpt-4o', label: 'GPT-4o' }
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Recommended)' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' }
  ],
  'openai-compatible': [
    { id: 'custom', label: 'Custom Model' }
  ]
};

export const AIConfigurationSection: React.FC = () => {
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states
  const [mode, setMode] = useState<'managed' | 'byok'>('managed');
  const [provider, setProvider] = useState<SupportedProvider>('gemini');
  const [model, setModel] = useState<string>('gemini-flash-lite-latest');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('perflens_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/config`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setMode(data.data.mode || 'managed');
        const prov: SupportedProvider = data.data.provider || 'gemini';
        setProvider(prov);
        setModel(data.data.model || PROVIDER_MODELS[prov]?.[0]?.id || 'gemini-flash-lite-latest');
        setBaseUrl(data.data.baseUrl || '');
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed connecting to AI configuration server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleProviderChange = (newProvider: SupportedProvider) => {
    setProvider(newProvider);
    const defaultModel = PROVIDER_MODELS[newProvider]?.[0]?.id || 'default';
    setModel(defaultModel);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/ai/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
          baseUrl: provider === 'openai-compatible' ? baseUrl.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message || 'Connection verified successfully!' });
      } else {
        setTestResult({ success: false, message: data.message || 'Connection test failed. Verify your key/model.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error while attempting connection test.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/ai/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          mode,
          provider: mode === 'byok' ? provider : 'managed',
          model,
          apiKey: apiKey.trim() || undefined,
          baseUrl: provider === 'openai-compatible' ? baseUrl.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setApiKey(''); // Clear plaintext from input state
        setStatusMessage({ type: 'success', text: 'AI configuration saved securely.' });
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed saving configuration.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network fault while saving configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm('Are you sure you want to remove your configured personal API key?')) return;
    try {
      const res = await fetch(`${API_BASE}/ai/config/key`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader()
        }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setApiKey('');
        setTestResult(null);
        setStatusMessage({ type: 'success', text: 'API key removed from secure storage.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed removing key.' });
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <RefreshCw size={20} className="spin" style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
        <span style={{ fontSize: '13px', color: 'var(--color-muted)', display: 'block', marginTop: '8px' }}>
          Loading AI configuration...
        </span>
      </div>
    );
  }

  const usagePercent = config ? Math.min(100, Math.round((config.usage.used / config.usage.limit) * 100)) : 0;
  const isExhausted = config ? config.usage.used >= config.usage.limit : false;

  return (
    <div id="ai-configuration" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: '#a855f7' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>AI Configuration</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
              Choose how PerfLens translates verified diagnostics into clear, humanized explanations.
            </p>
          </div>
        </div>

        {/* Global Masked / Configured Badge */}
        {config?.configured ? (
          <span
            className="metric-pill metric-score-green"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <CheckCircle2 size={12} />
            <span>Personal API Configured</span>
          </span>
        ) : (
          <span
            className="metric-pill"
            style={{ fontSize: '11px', color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}
          >
            No personal API configured
          </span>
        )}
      </div>

      {/* Status Banners */}
      {statusMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: statusMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Mode Selector Form */}
      <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Mode 1: PerfLens AI (Managed) */}
          <div
            onClick={() => setMode('managed')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${mode === 'managed' ? '#a855f7' : 'var(--color-border)'}`,
              backgroundColor: mode === 'managed' ? 'rgba(168, 85, 247, 0.04)' : 'var(--color-bg)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  id="mode-managed"
                  name="ai-mode"
                  checked={mode === 'managed'}
                  onChange={() => setMode('managed')}
                  style={{ accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <label htmlFor="mode-managed" style={{ fontWeight: 600, fontSize: '13.5px', cursor: 'pointer' }}>
                  PerfLens AI (Managed)
                </label>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Free Convenience</span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Included free usage powered by PerfLens server. No personal API key required.
            </p>

            {/* Quota Progress Meter */}
            <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-muted)' }}>Monthly Allowance:</span>
                <strong style={{ color: isExhausted ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                  {config ? `${config.usage.used} / ${config.usage.limit} used` : '5 / 5 used'}
                </strong>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${usagePercent}%`,
                    backgroundColor: isExhausted ? 'var(--color-danger)' : '#a855f7',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
              {isExhausted && (
                <span style={{ fontSize: '11px', color: 'var(--color-danger)', display: 'block', marginTop: '4px' }}>
                  Included explanations exhausted this month. Switch to your own API below.
                </span>
              )}
            </div>
          </div>

          {/* Mode 2: Bring Your Own Key (BYOK) */}
          <div
            onClick={() => setMode('byok')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${mode === 'byok' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: mode === 'byok' ? 'rgba(59, 130, 246, 0.04)' : 'var(--color-bg)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  id="mode-byok"
                  name="ai-mode"
                  checked={mode === 'byok'}
                  onChange={() => setMode('byok')}
                  style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <label htmlFor="mode-byok" style={{ fontWeight: 600, fontSize: '13.5px', cursor: 'pointer' }}>
                  Use My Own API (BYOK)
                </label>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>Unlimited</span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Route explanations through your own provider quota. Does not consume included PerfLens AI quota.
            </p>

            <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                Supports Google Gemini, OpenAI, Anthropic & OpenAI-compatible servers.
              </span>
            </div>
          </div>
        </div>

        {/* BYOK Configuration Form Fields (Always visible or highlighted when BYOK selected) */}
        {mode === 'byok' && (
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeIn 0.2s ease-in'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <KeyRound size={15} style={{ color: 'var(--color-accent)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Provider Credentials</h4>
            </div>

            <div className="grid-cols-2">
              {/* Provider Selection */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={13} />
                  <span>AI Provider</span>
                </label>
                <select
                  className="form-input"
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as SupportedProvider)}
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai-compatible">OpenAI Compatible (Custom Host)</option>
                </select>
              </div>

              {/* Model Selection */}
              <div className="form-group">
                <label className="form-label">Model</label>
                {provider === 'openai-compatible' ? (
                  <input
                    type="text"
                    className="form-input"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. llama-3.3-70b-versatile or mistral-large"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  />
                ) : (
                  <select
                    className="form-input"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    {PROVIDER_MODELS[provider].map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Custom Base URL if OpenAI-Compatible */}
            {provider === 'openai-compatible' && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe2 size={13} />
                  <span>Base URL</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.groq.com/openai/v1"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  Enter standard OpenAI-compatible API endpoint (e.g. Groq, OpenRouter, Together AI). Localhost and private IPs are blocked for security.
                </span>
              </div>
            )}

            {/* API Key Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">
                  API Key {config?.configured && !apiKey && <span style={{ color: 'var(--color-success)', fontSize: '11px' }}>(Currently Configured)</span>}
                </label>
                {config?.configured && !apiKey && (
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    Enter a new key only to replace the existing one
                  </span>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config?.configured ? '•••••••••••••••• (API configured)' : 'Paste your API key here...'}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    paddingRight: '36px',
                    fontFamily: showKey ? 'var(--font-mono)' : 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer'
                  }}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--color-muted)' }}>
                <ShieldCheck size={12} style={{ color: 'var(--color-success)' }} />
                <span>Encrypted at rest using AES-256-GCM. Plaintext keys are never returned or logged.</span>
              </div>
            </div>

            {/* Connection Test Result Banner */}
            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {mode === 'byok' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTestConnection}
                disabled={testing || (!config?.configured && !apiKey.trim())}
                style={{ gap: '6px', fontSize: '12px' }}
              >
                <RefreshCw size={12} className={testing ? 'spin' : ''} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            )}

            {config?.configured && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRemoveKey}
                style={{ gap: '6px', fontSize: '12px', color: 'var(--color-danger)' }}
              >
                <Trash2 size={12} />
                <span>Remove API Key</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={saving}
            style={{ gap: '6px', fontSize: '12px', minWidth: '120px' }}
          >
            {saving ? (
              <>
                <RefreshCw size={12} className="spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
