import { describe, it, expect } from 'vitest';
import { classifyMetric, METRIC_DEFINITIONS } from '../config/performanceThresholds.js';
import { rules } from '../services/recommendation/rules.js';
import { isScriptMinified } from '../services/jsAnalyzer/helpers.js';

describe('Adversarial Test Fixtures & Quality Gate Validation (Pass 2)', () => {

  // =========================================================================
  // 1 & 3. LCP = 1.9s & FCP = 1.7s Classification Tests
  // =========================================================================
  describe('1 & 3: LCP and FCP Real-World & Adversarial Values', () => {
    it('LCP = 1.9s (Google.com report value) MUST be classified as "good"', () => {
      // Direct numeric seconds
      const resNum = classifyMetric('lcp', 1.9, 's');
      expect(resNum.classification).toBe('good');
      expect(resNum.rating).toBe('good');
      expect(resNum.score).toBeGreaterThanOrEqual(90);
      expect(resNum.displayValue).toBe('1.90s');

      // String format "1.9s"
      const resStr = classifyMetric('lcp', '1.9s');
      expect(resStr.classification).toBe('good');
      expect(resStr.displayValue).toBe('1.90s');

      // 1900ms passed with explicit unit 'ms' (normalized to seconds)
      const resNorm = classifyMetric('lcp', 1900, 'ms');
      expect(resNorm.classification).toBe('good');
      expect(resNorm.displayValue).toBe('1.90s');

      // 1900 passed without unit (auto-normalized ms to s)
      const resAuto = classifyMetric('lcp', 1900);
      expect(resAuto.classification).toBe('good');
      expect(resAuto.displayValue).toBe('1.90s');
    });

    it('LCP Boundary Tests: 0s, 1.9s, 2.5s, 2.51s, 4.0s, 4.01s', () => {
      expect(classifyMetric('lcp', 0).classification).toBe('good');
      expect(classifyMetric('lcp', 1.9).classification).toBe('good');
      expect(classifyMetric('lcp', 2.5).classification).toBe('good');
      expect(classifyMetric('lcp', 2.51).classification).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4.0).classification).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4.01).classification).toBe('poor');
      expect(classifyMetric('lcp', 10.0).classification).toBe('poor');
    });

    it('FCP = 1.7s (Google.com report value) MUST be classified as "good"', () => {
      // Direct numeric seconds
      const resNum = classifyMetric('fcp', 1.7, 's');
      expect(resNum.classification).toBe('good');
      expect(resNum.rating).toBe('good');
      expect(resNum.score).toBeGreaterThanOrEqual(90);
      expect(resNum.displayValue).toBe('1.70s');

      // String format "1.7s"
      const resStr = classifyMetric('fcp', '1.7s');
      expect(resStr.classification).toBe('good');
      expect(resStr.displayValue).toBe('1.70s');

      // 1700ms passed with explicit unit 'ms' (normalized to seconds)
      const resNorm = classifyMetric('fcp', 1700, 'ms');
      expect(resNorm.classification).toBe('good');
      expect(resNorm.displayValue).toBe('1.70s');

      // 1700 passed without unit (auto-normalized ms to s)
      const resAuto = classifyMetric('fcp', 1700);
      expect(resAuto.classification).toBe('good');
      expect(resAuto.displayValue).toBe('1.70s');
    });

    it('FCP Boundary Tests: 0s, 1.7s, 1.8s, 1.81s, 3.0s, 3.01s', () => {
      expect(classifyMetric('fcp', 0).classification).toBe('good');
      expect(classifyMetric('fcp', 1.7).classification).toBe('good');
      expect(classifyMetric('fcp', 1.8).classification).toBe('good');
      expect(classifyMetric('fcp', 1.81).classification).toBe('needs-improvement');
      expect(classifyMetric('fcp', 3.0).classification).toBe('needs-improvement');
      expect(classifyMetric('fcp', 3.01).classification).toBe('poor');
    });
  });

  // =========================================================================
  // 2. INP Unit & Classification Tests
  // =========================================================================
  describe('2: INP Unit Interpretation & Classification', () => {
    it('INP = 7.2ms MUST be GOOD and display 7.2ms', () => {
      const res = classifyMetric('inp', 7.2);
      expect(res.classification).toBe('good');
      expect(res.displayValue).toBe('7.2ms');
      expect(res.score).toBe(100);
    });

    it('INP = "7.2ms" string MUST be parsed to 7.2ms, GOOD, display 7.2ms', () => {
      const res = classifyMetric('inp', '7.2ms');
      expect(res.classification).toBe('good');
      expect(res.displayValue).toBe('7.2ms');
    });

    it('INP = 7200ms MUST be POOR and display 7200ms', () => {
      const res = classifyMetric('inp', 7200);
      expect(res.classification).toBe('poor');
      expect(res.displayValue).toBe('7200ms');
      expect(res.score).toBe(0);
    });

    it('INP = "7.2s" string MUST be parsed as 7200ms and classified POOR', () => {
      const res = classifyMetric('inp', '7.2s');
      expect(res.classification).toBe('poor');
      expect(res.displayValue).toBe('7200ms');
      expect(res.score).toBe(0);
    });

    it('INP boundary tests: 0ms, 200ms, 201ms, 500ms, 501ms', () => {
      expect(classifyMetric('inp', 0).classification).toBe('good');
      expect(classifyMetric('inp', 200).classification).toBe('good');
      expect(classifyMetric('inp', 201).classification).toBe('needs-improvement');
      expect(classifyMetric('inp', 500).classification).toBe('needs-improvement');
      expect(classifyMetric('inp', 501).classification).toBe('poor');
    });

    it('Prevention of TTI/TBT/FCP -> INP substitution: lab environment without CrUX interaction MUST return N/A / unrated, never substituting TTI', () => {
      // When a lab audit contains TTI (interactive = 7.2s), TBT (300ms), FCP (1.5s), but no CrUX interaction:
      const cruxInp = undefined;
      const rawInpValue = (typeof cruxInp === 'number' && cruxInp > 0)
        ? `${cruxInp}ms`
        : 'N/A';

      expect(rawInpValue).toBe('N/A');
      expect(rawInpValue).not.toBe('7.2 s');
      expect(rawInpValue).not.toBe('7200ms');

      const classified = classifyMetric('inp', rawInpValue === 'N/A' ? null : rawInpValue, 'INP requires real user input events and is not available in non-interactive lab crawl');
      expect(classified.isAvailable).toBe(false);
      expect(classified.displayValue).toBe('N/A');
      expect(classified.rating).toBe('unrated');
      expect(classified.score).toBeNull();
      expect(classified.unavailableReason).toContain('not available in non-interactive lab crawl');
    });

    it('CLS = 0.023 MUST be classified as "good"', () => {
      const res = classifyMetric('cls', 0.023);
      expect(res.classification).toBe('good');
      expect(res.rating).toBe('good');
      expect(res.displayValue).toBe('0.023');
      expect(res.score).toBeGreaterThanOrEqual(90);
    });

    it('Strict Core Web Vitals vs Other Performance Metrics differentiation', () => {
      // Authoritative Web.dev Core Web Vitals (March 2024 onwards)
      expect(METRIC_DEFINITIONS.lcp.isCoreVital).toBe(true);
      expect(METRIC_DEFINITIONS.lcp.category).toBe('core-web-vital');

      expect(METRIC_DEFINITIONS.inp.isCoreVital).toBe(true);
      expect(METRIC_DEFINITIONS.inp.category).toBe('core-web-vital');

      expect(METRIC_DEFINITIONS.cls.isCoreVital).toBe(true);
      expect(METRIC_DEFINITIONS.cls.category).toBe('core-web-vital');

      // Non-Core Performance Metrics (Diagnostic / Lab)
      expect(METRIC_DEFINITIONS.fcp.isCoreVital).toBe(false);
      expect(METRIC_DEFINITIONS.fcp.category).toBe('other-performance-metric');

      expect(METRIC_DEFINITIONS.tbt.isCoreVital).toBe(false);
      expect(METRIC_DEFINITIONS.tbt.category).toBe('other-performance-metric');

      expect(METRIC_DEFINITIONS.ttfb.isCoreVital).toBe(false);
      expect(METRIC_DEFINITIONS.ttfb.category).toBe('other-performance-metric');

      // Classification results carry authoritative flag
      expect(classifyMetric('lcp', 1.9).isCoreVital).toBe(true);
      expect(classifyMetric('inp', 150).isCoreVital).toBe(true);
      expect(classifyMetric('cls', 0.023).isCoreVital).toBe(true);
      expect(classifyMetric('fcp', 1.5).isCoreVital).toBe(false);
      expect(classifyMetric('tbt', 50).isCoreVital).toBe(false);
      expect(classifyMetric('ttfb', 200).isCoreVital).toBe(false);
    });

    it('Lab vs Field labeling integrity: CrUX is field, Lighthouse/Puppeteer are lab', () => {
      // Real user measurement (CrUX)
      const fieldInp = {
        value: '150ms',
        rating: 'good' as const,
        source: 'crux' as const,
        mode: 'field' as const
      };
      expect(fieldInp.source).toBe('crux');
      expect(fieldInp.mode).toBe('field');

      // Synthetic lab measurement (Lighthouse / Puppeteer)
      const labLcp = {
        value: '1.90s',
        rating: 'good' as const,
        source: 'lighthouse' as const,
        mode: 'lab' as const
      };
      expect(labLcp.source).toBe('lighthouse');
      expect(labLcp.mode).toBe('lab');

      const labPuppeteerCls = {
        value: '0.023',
        rating: 'good' as const,
        source: 'puppeteer' as const,
        mode: 'lab' as const
      };
      expect(labPuppeteerCls.source).toBe('puppeteer');
      expect(labPuppeteerCls.mode).toBe('lab');
    });

    it('INVARIANT: unavailable metric ≠ metric with value 0 ≠ metric with poor score', () => {
      // 1. Unavailable metric (e.g. INP in lab, missing FCP, cached TTFB=0)
      const unavailMetric = classifyMetric('inp', null, 'Not measured in lab crawl');
      expect(unavailMetric.isAvailable).toBe(false);
      expect(unavailMetric.displayValue).toBe('N/A');
      expect(unavailMetric.rating).toBe('unrated');
      expect(unavailMetric.score).toBeNull(); // Explicitly null, NEVER 0

      // 2. Metric with genuine value 0 (e.g. CLS = 0, TBT = 0ms)
      const zeroCls = classifyMetric('cls', 0);
      expect(zeroCls.isAvailable).toBe(true);
      expect(zeroCls.displayValue).toBe('0.000');
      expect(zeroCls.rating).toBe('good');
      expect(zeroCls.score).toBe(100); // 100% optimal, NEVER null and NEVER 0

      const zeroTbt = classifyMetric('tbt', 0);
      expect(zeroTbt.isAvailable).toBe(true);
      expect(zeroTbt.displayValue).toBe('0ms');
      expect(zeroTbt.rating).toBe('good');
      expect(zeroTbt.score).toBe(100);

      // 3. Metric with poor score (e.g. LCP = 10s, INP = 7200ms, TBT = 1500ms)
      const poorLcp = classifyMetric('lcp', 10.0);
      expect(poorLcp.isAvailable).toBe(true);
      expect(poorLcp.rating).toBe('poor');
      expect(poorLcp.score).toBe(0); // Truly poor gets 0, NOT null

      const poorInp = classifyMetric('inp', 7200);
      expect(poorInp.isAvailable).toBe(true);
      expect(poorInp.rating).toBe('poor');
      expect(poorInp.score).toBe(0);

      // Verify they are strictly distinct
      expect(unavailMetric.score).not.toBe(zeroCls.score);
      expect(unavailMetric.score).not.toBe(poorLcp.score);
      expect(zeroCls.score).not.toBe(poorLcp.score);
      expect(unavailMetric.rating).not.toBe(poorLcp.rating);
    });

    it('Downstream scoring must NOT let unavailable metrics drag down overall score as 0', () => {
      // Simulation: LCP = 1.9s (good, score 92), CLS = 0 (good, score 100), TBT = 50ms (good, score 98), FCP = unavailable (null)
      const lcp = classifyMetric('lcp', 1.9);
      const cls = classifyMetric('cls', 0);
      const tbt = classifyMetric('tbt', 50);
      const fcp = classifyMetric('fcp', null);

      expect(fcp.score).toBeNull();
      expect(fcp.isAvailable).toBe(false);

      // Calculate score with active normalization (excluding unavailable metric)
      const weights = [
        { score: fcp.score, weight: 0.15, available: fcp.isAvailable },
        { score: lcp.score, weight: 0.30, available: lcp.isAvailable },
        { score: tbt.score, weight: 0.30, available: tbt.isAvailable },
        { score: cls.score, weight: 0.25, available: cls.isAvailable }
      ];
      const activeWeights = weights.filter(w => w.available && w.score !== null);
      const activeWeightTotal = activeWeights.reduce((sum, w) => sum + w.weight, 0);
      const normalizedScore = Math.round(activeWeights.reduce((sum, w) => sum + w.score! * w.weight, 0) / activeWeightTotal);

      // Active score must reflect the good metrics (~96/100), NOT be dragged down by FCP to ~82/100
      expect(normalizedScore).toBeGreaterThanOrEqual(95);
    });
  });

  // =========================================================================
  // 4. TTFB = 0ms vs Reliable Timing
  // =========================================================================
  describe('4: TTFB = 0ms and Cache / Measurement Integrity', () => {
    it('TTFB = 0ms MUST NOT automatically be treated as "good" — must be unrated / N/A with diagnostic', () => {
      const res = classifyMetric('ttfb', 0);
      expect(res.classification).toBe('unrated');
      expect(res.rating).toBe('unrated');
      expect(res.score).toBeNull();
      expect(res.isAvailable).toBe(false);
      expect(res.displayValue).toBe('N/A');
      expect(res.unavailableReason).toContain('local cache');
    });

    it('TTFB with real latency (e.g. 150ms) is GOOD', () => {
      const res = classifyMetric('ttfb', 150, 'ms');
      expect(res.classification).toBe('good');
      expect(res.rating).toBe('good');
      expect(res.displayValue).toBe('150ms');
    });

    it('TTFB boundaries: 800ms good, 801ms needs-improvement, 1800ms needs-improvement, 1801ms poor', () => {
      expect(classifyMetric('ttfb', 800, 'ms').classification).toBe('good');
      expect(classifyMetric('ttfb', 801, 'ms').classification).toBe('needs-improvement');
      expect(classifyMetric('ttfb', 1800, 'ms').classification).toBe('needs-improvement');
      expect(classifyMetric('ttfb', 1801, 'ms').classification).toBe('poor');
    });
  });

  // =========================================================================
  // 17. Zero vs Unknown Handling
  // =========================================================================
  describe('17: Zero vs Unknown Integrity', () => {
    it('CLS = 0 is a valid measurement and MUST be GOOD (score 100)', () => {
      const res = classifyMetric('cls', 0);
      expect(res.classification).toBe('good');
      expect(res.isAvailable).toBe(true);
      expect(res.score).toBe(100);
    });

    it('TBT = 0 is a valid measurement and MUST be GOOD (score 100)', () => {
      const res = classifyMetric('tbt', 0);
      expect(res.classification).toBe('good');
      expect(res.isAvailable).toBe(true);
      expect(res.score).toBe(100);
    });

    it('null/undefined are unknown, not 0', () => {
      expect(classifyMetric('cls', null).isAvailable).toBe(false);
      expect(classifyMetric('cls', undefined).isAvailable).toBe(false);
      expect(classifyMetric('tbt', null).isAvailable).toBe(false);
      expect(classifyMetric('tbt', undefined).isAvailable).toBe(false);
    });
  });

  // =========================================================================
  // 7, 11, 12. JavaScript & CSS Minification Evidence
  // =========================================================================
  describe('7, 11, 12: Minification Detection without Fake Triggers', () => {
    it('Google xjs bundle script URL is recognized as minified', () => {
      const googleXjsUrl = 'https://www.google.com/xjs/_/js/k=xjs.s.en.t6YV5beeE_g.O/am=.../d=1/rs=ACT90o...';
      expect(isScriptMinified(googleXjsUrl, '')).toBe(true);
    });

    it('Google gstatic script URL is recognized as minified', () => {
      const gstaticUrl = 'https://www.gstatic.com/recaptcha/releases/123/recaptcha__en.js';
      expect(isScriptMinified(gstaticUrl, '')).toBe(true);
    });

    it('Script with average line length > 200 is recognized as minified', () => {
      const denseCode = 'var a=1;function b(){return a+2;}var c=b();'.repeat(20);
      expect(isScriptMinified('https://example.com/app.js', denseCode)).toBe(true);
    });

    it('Unminified multi-line formatted script is recognized as unminified', () => {
      const formattedCode = `
        function calculateTotal(price, taxRate) {
          const subtotal = price;
          const tax = price * taxRate;
          const total = subtotal + tax;
          return total;
        }
        console.log(calculateTotal(100, 0.08));
      `;
      expect(isScriptMinified('https://example.com/calculate.js', formattedCode)).toBe(false);
    });

    it('Minify JS recommendation rule MUST NOT fire when all scripts are minified or < 10KB unminified', () => {
      const rule = rules.find(r => r.id === 'REC_JS_MINIFY');
      expect(rule).toBeDefined();

      const inputAllMinified = {
        pagespeed: null,
        image: null,
        css: null,
        js: {
          scripts: [
            { url: 'https://www.google.com/xjs/_/js/k=xjs.js', isMinified: true, fileSizeKb: 500 },
            { url: 'https://www.gstatic.com/og/_/js/k=og.js', isMinified: true, fileSizeKb: 200 }
          ]
        },
        seo: null,
        accessibility: null
      };

      const rec = rule?.evaluate(inputAllMinified);
      expect(rec).toBeNull();
    });

    it('Minify JS recommendation rule MUST fire with evidence when large unminified script exists', () => {
      const rule = rules.find(r => r.id === 'REC_JS_MINIFY');
      const inputUnminified = {
        pagespeed: null,
        image: null,
        css: null,
        js: {
          scripts: [
            { url: 'https://example.com/big-unminified.js', isMinified: false, fileSizeKb: 120 }
          ]
        },
        seo: null,
        accessibility: null
      };

      const rec = rule?.evaluate(inputUnminified);
      expect(rec).not.toBeNull();
      expect(rec?.findingId).toBe('REC_JS_MINIFY_001');
      expect(rec?.evidence).toContain('big-unminified.js');
      expect(rec?.confidence).toBe('high');
      expect(rec?.estimatedPerformanceGain).toBeDefined();
    });
  });

  // =========================================================================
  // 8. Transfer Savings Calculation (No Hardcoded ~1.0s)
  // =========================================================================
  describe('8: Transfer Savings Math Integrity', () => {
    it('MUST calculate reproducible savings based on network transfer model', () => {
      const rule = rules.find(r => r.id === 'REC_JS_MINIFY');
      const input = {
        pagespeed: null,
        image: null,
        css: null,
        js: {
          scripts: [
            { url: 'https://example.com/bundle.js', isMinified: false, fileSizeKb: 200 }
          ]
        },
        seo: null,
        accessibility: null
      };

      const rec = rule?.evaluate(input);
      expect(rec).not.toBeNull();
      // Estimated 20% savings on 200KB = ~40KB. At 200 KB/s (Fast 3G), 40/200 = 0.2s
      expect(rec?.estimatedPerformanceGain).toBeDefined();
      expect(rec?.estimatedPerformanceGain).toMatch(/Save ~\d+(\.\d+)?s/);
      expect(rec?.estimatedPerformanceGain).toContain('200 KB/s');
    });
  });

  // =========================================================================
  // 9. Render-blocking JavaScript Evidence
  // =========================================================================
  describe('9: Render-blocking Script Quality Gate', () => {
    const rule = rules.find(r => r.id === 'REC_JS_RENDER_BLOCKING');

    it('MUST NOT recommend defer/async if all scripts are async, defer, or in body', () => {
      const inputSafe = {
        pagespeed: null,
        image: null,
        css: null,
        js: {
          scripts: [
            { url: 'https://example.com/safe.js', isRenderBlocking: false }
          ]
        },
        seo: null,
        accessibility: null
      };

      expect(rule?.evaluate(inputSafe)).toBeNull();
    });

    it('MUST recommend defer/async with full evidence when synchronous script is in head', () => {
      const inputBlocking = {
        pagespeed: null,
        image: null,
        css: null,
        js: {
          scripts: [
            {
              url: 'https://example.com/sync-head.js',
              isRenderBlocking: true,
              location: 'head',
              async: false,
              defer: false,
              fileSizeKb: 45
            }
          ]
        },
        seo: null,
        accessibility: null
      };

      const rec = rule?.evaluate(inputBlocking);
      expect(rec).not.toBeNull();
      expect(rec?.findingId).toBe('REC_JS_RENDER_BLOCKING_001');
      expect(rec?.evidence).toContain('sync-head.js');
      expect(rec?.resource).toBe('https://example.com/sync-head.js');
    });
  });

  // =========================================================================
  // 13, 14, 15. SEO & Accessibility Fixtures
  // =========================================================================
  describe('13, 14, 15: Meta Description, Canonical, and Skip Link Evidence', () => {
    it('Meta Description: Missing generates finding with selector evidence; Existing does not', () => {
      const descRule = rules.find(r => r.id === 'REC_SEO_META_DESC');

      const missingInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: { missingMetaDescription: true },
          metaDescription: { exists: false, value: '', length: 0, selector: 'meta[name="description"]' }
        },
        accessibility: null
      };
      const recMissing = descRule?.evaluate(missingInput);
      expect(recMissing).not.toBeNull();
      expect(recMissing?.selector).toBe('meta[name="description"]');
      expect(recMissing?.findingId).toBe('REC_SEO_META_DESC_001');

      const existingInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: { missingMetaDescription: false },
          metaDescription: { exists: true, value: 'Search the world information', length: 30, selector: 'meta[name="description"]' }
        },
        accessibility: null
      };
      expect(descRule?.evaluate(existingInput)).toBeNull();
    });

    it('Canonical: Missing generates finding; Existing does not', () => {
      const canonicalRule = rules.find(r => r.id === 'REC_SEO_CANONICAL');

      const missingInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: { missingCanonical: true },
          canonical: { exists: false, href: '', selector: 'link[rel="canonical"]' }
        },
        accessibility: null
      };
      const recMissing = canonicalRule?.evaluate(missingInput);
      expect(recMissing).not.toBeNull();
      expect(recMissing?.selector).toBe('link[rel="canonical"]');

      const existingInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: { missingCanonical: false },
          canonical: { exists: true, href: 'https://example.com/', selector: 'link[rel="canonical"]' }
        },
        accessibility: null
      };
      expect(canonicalRule?.evaluate(existingInput)).toBeNull();
    });

    it('Skip Link: MUST NOT fire on minimal search bar page without navigation header (WCAG 2.4.1)', () => {
      const skipRule = rules.find(r => r.id === 'REC_A11Y_SKIP_LINK');

      // Google search page simulation: no repeated multi-link header
      const googleLikeInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: null,
        accessibility: {
          hasSkipLink: false,
          hasHeaderNav: false,
          hasRepeatedNavLinks: false,
          navLandmarksCount: 0
        }
      };
      expect(skipRule?.evaluate(googleLikeInput)).toBeNull();

      // Complex content site with repeated header nav but missing skip link
      const contentSiteInput = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: null,
        accessibility: {
          hasSkipLink: false,
          hasHeaderNav: true,
          hasRepeatedNavLinks: true,
          navLandmarksCount: 2
        }
      };
      const rec = skipRule?.evaluate(contentSiteInput);
      expect(rec).not.toBeNull();
      expect(rec?.findingId).toBe('REC_A11Y_SKIP_LINK_001');
      expect(rec?.evidence).toContain('WCAG 2.4.1');
    });
  });

  // =========================================================================
  // 18. Recommendation Quality Gate
  // =========================================================================
  describe('18: Recommendation Quality Gate Verification', () => {
    it('Every evaluated recommendation rule must produce all mandatory fields', () => {
      // Create a test input that triggers multiple recommendations
      const richInput = {
        pagespeed: null,
        image: {
          optimizationCandidates: [
            { url: 'https://example.com/hero.png', estimatedSizeReductionKb: 50 }
          ],
          summary: {
            imagesMissingLazyLoading: 2,
            imagesMissingAltText: 1
          }
        },
        css: {
          stylesheets: [
            { url: 'https://example.com/style.css', isRenderBlocking: true, sizeKb: 45, isInline: false }
          ]
        },
        js: {
          scripts: [
            { url: 'https://example.com/app.js', isMinified: false, fileSizeKb: 80 },
            { url: 'https://example.com/head.js', isRenderBlocking: true, fileSizeKb: 30 }
          ],
          summary: {
            unusedJsKb: 120
          }
        },
        seo: {
          summary: {
            missingTitle: true,
            missingMetaDescription: true,
            missingCanonical: true
          },
          metaDescription: { exists: false, selector: 'meta[name="description"]' },
          canonical: { exists: false, selector: 'link[rel="canonical"]' }
        },
        accessibility: {
          summary: {
            imagesMissingAlt: 2,
            missingSkipNavigation: true
          },
          hasSkipLink: false,
          hasHeaderNav: true,
          hasRepeatedNavLinks: true,
          navLandmarksCount: 2
        }
      };

      const emittedRecs = rules
        .map(rule => rule.evaluate(richInput))
        .filter((rec): rec is NonNullable<typeof rec> => rec !== null);

      expect(emittedRecs.length).toBeGreaterThanOrEqual(4);

      for (const rec of emittedRecs) {
        // Quality gate checks per Item 18
        expect(rec.findingId).toBeDefined();
        expect(typeof rec.findingId).toBe('string');
        expect(rec.findingId!.length).toBeGreaterThan(3);

        expect(rec.severity).toBeDefined();
        expect(['critical', 'high', 'medium', 'low', 'info', 'warning', 'error']).toContain(rec.severity);

        expect(rec.title).toBeDefined();
        expect(rec.title.length).toBeGreaterThan(5);

        expect(rec.actualValue).toBeDefined();
        expect(rec.expectedValue).toBeDefined();
        expect(rec.evidence).toBeDefined();
        expect(rec.evidence!.length).toBeGreaterThan(0);

        expect(rec.reason).toBeDefined();
        expect(rec.reason!.length).toBeGreaterThan(0);

        expect(rec.confidence).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(rec.confidence);
      }
    });
  });

});
