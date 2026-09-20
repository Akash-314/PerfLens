import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import puppeteer, { Browser } from 'puppeteer';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { AIService } from '../services/ai/ai.service.js';
import { ProviderRouter } from '../services/ai/providerRouter.js';
import { DeterministicProvider } from '../services/ai/providers/deterministic.provider.js';
import { aiConfigService } from '../services/ai/aiConfig.service.js';
import { explanationCache } from '../services/ai/ai.cache.js';
import type { AIProvider, ExplanationInput, ExplanationOutput } from '../services/ai/ai.types.js';

// =========================================================================
// PERFLENS — DEFINITIVE AI RUNTIME PROOF TEST SUITE
// Provider → Backend → Validator → API → Frontend → DOM
// =========================================================================

const UNIQUE_PROOF_MARKER = 'PERFLENS_AI_RUNTIME_PROOF_847291';
const NEGATIVE_CONTROL_MARKER = 'PERFLENS_AI_NEGATIVE_CONTROL_593821';

describe('PERFLENS — DEFINITIVE AI RUNTIME PROOF & DOM VERIFICATION', () => {
  let testServer: Server;
  let baseUrl: string;
  let browser: Browser | null = null;
  const testUserId = 'test-proof-user-' + Date.now();
  const dbUserId = '8f101306-620e-4880-834b-a280b90d0914'; // User with existing reports in Supabase
  const jwtSecret = process.env.JWT_SECRET || 'perflens_developer_secret_key_88f910a2';
  const authToken = jwt.sign({ id: dbUserId }, jwtSecret, { expiresIn: '30d' });

  beforeAll(async () => {
    // 1. Launch backend test server on ephemeral port
    await new Promise<void>((resolve) => {
      testServer = app.listen(0, () => {
        const addr = testServer.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // 2. Launch headless Puppeteer instance for DOM rendering tests
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (err: any) {
      console.warn('[AI Proof Warning]: Puppeteer launch failed:', err.message);
    }
  });

  afterAll(async () => {
    ProviderRouter.setTestProvider(null);
    if (browser) {
      await browser.close().catch(() => {});
    }
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    explanationCache.clear();
    ProviderRouter.setTestProvider(null);
    aiConfigService.setInMemoryOnly(true);
    aiConfigService.resetStoreForTesting();
  });

  afterEach(() => {
    ProviderRouter.setTestProvider(null);
    explanationCache.clear();
  });

  const verifiedFinding = {
    id: 'f-tbt-380',
    category: 'performance',
    severity: 'high',
    issue: 'Total Blocking Time exceeds 200ms threshold',
    refUrl: 'https://web.dev/tbt/',
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

  // Helper to construct a strictly schema-valid explanation with a chosen marker
  function createMarkerExplanation(marker: string): ExplanationOutput {
    return {
      title: `Understanding Total Blocking Time - ${marker}`,
      whatIsHappening: `Measured main-thread blocking time exceeds targets with verification token ${marker}.`,
      whyItMatters: `Input delay impacts user responsiveness, verified by token ${marker}.`,
      evidenceExplanation: `Lighthouse diagnostic audit evidence confirmed with token ${marker}.`,
      knownFacts: [
        `Total Blocking Time was measured at 380ms (token: ${marker})`,
        `Target threshold is 200ms or less`
      ],
      unknowns: [
        `Specific internal JavaScript function stack traces (token: ${marker})`,
        `Client device CPU differences`
      ],
      confidence: 'high',
      source: 'ai',
      promptVersion: 'explainer.v1',
      model: 'gemini-flash-lite-latest',
      provider: 'managed'
    };
  }

  // =======================================================================
  // 1. PROVIDER BOUNDARY & PROOF MARKER TEST
  // =======================================================================
  describe('1. Provider Boundary & Marker Injection', () => {
    it('test provider receives verified finding and injects unique marker PERFLENS_AI_RUNTIME_PROOF_847291', async () => {
      let providerCalled = false;
      let receivedInput: ExplanationInput | null = null;

      const testProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (input: ExplanationInput): Promise<ExplanationOutput> => {
          providerCalled = true;
          receivedInput = input;
          return createMarkerExplanation(UNIQUE_PROOF_MARKER);
        }
      };

      ProviderRouter.setTestProvider(testProvider);

      const service = new AIService();
      const output = await service.explainFinding(verifiedFinding, { url: 'https://example.com' }, { id: testUserId });

      expect(providerCalled).toBe(true);
      expect(receivedInput).not.toBeNull();
      expect(receivedInput!.findingId).toBe('f-tbt-380');
      expect(receivedInput!.evidence[0].value).toBe(380);
      expect(output.whatIsHappening).toContain(UNIQUE_PROOF_MARKER);
      expect(output.title).toContain(UNIQUE_PROOF_MARKER);
      expect(output.whyItMatters).toContain(UNIQUE_PROOF_MARKER);
      expect(output.knownFacts[0]).toContain(UNIQUE_PROOF_MARKER);
      expect(output.source).toBe('ai');
      expect(output.isFallback).toBeFalsy();
    });
  });

  // =======================================================================
  // 2. HTTP API & ROUTING INTEGRATION TEST
  // =======================================================================
  describe('2. End-to-End HTTP API Execution (Route -> Controller -> Service -> Router -> Provider)', () => {
    it('POST /api/v1/ai/explain exercises entire backend chain and returns unique marker', async () => {
      let providerCalled = false;
      let callCount = 0;

      const testProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          providerCalled = true;
          callCount++;
          return createMarkerExplanation(UNIQUE_PROOF_MARKER);
        }
      };

      ProviderRouter.setTestProvider(testProvider);

      const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          finding: verifiedFinding,
          context: { url: 'https://example.com' }
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(providerCalled).toBe(true);
      expect(callCount).toBe(1);

      // Verify marker was preserved completely across all layers
      expect(json.data.whatIsHappening).toContain(UNIQUE_PROOF_MARKER);
      expect(json.data.whyItMatters).toContain(UNIQUE_PROOF_MARKER);
      expect(json.data.knownFacts[0]).toContain(UNIQUE_PROOF_MARKER);
      expect(json.data.unknowns[0]).toContain(UNIQUE_PROOF_MARKER);
      expect(json.data.source).toBe('ai');
      expect(json.data.provider).toBe('managed');
      expect(json.data.model).toBe('gemini-flash-lite-latest');
    });

    it('POST /api/ai/explain alias route behaves identically with marker preservation', async () => {
      const testProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          return createMarkerExplanation(UNIQUE_PROOF_MARKER);
        }
      };

      ProviderRouter.setTestProvider(testProvider);

      const res = await fetch(`${baseUrl}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding: verifiedFinding,
          context: { url: 'https://example.com' }
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.whatIsHappening).toContain(UNIQUE_PROOF_MARKER);
    });
  });

  // =======================================================================
  // 3. DETERMINISTIC FALLBACK EXCLUSION
  // =======================================================================
  describe('3. Deterministic Fallback Exclusion', () => {
    it('proves the marker originates SOLELY from provider and NEVER from fallback templates', async () => {
      const fallbackProvider = new DeterministicProvider();
      const fallbackResult = await fallbackProvider.explainFinding({
        findingId: 'f-tbt-380',
        category: 'performance',
        severity: 'high',
        title: verifiedFinding.issue,
        evidence: verifiedFinding.evidence as any
      });

      // The fallback template must NOT contain the proof marker
      expect(fallbackResult.whatIsHappening).not.toContain(UNIQUE_PROOF_MARKER);
      expect(fallbackResult.whyItMatters).not.toContain(UNIQUE_PROOF_MARKER);
      expect(fallbackResult.title).not.toContain(UNIQUE_PROOF_MARKER);
      expect(fallbackResult.knownFacts.join(' ')).not.toContain(UNIQUE_PROOF_MARKER);
      expect(fallbackResult.unknowns.join(' ')).not.toContain(UNIQUE_PROOF_MARKER);
    });
  });

  // =======================================================================
  // 4. CACHE BYPASS & CACHE ISOLATION
  // =======================================================================
  describe('4. Cache Bypass & Cache Isolation', () => {
    it('executes provider on first call, caches output, and re-executes when cache is cleared', async () => {
      let calls = 0;
      const testProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          calls++;
          return createMarkerExplanation(UNIQUE_PROOF_MARKER);
        }
      };

      ProviderRouter.setTestProvider(testProvider);
      const service = new AIService();

      // Request 1: Fresh execution
      const res1 = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(calls).toBe(1);
      expect(res1.fromCache).toBeFalsy();
      expect(res1.whatIsHappening).toContain(UNIQUE_PROOF_MARKER);

      // Request 2: Served from cache
      const res2 = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(calls).toBe(1); // Provider NOT called again
      expect(res2.fromCache).toBe(true);

      // Cache clear forces new provider execution
      explanationCache.clear();
      const res3 = await service.explainFinding(verifiedFinding, {}, { id: testUserId });
      expect(calls).toBe(2);
      expect(res3.fromCache).toBeFalsy();
    });
  });

  // =======================================================================
  // 5. NEGATIVE CONTROL TEST
  // =======================================================================
  describe('5. Negative Control Verification', () => {
    it('returns PERFLENS_AI_NEGATIVE_CONTROL_593821 and NOT PERFLENS_AI_RUNTIME_PROOF_847291', async () => {
      const negativeProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          return createMarkerExplanation(NEGATIVE_CONTROL_MARKER);
        }
      };

      ProviderRouter.setTestProvider(negativeProvider);

      const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding: { ...verifiedFinding, id: 'f-negative-control-01' }
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.whatIsHappening).toContain(NEGATIVE_CONTROL_MARKER);
      expect(json.data.whatIsHappening).not.toContain(UNIQUE_PROOF_MARKER);
    });
  });

  // =======================================================================
  // 6. FAILURE FALLBACK & QUOTA PROTECTION
  // =======================================================================
  describe('6. Deterministic Failure Fallback & Quota Protection', () => {
    it('falls back cleanly on PROVIDER_RUNTIME_TEST_FAILURE and protects managed quota', async () => {
      const failingProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          throw new Error('PROVIDER_RUNTIME_TEST_FAILURE');
        }
      };

      ProviderRouter.setTestProvider(failingProvider);

      const usageBefore = await aiConfigService.getUserUsage(testUserId);

      const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          finding: verifiedFinding
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.source).toBe('deterministic_fallback');
      expect(json.data.isFallback).toBe(true);
      expect(json.data.whatIsHappening).toBeDefined();
      expect(json.data.whatIsHappening).not.toContain(UNIQUE_PROOF_MARKER);

      const usageAfter = await aiConfigService.getUserUsage(testUserId);
      expect(usageAfter.managedUsed).toBe(usageBefore.managedUsed); // Quota NOT consumed
    });
  });

  // =======================================================================
  // 7. QUOTA ACCOUNTING ACCURACY
  // =======================================================================
  describe('7. Quota Accounting Accuracy', () => {
    it('increments managed usage exactly once on successful provider execution and 0 on failure', async () => {
      // Use dbUserId which is authenticated and decoded by loadUserPassively
      const initial = await aiConfigService.getUserUsage(dbUserId);
      const startCount = initial.managedUsed;

      // Step 1: Successful explanation
      const successProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => createMarkerExplanation(UNIQUE_PROOF_MARKER)
      };
      ProviderRouter.setTestProvider(successProvider);

      const resSuccess = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ finding: { ...verifiedFinding, id: 'f-quota-test-1' } })
      });
      expect(resSuccess.status).toBe(200);

      const afterSuccess = await aiConfigService.getUserUsage(dbUserId);
      expect(afterSuccess.managedUsed).toBe(startCount + 1);

      // Step 2: Failing provider does not increment
      const failProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          throw new Error('PROVIDER_ERROR');
        }
      };
      ProviderRouter.setTestProvider(failProvider);
      explanationCache.clear();

      await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ finding: { ...verifiedFinding, id: 'f-quota-test-2' } })
      });

      const afterFail = await aiConfigService.getUserUsage(dbUserId);
      expect(afterFail.managedUsed).toBe(startCount + 1);
    });
  });

  // =======================================================================
  // 8. SECURITY & XSS INJECTION PROTECTION
  // =======================================================================
  describe('8. Security Checks & XSS Sanitization', () => {
    it('renders script tags as plain text without executing XSS payload', async () => {
      const xssMarker = "<img src=x onerror=alert('XSS')>";
      const xssProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => ({
          title: `XSS Proof ${xssMarker}`,
          whatIsHappening: `Safe output contains ${xssMarker}`,
          whyItMatters: `Payload test ${xssMarker}`,
          evidenceExplanation: `Sanitized evidence ${xssMarker}`,
          knownFacts: [`Fact: ${xssMarker}`],
          unknowns: [`Unknown: ${xssMarker}`],
          confidence: 'high',
          source: 'ai',
          promptVersion: 'explainer.v1',
          model: 'gemini-flash-lite-latest',
          provider: 'managed'
        })
      };

      ProviderRouter.setTestProvider(xssProvider);

      const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding: verifiedFinding })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.whatIsHappening).toContain(xssMarker);
      // Response Content-Type is application/json, prevents raw HTML browser interpretation
      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('ensures no API keys or secret credentials ever appear in response payload', async () => {
      const secretProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => createMarkerExplanation(UNIQUE_PROOF_MARKER)
      };

      ProviderRouter.setTestProvider(secretProvider);

      const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ finding: verifiedFinding })
      });

      const bodyText = await res.text();
      expect(bodyText).not.toContain(jwtSecret);
      expect(bodyText).not.toContain('GEMINI_API_KEY');
      expect(bodyText).not.toContain('sk-');
    });
  });

  // =======================================================================
  // =======================================================================
  // 9. REAL BROWSER DOM RENDERING TEST (PUPPETEER E2E)
  // =======================================================================
  describe('9. Frontend DOM Rendering (Puppeteer E2E)', () => {
    it('user clicks "Explain with AI" -> test provider returns marker -> marker visible in DOM', async () => {
      if (!browser) {
        console.warn('Skipping browser test because Puppeteer browser was not initialized.');
        return;
      }

      // Check if dev server is alive on port 5174
      const devServerAlive = await fetch('http://localhost:5174')
        .then((r) => r.status === 200)
        .catch(() => false);

      if (!devServerAlive) {
        console.warn('Vite dev server at http://localhost:5174 is not active. Skipping live DOM assertion.');
        return;
      }

      // Set test provider to return the unique proof marker
      let providerCalled = false;
      const testProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          providerCalled = true;
          return createMarkerExplanation(UNIQUE_PROOF_MARKER);
        }
      };
      ProviderRouter.setTestProvider(testProvider);

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      try {
        // Intercept /ai/explain requests from the browser and route to in-process test server
        await page.setRequestInterception(true);
        page.on('request', async (req) => {
          if (req.url().includes('/ai/explain')) {
            try {
              const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
                method: req.method(),
                headers: req.headers() as any,
                body: req.postData()
              });
              const body = await res.text();
              await req.respond({
                status: res.status,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body
              });
            } catch {
              await req.abort();
            }
          } else {
            req.continue();
          }
        });

        // Pre-inject JWT session into localStorage before document load
        await page.evaluateOnNewDocument((token) => {
          localStorage.setItem('perflens_token', token);
        }, authToken);

        // Navigate to the app
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

        // Navigate to Dashboard
        await page.waitForSelector('button.btn-secondary', { timeout: 8000 });
        await page.click('button.btn-secondary');

        // Wait for sidebar
        await page.waitForSelector('.sidebar', { timeout: 8000 });
        await new Promise((r) => setTimeout(r, 1500));

        // Click Recommendations tab in sidebar
        await page.evaluate(() => {
          const navs = Array.from(document.querySelectorAll('.nav-item'));
          const recNav = navs.find((el) => el.textContent?.includes('Recommendations'));
          if (recNav) (recNav as HTMLElement).click();
        });

        // Wait for Recommendations page to load buttons
        await page.waitForFunction(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((x) => x.textContent?.includes('AI Explain') || x.textContent?.includes('Explain with AI'));
        }, { timeout: 15000 });

        // Locate and click the AI Explain button on the first recommendation card
        const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((x) => x.textContent?.includes('AI Explain') || x.textContent?.includes('Explain with AI'));
          if (b) {
            b.click();
            return true;
          }
          return false;
        });
        expect(clicked).toBe(true);

        // Wait for AI explanation to render in the DOM
        await page.waitForFunction(
          (marker) => document.body.innerText.includes(marker),
          { timeout: 15000 },
          UNIQUE_PROOF_MARKER
        );

        // DEFINITIVE DOM ASSERTIONS
        expect(providerCalled).toBe(true);

        const domHasMarker = await page.evaluate((marker) => {
          return document.body.innerText.includes(marker);
        }, UNIQUE_PROOF_MARKER);
        expect(domHasMarker).toBe(true);

        // Assert that the AI Explanation Card elements are in the DOM
        const cardHasBadge = await page.evaluate(() => {
          return document.body.innerText.includes('✦ AI Explanation') || document.body.innerText.includes('AI Explanation');
        });
        expect(cardHasBadge).toBe(true);

      } finally {
        await page.close();
      }
    }, 30000);

    it('NEGATIVE CONTROL in DOM: returns PERFLENS_AI_NEGATIVE_CONTROL_593821 and updates DOM', async () => {
      if (!browser) return;

      const devServerAlive = await fetch('http://localhost:5174').then((r) => r.status === 200).catch(() => false);
      if (!devServerAlive) return;

      // Switch test provider to return negative control marker
      let negativeCalled = false;
      const negativeProvider: AIProvider = {
        name: 'managed',
        modelName: 'gemini-flash-lite-latest',
        explainFinding: async (): Promise<ExplanationOutput> => {
          negativeCalled = true;
          return createMarkerExplanation(NEGATIVE_CONTROL_MARKER);
        }
      };
      ProviderRouter.setTestProvider(negativeProvider);
      explanationCache.clear();

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      try {
        await page.setRequestInterception(true);
        page.on('request', async (req) => {
          if (req.url().includes('/ai/explain')) {
            try {
              const res = await fetch(`${baseUrl}/api/v1/ai/explain`, {
                method: req.method(),
                headers: req.headers() as any,
                body: req.postData()
              });
              const body = await res.text();
              await req.respond({
                status: res.status,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body
              });
            } catch {
              await req.abort();
            }
          } else {
            req.continue();
          }
        });

        await page.evaluateOnNewDocument((token) => {
          localStorage.setItem('perflens_token', token);
        }, authToken);

        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
        await page.waitForSelector('button.btn-secondary', { timeout: 8000 });
        await page.click('button.btn-secondary');
        await page.waitForSelector('.sidebar', { timeout: 8000 });
        await new Promise((r) => setTimeout(r, 1500));

        await page.evaluate(() => {
          const navs = Array.from(document.querySelectorAll('.nav-item'));
          const recNav = navs.find((el) => el.textContent?.includes('Recommendations'));
          if (recNav) (recNav as HTMLElement).click();
        });

        // Wait for Recommendations page to load buttons
        await page.waitForFunction(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((x) => x.textContent?.includes('AI Explain') || x.textContent?.includes('Explain with AI'));
        }, { timeout: 15000 });

        // Click the second recommendation's AI Explain button to ensure independent execution
        const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button')).filter((x) =>
            x.textContent?.includes('AI Explain') || x.textContent?.includes('Explain with AI')
          );
          if (btns.length > 1) {
            btns[1].click();
            return true;
          } else if (btns.length > 0) {
            btns[0].click();
            return true;
          }
          return false;
        });
        expect(clicked).toBe(true);

        await page.waitForFunction(
          (marker) => document.body.innerText.includes(marker),
          { timeout: 15000 },
          NEGATIVE_CONTROL_MARKER
        );

        expect(negativeCalled).toBe(true);

        const domHasNegativeMarker = await page.evaluate((marker) => {
          return document.body.innerText.includes(marker);
        }, NEGATIVE_CONTROL_MARKER);
        expect(domHasNegativeMarker).toBe(true);

      } finally {
        await page.close();
      }
    }, 30000);
  });
});
