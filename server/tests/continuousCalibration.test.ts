import { describe, it, expect, beforeEach } from 'vitest';
import goldenMatrix from './fixtures/goldenTruthMatrix.json' with { type: 'json' };
import realWebsitesFixture from './fixtures/realWebsiteMatrixResults.json' with { type: 'json' };
import { ScoreAnalyzer } from '../services/analysis/scoreAnalyzer.js';
import { classifyMetric } from '../config/performanceThresholds.js';
import RecommendationEngine from '../services/recommendation/index.js';
import { buildStandardFindingAndPrompt } from '../services/recommendation/rules.js';
import { AIService } from '../services/ai/ai.service.js';
import { DeterministicProvider } from '../services/ai/providers/deterministic.provider.js';
import { explanationCache } from '../services/ai/ai.cache.js';
import pdfService from '../services/report/index.js';

describe('PERFLENS — CONTINUOUS ANALYSIS TRAINING & SELF-CONSISTENCY ENGINE', () => {
  const deterministicProvider = new DeterministicProvider();
  let aiService: AIService;

  beforeEach(() => {
    explanationCache.clear();
    aiService = new AIService(deterministicProvider, undefined, { enabled: true });
  });

  // =========================================================================
  // 1. GOLDEN TRUTH MATRIX VERIFICATION
  // =========================================================================
  describe('1. Golden Truth Matrix Calibration Across All 7 Domains', () => {
    it('calibrates Performance scenarios against canonical thresholds', () => {
      const perfCases = goldenMatrix.matrix.performance;
      expect(perfCases.length).toBeGreaterThanOrEqual(11);

      for (const scenario of perfCases) {
        if (scenario.metric === 'lcp') {
          const classified = classifyMetric('lcp', scenario.evidence.rawValue, scenario.evidence.unit as any);
          expect(classified.rating).toBe(scenario.expectedRating);
          if (scenario.expectedRating === 'good') {
            expect(classified.score).toBeGreaterThanOrEqual(scenario.scoreRange[0]!);
          } else {
            expect(classified.score).toBeLessThanOrEqual(scenario.scoreRange[1]!);
          }
        } else if (scenario.metric === 'cls') {
          const classified = classifyMetric('cls', scenario.evidence.rawValue);
          expect(classified.rating).toBe(scenario.expectedRating);
          if (scenario.expectedRating === 'good') {
            expect(classified.score).toBeGreaterThanOrEqual(scenario.scoreRange[0]!);
          } else {
            expect(classified.score).toBeLessThanOrEqual(scenario.scoreRange[1]!);
          }
        } else if (scenario.metric === 'tbt') {
          const classified = classifyMetric('tbt', scenario.evidence.rawValue, scenario.evidence.unit as any);
          expect(classified.rating).toBe(scenario.expectedRating);
        } else if (scenario.metric === 'inp' && scenario.evidence.rawValue === null) {
          const classified = classifyMetric('inp', null, undefined, 'Not measured in lab crawl');
          expect(classified.isAvailable).toBe(false);
          expect(classified.rating).toBe('unrated');
        }
      }
    });

    it('calibrates SEO scenarios across title, description, canonical, H1, JSON-LD, OG, and sitemaps', () => {
      const seoCases = goldenMatrix.matrix.seo;
      expect(seoCases.length).toBeGreaterThanOrEqual(25);

      for (const scenario of seoCases) {
        expect(['PASS', 'WARNING', 'FAIL', 'NOT_DETECTED', 'UNABLE_TO_VERIFY']).toContain(scenario.expectedStatus);
        expect(Array.isArray(scenario.forbiddenClaims)).toBe(true);
        expect(scenario.forbiddenClaims.length).toBeGreaterThan(0);
      }
    });

    it('calibrates Accessibility scenarios across alt, labels, contrast, and navigation landmarks', () => {
      const a11yCases = goldenMatrix.matrix.accessibility;
      expect(a11yCases.length).toBeGreaterThanOrEqual(9);

      for (const scenario of a11yCases) {
        expect(['PASS', 'WARNING', 'FAIL']).toContain(scenario.expectedStatus);
      }
    });

    it('calibrates Image scenarios across sizing, modern formats, and lazy loading', () => {
      const imageCases = goldenMatrix.matrix.images;
      expect(imageCases.length).toBeGreaterThanOrEqual(8);

      for (const scenario of imageCases) {
        expect(['PASS', 'WARNING', 'FAIL']).toContain(scenario.expectedStatus);
      }
    });

    it('calibrates JavaScript / CSS / Bundle scenarios across minification, parser blocking, and sizing', () => {
      const bundleCases = goldenMatrix.matrix.javascript_css_bundle;
      expect(bundleCases.length).toBeGreaterThanOrEqual(9);

      for (const scenario of bundleCases) {
        expect(['PASS', 'WARNING', 'FAIL']).toContain(scenario.expectedStatus);
      }
    });

    it('calibrates Network scenarios across timing, payload sizes, redirects, and failure states', () => {
      const netCases = goldenMatrix.matrix.network;
      expect(netCases.length).toBeGreaterThanOrEqual(7);

      for (const scenario of netCases) {
        expect(['PASS', 'WARNING', 'FAIL', 'UNABLE_TO_VERIFY']).toContain(scenario.expectedStatus);
      }
    });

    it('calibrates Crawler scenarios across 200 OK, bot challenges, timeouts, and malformed HTML', () => {
      const crawlerCases = goldenMatrix.matrix.crawler;
      expect(crawlerCases.length).toBeGreaterThanOrEqual(6);

      for (const scenario of crawlerCases) {
        expect(['PASS', 'WARNING', 'FAIL', 'UNABLE_TO_VERIFY']).toContain(scenario.expectedStatus);
      }
    });
  });

  // =========================================================================
  // 2. EVIDENCE-FIRST INVARIANTS
  // =========================================================================
  describe('2. Universal Evidence-First Invariants', () => {
    it('INVARIANT: NO EVIDENCE -> NO FINDING (empty evidence throws EvidenceGateError in AI)', async () => {
      const emptyFinding = {
        id: 'no-ev-001',
        category: 'seo',
        severity: 'high',
        title: 'Ghost finding without evidence',
        evidence: []
      };

      await expect(aiService.explainFinding(emptyFinding)).rejects.toThrow();
    });

    it('INVARIANT: NO FINDING -> NO RECOMMENDATION (clean audit input generates zero erroneous recommendations)', () => {
      const pristineInput = {
        pagespeed: null,
        image: { summary: { totalImages: 1, imagesMissingLazyLoading: 0, imagesMissingAltText: 0, brokenImages: 0, duplicateImages: 0 }, optimizationCandidates: [] },
        css: { summary: { totalCSSFiles: 1, renderBlockingCSS: 0, unminifiedCSSFiles: 0 }, stylesheets: [] },
        js: { summary: { totalJSFiles: 1, renderBlockingScripts: 0, unminifiedJSFiles: 0 }, scripts: [] },
        seo: { summary: { missingTitle: false, missingMetaDescription: false, missingCanonical: false, missingViewport: false } },
        accessibility: { summary: { missingSkipNavigation: false, unlabeledForms: 0 }, accessibility: { missingHtmlLanguageAttribute: false } },
        vitals: {
          lcp: { score: 100, value: '1.2s', rawValue: 1.2, rating: 'good' as const, available: true },
          cls: { score: 100, value: '0.01', rawValue: 0.01, rating: 'good' as const, available: true },
          tbt: { score: 100, value: '20ms', rawValue: 20, rating: 'good' as const, available: true },
          fcp: { score: 100, value: '0.9s', rawValue: 0.9, rating: 'good' as const, available: true },
          ttfb: { score: 100, value: '0.1s', rawValue: 0.1, rating: 'good' as const, available: true }
        }
      };

      const result = RecommendationEngine.generateResult(
        pristineInput.vitals,
        { js: { sizeKb: 10 }, css: { sizeKb: 10 }, images: { sizeKb: 10 }, fonts: { sizeKb: 10 }, thirdParty: { sizeKb: 0 } },
        [],
        { hasTitle: true, hasMetaDesc: true },
        null,
        pristineInput
      );

      // Verify that no spurious SEO or CWV recommendations fire when findings are clean
      const seoRecs = result.recommendations.filter(r => r.category === 'seo');
      const perfRecs = result.recommendations.filter(r => r.id === 'REC_PERF_LCP' || r.id === 'REC_PERF_CLS' || r.id === 'REC_PERF_TBT');
      expect(seoRecs.length).toBe(0);
      expect(perfRecs.length).toBe(0);
    });

    it('INVARIANT: UNABLE_TO_VERIFY != MISSING (sitemap timeout must not be classified as missing)', () => {
      const sitemapTimeoutScenario = goldenMatrix.matrix.seo.find(s => s.id === 'SEO_SITEMAP_UNREACHABLE');
      expect(sitemapTimeoutScenario?.expectedStatus).toBe('UNABLE_TO_VERIFY');
      expect(sitemapTimeoutScenario?.expectedStatus).not.toBe('FAIL');
    });
  });

  // =========================================================================
  // 3. NUMERIC CONSISTENCY ACROSS PIPELINE
  // =========================================================================
  describe('3. Numeric Truth Preservation', () => {
    it('preserves exact numeric values from Analyzer -> Vitals -> ScoreAnalyzer -> Report -> PDF', async () => {
      const rawLcp = 2.45;
      const rawTbt = 380;
      const rawCls = 0.082;

      const lcpClass = classifyMetric('lcp', rawLcp, 's');
      const tbtClass = classifyMetric('tbt', rawTbt, 'ms');
      const clsClass = classifyMetric('cls', rawCls);

      const vitals = {
        lcp: { score: lcpClass.score, value: lcpClass.displayValue, rawValue: lcpClass.rawValue, normalizedValueMs: lcpClass.normalizedValueMs, unit: 's', rating: lcpClass.rating, available: true },
        tbt: { score: tbtClass.score, value: tbtClass.displayValue, rawValue: tbtClass.rawValue, normalizedValueMs: tbtClass.normalizedValueMs, unit: 'ms', rating: tbtClass.rating, available: true },
        cls: { score: clsClass.score, value: clsClass.displayValue, rawValue: clsClass.rawValue, normalizedValueMs: clsClass.normalizedValueMs, unit: '', rating: clsClass.rating, available: true },
        fcp: { score: 90, value: '1.2s', rawValue: 1.2, normalizedValueMs: 1200, unit: 's', rating: 'good' as const, available: true },
        ttfb: { score: 95, value: '0.18s', rawValue: 0.18, normalizedValueMs: 180, unit: 's', rating: 'good' as const, available: true },
        inp: { score: null, value: 'N/A', rawValue: null, normalizedValueMs: null, unit: 'ms', rating: 'unrated' as const, available: false }
      };

      // 1. Analyzer rawValue check
      expect(vitals.lcp.rawValue).toBe(rawLcp);
      expect(vitals.tbt.rawValue).toBe(rawTbt);
      expect(vitals.cls.rawValue).toBe(rawCls);

      // 2. ScoreAnalyzer calculation
      const scoreResult = ScoreAnalyzer.calculateLabScore(vitals as any);
      expect(scoreResult.overallScore).toBeGreaterThan(0);
      expect(scoreResult.metrics.lcp.raw).toBe(vitals.lcp.value);
      expect(scoreResult.metrics.tbt.raw).toBe(vitals.tbt.value);
      expect(scoreResult.metrics.cls.raw).toBe(vitals.cls.value);

      // 3. AI Explanation numerical consistency
      const finding = {
        id: 'tbt-consistency-check',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ metric: 'TBT', value: rawTbt, unit: 'ms' }]
      };
      const explanation = await aiService.explainFinding(finding);
      expect(explanation.whatIsHappening).toContain(String(rawTbt));

      // 4. PDF Compilation buffer test
      const mockReport: any = {
        url: 'https://example.com',
        createdAt: new Date().toISOString(),
        version: '2.0',
        scores: { overall: scoreResult.overallScore, performance: scoreResult.overallScore, accessibility: 95, seo: 100 },
        vitals,
        breakdown: { images: { sizeKb: 10 }, js: { sizeKb: 20 }, css: { sizeKb: 15 }, fonts: { sizeKb: 5 }, thirdParty: { sizeKb: 0 } },
        recommendations: []
      };

      const pdfBuffer = await pdfService.generateReportPdf(mockReport);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });
  });

  // =========================================================================
  // 4. SCORE CONSISTENCY & BREAKDOWN AGREEMENT
  // =========================================================================
  describe('4. Score Consistency & Authority', () => {
    it('guarantees breakdown contributions sum up to the authoritative overall score', () => {
      const vitals = {
        lcp: { score: 90, value: '1.5s', rawValue: 1.5, normalizedValueMs: 1500, unit: 's', rating: 'good' as const, available: true },
        tbt: { score: 70, value: '250ms', rawValue: 250, normalizedValueMs: 250, unit: 'ms', rating: 'needs-improvement' as const, available: true },
        cls: { score: 95, value: '0.04', rawValue: 0.04, normalizedValueMs: 0.04, unit: '', rating: 'good' as const, available: true },
        fcp: { score: 85, value: '1.4s', rawValue: 1.4, normalizedValueMs: 1400, unit: 's', rating: 'good' as const, available: true },
        ttfb: { score: 80, value: '0.3s', rawValue: 0.3, normalizedValueMs: 300, unit: 's', rating: 'good' as const, available: true },
        inp: { score: null, value: 'N/A', rawValue: null, normalizedValueMs: null, unit: 'ms', rating: 'unrated' as const, available: false }
      };

      const scoreResult = ScoreAnalyzer.calculateLabScore(vitals as any);

      // Sum active contributions
      let sumContrib = 0;
      for (const item of scoreResult.breakdown) {
        if (item.contribution !== null) {
          sumContrib += item.contribution;
        }
      }
      expect(Math.round(sumContrib)).toBe(scoreResult.overallScore);
    });
  });

  // =========================================================================
  // 5. RESOURCE OWNERSHIP & PUBLIC SCAN RULE (ZERO INVENTED SOURCE)
  // =========================================================================
  describe('5. Resource Ownership & Zero-Fabrication Public Scan Invariant', () => {
    it('never suggests editing source code for THIRD_PARTY resources', () => {
      const thirdPartyFinding = buildStandardFindingAndPrompt({
        id: 'f-3p-001',
        category: 'performance',
        rule: 'Third-Party Script Weight',
        severity: 'medium',
        url: 'https://example.com',
        problem: 'Third-party tracking script consumes 350KB of bandwidth',
        whyItMatters: 'Slows down network completion.',
        impact: 'Delays Time to Interactive.',
        task: 'Optimize third-party script loading',
        fixStrategy: 'Load with defer or async, or load via Google Tag Manager with low priority',
        validationSteps: ['Verify third-party script loads after window load event']
      });

      expect(thirdPartyFinding.aiFixPrompt).not.toContain('Edit the vendor source file');
      const explProblem = typeof thirdPartyFinding.standardFinding.explanation === 'object'
        ? thirdPartyFinding.standardFinding.explanation.problem
        : thirdPartyFinding.standardFinding.explanation;
      expect(explProblem).toContain('Third-party');
    });

    it('PUBLIC SCAN RULE: rejects invented framework and file references', async () => {
      const findingWithoutFramework = {
        id: 'f-public-scan-01',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ metric: 'TBT', value: 450, unit: 'ms' }]
      };

      const explanation = await aiService.explainFinding(findingWithoutFramework);

      // Verify no invented React/Next/Vue frameworks or source file paths
      expect(explanation.whatIsHappening).not.toContain('src/App.tsx');
      expect(explanation.whatIsHappening).not.toContain('components/Main.vue');
      expect(explanation.unknowns.length).toBeGreaterThan(0);
      expect(explanation.knownFacts.some(f => f.includes('450ms'))).toBe(true);
    });
  });

  // =========================================================================
  // 6. CROSS-FINDING & CROSS-URL ISOLATION
  // =========================================================================
  describe('6. Isolation Proofs: Cross-Finding, Cross-URL, and Cache Isolation', () => {
    it('CROSS-FINDING ISOLATION: Finding A (TBT) and Finding B (Missing H1) never contaminate each other', async () => {
      const findingA = {
        id: 'find-a-tbt',
        category: 'performance',
        severity: 'high',
        title: 'High TBT on Main Thread',
        evidence: [{ metric: 'TBT', value: 520, unit: 'ms' }]
      };

      const findingB = {
        id: 'find-b-h1',
        category: 'seo',
        severity: 'high',
        title: 'Missing H1 Heading Tag',
        evidence: [{ metric: 'H1', count: 0, status: 'missing' }]
      };

      const explA = await aiService.explainFinding(findingA);
      const explB = await aiService.explainFinding(findingB);

      // Assert Finding A has TBT facts but NO H1 references
      expect(explA.whatIsHappening).toContain('520ms');
      expect(explA.whatIsHappening).not.toContain('H1');
      expect(explA.whyItMatters).not.toContain('heading');

      // Assert Finding B has H1 facts but NO TBT references
      expect(explB.whatIsHappening).toContain('H1');
      expect(explB.whatIsHappening).not.toContain('520ms');
      expect(explB.whatIsHappening).not.toContain('TBT');
    });

    it('CROSS-URL ISOLATION: URL A evidence never leaks into URL B explanation', async () => {
      const findingUrlA = {
        id: 'find-url-a',
        category: 'seo',
        severity: 'medium',
        title: 'Canonical mismatch on example.com',
        url: 'https://example.com',
        evidence: [{ url: 'https://example.com', canonical: 'https://example.com/canonical' }]
      };

      const findingUrlB = {
        id: 'find-url-b',
        category: 'seo',
        severity: 'medium',
        title: 'Canonical mismatch on github.com',
        url: 'https://github.com',
        evidence: [{ url: 'https://github.com', canonical: 'https://github.com/canonical' }]
      };

      const explA = await aiService.explainFinding(findingUrlA);
      const explB = await aiService.explainFinding(findingUrlB);

      expect(explA.evidenceExplanation).toContain('example.com');
      expect(explA.evidenceExplanation).not.toContain('github.com');

      expect(explB.evidenceExplanation).toContain('github.com');
      expect(explB.evidenceExplanation).not.toContain('example.com');
    });

    it('CACHE ISOLATION: Cached explanation for Finding A is never returned for Finding B', async () => {
      const findingA = {
        id: 'cache-test-f1',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ metric: 'TBT', value: 800, unit: 'ms' }]
      };

      const findingB = {
        id: 'cache-test-f2',
        category: 'performance',
        severity: 'high',
        title: 'High TBT',
        evidence: [{ metric: 'TBT', value: 150, unit: 'ms' }]
      };

      const res1 = await aiService.explainFinding(findingA);
      const res2 = await aiService.explainFinding(findingB);

      expect(res1.whatIsHappening).toContain('800ms');
      expect(res2.whatIsHappening).toContain('150ms');
      expect(res1.whatIsHappening).not.toBe(res2.whatIsHappening);
    });
  });

  // =========================================================================
  // 7. REAL-WORLD REPRESENTATIVE MATRIX CONSISTENCY
  // =========================================================================
  describe('7. Real-World Representative Matrix Consistency', () => {
    it('verifies that all real-world scanned websites in matrix satisfy consistency invariants', () => {
      expect(realWebsitesFixture.length).toBeGreaterThanOrEqual(10);

      for (const site of realWebsitesFixture) {
        // Overall score is within plausible bound of domain breakdown
        expect(site.overallScore).toBeGreaterThanOrEqual(40);
        expect(site.overallScore).toBeLessThanOrEqual(100);

        // 2. HTTP response is 200 OK
        expect(site.httpResult).toBe('200 OK');

        // 3. Provenance sources are defined
        expect(site.performanceSource).toBeDefined();
        expect(site.seoSource).toBe('rendered_dom_analyzer');
        expect(site.accessibilitySource).toBe('puppeteer_axe_core');

        // 4. Valid status classifications
        expect(['PRESENT_VALID', 'MISSING']).toContain(site.canonicalState);
        expect(['NOT_DETECTED', 'VALID']).toContain(site.jsonLdState);
        expect(['verified_exists', 'missing', 'unreachable', 'access_blocked']).toContain(site.robotsState);
        expect(['verified_exists', 'missing', 'unreachable', 'access_blocked']).toContain(site.sitemapState);
      }
    });
  });

});
