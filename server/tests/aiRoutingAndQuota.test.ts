import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from '../services/ai/ai.service.js';
import { DeterministicProvider } from '../services/ai/providers/deterministic.provider.js';
import { aiConfigService } from '../services/ai/aiConfig.service.js';
import { explanationCache } from '../services/ai/ai.cache.js';
import { ProviderRouter } from '../services/ai/providerRouter.js';
import type { AIProvider, ExplanationInput, ExplanationOutput } from '../services/ai/ai.types.js';

describe('PERFLENS — AI Explainer Routing, Quota Accounting & Marker Injection Proof', () => {
  const testUserId = 'test-audit-user-' + Date.now();

  beforeEach(() => {
    explanationCache.clear();
    aiConfigService.setInMemoryOnly(true);
    aiConfigService.resetStoreForTesting();
  });

  const sampleFinding = {
    id: 'f-audit-001',
    category: 'performance',
    severity: 'high',
    issue: 'High Total Blocking Time measured on main thread',
    evidence: [
      {
        metric: 'TBT',
        value: 750,
        unit: 'ms',
        source: 'Google Lighthouse'
      }
    ]
  };

  // -------------------------------------------------------------
  // 1. MARKER INJECTION TEST (TEST_AI_MARKER_84721)
  // -------------------------------------------------------------
  it('MARKER INJECTION: genuine provider output with TEST_AI_MARKER_84721 reaches output without being replaced by deterministic text', async () => {
    const MARKER = 'TEST_AI_MARKER_84721';

    // Mock provider returning distinctive marker
    const markerProvider: AIProvider = {
      name: 'managed',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => {
        return {
          title: input.title,
          whatIsHappening: `Verified execution trace: ${MARKER}. Main-thread execution was delayed by 750 ms.`,
          whyItMatters: `High main-thread delay under marker ${MARKER} impedes immediate user input responsiveness.`,
          evidenceExplanation: `Recorded 750ms Total Blocking Time via ${input.evidence[0]?.source}.`,
          knownFacts: ['The measured Total Blocking Time (TBT) is 750 ms.'],
          unknowns: ['Detailed call stack breakdown requires CPU profile.'],
          confidence: 'high',
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        };
      }
    };

    const service = new AIService(markerProvider, new DeterministicProvider());
    const result = await service.explainFinding(sampleFinding, {}, { id: testUserId });

    // Prove that the marker is present and NOT replaced with deterministic text
    expect(result.source).toBe('ai');
    expect(result.whatIsHappening).toContain(MARKER);
    expect(result.whyItMatters).toContain(MARKER);
    expect(result.isFallback).toBeFalsy();
    expect(result.findingId).toBe('f-audit-001');
    expect(result.generatedAt).toBeDefined();

    // Confirm it is materially different from deterministic fallback text
    expect(result.whatIsHappening).not.toContain('PerfLens detected substantial main-thread processing work');
  });

  // -------------------------------------------------------------
  // 2. MANAGED QUOTA ACCOUNTING — INCREMENT ON SUCCESS
  // -------------------------------------------------------------
  it('QUOTA ACCOUNTING: successful managed AI explanation increments quota exactly once', async () => {
    const mockSuccessProvider: AIProvider = {
      name: 'managed',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => ({
        title: input.title,
        whatIsHappening: 'Main thread was blocked for 750 ms.',
        whyItMatters: 'Users experience sluggish interactions.',
        evidenceExplanation: 'TBT of 750ms.',
        knownFacts: ['TBT is 750 ms'],
        unknowns: ['Exact script file'],
        confidence: 'high',
        source: 'ai',
        promptVersion: 'explainer.v1',
        model: 'gemini-flash-lite-latest',
        provider: 'managed'
      })
    };

    const service = new AIService(mockSuccessProvider, new DeterministicProvider());

    const initialUsage = await aiConfigService.getUserUsage(testUserId);
    expect(initialUsage.managedUsed).toBe(0);

    // Call 1 -> Should increment to 1
    const res1 = await service.explainFinding(sampleFinding, {}, { id: testUserId });
    expect(res1.source).toBe('ai');

    const usageAfterCall1 = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterCall1.managedUsed).toBe(1);

    // Call 2 with DIFFERENT finding -> Should increment to 2
    const differentFinding = { ...sampleFinding, id: 'f-audit-002' };
    const res2 = await service.explainFinding(differentFinding, {}, { id: testUserId });
    expect(res2.source).toBe('ai');

    const usageAfterCall2 = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterCall2.managedUsed).toBe(2);
  });

  // -------------------------------------------------------------
  // 3. ZERO QUOTA ON PROVIDER FAILURE / FALLBACK
  // -------------------------------------------------------------
  it('QUOTA ACCOUNTING: provider failure triggers deterministic fallback and DOES NOT increment quota', async () => {
    const failingProvider: AIProvider = {
      name: 'managed',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (): Promise<ExplanationOutput> => {
        throw new Error('Gemini API rate limit exceeded (HTTP 429).');
      }
    };

    const service = new AIService(failingProvider, new DeterministicProvider());

    const usageBeforeFailure = await aiConfigService.getUserUsage(testUserId);
    const countBefore = usageBeforeFailure.managedUsed;

    const failingFinding = { ...sampleFinding, id: 'f-audit-failure-001' };
    const result = await service.explainFinding(failingFinding, {}, { id: testUserId });

    // Fallback returned safely without crashing
    expect(result.source).toBe('deterministic_fallback');
    expect(result.isFallback).toBe(true);
    expect(result.whatIsHappening).toBeDefined();

    // Verify quota DID NOT change
    const usageAfterFailure = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterFailure.managedUsed).toBe(countBefore);
  });

  // -------------------------------------------------------------
  // 4. CACHE DEDUPLICATION — NO DUPLICATE QUOTA CONSUMPTION
  // -------------------------------------------------------------
  it('CACHE DEDUPLICATION: re-rendering / re-requesting the same finding hits cache and does NOT re-increment quota', async () => {
    let callCount = 0;
    const trackingProvider: AIProvider = {
      name: 'managed',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => {
        callCount++;
        return {
          title: input.title,
          whatIsHappening: 'Cached main thread analysis.',
          whyItMatters: 'Page responsiveness.',
          evidenceExplanation: 'TBT of 750ms.',
          knownFacts: ['TBT is 750 ms'],
          unknowns: ['Component internals'],
          confidence: 'high',
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        };
      }
    };

    const service = new AIService(trackingProvider, new DeterministicProvider());
    const cacheTestFinding = { ...sampleFinding, id: 'f-audit-cache-001' };

    const usageBefore = await aiConfigService.getUserUsage(testUserId);
    const startCount = usageBefore.managedUsed;

    // First call (cache miss) -> calls provider, increments quota
    const res1 = await service.explainFinding(cacheTestFinding, {}, { id: testUserId });
    expect(callCount).toBe(1);
    expect(res1.fromCache).toBeFalsy();

    const usageAfterFirst = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterFirst.managedUsed).toBe(startCount + 1);

    // Second call with same finding and evidence (cache hit) -> DOES NOT call provider, DOES NOT increment quota
    const res2 = await service.explainFinding(cacheTestFinding, {}, { id: testUserId });
    expect(callCount).toBe(1); // Still 1! Provider was not called again
    expect(res2.fromCache).toBe(true);

    const usageAfterSecond = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterSecond.managedUsed).toBe(startCount + 1); // Still startCount + 1!
  });

  // -------------------------------------------------------------
  // 5. BYOK MODE CONSUMES ZERO MANAGED QUOTA
  // -------------------------------------------------------------
  it('BYOK MODE: BYOK explanations NEVER increment managed quota', async () => {
    // Configure user in BYOK mode
    await aiConfigService.saveUserConfig(testUserId, {
      mode: 'byok',
      provider: 'gemini',
      model: 'gemini-flash-lite-latest',
      apiKey: 'AIzaSyFakeValidKeyForByokTest123456789'
    });

    const byokProvider: AIProvider = {
      name: 'gemini',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => ({
        title: input.title,
        whatIsHappening: 'BYOK client explanation.',
        whyItMatters: 'Page latency.',
        evidenceExplanation: 'TBT 750ms.',
        knownFacts: ['TBT is 750 ms'],
        unknowns: ['Third party impact'],
        confidence: 'high',
        source: 'ai',
        promptVersion: 'explainer.v1',
        model: 'gemini-flash-lite-latest',
        provider: 'gemini'
      })
    };

    const spy = vi.spyOn(ProviderRouter, 'resolveProvider').mockReturnValue(byokProvider);

    const service = new AIService();
    const byokFinding = { ...sampleFinding, id: 'f-audit-byok-001' };

    const usageBeforeByok = await aiConfigService.getUserUsage(testUserId);
    const countBefore = usageBeforeByok.managedUsed;

    const res = await service.explainFinding(byokFinding, {}, { id: testUserId });
    expect(res.source).toBe('ai');
    expect(res.provider).toBe('gemini');

    // Managed quota must remain completely untouched
    const usageAfterByok = await aiConfigService.getUserUsage(testUserId);
    expect(usageAfterByok.managedUsed).toBe(countBefore);
    spy.mockRestore();
  });

  // -------------------------------------------------------------
  // 6. CONTROLLED MARKER: PERFLENS_AI_RUNTIME_TEST_847291
  // -------------------------------------------------------------
  it('DETERMINISTIC MARKER TEST: PERFLENS_AI_RUNTIME_TEST_847291 passes through provider to output intact', async () => {
    const MARKER = 'PERFLENS_AI_RUNTIME_TEST_847291';

    const testMarkerProvider: AIProvider = {
      name: 'managed',
      modelName: 'gemini-flash-lite-latest',
      explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => ({
        title: input.title,
        whatIsHappening: `Deterministic marker verification: ${MARKER}. Render blocking resource evaluated.`,
        whyItMatters: `High priority delay: ${MARKER}.`,
        evidenceExplanation: `Observed via ${input.evidence[0]?.source || 'engine'} with ${MARKER}.`,
        knownFacts: [`Verified finding with token ${MARKER}`],
        unknowns: ['Detailed call stack'],
        confidence: 'high',
        source: 'ai',
        promptVersion: 'explainer.v1',
        model: 'gemini-flash-lite-latest',
        provider: 'managed'
      })
    };

    const service = new AIService(testMarkerProvider, new DeterministicProvider());
    const markerFinding = { ...sampleFinding, id: 'f-marker-847291' };

    const output = await service.explainFinding(markerFinding, {}, { id: testUserId });

    expect(output.source).toBe('ai');
    expect(output.whatIsHappening).toContain(MARKER);
    expect(output.whyItMatters).toContain(MARKER);
    expect(output.evidenceExplanation).toContain(MARKER);
    expect(output.knownFacts[0]).toContain(MARKER);
    expect(output.findingId).toBe('f-marker-847291');
    expect(output.isFallback).toBeFalsy();
  });

  // -------------------------------------------------------------
  // 7. SECURITY & AUTH SECRET EXPOSURE AUDIT
  // -------------------------------------------------------------
  it('SECURITY AUDIT: passwords and API keys are never exposed in responses, URLs, or storage', async () => {
    // 1. Verify that user config masks API keys
    await aiConfigService.saveUserConfig(testUserId, {
      mode: 'byok',
      provider: 'openai',
      apiKey: 'sk-proj-super-secret-key-1234567890'
    });

    const publicConfig = await aiConfigService.getUserConfigDto(testUserId);
    expect((publicConfig as any).apiKey).toBeUndefined();
    expect((publicConfig as any).encryptedApiKey).toBeUndefined();
    expect(publicConfig.configured).toBe(true);

    // 2. Verify evidence gate strips passwords and secrets
    const { adaptFindingToExplanationInput } = await import('../services/ai/ai.adapter.js');
    const sensitiveFinding = {
      id: 'f-sec-001',
      issue: 'API key in query string: https://api.example.com?api_key=secret123&password=supersecret',
      evidence: ['Failed auth with Bearer eyJhbGciOi... and password=supersecret']
    };

    const adapted = adaptFindingToExplanationInput(sensitiveFinding);
    expect(adapted.title).not.toContain('supersecret');
    expect(adapted.title).toContain('[REDACTED]');
    expect(adapted.evidence[0]?.details?.text).not.toContain('supersecret');
    expect(adapted.evidence[0]?.details?.text).toContain('[REDACTED]');
  });
});

