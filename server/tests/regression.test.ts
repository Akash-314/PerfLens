import { describe, it, expect } from 'vitest';
import { classifyMetric, PERFORMANCE_THRESHOLDS } from '../config/performanceThresholds.js';
import { rules } from '../services/recommendation/rules.js';
import { detectCommonLibrary } from '../services/jsAnalyzer/helpers.js';

describe('PerfLens Engine Regression Test Suite', () => {

  describe('Part 5: CLS = 0 Regression Bug', () => {
    it('MUST classify CLS = 0 as "good" with score 100 (never needs-improvement)', () => {
      const result = classifyMetric('cls', 0);
      expect(result.classification).toBe('good');
      expect(result.score).toBe(100);
      expect(result.rawValue).toBe(0);
    });

    it('MUST classify CLS = 0.01 as "good"', () => {
      const result = classifyMetric('cls', 0.01);
      expect(result.classification).toBe('good');
    });

    it('MUST classify CLS = 0.10 (good boundary) as "good"', () => {
      const result = classifyMetric('cls', 0.10);
      expect(result.classification).toBe('good');
    });

    it('MUST classify CLS = 0.101 (just above good boundary) as "needs-improvement"', () => {
      const result = classifyMetric('cls', 0.101);
      expect(result.classification).toBe('needs-improvement');
    });

    it('MUST classify CLS = 0.25 (needs-improvement boundary) as "needs-improvement"', () => {
      const result = classifyMetric('cls', 0.25);
      expect(result.classification).toBe('needs-improvement');
    });

    it('MUST classify CLS = 0.251 (poor boundary) as "poor"', () => {
      const result = classifyMetric('cls', 0.251);
      expect(result.classification).toBe('poor');
    });

    it('MUST classify CLS = 0.85 (very large CLS) as "poor"', () => {
      const result = classifyMetric('cls', 0.85);
      expect(result.classification).toBe('poor');
    });

    it('MUST handle null/undefined/NaN/negative CLS safely without falsy conversion', () => {
      expect(classifyMetric('cls', null).classification).toBe('unrated');
      expect(classifyMetric('cls', undefined).classification).toBe('unrated');
      expect(classifyMetric('cls', NaN).classification).toBe('unrated');
      // Negative invalid values are clamped to 0 (good)
      expect(classifyMetric('cls', -0.05).classification).toBe('good');
    });
  });

  describe('Part 6: TBT = 0ms Regression Bug', () => {
    it('MUST classify TBT = 0 as "good" with score 100 (never needs-improvement)', () => {
      const result = classifyMetric('tbt', 0);
      expect(result.classification).toBe('good');
      expect(result.score).toBe(100);
      expect(result.rawValue).toBe(0);
    });

    it('MUST classify TBT = 1ms as "good"', () => {
      const result = classifyMetric('tbt', 1);
      expect(result.classification).toBe('good');
    });

    it('MUST classify TBT = 200ms (good boundary) as "good"', () => {
      const result = classifyMetric('tbt', 200);
      expect(result.classification).toBe('good');
    });

    it('MUST classify TBT = 201ms (just above threshold) as "needs-improvement"', () => {
      const result = classifyMetric('tbt', 201);
      expect(result.classification).toBe('needs-improvement');
    });

    it('MUST classify TBT = 600ms (poor boundary) as "needs-improvement"', () => {
      const result = classifyMetric('tbt', 600);
      expect(result.classification).toBe('needs-improvement');
    });

    it('MUST classify TBT = 601ms as "poor"', () => {
      const result = classifyMetric('tbt', 601);
      expect(result.classification).toBe('poor');
    });

    it('MUST classify TBT = 1500ms as "poor"', () => {
      const result = classifyMetric('tbt', 1500);
      expect(result.classification).toBe('poor');
    });

    it('MUST distinguish 0 from null/undefined/unavailable', () => {
      const zeroResult = classifyMetric('tbt', 0);
      const nullResult = classifyMetric('tbt', null);
      const undefinedResult = classifyMetric('tbt', undefined);

      expect(zeroResult.classification).toBe('good');
      expect(zeroResult.score).toBe(100);

      expect(nullResult.classification).toBe('unrated');
      expect(nullResult.isAvailable).toBe(false);

      expect(undefinedResult.classification).toBe('unrated');
      expect(undefinedResult.isAvailable).toBe(false);
    });
  });

  describe('Part 13, 14, 47: Google Title & Meta Description Separation', () => {
    const titleRule = rules.find(r => r.id === 'REC_SEO_TITLE');
    const descRule = rules.find(r => r.id === 'REC_SEO_META_DESC');

    it('MUST have distinct rules for Title and Meta Description', () => {
      expect(titleRule).toBeDefined();
      expect(descRule).toBeDefined();
      expect(rules.find(r => r.id === 'REC_SEO_META')).toBeUndefined();
    });

    it('google.com simulation: page HAS title but MISSES meta description', () => {
      const input = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: {
            missingTitle: false, // Google has <title>Google</title>
            missingMetaDescription: true // Google homepage has no meta description
          }
        },
        accessibility: null
      };

      const titleRec = titleRule?.evaluate(input);
      const descRec = descRule?.evaluate(input);

      // Title rule MUST NOT fire because title exists
      expect(titleRec).toBeNull();

      // Description rule MUST fire
      expect(descRec).not.toBeNull();
      expect(descRec?.id).toBe('REC_SEO_META_DESC');
      expect(descRec?.title).toBe('Provide a meta description for search engine result snippets');
      expect(descRec?.title).not.toContain('title');
    });

    it('Page missing both title and description fires both distinctly', () => {
      const input = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: {
            missingTitle: true,
            missingMetaDescription: true
          }
        },
        accessibility: null
      };

      const titleRec = titleRule?.evaluate(input);
      const descRec = descRule?.evaluate(input);

      expect(titleRec).not.toBeNull();
      expect(titleRec?.id).toBe('REC_SEO_TITLE');
      expect(descRec).not.toBeNull();
      expect(descRec?.id).toBe('REC_SEO_META_DESC');
    });

    it('Page with perfect title and description fires neither', () => {
      const input = {
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: {
          summary: {
            missingTitle: false,
            missingMetaDescription: false
          }
        },
        accessibility: null
      };

      expect(titleRule?.evaluate(input)).toBeNull();
      expect(descRule?.evaluate(input)).toBeNull();
    });
  });

  describe('Google Vue.js False Positive Regression', () => {
    it('MUST NOT identify Google query/hash string containing "vue" substring as Vue.js', () => {
      const googleScriptUrl = 'https://www.google.com/xjs/_/js/k=xjs.s.en.t6YV5beeE_g.O/am=.../d=1/rs=ACT90o...';
      const detected = detectCommonLibrary(googleScriptUrl);
      expect(detected).toBeNull();
    });

    it('MUST identify legitimate Vue.js script files correctly', () => {
      expect(detectCommonLibrary('https://cdn.jsdelivr.net/npm/vue@3.2.0/dist/vue.global.prod.js')).toBe('Vue');
      expect(detectCommonLibrary('https://unpkg.com/vue/dist/vue.runtime.min.js')).toBe('Vue');
      expect(detectCommonLibrary('/static/js/vue.min.js')).toBe('Vue');
    });

    it('MUST identify legitimate React script files correctly', () => {
      expect(detectCommonLibrary('https://unpkg.com/react@18/umd/react.production.min.js')).toBe('React');
      expect(detectCommonLibrary('/assets/react-dom.min.js')).toBe('React');
    });
  });

  describe('LCP and FCP Threshold Standards', () => {
    it('LCP thresholds adhere to 2.5s good, 4.0s poor', () => {
      expect(PERFORMANCE_THRESHOLDS.lcp.thresholds.goodMax).toBe(2.5);
      expect(PERFORMANCE_THRESHOLDS.lcp.thresholds.needsImprovementMax).toBe(4.0);

      expect(classifyMetric('lcp', 2.0).classification).toBe('good');
      expect(classifyMetric('lcp', 2.5).classification).toBe('good');
      expect(classifyMetric('lcp', 3.0).classification).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4.0).classification).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4.1).classification).toBe('poor');
    });

    it('FCP thresholds adhere to 1.8s good, 3.0s poor', () => {
      expect(PERFORMANCE_THRESHOLDS.fcp.thresholds.goodMax).toBe(1.8);
      expect(PERFORMANCE_THRESHOLDS.fcp.thresholds.needsImprovementMax).toBe(3.0);

      expect(classifyMetric('fcp', 1.5).classification).toBe('good');
      expect(classifyMetric('fcp', 1.8).classification).toBe('good');
      expect(classifyMetric('fcp', 2.5).classification).toBe('needs-improvement');
      expect(classifyMetric('fcp', 3.1).classification).toBe('poor');
    });
  });

});
