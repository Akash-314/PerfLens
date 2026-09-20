import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import {
  UserAiConfig,
  UserAiConfigDto,
  UserAiUsage,
  SaveAiConfigRequest,
  SupportedAIProvider,
  AIConfigMode
} from '../../models/userAiConfig.js';
import { encryptSecret, maskApiKey } from '../security/aiEncryption.js';

export function getManagedMonthlyLimit(): number {
  const envVal = process.env.PERFLENS_MANAGED_AI_MONTHLY_LIMIT;
  const parsed = envVal ? parseInt(envVal, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export const DEFAULT_MODELS_BY_PROVIDER: Record<SupportedAIProvider, string> = {
  managed: 'gemini-flash-lite-latest',
  gemini: 'gemini-flash-lite-latest',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  'openai-compatible': 'custom-model'
};

export class AIConfigService {
  // Ephemeral in-memory store for unit tests or guest/offline fallback
  private inMemoryConfigs = new Map<string, UserAiConfig>();
  private inMemoryUsages = new Map<string, Map<string, number>>();
  private useInMemoryOnly = process.env.NODE_ENV === 'test';

  public setInMemoryOnly(val: boolean): void {
    this.useInMemoryOnly = val;
  }

  /**
   * Clears internal state (useful for test isolation).
   */
  public resetStoreForTesting(): void {
    this.inMemoryConfigs.clear();
    this.inMemoryUsages.clear();
  }

  /**
   * Retrieves raw configuration including encrypted secret for backend routing.
   * NEVER expose output from this function to the frontend.
   */
  public async getRawUserConfig(userId: string): Promise<UserAiConfig | null> {
    if (!userId) return null;

    if (!this.useInMemoryOnly && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_ai_configs')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            mode: data.mode as AIConfigMode,
            provider: data.provider as SupportedAIProvider,
            model: data.model,
            encryptedApiKey: data.encrypted_api_key,
            baseUrl: data.base_url,
            configuredAt: data.configured_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch {
        // Fallback to in-memory on error
      }
    }

    return this.inMemoryConfigs.get(userId) || null;
  }

  /**
   * Retrieves sanitized, safe configuration with masked key and quota details for frontend.
   */
  public async getUserConfigDto(userId: string): Promise<UserAiConfigDto> {
    const raw = await this.getRawUserConfig(userId);
    const period = getCurrentPeriod();
    const usage = await this.getUserUsage(userId, period);

    const mode: AIConfigMode = raw?.mode || 'managed';
    const provider: SupportedAIProvider = raw?.provider || 'gemini';
    const model: string = raw?.model || DEFAULT_MODELS_BY_PROVIDER[provider];
    const hasKey = Boolean(raw?.encryptedApiKey);

    return {
      mode,
      provider,
      model,
      baseUrl: raw?.baseUrl || null,
      configured: hasKey,
      maskedKey: hasKey ? maskApiKey(raw?.encryptedApiKey) : null,
      configuredAt: raw?.configuredAt || null,
      usage: {
        used: usage.managedUsed,
        limit: usage.limit,
        period
      }
    };
  }

  /**
   * Saves or updates a user's AI configuration, encrypting any provided API key.
   */
  public async saveUserConfig(userId: string, req: SaveAiConfigRequest): Promise<UserAiConfigDto> {
    if (!userId) throw new Error('User ID is required.');

    const mode: AIConfigMode = req.mode === 'byok' ? 'byok' : 'managed';
    const provider: SupportedAIProvider = req.provider || 'gemini';
    const model: string = req.model || DEFAULT_MODELS_BY_PROVIDER[provider];
    const baseUrl: string | null = req.baseUrl?.trim() || null;

    let encryptedKey: string | null = null;
    if (req.apiKey && req.apiKey.trim()) {
      encryptedKey = encryptSecret(req.apiKey.trim());
    } else {
      // Preserve existing key if not updated
      const existing = await this.getRawUserConfig(userId);
      encryptedKey = existing?.encryptedApiKey || null;
    }

    const now = new Date().toISOString();
    const configData: UserAiConfig = {
      userId,
      mode,
      provider,
      model,
      encryptedApiKey: encryptedKey,
      baseUrl,
      configuredAt: encryptedKey ? now : null,
      updatedAt: now
    };

    // Store in-memory
    this.inMemoryConfigs.set(userId, configData);

    // Persist to Supabase if available
    if (!this.useInMemoryOnly && isSupabaseConfigured()) {
      try {
        await supabase
          .from('user_ai_configs')
          .upsert({
            user_id: userId,
            mode,
            provider,
            model,
            encrypted_api_key: encryptedKey,
            base_url: baseUrl,
            configured_at: encryptedKey ? now : null,
            updated_at: now
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('[AI Config]: Failed persisting to Supabase, stored in memory.', (err as any).message);
      }
    }

    return this.getUserConfigDto(userId);
  }

  /**
   * Removes a user's stored API key and resets configured state.
   */
  public async removeUserApiKey(userId: string): Promise<UserAiConfigDto> {
    const existing = await this.getRawUserConfig(userId);
    const now = new Date().toISOString();

    const updated: UserAiConfig = {
      userId,
      mode: existing?.mode || 'managed',
      provider: existing?.provider || 'gemini',
      model: existing?.model || DEFAULT_MODELS_BY_PROVIDER[existing?.provider || 'gemini'],
      encryptedApiKey: null,
      baseUrl: existing?.baseUrl || null,
      configuredAt: null,
      updatedAt: now
    };

    this.inMemoryConfigs.set(userId, updated);

    if (!this.useInMemoryOnly && isSupabaseConfigured()) {
      try {
        await supabase
          .from('user_ai_configs')
          .update({
            encrypted_api_key: null,
            configured_at: null,
            updated_at: now
          })
          .eq('user_id', userId);
      } catch {
        // Fallback handled
      }
    }

    return this.getUserConfigDto(userId);
  }

  /**
   * Gets user usage stats for a given period.
   */
  public async getUserUsage(userId: string, period = getCurrentPeriod()): Promise<UserAiUsage> {
    const limit = getManagedMonthlyLimit();
    if (!userId) {
      return { userId: 'guest', period, managedUsed: 0, limit };
    }

    if (!this.useInMemoryOnly && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_ai_usages')
          .select('managed_used')
          .eq('user_id', userId)
          .eq('period', period)
          .maybeSingle();

        if (!error && data) {
          return {
            userId,
            period,
            managedUsed: Number(data.managed_used) || 0,
            limit
          };
        }
      } catch {
        // Fallback to in-memory
      }
    }

    const userPeriodMap = this.inMemoryUsages.get(userId);
    const managedUsed = userPeriodMap?.get(period) || 0;
    return { userId, period, managedUsed, limit };
  }

  /**
   * Checks if user has remaining managed quota for the current period.
   */
  public async checkManagedQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number; period: string }> {
    const period = getCurrentPeriod();
    const usage = await this.getUserUsage(userId, period);
    const allowed = usage.managedUsed < usage.limit;

    return {
      allowed,
      used: usage.managedUsed,
      limit: usage.limit,
      period
    };
  }

  /**
   * Increments managed usage count by 1 for the current period upon successful explanation.
   */
  public async incrementManagedUsage(userId: string, period = getCurrentPeriod()): Promise<void> {
    if (!userId) return;

    const currentUsage = await this.getUserUsage(userId, period);
    const nextUsed = currentUsage.managedUsed + 1;
    const now = new Date().toISOString();

    // In-memory update
    if (!this.inMemoryUsages.has(userId)) {
      this.inMemoryUsages.set(userId, new Map());
    }
    this.inMemoryUsages.get(userId)!.set(period, nextUsed);

    // Supabase update
    if (!this.useInMemoryOnly && isSupabaseConfigured()) {
      try {
        await supabase
          .from('user_ai_usages')
          .upsert({
            user_id: userId,
            period,
            managed_used: nextUsed,
            updated_at: now
          }, { onConflict: 'user_id,period' });
      } catch (err) {
        console.warn('[AI Quota]: Failed updating Supabase usage.', (err as any).message);
      }
    }
  }
}

export const aiConfigService = new AIConfigService();
