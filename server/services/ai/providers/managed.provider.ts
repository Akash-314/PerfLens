import { AIProvider, ExplanationInput, ExplanationOutput } from '../ai.types.js';
import { GeminiProvider } from './gemini.provider.js';

export class ManagedProvider implements AIProvider {
  public readonly name = 'managed';
  public readonly modelName: string;
  private innerProvider: GeminiProvider;

  constructor(options?: { modelName?: string; apiKey?: string }) {
    this.modelName = options?.modelName || process.env.PERFLENS_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const managedKey = options?.apiKey || process.env.PERFLENS_AI_API_KEY || process.env.GEMINI_API_KEY;
    this.innerProvider = new GeminiProvider({
      apiKey: managedKey,
      modelName: this.modelName
    });
  }

  public async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    const output = await this.innerProvider.explainFinding(input);
    return {
      ...output,
      provider: 'managed',
      model: this.modelName
    };
  }

  public async testConnection(): Promise<{ success: boolean; code?: any; message?: string }> {
    return this.innerProvider.testConnection();
  }
}
