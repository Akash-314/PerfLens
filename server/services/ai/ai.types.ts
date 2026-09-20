export type FindingCategory =
  | 'performance'
  | 'accessibility'
  | 'seo'
  | 'images'
  | 'js'
  | 'css'
  | 'best-practices'
  | 'security';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ExplanationConfidence = 'high' | 'medium' | 'low';

export interface VerifiedEvidenceItem {
  id: string;
  source?: string;
  metric?: string;
  value?: any;
  unit?: string;
  resource?: string;
  selector?: string;
  details?: Record<string, any>;
}

export interface ExplanationInput {
  findingId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  url?: string;
  evidence: VerifiedEvidenceItem[];
  knownContext?: {
    totalJsKb?: number;
    totalRequests?: number;
    framework?: string;
    verifiedFramework?: boolean;
  };
}

export interface ExplanationOutput {
  title: string;
  whatIsHappening: string;
  whyItMatters: string;
  evidenceExplanation: string;
  knownFacts: string[];
  unknowns: string[];
  confidence: ExplanationConfidence;
  relatedFindingIds?: string[];
  source: 'ai' | 'deterministic_fallback';
  promptVersion: string;
  model: string;
  provider: string;
  findingId?: string;
  generatedAt?: string;
  fromCache?: boolean;
  isFallback?: boolean;
}

export type AIProviderType =
  | 'managed'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openai-compatible';

export type AIConfigMode = 'managed' | 'byok';

export type ProviderErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_MODEL'
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'SSRF_BLOCKED'
  | 'UNKNOWN_PROVIDER_ERROR';

export interface AIProvider {
  name: string;
  modelName: string;
  explainFinding(input: ExplanationInput): Promise<ExplanationOutput>;
  testConnection?(): Promise<{ success: boolean; code?: ProviderErrorCode; message?: string }>;
}

