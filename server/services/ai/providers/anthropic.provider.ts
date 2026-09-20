import axios from 'axios';
import { AIProvider, ExplanationInput, ExplanationOutput, ProviderErrorCode } from '../ai.types.js';
import { buildSystemInstruction, buildUserPrompt, PROMPT_VERSION } from '../prompts/explainer.v1.js';
import { parseModelJson, validateExplanationOutput } from '../ai.validator.js';

export interface AnthropicProviderOptions {
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
}

export class AnthropicProvider implements AIProvider {
  public readonly name: string = 'anthropic';
  public readonly modelName: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(options?: AnthropicProviderOptions) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
    this.modelName = options?.modelName || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
    this.timeoutMs = options?.timeoutMs || 10000;
  }

  public async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    if (!this.apiKey) {
      throw new Error('No Anthropic API key provided.');
    }

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt(input);
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const requestBody = {
      model: this.modelName,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    };

    let response: any;
    try {
      response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: this.timeoutMs
      });
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`Anthropic request timed out after ${this.timeoutMs}ms.`);
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('Anthropic authentication failed. Invalid API key.');
      }
      if (err.response?.status === 429) {
        throw new Error('Anthropic API rate limit or quota exceeded (HTTP 429).');
      }
      if (err.response?.status >= 500) {
        throw new Error(`Anthropic API server error (HTTP ${err.response.status}).`);
      }
      throw new Error(`Anthropic request failed: ${err.response?.data?.error?.message || err.message}`);
    }

    const rawContent = response?.data?.content?.[0]?.text;
    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error('Anthropic returned empty message text.');
    }

    const rawJson = parseModelJson(rawContent);
    const validation = validateExplanationOutput(rawJson, input, {
      model: this.modelName,
      provider: this.name,
      promptVersion: PROMPT_VERSION
    });

    if (!validation.valid || !validation.data) {
      throw new Error(`Validation failed on Anthropic output: ${validation.errors.join('; ')}`);
    }

    return validation.data;
  }

  public async testConnection(): Promise<{ success: boolean; code?: ProviderErrorCode; message?: string }> {
    if (!this.apiKey) {
      return { success: false, code: 'AUTH_ERROR', message: 'No Anthropic API key provided.' };
    }

    const endpoint = 'https://api.anthropic.com/v1/messages';
    try {
      await axios.post(
        endpoint,
        {
          model: this.modelName,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 6000
        }
      );
      return { success: true, message: 'Anthropic connection verified successfully.' };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        return { success: false, code: 'AUTH_ERROR', message: 'Anthropic authentication failed. Please verify your API key.' };
      }
      if (status === 404) {
        return { success: false, code: 'INVALID_MODEL', message: `Anthropic model "${this.modelName}" was not found or is unavailable.` };
      }
      if (status === 429) {
        return { success: false, code: 'RATE_LIMITED', message: 'Anthropic rate limit or account quota exceeded.' };
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return { success: false, code: 'TIMEOUT', message: 'Connection to Anthropic timed out.' };
      }
      if (status >= 500) {
        return { success: false, code: 'PROVIDER_UNAVAILABLE', message: 'Anthropic service is temporarily unavailable.' };
      }
      return { success: false, code: 'NETWORK_ERROR', message: err.response?.data?.error?.message || 'Failed connecting to Anthropic API.' };
    }
  }
}
