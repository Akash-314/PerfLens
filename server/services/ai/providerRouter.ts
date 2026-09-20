import { AIProvider } from './ai.types.js';
import { UserAiConfig } from '../../models/userAiConfig.js';
import { ManagedProvider } from './providers/managed.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { OpenAICompatibleProvider } from './providers/openaiCompatible.provider.js';

export class ProviderRouter {
  private static testProviderOverride: AIProvider | null = null;

  public static setTestProvider(provider: AIProvider | null): void {
    ProviderRouter.testProviderOverride = provider;
  }

  public static getTestProvider(): AIProvider | null {
    return ProviderRouter.testProviderOverride;
  }

  /**
   * Resolves the proper AIProvider instance based on the user's active configuration.
   * Enforces strict isolation: BYOK never accesses managed keys; Managed never accesses user keys.
   */
  public static resolveProvider(
    config?: UserAiConfig | null,
    decryptedKey?: string | null,
    defaultPrimary?: AIProvider
  ): AIProvider {
    if (ProviderRouter.testProviderOverride) {
      return ProviderRouter.testProviderOverride;
    }

    // 1. Managed Mode (default when no config or mode explicitly set to 'managed')
    if (!config || config.mode === 'managed') {
      return defaultPrimary || new ManagedProvider({
        modelName: config?.model
      });
    }

    // 2. BYOK Mode
    const key = decryptedKey || undefined;

    switch (config.provider) {
      case 'gemini':
        return new GeminiProvider({
          apiKey: key,
          modelName: config.model || 'gemini-flash-lite-latest'
        });

      case 'openai':
        return new OpenAIProvider({
          apiKey: key,
          modelName: config.model || 'gpt-4o-mini'
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: key,
          modelName: config.model || 'claude-3-5-haiku-latest'
        });

      case 'openai-compatible':
        return new OpenAICompatibleProvider({
          apiKey: key,
          modelName: config.model || 'custom-model',
          baseUrl: config.baseUrl || undefined
        });

      default:
        // Default to managed if unknown provider
        return new ManagedProvider();
    }
  }
}
