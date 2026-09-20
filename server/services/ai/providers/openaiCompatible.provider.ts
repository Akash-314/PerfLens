import { OpenAIProvider, OpenAIProviderOptions } from './openai.provider.js';
import { ExplanationInput, ExplanationOutput, ProviderErrorCode } from '../ai.types.js';
import { validateUrlForSsrf, validateUrlSsrfAsync } from '../../security/ssrfValidator.js';

export class OpenAICompatibleProvider extends OpenAIProvider {
  public override readonly name: string = 'openai-compatible';

  constructor(options?: OpenAIProviderOptions) {
    super(options);
    if (!options?.baseUrl || !options.baseUrl.trim()) {
      throw new Error('Base URL is required for OpenAI-compatible providers.');
    }
  }

  private async assertSafeBaseUrl(): Promise<void> {
    if (!validateUrlForSsrf(this.baseUrl)) {
      throw new Error('Restricted base URL rejected for security reasons (SSRF Protection).');
    }

    const check = await validateUrlSsrfAsync(this.baseUrl);
    if (!check.safe) {
      throw new Error(check.reason || 'Base URL resolved to a restricted IP address (SSRF Protection).');
    }
  }

  public override async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    await this.assertSafeBaseUrl();
    const output = await super.explainFinding(input);
    return {
      ...output,
      provider: 'openai-compatible'
    };
  }

  public override async testConnection(): Promise<{ success: boolean; code?: ProviderErrorCode; message?: string }> {
    try {
      await this.assertSafeBaseUrl();
    } catch (err: any) {
      return {
        success: false,
        code: 'SSRF_BLOCKED',
        message: err.message || 'Restricted target host blocked for security reasons.'
      };
    }

    return super.testConnection();
  }
}
