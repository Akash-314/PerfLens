import axios from 'axios';
import { AIProvider, ExplanationInput, ExplanationOutput, ProviderErrorCode } from '../ai.types.js';
import { buildSystemInstruction, buildUserPrompt, PROMPT_VERSION } from '../prompts/explainer.v1.js';
import { parseModelJson, validateExplanationOutput } from '../ai.validator.js';

export interface OpenAIProviderOptions {
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
  baseUrl?: string;
}

export class OpenAIProvider implements AIProvider {
  public readonly name: string = 'openai';
  public readonly modelName: string;
  protected readonly apiKey: string | undefined;
  protected readonly timeoutMs: number;
  protected readonly baseUrl: string;

  constructor(options?: OpenAIProviderOptions) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    this.modelName = options?.modelName || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.timeoutMs = options?.timeoutMs || 10000;
    this.baseUrl = options?.baseUrl || 'https://api.openai.com/v1';
  }

  public async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key provided.');
    }

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt(input);
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const requestBody = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1024
    };

    let response: any;
    try {
      response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: this.timeoutMs
      });
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms.`);
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('OpenAI authentication failed. Invalid API key.');
      }
      if (err.response?.status === 429) {
        throw new Error('OpenAI API rate limit or quota exceeded (HTTP 429).');
      }
      if (err.response?.status >= 500) {
        throw new Error(`OpenAI API server error (HTTP ${err.response.status}).`);
      }
      throw new Error(`OpenAI request failed: ${err.response?.data?.error?.message || err.message}`);
    }

    const rawContent = response?.data?.choices?.[0]?.message?.content;
    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error('OpenAI returned empty message content.');
    }

    const rawJson = parseModelJson(rawContent);
    const validation = validateExplanationOutput(rawJson, input, {
      model: this.modelName,
      provider: this.name,
      promptVersion: PROMPT_VERSION
    });

    if (!validation.valid || !validation.data) {
      throw new Error(`Validation failed on OpenAI output: ${validation.errors.join('; ')}`);
    }

    return validation.data;
  }

  public async testConnection(): Promise<{ success: boolean; code?: ProviderErrorCode; message?: string }> {
    if (!this.apiKey) {
      return { success: false, code: 'AUTH_ERROR', message: 'No OpenAI API key provided.' };
    }

    // Ping model list or a 1-token test prompt
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    try {
      await axios.post(
        endpoint,
        {
          model: this.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          },
          timeout: 6000
        }
      );
      return { success: true, message: 'OpenAI connection verified successfully.' };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        return { success: false, code: 'AUTH_ERROR', message: 'OpenAI authentication failed. Please verify your API key.' };
      }
      if (status === 404) {
        return { success: false, code: 'INVALID_MODEL', message: `OpenAI model "${this.modelName}" was not found or is unavailable.` };
      }
      if (status === 429) {
        return { success: false, code: 'RATE_LIMITED', message: 'OpenAI rate limit or account quota exceeded.' };
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return { success: false, code: 'TIMEOUT', message: 'Connection to OpenAI timed out.' };
      }
      if (status >= 500) {
        return { success: false, code: 'PROVIDER_UNAVAILABLE', message: 'OpenAI service is temporarily unavailable.' };
      }
      return { success: false, code: 'NETWORK_ERROR', message: err.response?.data?.error?.message || 'Failed connecting to OpenAI API.' };
    }
  }
}
