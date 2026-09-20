import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiConfigService, getManagedMonthlyLimit } from '../services/ai/aiConfig.service.js';
import { encryptSecret, decryptSecret, sanitizeLog } from '../services/security/aiEncryption.js';
import { ProviderRouter } from '../services/ai/providerRouter.js';
import { AIService, ManagedAiQuotaExceededError, ByokNotConfiguredError } from '../services/ai/ai.service.js';
import { OpenAICompatibleProvider } from '../services/ai/providers/openaiCompatible.provider.js';
import { GeminiProvider } from '../services/ai/providers/gemini.provider.js';
import { OpenAIProvider } from '../services/ai/providers/openai.provider.js';
import { AnthropicProvider } from '../services/ai/providers/anthropic.provider.js';
import { ManagedProvider } from '../services/ai/providers/managed.provider.js';
import { AIProvider, ExplanationOutput } from '../services/ai/ai.types.js';

// Deterministic test finding
const sampleFinding = {
  id: 'tbt-test-1',
  category: 'performance',
  severity: 'high',
  title: 'Total Blocking Time is 850ms',
  evidence: [
    { metric: 'TBT', value: 850, unit: 'ms', source: 'lighthouse' }
  ]
};

const mockOutput: ExplanationOutput = {
  title: 'Elevated Total Blocking Time',
  whatIsHappening: 'Main thread was blocked for 850ms during page load.',
  whyItMatters: 'Users experience noticeable delay when trying to interact with the page.',
  evidenceExplanation: 'Lighthouse audit captured 850ms of blocking tasks.',
  knownFacts: ['TBT was measured at 850ms.'],
  unknowns: ['Exact script bundle responsible for blocking task.'],
  confidence: 'high',
  source: 'ai',
  promptVersion: 'explainer.v1',
  model: 'test-model',
  provider: 'test-provider'
};

describe('PERFLENS AI Configuration & BYOK V1 — Security & Logic Suite', () => {
  beforeEach(() => {
    aiConfigService.setInMemoryOnly(true);
    aiConfigService.resetStoreForTesting();
    vi.restoreAllMocks();
  });

  // ==========================================================
  // 1. ENCRYPTION AT REST & API KEY SECURITY
  // ==========================================================
  describe('1. Encryption & Secret Security', () => {
    it('encrypts secret with AES-256-GCM and decrypts back to original in memory', () => {
      const plainKey = 'AIzaSyTestKey1234567890abcdef';
      const encrypted = encryptSecret(plainKey);

      expect(encrypted).not.toBe(plainKey);
      expect(encrypted).not.toContain(plainKey);
      expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plainKey);
    });

    it('throws error if encrypted ciphertext or tag is tampered with', () => {
      const encrypted = encryptSecret('secret-key');
      const parts = encrypted.split(':');
      const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;

      expect(() => decryptSecret(tampered)).toThrow();
    });

    it('never returns the plaintext key from maskApiKey or getUserConfigDto', async () => {
      const secret = 'sk-proj-supersecretkey999999999999';
      await aiConfigService.saveUserConfig('user-1', {
        mode: 'byok',
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: secret
      });

      const dto = await aiConfigService.getUserConfigDto('user-1');

      expect((dto as any).apiKey).toBeUndefined();
      expect((dto as any).encryptedApiKey).toBeUndefined();
      expect(dto.configured).toBe(true);
      expect(dto.maskedKey).toBe('••••••••••••••••');
      expect(JSON.stringify(dto)).not.toContain(secret);
    });

    it('sanitizes logs to ensure keys and bearer tokens are never printed', () => {
      const logWithBearer = 'Error calling https://api.openai.com: Bearer sk-1234567890abcdef failed';
      const sanitized = sanitizeLog(logWithBearer);
      expect(sanitized).not.toContain('sk-1234567890abcdef');
      expect(sanitized).toContain('Bearer [REDACTED]');

      const logWithGeminiKey = 'https://generativelanguage.googleapis.com/v1beta/models/gemini?key=AQ.SecretKey123';
      const sanitizedGemini = sanitizeLog(logWithGeminiKey);
      expect(sanitizedGemini).not.toContain('AQ.SecretKey123');
      expect(sanitizedGemini).toContain('key=[REDACTED]');
    });
  });

  // ==========================================================
  // 2. USER ISOLATION & ACCESS CONTROL
  // ==========================================================
  describe('2. User Isolation & Access Control', () => {
    it('user A cannot view or access user B configuration', async () => {
      await aiConfigService.saveUserConfig('user-a', {
        mode: 'byok',
        provider: 'gemini',
        model: 'gemini-flash-lite-latest',
        apiKey: 'key-for-user-a'
      });

      await aiConfigService.saveUserConfig('user-b', {
        mode: 'byok',
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'key-for-user-b'
      });

      const configA = await aiConfigService.getUserConfigDto('user-a');
      const configB = await aiConfigService.getUserConfigDto('user-b');

      expect(configA.provider).toBe('gemini');
      expect(configB.provider).toBe('openai');

      const rawA = await aiConfigService.getRawUserConfig('user-a');
      const rawB = await aiConfigService.getRawUserConfig('user-b');
      expect(decryptSecret(rawA!.encryptedApiKey!)).toBe('key-for-user-a');
      expect(decryptSecret(rawB!.encryptedApiKey!)).toBe('key-for-user-b');
    });

    it('deleting configuration removes usable credentials completely', async () => {
      await aiConfigService.saveUserConfig('user-del', {
        mode: 'byok',
        provider: 'gemini',
        apiKey: 'key-to-delete'
      });

      let raw = await aiConfigService.getRawUserConfig('user-del');
      expect(raw?.encryptedApiKey).toBeTruthy();

      await aiConfigService.removeUserApiKey('user-del');

      raw = await aiConfigService.getRawUserConfig('user-del');
      expect(raw?.encryptedApiKey).toBeNull();
      const dto = await aiConfigService.getUserConfigDto('user-del');
      expect(dto.configured).toBe(false);
      expect(dto.maskedKey).toBeNull();
    });
  });

  // ==========================================================
  // 3. MANAGED QUOTA & BYOK INDEPENDENCE
  // ==========================================================
  describe('3. Managed Quota & BYOK Independence', () => {
    it('managed quota tracks usage accurately up to limit', async () => {
      const limit = getManagedMonthlyLimit();
      expect(limit).toBeGreaterThan(0);

      const quota0 = await aiConfigService.checkManagedQuota('user-quota');
      expect(quota0.allowed).toBe(true);
      expect(quota0.used).toBe(0);

      await aiConfigService.incrementManagedUsage('user-quota');
      const quota1 = await aiConfigService.checkManagedQuota('user-quota');
      expect(quota1.used).toBe(1);
    });

    it('blocks managed explanations when managed quota limit is reached', async () => {
      const mockProvider: AIProvider = {
        name: 'mock-managed',
        modelName: 'mock-model',
        explainFinding: vi.fn().mockResolvedValue(mockOutput)
      };

      const ai = new AIService({ primaryProvider: mockProvider });
      const limit = getManagedMonthlyLimit();

      // Exhaust limit with distinct findings
      for (let i = 0; i < limit; i++) {
        await ai.explainFinding({ ...sampleFinding, id: `quota-finding-${i}` }, {}, { id: 'quota-test-user' });
      }

      const quota = await aiConfigService.checkManagedQuota('quota-test-user');
      expect(quota.used).toBe(limit);
      expect(quota.allowed).toBe(false);

      // Next managed request must throw ManagedAiQuotaExceededError
      await expect(
        ai.explainFinding(sampleFinding, {}, { id: 'quota-test-user' })
      ).rejects.toThrow(ManagedAiQuotaExceededError);

      // Quota count remains at limit
      const quotaAfter = await aiConfigService.checkManagedQuota('quota-test-user');
      expect(quotaAfter.used).toBe(limit);
    });

    it('BYOK requests DO NOT consume managed quota', async () => {
      // Configure user in BYOK mode
      await aiConfigService.saveUserConfig('byok-user', {
        mode: 'byok',
        provider: 'gemini',
        model: 'gemini-flash-lite-latest',
        apiKey: 'test-user-key'
      });

      // Mock provider router resolution by testing directly
      const mockByokProvider: AIProvider = {
        name: 'gemini',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: vi.fn().mockResolvedValue({
          ...mockOutput,
          provider: 'gemini'
        })
      };

      vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(mockByokProvider);

      const ai = new AIService();
      const output = await ai.explainFinding(sampleFinding, {}, { id: 'byok-user' });

      expect(output.provider).toBe('gemini');

      // Managed quota must still be 0
      const quota = await aiConfigService.checkManagedQuota('byok-user');
      expect(quota.used).toBe(0);
    });

    it('switching from exhausted managed quota to BYOK allows explanations without altering managed count', async () => {
      const mockByokProvider: AIProvider = {
        name: 'openai',
        modelName: 'gpt-4o-mini',
        explainFinding: vi.fn().mockResolvedValue({
          ...mockOutput,
          provider: 'openai'
        })
      };

      const limit = getManagedMonthlyLimit();
      for (let i = 0; i < limit; i++) {
        await aiConfigService.incrementManagedUsage('switch-user');
      }

      const exhaustedQuota = await aiConfigService.checkManagedQuota('switch-user');
      expect(exhaustedQuota.allowed).toBe(false);

      // Switch to BYOK
      await aiConfigService.saveUserConfig('switch-user', {
        mode: 'byok',
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-my-key'
      });

      vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(mockByokProvider);

      const ai = new AIService();
      const output = await ai.explainFinding(sampleFinding, {}, { id: 'switch-user' });
      expect(output.provider).toBe('openai');

      // Managed quota remains at limit
      const quotaAfter = await aiConfigService.checkManagedQuota('switch-user');
      expect(quotaAfter.used).toBe(limit);
    });
  });

  // ==========================================================
  // 4. PROVIDER ROUTING & ISOLATION
  // ==========================================================
  describe('4. Provider Routing & Isolation', () => {
    it('routes to ManagedProvider when mode is managed', () => {
      const config = {
        userId: 'u1',
        mode: 'managed' as const,
        provider: 'managed' as const,
        model: 'gemini-flash-lite-latest'
      };

      const provider = ProviderRouter.resolveProvider(config);
      expect(provider).toBeInstanceOf(ManagedProvider);
      expect(provider.name).toBe('managed');
    });

    it('routes to GeminiProvider when BYOK provider is gemini', () => {
      const config = {
        userId: 'u2',
        mode: 'byok' as const,
        provider: 'gemini' as const,
        model: 'gemini-flash-lite-latest'
      };

      const provider = ProviderRouter.resolveProvider(config, 'decrypted-key');
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.name).toBe('gemini');
    });

    it('routes to OpenAIProvider when BYOK provider is openai', () => {
      const config = {
        userId: 'u3',
        mode: 'byok' as const,
        provider: 'openai' as const,
        model: 'gpt-4o-mini'
      };

      const provider = ProviderRouter.resolveProvider(config, 'sk-key');
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('openai');
    });

    it('routes to AnthropicProvider when BYOK provider is anthropic', () => {
      const config = {
        userId: 'u4',
        mode: 'byok' as const,
        provider: 'anthropic' as const,
        model: 'claude-3-5-haiku-latest'
      };

      const provider = ProviderRouter.resolveProvider(config, 'sk-ant-key');
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.name).toBe('anthropic');
    });

    it('throws ByokNotConfiguredError if user selects BYOK but has no key configured', async () => {
      await aiConfigService.saveUserConfig('no-key-user', {
        mode: 'byok',
        provider: 'gemini'
      });

      const ai = new AIService();
      await expect(
        ai.explainFinding(sampleFinding, {}, { id: 'no-key-user' })
      ).rejects.toThrow(ByokNotConfiguredError);
    });
  });

  // ==========================================================
  // 5. SSRF PROTECTION FOR OPENAI-COMPATIBLE PROVIDERS
  // ==========================================================
  describe('5. SSRF Protection for Custom Base URLs', () => {
    it('blocks localhost and loopback IP addresses', async () => {
      const providerLocal = new OpenAICompatibleProvider({
        baseUrl: 'http://localhost:5001/v1',
        apiKey: 'key'
      });

      const res = await providerLocal.testConnection();
      expect(res.success).toBe(false);
      expect(res.code).toBe('SSRF_BLOCKED');

      const provider127 = new OpenAICompatibleProvider({
        baseUrl: 'http://127.0.0.1:8080/v1',
        apiKey: 'key'
      });
      const res127 = await provider127.testConnection();
      expect(res127.success).toBe(false);
      expect(res127.code).toBe('SSRF_BLOCKED');
    });

    it('blocks cloud metadata endpoint 169.254.169.254', async () => {
      const providerMeta = new OpenAICompatibleProvider({
        baseUrl: 'http://169.254.169.254/latest/meta-data',
        apiKey: 'key'
      });

      const res = await providerMeta.testConnection();
      expect(res.success).toBe(false);
      expect(res.code).toBe('SSRF_BLOCKED');
    });

    it('blocks private RFC1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
      const p10 = new OpenAICompatibleProvider({ baseUrl: 'http://10.0.0.5:3000/v1', apiKey: 'k' });
      const p172 = new OpenAICompatibleProvider({ baseUrl: 'http://172.16.5.1:8000/v1', apiKey: 'k' });
      const p192 = new OpenAICompatibleProvider({ baseUrl: 'http://192.168.1.1:11434/v1', apiKey: 'k' });

      expect((await p10.testConnection()).code).toBe('SSRF_BLOCKED');
      expect((await p172.testConnection()).code).toBe('SSRF_BLOCKED');
      expect((await p192.testConnection()).code).toBe('SSRF_BLOCKED');
    });
  });

  // ==========================================================
  // 6. ERROR NORMALIZATION & RESILIENCE
  // ==========================================================
  describe('6. Error Normalization & Resilience', () => {
    it('provider failure falls back gracefully to deterministic explanation and does NOT increment quota', async () => {
      const failingProvider: AIProvider = {
        name: 'failing-gemini',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: vi.fn().mockRejectedValue(new Error('Rate limit exceeded 429'))
      };

      const ai = new AIService({ primaryProvider: failingProvider });
      const output = await ai.explainFinding(sampleFinding, {}, { id: 'err-user' });

      expect(output.isFallback).toBe(true);
      expect(output.source).toBe('deterministic_fallback');

      // Managed quota must NOT have incremented on failure
      const quota = await aiConfigService.checkManagedQuota('err-user');
      expect(quota.used).toBe(0);
    });

    it('never removes or alters the original finding if AI fails', async () => {
      const findingCopy = JSON.parse(JSON.stringify(sampleFinding));
      const failingProvider: AIProvider = {
        name: 'failing',
        modelName: 'model',
        explainFinding: vi.fn().mockRejectedValue(new Error('500 server error'))
      };

      const ai = new AIService({ primaryProvider: failingProvider });
      await ai.explainFinding(sampleFinding);

      expect(sampleFinding).toEqual(findingCopy);
    });
  });
});
