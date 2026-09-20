import { AIProvider, ExplanationInput, ExplanationOutput } from './ai.types.js';
import { adaptFindingToExplanationInput, EvidenceGateError } from './ai.adapter.js';
import { ManagedProvider } from './providers/managed.provider.js';
import { DeterministicProvider } from './providers/deterministic.provider.js';
import { ProviderRouter } from './providerRouter.js';
import { aiConfigService } from './aiConfig.service.js';
import { decryptSecret, sanitizeLog } from '../security/aiEncryption.js';
import { explanationCache } from './ai.cache.js';
import { PROMPT_VERSION } from './prompts/explainer.v1.js';

export class AIDisabledError extends Error {
  constructor(message = 'AI explainer is disabled: PERFLENS_AI_ENABLED is false') {
    super(message);
    this.name = 'AIDisabledError';
  }
}

export class ManagedAiQuotaExceededError extends Error {
  public readonly code = 'MANAGED_AI_QUOTA_EXCEEDED';
  public readonly used: number;
  public readonly limit: number;
  public readonly period: string;

  constructor(used: number, limit: number, period: string) {
    super("You've used your included PerfLens AI explanations.");
    this.name = 'ManagedAiQuotaExceededError';
    this.used = used;
    this.limit = limit;
    this.period = period;
  }
}

export class ByokNotConfiguredError extends Error {
  public readonly code = 'BYOK_NOT_CONFIGURED';

  constructor(message = 'Connect an AI provider to use AI explanations.') {
    super(message);
    this.name = 'ByokNotConfiguredError';
  }
}

export interface AIServiceOptions {
  primaryProvider?: AIProvider;
  fallbackProvider?: AIProvider;
  enabled?: boolean;
}

export class AIService {
  private primaryProvider: AIProvider;
  private fallbackProvider: AIProvider;
  private enabled: boolean;

  constructor(
    primaryOrOptions?: AIProvider | AIServiceOptions,
    fallbackProvider?: AIProvider,
    options?: AIServiceOptions
  ) {
    if (primaryOrOptions && typeof (primaryOrOptions as any).explainFinding === 'function') {
      this.primaryProvider = primaryOrOptions as AIProvider;
      this.fallbackProvider = fallbackProvider || new DeterministicProvider();
      this.enabled = options?.enabled !== undefined
        ? options.enabled
        : process.env.PERFLENS_AI_ENABLED !== 'false';
    } else {
      const opts = (primaryOrOptions as AIServiceOptions) || {};
      this.primaryProvider = opts.primaryProvider || new ManagedProvider();
      this.fallbackProvider = opts.fallbackProvider || fallbackProvider || new DeterministicProvider();
      this.enabled = opts.enabled !== undefined
        ? opts.enabled
        : (options?.enabled !== undefined ? options.enabled : process.env.PERFLENS_AI_ENABLED !== 'false');
    }
  }

  public isAIEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Explains a verified finding using AI, falling back to deterministic explanation on any failure.
   * Strictly enforces the Evidence Gate, managed monthly quotas, and BYOK routing.
   */
  public async explainFinding(
    rawFinding: any,
    context?: any,
    user?: { id?: string } | null
  ): Promise<ExplanationOutput> {
    // 1. Evidence Gate validation & input adapter
    const input: ExplanationInput = adaptFindingToExplanationInput(rawFinding, context);

    // 2. If AI feature is disabled, reject with AIDisabledError
    if (!this.enabled) {
      throw new AIDisabledError('AI explainer is disabled: PERFLENS_AI_ENABLED is false');
    }

    // 3. Resolve Provider & check quota
    const userId = user?.id;
    const userConfig = userId ? await aiConfigService.getRawUserConfig(userId) : null;
    const isByokMode = userConfig?.mode === 'byok';

    let activeProvider: AIProvider = ProviderRouter.getTestProvider() || this.primaryProvider;
    let shouldIncrementManaged = false;

    if (isByokMode && userConfig) {
      // BYOK Mode
      if (!userConfig.encryptedApiKey) {
        throw new ByokNotConfiguredError('Connect an AI provider to use AI explanations.');
      }

      let decryptedKey: string;
      try {
        decryptedKey = decryptSecret(userConfig.encryptedApiKey);
      } catch {
        throw new ByokNotConfiguredError('Saved API key is invalid or corrupted. Please re-enter your key in Settings.');
      }

      activeProvider = ProviderRouter.resolveProvider(userConfig, decryptedKey, this.primaryProvider);
      // BYOK requests DO NOT consume managed quota!
      shouldIncrementManaged = false;
    } else {
      // Managed Mode
      if (userId) {
        const quota = await aiConfigService.checkManagedQuota(userId);
        if (!quota.allowed) {
          throw new ManagedAiQuotaExceededError(quota.used, quota.limit, quota.period);
        }
        shouldIncrementManaged = true;
      }
      activeProvider = ProviderRouter.resolveProvider(userConfig, null, this.primaryProvider);
    }

    // 4. Cache lookup with partitioned key
    const cacheKey = explanationCache.computeKey(
      input,
      `${activeProvider.name}:${activeProvider.modelName}`,
      PROMPT_VERSION
    );
    const cached = explanationCache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // 5. Try active AI provider
    try {
      const output = await activeProvider.explainFinding(input);
      const enrichedOutput: ExplanationOutput = {
        ...output,
        findingId: input.findingId,
        generatedAt: new Date().toISOString(),
        provider: output.provider || activeProvider.name,
        model: output.model || activeProvider.modelName
      };
      explanationCache.set(cacheKey, enrichedOutput);

      // Increment managed usage only upon successful explanation
      if (shouldIncrementManaged && userId) {
        await aiConfigService.incrementManagedUsage(userId);
      }

      return enrichedOutput;
    } catch (err: any) {
      // Diagnostic logging (never log API keys or secrets)
      const safeMsg = sanitizeLog(err.message);
      console.warn(`[AI Explainer]: Provider "${activeProvider.name}" unavailable (${safeMsg}). Falling back to deterministic engine.`);

      // 6. Safe deterministic fallback (does not increment managed usage)
      const fallbackOutput = await this.fallbackProvider.explainFinding(input);
      return {
        ...fallbackOutput,
        findingId: input.findingId,
        generatedAt: new Date().toISOString(),
        source: 'deterministic_fallback',
        isFallback: true
      };
    }
  }
}

export const aiService = new AIService();
export { EvidenceGateError };


