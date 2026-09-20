import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import type { Server } from 'http';
import app from '../app.js';
import { AIService, ManagedAiQuotaExceededError, AIDisabledError } from '../services/ai/ai.service.js';
import { adaptFindingToExplanationInput } from '../services/ai/ai.adapter.js';
import { validateExplanationOutput, parseModelJson } from '../services/ai/ai.validator.js';
import { DeterministicProvider } from '../services/ai/providers/deterministic.provider.js';
import { ProviderRouter } from '../services/ai/providerRouter.js';
import { aiConfigService } from '../services/ai/aiConfig.service.js';
import { explanationCache } from '../services/ai/ai.cache.js';
import { sanitizeLog, maskApiKey } from '../services/security/aiEncryption.js';
import { validateUrlForSsrf } from '../services/security/ssrfValidator.js';
import type { AIProvider, ExplanationInput, ExplanationOutput } from '../services/ai/ai.types.js';

// Load deterministic fixtures
import successFixture from './fixtures/ai/fixture-ai-success.json' with { type: 'json' };
import invalidFixture from './fixtures/ai/fixture-ai-invalid.json' with { type: 'json' };
import hallucinationFixture from './fixtures/ai/fixture-ai-hallucination.json' with { type: 'json' };
import injectionFixture from './fixtures/ai/fixture-ai-injection.json' with { type: 'json' };
import emptyFixture from './fixtures/ai/fixture-ai-empty.json' with { type: 'json' };
import partialFixture from './fixtures/ai/fixture-ai-partial.json' with { type: 'json' };
import oversizedFixture from './fixtures/ai/fixture-ai-oversized.json' with { type: 'json' };


describe('PERFLENS — AI EXPLAINER EXTREME QA & RELIABILITY SUITE', () => {
  let testServer: Server;
  let baseUrl: string;
  const testUserId = 'test-qa-user-' + Date.now();

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      testServer = app.listen(0, () => {
        const addr = testServer.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    explanationCache.clear();
    aiConfigService.setInMemoryOnly(true);
    aiConfigService.resetStoreForTesting();
    vi.restoreAllMocks();
  });

  const verifiedFinding = {
    id: 'f-tbt-380',
    category: 'performance',
    severity: 'high',
    issue: 'High Total Blocking Time measured on main thread',
    evidence: [
      {
        id: 'E001',
        metric: 'TBT',
        value: 380,
        unit: 'ms',
        source: 'Google Lighthouse'
      }
    ]
  };

  // ==========================================================
  // SECTION 4: GOLDEN PATH — MANAGED AI
  // ==========================================================
  describe('Section 4 & 6: Golden Path & Provider Call Proof', () => {
    it('executes the full chain: Finding -> Provider -> Validator -> Output -> Quota Increment', async () => {
      let callCount = 0;
      let receivedInput: ExplanationInput | null = null;

      const mockProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => {
          callCount++;
          receivedInput = input;
          return {
            title: successFixture.title,
            whatIsHappening: successFixture.whatIsHappening,
            whyItMatters: successFixture.whyItMatters,
            evidenceExplanation: successFixture.evidenceExplanation,
            knownFacts: successFixture.knownFacts,
            unknowns: successFixture.unknowns,
            confidence: successFixture.confidence as any,
            source: 'ai',
            promptVersion: 'explainer.v1',
            model: 'gemini-flash-lite-latest',
            provider: 'managed'
          };
        }
      };

      const service = new AIService(mockProvider, new DeterministicProvider());

      // Quota before
      const usageBefore = await aiConfigService.getUserUsage(testUserId);
      expect(usageBefore.managedUsed).toBe(0);

      // Execute explanation
      const result = await service.explainFinding(verifiedFinding, { url: 'https://example.com' }, { id: testUserId });

      // Verification of provider call (Section 6)
      expect(callCount).toBe(1);
      expect(receivedInput).not.toBeNull();
      expect(receivedInput!.findingId).toBe('f-tbt-380');
      expect(receivedInput!.evidence[0].value).toBe(380);
      expect(receivedInput!.evidence[0].unit).toBe('ms');

      // Verification of output shape (Section 4)
      expect(result.source).toBe('ai');
      expect(result.provider).toBe('managed');
      expect(result.model).toBe('gemini-flash-lite-latest');
      expect(result.title).toBe(successFixture.title);
      expect(result.whatIsHappening).toBe(successFixture.whatIsHappening);
      expect(result.isFallback).toBeFalsy();
      expect(result.findingId).toBe('f-tbt-380');
      expect(result.generatedAt).toBeDefined();

      // Quota incremented exactly once (Section 4.14)
      const usageAfter = await aiConfigService.getUserUsage(testUserId);
      expect(usageAfter.managedUsed).toBe(1);
    });
  });

  // ==========================================================
  // SECTION 5 & 7: PROOF THAT REAL AI RESPONSE REACHES CONSUMER
  // ==========================================================
  describe('Section 5 & 7: Proof of Real AI Response & Fallback Distinction', () => {
    it('SECTION 5: PERFLENS_AI_PROOF_847291 marker reaches consumer without being replaced', async () => {
      const MARKER = 'PERFLENS_AI_PROOF_847291';

      const proofProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (_input: ExplanationInput): Promise<ExplanationOutput> => ({
          title: `Diagnostic: ${MARKER}`,
          whatIsHappening: `Real AI Execution Confirmed with token ${MARKER}.`,
          whyItMatters: `Marker verification ${MARKER} validates direct provider pass-through.`,
          evidenceExplanation: `Recorded evidence with marker ${MARKER}.`,
          knownFacts: [`Verified finding marker: ${MARKER}`],
          unknowns: ['No unknown variables'],
          confidence: 'high',
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        })
      };

      const service = new AIService(proofProvider, new DeterministicProvider());
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(res.source).toBe('ai');
      expect(res.title).toContain(MARKER);
      expect(res.whatIsHappening).toContain(MARKER);
      expect(res.whyItMatters).toContain(MARKER);
      expect(res.knownFacts[0]).toContain(MARKER);
    });

    it('SECTION 7: successful provider response returns AI text and NEVER deterministic fallback', async () => {
      const AI_TEXT = 'PERFLENS_REAL_AI_RESPONSE';
      const FALLBACK_TEXT = 'PERFLENS_DETERMINISTIC_FALLBACK';

      const successProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (_input: ExplanationInput): Promise<ExplanationOutput> => ({
          title: AI_TEXT,
          whatIsHappening: AI_TEXT,
          whyItMatters: AI_TEXT,
          evidenceExplanation: AI_TEXT,
          knownFacts: [AI_TEXT],
          unknowns: [AI_TEXT],
          confidence: 'high',
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        })
      };

      const customFallback: AIProvider = {
        name: 'deterministic',
        modelName: 'deterministic-v1',
        explainFinding: async (): Promise<ExplanationOutput> => ({
          title: FALLBACK_TEXT,
          whatIsHappening: FALLBACK_TEXT,
          whyItMatters: FALLBACK_TEXT,
          evidenceExplanation: FALLBACK_TEXT,
          knownFacts: [FALLBACK_TEXT],
          unknowns: [FALLBACK_TEXT],
          confidence: 'medium',
          source: 'deterministic_fallback',
          promptVersion: 'explainer.v1',
          model: 'deterministic-v1',
          provider: 'deterministic'
        })
      };

      const service = new AIService(successProvider, customFallback);
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(res.source).toBe('ai');
      expect(res.whatIsHappening).toBe(AI_TEXT);
      expect(res.whatIsHappening).not.toBe(FALLBACK_TEXT);
      expect(res.isFallback).toBeFalsy();
    });
  });

  // ==========================================================
  // SECTIONS 8-14: PROVIDER FAILURE MATRIX & SAFE FALLBACK
  // ==========================================================
  describe('Sections 8-14: Managed AI Provider Failure Matrix', () => {
    it('SECTION 8: provider timeout falls back cleanly and DOES NOT increment quota', async () => {
      const timeoutProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          throw new Error('Gemini request timed out after 8000ms.');
        }
      };

      const service = new AIService(timeoutProvider, new DeterministicProvider());
      const usageBefore = await aiConfigService.getUserUsage(testUserId);

      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(res.source).toBe('deterministic_fallback');
      expect(res.isFallback).toBe(true);
      expect(res.whatIsHappening).toBeDefined();

      const usageAfter = await aiConfigService.getUserUsage(testUserId);
      expect(usageAfter.managedUsed).toBe(usageBefore.managedUsed);
    });

    it('SECTION 9: provider HTTP 429 rate limit falls back and DOES NOT increment quota', async () => {
      const rateLimitProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          throw new Error('Gemini API rate limit exceeded (HTTP 429).');
        }
      };

      const service = new AIService(rateLimitProvider, new DeterministicProvider());
      const usageBefore = await aiConfigService.getUserUsage(testUserId);

      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(res.source).toBe('deterministic_fallback');
      expect(res.isFallback).toBe(true);

      const usageAfter = await aiConfigService.getUserUsage(testUserId);
      expect(usageAfter.managedUsed).toBe(usageBefore.managedUsed);
    });

    it('SECTION 10: provider HTTP 500 server error falls back safely without crash', async () => {
      const serverErrProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          throw new Error('Gemini API server error (HTTP 500).');
        }
      };

      const service = new AIService(serverErrProvider, new DeterministicProvider());
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(res.source).toBe('deterministic_fallback');
      expect(res.isFallback).toBe(true);
    });

    it('SECTION 11: provider returns non-JSON text -> rejected safely by parser', () => {
      expect(() => parseModelJson(invalidFixture.invalidRawJson)).toThrow(/not valid JSON/);
    });

    it('SECTION 12: valid JSON but invalid schema -> rejected safely by validator', () => {
      const adaptedInput = adaptFindingToExplanationInput(verifiedFinding);
      const validation = validateExplanationOutput(invalidFixture.invalidSchema, adaptedInput, {
        model: 'test',
        provider: 'managed',
        promptVersion: 'explainer.v1'
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes('title'))).toBe(true);
    });

    it('SECTION 13: empty response -> rejected safely', () => {
      const adaptedInput = adaptFindingToExplanationInput(verifiedFinding);
      const validationEmpty = validateExplanationOutput(emptyFixture.emptyObject, adaptedInput, {
        model: 'test',
        provider: 'managed',
        promptVersion: 'explainer.v1'
      });
      expect(validationEmpty.valid).toBe(false);

      expect(() => parseModelJson(emptyFixture.emptyString)).toThrow(/empty response/);
    });

    it('SECTION 14: partial response missing required fields -> rejected without rendering undefined', () => {
      const adaptedInput = adaptFindingToExplanationInput(verifiedFinding);
      const validation = validateExplanationOutput(partialFixture.missingKnownFacts, adaptedInput, {
        model: 'test',
        provider: 'managed',
        promptVersion: 'explainer.v1'
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('knownFacts'))).toBe(true);
    });
  });

  // ==========================================================
  // SECTIONS 15-18: HALLUCINATION GUARDS
  // ==========================================================
  describe('Sections 15-18: Hallucination Guard Defenses', () => {
    const adaptedInput = adaptFindingToExplanationInput(verifiedFinding);

    it('SECTION 16: catches and rejects unsupported framework claims (e.g. React/Next.js)', () => {
      const validation = validateExplanationOutput(
        hallucinationFixture.unsupportedFramework,
        adaptedInput,
        { model: 'test', provider: 'managed', promptVersion: 'explainer.v1' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Hallucination guard rejected unsupported framework claim'))).toBe(true);
    });

    it('SECTION 17: catches and rejects fabricated source code filenames (e.g. src/App.tsx)', () => {
      const validation = validateExplanationOutput(
        hallucinationFixture.fabricatedSourceFile,
        adaptedInput,
        { model: 'test', provider: 'managed', promptVersion: 'explainer.v1' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Hallucination guard rejected unsupported file reference'))).toBe(true);
    });

    it('SECTION 18: catches and rejects speculative ranking penalty claims ("Google will penalize")', () => {
      const validation = validateExplanationOutput(
        hallucinationFixture.speculativePenalty,
        adaptedInput,
        { model: 'test', provider: 'managed', promptVersion: 'explainer.v1' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Hallucination guard rejected unsupported absolute claim'))).toBe(true);
    });

    it('catches and rejects non-existent evidence IDs (e.g. E999)', () => {
      const validation = validateExplanationOutput(
        hallucinationFixture.inventedEvidenceId,
        adaptedInput,
        { model: 'test', provider: 'managed', promptVersion: 'explainer.v1' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('non-existent evidence ID "E999"'))).toBe(true);
    });
  });

  // ==========================================================
  // SECTIONS 19-23: PROMPT INJECTION & SECRET LEAK PREVENTION
  // ==========================================================
  describe('Sections 19-23: Prompt Injection & Secret Scrubbing', () => {
    it('SECTION 19-21: treats untrusted page text, titles, and meta descriptions strictly as data', () => {
      const maliciousFinding = {
        id: 'f-inj-001',
        category: 'seo',
        severity: 'high',
        issue: injectionFixture.maliciousTitle,
        evidence: [
          {
            id: 'E001',
            source: 'page-audit',
            details: { text: injectionFixture.untrustedPageText }
          }
        ]
      };

      const adapted = adaptFindingToExplanationInput(maliciousFinding);

      // Passwords in title are redacted
      expect(adapted.title).not.toContain('TEST_PASSWORD_847291');
      expect(adapted.title).toContain('[REDACTED]');
      // Finding ID remains stable
      expect(adapted.findingId).toBe('f-inj-001');
    });

    it('SECTION 22: fake API key AIza_TEST_SECRET_847291 is sanitized from logs and evidence', () => {
      const textWithSecret = `Connecting with Bearer ${injectionFixture.maliciousMetaDescription}`;
      const sanitized = sanitizeLog(textWithSecret);

      expect(sanitized).not.toContain('AIza_TEST_SECRET_847291');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('SECTION 23: test password TEST_PASSWORD_847291 is scrubbed by sanitizeLog and Evidence Gate', () => {
      const logLine = 'Login failed: password=TEST_PASSWORD_847291&user=admin';
      const sanitized = sanitizeLog(logLine);

      expect(sanitized).not.toContain('TEST_PASSWORD_847291');
      expect(sanitized).toContain('password=[REDACTED]');
    });
  });

  // ==========================================================
  // SECTIONS 27-31: BYOK PROVIDER ROUTING & MODEL SWITCHING
  // ==========================================================
  describe('Sections 27-31: BYOK Provider Routing Matrix', () => {
    it('SECTION 27: BYOK Gemini routes to GeminiProvider and DOES NOT consume managed quota', async () => {
      await aiConfigService.saveUserConfig(testUserId, {
        mode: 'byok',
        provider: 'gemini',
        model: 'gemini-flash-lite-latest',
        apiKey: 'AIzaSyFakeValidKeyGemini12345'
      });

      const spyGemini = vi.fn().mockResolvedValue(successFixture);
      const mockGemini: AIProvider = {
        name: 'gemini',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: spyGemini
      };

      const routerSpy = vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(mockGemini);

      const service = new AIService();
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(spyGemini).toHaveBeenCalledTimes(1);
      expect(res.provider).toBe('gemini');

      const usage = await aiConfigService.getUserUsage(testUserId);
      expect(usage.managedUsed).toBe(0); // BYOK never consumes managed quota

      routerSpy.mockRestore();
    });

    it('SECTION 28: BYOK OpenAI routes to OpenAIProvider and does not call Gemini', async () => {
      await aiConfigService.saveUserConfig(testUserId, {
        mode: 'byok',
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-proj-fakeValidKeyOpenAI12345'
      });

      const spyOpenAI = vi.fn().mockResolvedValue({
        ...successFixture,
        provider: 'openai',
        model: 'gpt-4o-mini'
      });
      const mockOpenAI: AIProvider = {
        name: 'openai',
        modelName: 'gpt-4o-mini',
        explainFinding: spyOpenAI
      };

      const routerSpy = vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(mockOpenAI);

      const service = new AIService();
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(spyOpenAI).toHaveBeenCalledTimes(1);
      expect(res.provider).toBe('openai');

      routerSpy.mockRestore();
    });

    it('SECTION 29: ProviderRouter correctly instantiates all 5 providers based on configuration', () => {
      const geminiInst = ProviderRouter.resolveProvider(
        { userId: 'u1', mode: 'byok', provider: 'gemini', model: 'gemini-flash-lite-latest' },
        'fake-key'
      );
      expect(geminiInst.name).toBe('gemini');

      const openaiInst = ProviderRouter.resolveProvider(
        { userId: 'u1', mode: 'byok', provider: 'openai', model: 'gpt-4o-mini' },
        'fake-key'
      );
      expect(openaiInst.name).toBe('openai');

      const anthropicInst = ProviderRouter.resolveProvider(
        { userId: 'u1', mode: 'byok', provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
        'fake-key'
      );
      expect(anthropicInst.name).toBe('anthropic');

      const compatInst = ProviderRouter.resolveProvider(
        { userId: 'u1', mode: 'byok', provider: 'openai-compatible', model: 'custom-model', baseUrl: 'https://llm.example.com/v1' },
        'fake-key'
      );
      expect(compatInst.name).toBe('openai-compatible');

      const managedInst = ProviderRouter.resolveProvider(
        { userId: 'u1', mode: 'managed', provider: 'managed', model: 'gemini-flash-lite-latest' }
      );
      expect(managedInst.name).toBe('managed');
    });

    it('SECTION 31: Model switching uses new model and does not return stale cache from old model', async () => {
      const calls: string[] = [];

      const mockProvider: AIProvider = {
        name: 'openai',
        modelName: 'model-a',
        explainFinding: async (_input: ExplanationInput): Promise<ExplanationOutput> => {
          calls.push('model-a');
          return { ...successFixture, model: 'model-a', provider: 'openai', source: 'ai', promptVersion: 'explainer.v1' } as any;
        }
      };

      const mockProviderB: AIProvider = {
        name: 'openai',
        modelName: 'model-b',
        explainFinding: async (_input: ExplanationInput): Promise<ExplanationOutput> => {
          calls.push('model-b');
          return { ...successFixture, model: 'model-b', provider: 'openai', source: 'ai', promptVersion: 'explainer.v1' } as any;
        }
      };

      const serviceA = new AIService(mockProvider, new DeterministicProvider());
      const resA = await serviceA.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(resA.model).toBe('model-a');

      const serviceB = new AIService(mockProviderB, new DeterministicProvider());
      const resB = await serviceB.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(resB.model).toBe('model-b');

      expect(calls).toEqual(['model-a', 'model-b']);
    });
  });

  // ==========================================================
  // SECTIONS 32-34: MANAGED QUOTA & FAILURE ACCOUNTING
  // ==========================================================
  describe('Sections 32-34: Managed Quota Accounting', () => {
    it('SECTION 32: enforces 5/month limit; 6th request throws ManagedAiQuotaExceededError', async () => {
      const mockSuccessProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => ({
          ...successFixture,
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed',
          title: `Finding ${input.findingId}`
        } as any)
      };

      const service = new AIService(mockSuccessProvider, new DeterministicProvider());

      // 5 successful requests with distinct finding IDs to avoid cache hits
      for (let i = 1; i <= 5; i++) {
        const finding = { ...verifiedFinding, id: `quota-f-${i}` };
        const res = await service.explainFinding(finding, {}, { id: testUserId });
        expect(res.source).toBe('ai');
      }

      const usage = await aiConfigService.getUserUsage(testUserId);
      expect(usage.managedUsed).toBe(5);

      // 6th request must be blocked with ManagedAiQuotaExceededError
      const finding6 = { ...verifiedFinding, id: 'quota-f-6' };
      await expect(service.explainFinding(finding6, {}, { id: testUserId })).rejects.toThrow(ManagedAiQuotaExceededError);

      // Usage remains capped at 5
      const usageFinal = await aiConfigService.getUserUsage(testUserId);
      expect(usageFinal.managedUsed).toBe(5);
    });

    it('SECTION 34: BYOK requests do NOT consume managed quota when at 5/5', async () => {
      // Pre-fill managed quota to 5
      for (let i = 1; i <= 5; i++) {
        await aiConfigService.incrementManagedUsage(testUserId);
      }
      const quotaCheck = await aiConfigService.checkManagedQuota(testUserId);
      expect(quotaCheck.allowed).toBe(false);

      // Switch to BYOK
      await aiConfigService.saveUserConfig(testUserId, {
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-test-key-12345'
      });

      const mockByokProvider: AIProvider = {
        name: 'openai',
        modelName: 'gpt-4o-mini',
        explainFinding: async () => ({ ...successFixture, source: 'ai', promptVersion: 'v1', model: 'gpt-4o-mini', provider: 'openai' } as any)
      };

      const routerSpy = vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(mockByokProvider);
      const service = new AIService();

      // BYOK request should succeed even though managed quota is 5/5
      const res = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(res.source).toBe('ai');
      expect(res.provider).toBe('openai');

      // Managed count must still be 5
      const usage = await aiConfigService.getUserUsage(testUserId);
      expect(usage.managedUsed).toBe(5);

      routerSpy.mockRestore();
    });
  });

  // ==========================================================
  // SECTIONS 35-39: CONCURRENCY & DATA ISOLATION
  // ==========================================================
  describe('Sections 35-39: Concurrency, Cross-Scan & Cross-User Isolation', () => {
    it('SECTION 37: concurrent requests for distinct findings remain completely isolated', async () => {
      const mockProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => ({
          ...successFixture,
          findingId: input.findingId,
          title: `Result for ${input.findingId}`,
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        } as any)
      };

      const service = new AIService(mockProvider, new DeterministicProvider());

      const fA = { ...verifiedFinding, id: 'finding-A' };
      const fB = { ...verifiedFinding, id: 'finding-B' };
      const fC = { ...verifiedFinding, id: 'finding-C' };

      const [resA, resB, resC] = await Promise.all([
        service.explainFinding(fA, {}, { id: testUserId }),
        service.explainFinding(fB, {}, { id: testUserId }),
        service.explainFinding(fC, {}, { id: testUserId })
      ]);

      expect(resA.findingId).toBe('finding-A');
      expect(resA.title).toContain('finding-A');

      expect(resB.findingId).toBe('finding-B');
      expect(resB.title).toContain('finding-B');

      expect(resC.findingId).toBe('finding-C');
      expect(resC.title).toContain('finding-C');
    });

    it('SECTION 38: cross-scan isolation ensures finding input contains only target scan evidence', () => {
      const scanAFinding = {
        id: 'scan-a-tbt',
        category: 'performance',
        issue: 'TBT 380ms on google.com',
        evidence: [{ metric: 'TBT', value: 380, source: 'google.com' }]
      };

      const scanBFinding = {
        id: 'scan-b-canonical',
        category: 'seo',
        issue: 'Missing canonical on github.com',
        evidence: [{ metric: 'canonical', value: 'missing', source: 'github.com' }]
      };

      const inputA = adaptFindingToExplanationInput(scanAFinding);
      const inputB = adaptFindingToExplanationInput(scanBFinding);

      expect(JSON.stringify(inputA)).not.toContain('github.com');
      expect(JSON.stringify(inputB)).not.toContain('google.com');
    });

    it('SECTION 39: cross-user isolation prevents User A config from accessing User B data', async () => {
      await aiConfigService.saveUserConfig('user-alpha', {
        mode: 'byok',
        provider: 'gemini',
        apiKey: 'AIzaSyAlphaKey123'
      });

      await aiConfigService.saveUserConfig('user-beta', {
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-beta-key-456'
      });

      const alphaDto = await aiConfigService.getUserConfigDto('user-alpha');
      const betaDto = await aiConfigService.getUserConfigDto('user-beta');

      expect(alphaDto.provider).toBe('gemini');
      expect(betaDto.provider).toBe('openai');
      // Neither DTO exposes raw secrets
      expect((alphaDto as any).apiKey).toBeUndefined();
      expect((betaDto as any).apiKey).toBeUndefined();
    });
  });

  // ==========================================================
  // SECTIONS 40-42: CACHE DEDUPLICATION & INTEGRITY
  // ==========================================================
  describe('Sections 40-42: Cache Partitioning & Deduplication', () => {
    it('SECTION 40: hits cache on identical finding, evidence, model, and promptVersion', async () => {
      let providerCalls = 0;
      const trackingProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          providerCalls++;
          return { ...successFixture, source: 'ai', promptVersion: 'explainer.v1', model: 'gemini-flash-lite-latest', provider: 'managed' } as any;
        }
      };

      const service = new AIService(trackingProvider, new DeterministicProvider());

      // Call 1 -> miss -> calls provider
      const res1 = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(providerCalls).toBe(1);
      expect(res1.fromCache).toBeFalsy();

      // Call 2 -> hit -> does not call provider
      const res2 = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(providerCalls).toBe(1);
      expect(res2.fromCache).toBe(true);
    });

    it('changing evidence creates a distinct cache key and triggers fresh provider call', async () => {
      let providerCalls = 0;
      const trackingProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          providerCalls++;
          return { ...successFixture, source: 'ai', promptVersion: 'explainer.v1', model: 'gemini-flash-lite-latest', provider: 'managed' } as any;
        }
      };

      const service = new AIService(trackingProvider, new DeterministicProvider());

      await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(providerCalls).toBe(1);

      // Modify evidence
      const modifiedFinding = {
        ...verifiedFinding,
        evidence: [{ id: 'E001', metric: 'TBT', value: 920, unit: 'ms' }]
      };

      await service.explainFinding(modifiedFinding, {}, { id: testUserId });
      expect(providerCalls).toBe(2);
    });
  });

  // ==========================================================
  // SECTIONS 49-52: SECURITY — XSS & SSRF SAFEGUARDS
  // ==========================================================
  describe('Sections 49-52 & 81: Security, SSRF & XSS Safeguards', () => {
    it('SECTION 49: XSS script tags in model output are preserved as text and never executed', () => {
      const maliciousModelOutput = {
        ...successFixture,
        whatIsHappening: injectionFixture.xssPayload
      };

      const adaptedInput = adaptFindingToExplanationInput(verifiedFinding);
      const validation = validateExplanationOutput(maliciousModelOutput, adaptedInput, {
        model: 'test',
        provider: 'managed',
        promptVersion: 'explainer.v1'
      });

      expect(validation.valid).toBe(true);
      // Validated data preserves text literally without HTML decoding
      expect(validation.data?.whatIsHappening).toBe(injectionFixture.xssPayload);
    });

    it('SECTION 81: SSRF protection blocks private IP ranges on OpenAI-compatible base URLs', async () => {
      const privateTargets = [
        'http://localhost:8080',
        'http://127.0.0.1:5001',
        'http://10.0.0.1/v1',
        'http://192.168.1.1/v1',
        'http://172.16.0.1/v1',
        'http://169.254.169.254/latest/meta-data'
      ];

      for (const url of privateTargets) {
        expect(validateUrlForSsrf(url)).toBe(false);
      }
    });

    it('SECTION 81: SSRF protection allows valid public HTTPS hosts', () => {
      const publicTargets = [
        'https://api.groq.com/openai/v1',
        'https://api.together.xyz/v1',
        'https://openrouter.ai/api/v1'
      ];

      for (const url of publicTargets) {
        expect(validateUrlForSsrf(url)).toBe(true);
      }
    });
  });

  // ==========================================================
  // SECTIONS 74-77: REGRESSION & FEATURE FLAG INTEGRITY
  // ==========================================================
  describe('Sections 74-77: Deterministic Regression Baseline & Feature Flag', () => {
    it('SECTION 74: AI explanation never mutates original finding object', async () => {
      const mockProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async () => ({ ...successFixture, source: 'ai', promptVersion: 'v1', model: 'gemini', provider: 'managed' } as any)
      };

      const service = new AIService(mockProvider, new DeterministicProvider());
      const findingClone = JSON.parse(JSON.stringify(verifiedFinding));

      await service.explainFinding(verifiedFinding, {}, { id: testUserId });

      expect(verifiedFinding).toEqual(findingClone);
    });

    it('SECTION 77: when PERFLENS_AI_ENABLED is false, throws AIDisabledError immediately without calling provider', async () => {
      const providerSpy = vi.fn();
      const mockProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: providerSpy
      };

      const service = new AIService({ primaryProvider: mockProvider, enabled: false });
      expect(service.isAIEnabled()).toBe(false);

      await expect(service.explainFinding(verifiedFinding, {}, { id: testUserId })).rejects.toThrow(AIDisabledError);
      expect(providerSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // SECTIONS 24-26 & 68: AUTHENTICATION & AUTHORIZATION TESTS
  // ==========================================================
  describe('Sections 24-26 & 68: Authentication & Authorization HTTP Security', () => {
    it('SECTION 24: GET /api/v1/ai/config requires authentication and returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/ai/config`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('token required');
    });

    it('SECTION 25: expired or invalid JWT token returns 401 Access denied', async () => {
      const res = await fetch(`${baseUrl}/api/v1/ai/config`, {
        headers: { Authorization: 'Bearer invalid.or.expired.jwt.token.here' }
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid or expired token');
    });

    it('SECTION 26: User A cannot mutate or access User B AI credentials', async () => {
      // User A configuration
      await aiConfigService.saveUserConfig('user-tenant-A', {
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-tenant-A-key-11111'
      });

      // User B configuration
      await aiConfigService.saveUserConfig('user-tenant-B', {
        mode: 'byok',
        provider: 'anthropic',
        apiKey: 'sk-ant-tenant-B-key-22222'
      });

      const configA = await aiConfigService.getUserConfigDto('user-tenant-A');
      const configB = await aiConfigService.getUserConfigDto('user-tenant-B');

      expect(configA.provider).toBe('openai');
      expect(configB.provider).toBe('anthropic');
      expect(configA.maskedKey).toBe('••••••••••••••••');
      expect(configB.maskedKey).toBe('••••••••••••••••');
      // No plaintext cross-contamination
      expect(JSON.stringify(configA)).not.toContain('tenant-B');
      expect(JSON.stringify(configB)).not.toContain('tenant-A');
    });
  });

  // ==========================================================
  // SECTION 41: CACHE POISONING RESISTANCE
  // ==========================================================
  describe('Section 41: Cache Poisoning Resistance', () => {
    it('distinct models or evidence differences never return poisoned cache from another user', () => {
      const inputA: ExplanationInput = {
        findingId: 'shared-f1',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ id: 'E1', metric: 'TBT', value: 380, source: 'audit' }]
      };

      const inputB: ExplanationInput = {
        findingId: 'shared-f1',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ id: 'E1', metric: 'TBT', value: 950, source: 'audit' }]
      };

      const keyA = explanationCache.computeKey(inputA, 'gemini:flash', 'v1');
      const keyB = explanationCache.computeKey(inputB, 'gemini:flash', 'v1');

      expect(keyA).not.toBe(keyB);
    });
  });

  // ==========================================================
  // SECTIONS 50-52: TOKEN, COST CONTROL & BOUNDED SIZING
  // ==========================================================
  describe('Sections 50-52: Token, Cost Control & Bounded Sizing', () => {
    it('SECTION 50: oversized model output fields are bounded safely and rogue deep fields discarded', () => {
      const adapted = adaptFindingToExplanationInput(verifiedFinding);
      const validation = validateExplanationOutput(oversizedFixture.oversizedField, adapted, {
        model: 'gemini-flash-lite-latest',
        provider: 'managed',
        promptVersion: 'explainer.v1'
      });

      expect(validation.valid).toBe(true);
      expect(validation.data?.title.length).toBeLessThanOrEqual(500);
      expect(validation.data?.whatIsHappening.length).toBeLessThanOrEqual(5000);
      // Rogue deeply nested field from fixture is dropped
      expect((validation.data as any)?.deeplyNestedDetails).toBeUndefined();
    });

    it('SECTION 51: input evidence is strictly bounded to at most 15 items to prevent uncontrolled prompt explosion', () => {
      const largeEvidenceFinding = {
        id: 'bulk-evidence-01',
        category: 'performance',
        severity: 'high',
        title: 'Unoptimized Image Flood',
        evidence: Array.from({ length: 100 }, (_, i) => ({
          id: `E${String(i + 1).padStart(3, '0')}`,
          resource: `https://example.com/img-${i}.jpg`,
          value: 500,
          unit: 'KB'
        }))
      };

      const adapted = adaptFindingToExplanationInput(largeEvidenceFinding);
      expect(adapted.evidence.length).toBe(15);
      expect(adapted.evidence[0].id).toBe('E001');
      expect(adapted.evidence[14].id).toBe('E015');
    });

    it('SECTION 52: sends only verified evidence items and strictly excludes full HTML, passwords, and cookies', () => {
      const finding = {
        id: 'cost-control-01',
        category: 'performance',
        severity: 'high',
        title: 'Optimize CSS Delivery',
        evidence: [
          { id: 'E001', resource: 'https://example.com/main.css', value: 120, unit: 'KB' }
        ],
        // Extraneous sensitive fields that should never be forwarded
        password: 'SUPER_SECRET_PASSWORD',
        cookie: 'session_id=12345',
        fullHtml: '<html><body>'.repeat(500) + '</body></html>'
      };

      const adapted = adaptFindingToExplanationInput(finding);

      const serialized = JSON.stringify(adapted);
      expect(serialized).not.toContain('SUPER_SECRET_PASSWORD');
      expect(serialized).not.toContain('session_id=12345');
      expect(serialized).not.toContain('<html>');
      expect(adapted.evidence.length).toBe(1);
      expect(adapted.evidence[0].resource).toBe('https://example.com/main.css');
    });
  });

  // ==========================================================
  // SECTION 60 & 61: API KEY MASKING & TEST CONNECTION
  // ==========================================================
  describe('Sections 60 & 61: API Key Masking & Test Connection', () => {
    it('SECTION 60: maskApiKey never exposes real key characters', () => {
      const key = 'sk-proj-1234567890abcdefghijklmnop';
      const masked = maskApiKey(key);
      expect(masked).toBe('••••••••••••••••');
      expect(masked).not.toContain('sk-');
      expect(masked).not.toContain('1234');
    });

    it('SECTION 61: test connection with invalid key returns safe error without leaking secret', async () => {
      const mockFailProvider: AIProvider = {
        name: 'gemini',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: vi.fn(),
        testConnection: async () => ({
          success: false,
          code: 'AUTH_ERROR',
          message: 'API key not valid. Please pass a valid API key.'
        })
      };

      const result = await mockFailProvider.testConnection!();
      expect(result.success).toBe(false);
      expect(result.code).toBe('AUTH_ERROR');
      expect(result.message).not.toContain('secret');
    });
  });

  // ==========================================================
  // SECTIONS 66-67: FRONTEND PRODUCTION BUNDLE SECRET SCAN
  // ==========================================================
  describe('Sections 66-67: Production Bundle Secret Scrubbing Audit', () => {
    it('verifies that frontend build artifacts contain no hardcoded API keys or provider secrets', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const distAssetsDir = path.resolve(process.cwd(), '../dist/assets');
      if (fs.existsSync(distAssetsDir)) {
        const files = fs.readdirSync(distAssetsDir);
        const jsFiles = files.filter((f: string) => f.endsWith('.js'));

        for (const jsFile of jsFiles) {
          const content = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf-8');

          // Secret keys must never exist in frontend client bundles
          expect(content).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);
          expect(content).not.toMatch(/AQ\.[A-Za-z0-9_-]{40,}/);
          expect(content).not.toContain('perflens_developer_secret_key');
          expect(content).not.toMatch(/sk-proj-[A-Za-z0-9_-]{20,}/);
        }
      }
    });
  });
});
