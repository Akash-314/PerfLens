import crypto from 'crypto';
import { ExplanationInput, ExplanationOutput } from './ai.types.js';

interface CacheEntry {
  output: ExplanationOutput;
  timestamp: number;
}

export class ExplanationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 200, ttlMs = 3600000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  public computeKey(input: ExplanationInput, model: string, promptVersion: string): string {
    const serializedEvidence = JSON.stringify(input.evidence);
    const urlPart = input.url ? input.url.toLowerCase().trim() : '';
    const hash = crypto
      .createHash('sha256')
      .update(`${input.findingId}:${urlPart}:${serializedEvidence}:${model}:${promptVersion}`)
      .digest('hex')
      .substring(0, 16);
    return `${input.findingId}:${hash}`;
  }

  public get(key: string): ExplanationOutput | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.output;
  }

  public set(key: string, output: ExplanationOutput): void {
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      output,
      timestamp: Date.now()
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const explanationCache = new ExplanationCache();
