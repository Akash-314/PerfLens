export type AIConfigMode = 'managed' | 'byok';

export type SupportedAIProvider =
  | 'managed'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openai-compatible';

export interface UserAiConfig {
  id?: string;
  userId: string;
  mode: AIConfigMode;
  provider: SupportedAIProvider;
  model: string;
  encryptedApiKey?: string | null;
  baseUrl?: string | null;
  configuredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAiConfigDto {
  mode: AIConfigMode;
  provider: SupportedAIProvider;
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

export interface UserAiUsage {
  id?: string;
  userId: string;
  period: string; // e.g. '2026-09'
  managedUsed: number;
  limit: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveAiConfigRequest {
  mode: AIConfigMode;
  provider?: SupportedAIProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}
