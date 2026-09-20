import axios from 'axios';
import { AIProvider, ExplanationInput, ExplanationOutput } from '../ai.types.js';
import { buildSystemInstruction, buildUserPrompt, PROMPT_VERSION } from '../prompts/explainer.v1.js';
import { parseModelJson, validateExplanationOutput } from '../ai.validator.js';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';
  public readonly modelName: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(options?: { apiKey?: string; modelName?: string; timeoutMs?: number }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.PERFLENS_AI_API_KEY;
    this.modelName = options?.modelName || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    this.timeoutMs = options?.timeoutMs || 8000;
  }

  public async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    if (!this.apiKey) {
      throw new Error('No Gemini API key configured in server environment.');
    }

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt(input);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    let response: any;
    try {
      response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeoutMs
      });
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms.`);
      }
      if (err.response?.status === 429) {
        throw new Error('Gemini API rate limit exceeded (HTTP 429).');
      }
      if (err.response?.status >= 500) {
        throw new Error(`Gemini API server error (HTTP ${err.response.status}).`);
      }
      throw new Error(`Gemini API call failed: ${err.response?.data?.error?.message || err.message}`);
    }

    const candidates = response?.data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('Gemini returned no candidates.');
    }

    const rawText = candidates[0]?.content?.parts?.[0]?.text;
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Gemini returned empty candidate text.');
    }

    // Parse and validate
    const rawJson = parseModelJson(rawText);
    const validation = validateExplanationOutput(rawJson, input, {
      model: this.modelName,
      provider: this.name,
      promptVersion: PROMPT_VERSION
    });

    if (!validation.valid || !validation.data) {
      throw new Error(`Validation failed on Gemini output: ${validation.errors.join('; ')}`);
    }

    return validation.data;
  }

  public async testConnection(): Promise<{ success: boolean; code?: any; message?: string }> {
    if (!this.apiKey) {
      return { success: false, code: 'AUTH_ERROR', message: 'No Gemini API key configured.' };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    try {
      await axios.post(
        endpoint,
        {
          contents: [{ role: 'user', parts: [{ text: 'test connection' }] }],
          generationConfig: { maxOutputTokens: 1 }
        },
        { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
      );
      return { success: true, message: 'Google Gemini connection verified successfully.' };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403 || err.response?.data?.error?.status === 'PERMISSION_DENIED') {
        return { success: false, code: 'AUTH_ERROR', message: 'Gemini authentication failed. Please check your API key.' };
      }
      if (status === 404) {
        return { success: false, code: 'INVALID_MODEL', message: `Gemini model "${this.modelName}" was not found or is unavailable.` };
      }
      if (status === 429) {
        return { success: false, code: 'RATE_LIMITED', message: 'Gemini rate limit or quota exceeded.' };
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return { success: false, code: 'TIMEOUT', message: 'Connection to Gemini API timed out.' };
      }
      if (status >= 500) {
        return { success: false, code: 'PROVIDER_UNAVAILABLE', message: 'Gemini API is temporarily unavailable.' };
      }
      return { success: false, code: 'NETWORK_ERROR', message: err.response?.data?.error?.message || 'Failed connecting to Gemini API.' };
    }
  }
}

