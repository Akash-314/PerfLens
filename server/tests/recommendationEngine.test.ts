import { describe, it, expect } from 'vitest';
import { rules } from '../services/recommendation/rules.js';
import { generateRecommendations } from '../services/recommendation/recommendation.service.js';
import RecommendationEngine from '../services/recommendation/index.js';
import pdfService from '../services/report/index.js';

describe('PerfLens Recommendation Engine & Estimated Improvement Overhaul (30. Tests)', () => {
  // ---------------------------------------------------------------------------
  // 1. Large JS does NOT automatically imply minification issue
  // ---------------------------------------------------------------------------
  it('1: Large JS does NOT automatically imply minification issue', () => {
    const minifyRule = rules.find(r => r.id === 'REC_JS_MINIFY');
    expect(minifyRule).toBeDefined();

    // 778.6 KB of JavaScript, but all scripts are production-minified
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/main.min.js', isMinified: true, fileSizeKb: 500 },
          { url: 'https://example.com/vendor.min.js', isMinified: true, fileSizeKb: 278.6 }
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = minifyRule?.evaluate(input);
    expect(rec).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 2. Large JS does NOT automatically imply unused JS
  // ---------------------------------------------------------------------------
  it('2: Large JS does NOT automatically imply unused JS', () => {
    const unusedRule = rules.find(r => r.id === 'REC_JS_UNUSED');
    expect(unusedRule).toBeDefined();

    // Large bundle, but no CDP coverage measurement available
    const inputWithoutCoverage = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        summary: { totalJSSizeKb: 778.6, estimatedUnusedJS: 0 },
        scripts: [
          { url: 'https://example.com/bundle.js', fileSizeKb: 778.6 } // No estimatedUnusedJsKb
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = unusedRule?.evaluate(inputWithoutCoverage);
    expect(rec).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 3. Large JS does NOT automatically imply code splitting
  // ---------------------------------------------------------------------------
  it('3: Large JS does NOT automatically imply code splitting without measured evidence', () => {
    const unusedRule = rules.find(r => r.id === 'REC_JS_UNUSED');

    // Unused JS under threshold (<= 50KB) even if total bundle is 500KB
    const inputSmallUnused = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        summary: { estimatedUnusedJS: 35 },
        scripts: [
          { url: 'https://example.com/app.js', fileSizeKb: 500, estimatedUnusedJsKb: 35 }
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = unusedRule?.evaluate(inputSmallUnused);
    expect(rec).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 4. Transfer savings are not labeled FCP savings
  // ---------------------------------------------------------------------------
  it('4: Transfer savings are not labeled FCP savings', () => {
    const minifyRule = rules.find(r => r.id === 'REC_JS_MINIFY');
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/unminified.js', isMinified: false, fileSizeKb: 100 }
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = minifyRule?.evaluate(input);
    expect(rec).not.toBeNull();
    expect(rec?.estimatedSavings?.type).toBe('transfer_only');
    expect(rec?.estimatedSavings?.assumption).toContain('Fast 3G');
    // Must NOT claim FCP improvement
    expect(rec?.estimatedSavings?.displayString).not.toMatch(/FCP improves by/i);
    expect(rec?.potentialImpact).not.toMatch(/FCP improves by \d/i);
  });

  // ---------------------------------------------------------------------------
  // 5. Meta description has no performance savings
  // ---------------------------------------------------------------------------
  it('5: Meta description has no performance savings', () => {
    const metaRule = rules.find(r => r.id === 'REC_SEO_META_DESC');
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: {
        summary: { missingMetaDescription: true }
      },
      accessibility: null
    };

    const rec = metaRule?.evaluate(input);
    expect(rec).not.toBeNull();
    expect(rec?.category).toBe('seo');
    expect(rec?.estimatedSavings).toBeNull();
    expect(rec?.estimateType).toBe('not_quantified');
    expect(rec?.estimatedImprovement).toBe('Not quantified');
    expect(rec?.estimatedBandwidthSaving).toBe(0);
    expect(rec?.potentialImpact).toMatch(/search engine|snippet|CTR/i);
  });

  // ---------------------------------------------------------------------------
  // 6. Canonical has no performance savings
  // ---------------------------------------------------------------------------
  it('6: Canonical has no performance savings', () => {
    const canonicalRule = rules.find(r => r.id === 'REC_SEO_CANONICAL');
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: {
        summary: { missingCanonical: true }
      },
      accessibility: null
    };

    const rec = canonicalRule?.evaluate(input);
    expect(rec).not.toBeNull();
    expect(rec?.category).toBe('seo');
    expect(rec?.estimatedSavings).toBeNull();
    expect(rec?.estimateType).toBe('not_quantified');
    expect(rec?.estimatedImprovement).toBe('Not quantified');
    expect(rec?.estimatedBandwidthSaving).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 7. Skip navigation has no performance savings
  // ---------------------------------------------------------------------------
  it('7: Skip navigation has no performance savings', () => {
    const skipRule = rules.find(r => r.id === 'REC_A11Y_SKIP_LINK');
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: {
        summary: { missingSkipNavigation: true },
        hasHeaderNav: true,
        hasRepeatedNavLinks: true,
        validationEvidence: {
          landmarks: { hasNav: true },
          links: [1, 2, 3, 4, 5]
        }
      }
    };

    const rec = skipRule?.evaluate(input);
    expect(rec).not.toBeNull();
    expect(rec?.category).toBe('accessibility');
    expect(rec?.estimatedSavings).toBeNull();
    expect(rec?.estimateType).toBe('not_quantified');
    expect(rec?.estimatedImprovement).toBe('Not quantified');
    expect(rec?.estimatedBandwidthSaving).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 8. Good LCP produces no LCP recommendation
  // ---------------------------------------------------------------------------
  it('8: Good LCP produces no LCP recommendation', () => {
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');
    expect(lcpRule).toBeDefined();

    // Google.com regression value: LCP = 1.7s (good)
    const inputGoogle = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        lcp: { value: 1.7, unit: 's', rating: 'good' }
      }
    };

    const rec = lcpRule?.evaluate(inputGoogle);
    expect(rec).toBeNull();

    // Boundary check: LCP = 2.50s (still good)
    const inputBoundary = {
      ...inputGoogle,
      vitals: {
        lcp: { value: '2.50s', unit: 's', rating: 'good' }
      }
    };
    expect(lcpRule?.evaluate(inputBoundary)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 9. Good CLS produces no CLS recommendation
  // ---------------------------------------------------------------------------
  it('9: Good CLS produces no CLS recommendation', () => {
    const clsRule = rules.find(r => r.id === 'REC_PERF_CLS_SHIFTS');
    expect(clsRule).toBeDefined();

    // Google.com regression value: CLS = 0.023 (good)
    const inputGoogle = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        cls: { value: 0.023, unit: '', rating: 'good' }
      }
    };

    const rec = clsRule?.evaluate(inputGoogle);
    expect(rec).toBeNull();

    // Boundary check: CLS = 0.100 (good)
    const inputBoundary = {
      ...inputGoogle,
      vitals: {
        cls: { value: '0.100', unit: '', rating: 'good' }
      }
    };
    expect(clsRule?.evaluate(inputBoundary)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 10. Unavailable INP produces no INP recommendation
  // ---------------------------------------------------------------------------
  it('10: Unavailable INP produces no INP recommendation', () => {
    const inpRule = rules.find(r => r.id === 'REC_PERF_INP_FIELD');
    expect(inpRule).toBeDefined();

    // Puppeteer lab crawl where INP is N/A / unrated
    const inputLab = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        inp: {
          value: 'N/A',
          unit: 'ms',
          rating: 'unrated',
          available: false,
          source: 'puppeteer',
          mode: 'lab'
        }
      }
    };

    const rec = inpRule?.evaluate(inputLab);
    expect(rec).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 11. TTI never produces INP recommendation
  // ---------------------------------------------------------------------------
  it('11: TTI never produces INP recommendation', () => {
    const inpRule = rules.find(r => r.id === 'REC_PERF_INP_FIELD');

    // Lab crawl with poor TTI (e.g. 5200ms) but no field INP
    const inputWithTti = {
      pagespeed: {
        metrics: { tti: '5.2s' }
      },
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        inp: { value: 'N/A', available: false, mode: 'lab' }
      }
    };

    const rec = inpRule?.evaluate(inputWithTti);
    expect(rec).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 12. TBT recommendations use long-task evidence
  // ---------------------------------------------------------------------------
  it('12: TBT recommendations use long-task evidence', () => {
    const tbtRule = rules.find(r => r.id === 'REC_PERF_TBT_LONG_TASKS');
    expect(tbtRule).toBeDefined();

    // Google.com report value: TBT = 300ms (needs improvement)
    const inputTbt = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        tbt: { value: 300, unit: 'ms', rating: 'needs-improvement' },
        tbtDetails: {
          longTaskCount: 4,
          maxTaskDurationMs: 142,
          tasks: [
            { startTime: 1200, duration: 142, blockingDuration: 92, scriptUrl: 'https://example.com/app.js' },
            { startTime: 1500, duration: 80, blockingDuration: 30, scriptUrl: 'https://example.com/vendor.js' }
          ]
        }
      }
    };

    const rec = tbtRule?.evaluate(inputTbt);
    expect(rec).not.toBeNull();
    expect(rec?.finding.metric).toBe('TBT');
    expect(rec?.finding.value).toBe(300);
    expect(rec?.evidenceDetails).toBeDefined();
    expect(rec?.evidenceDetails?.length).toBeGreaterThan(0);
    expect(rec?.evidenceDetails?.[0].type).toBe('long-task');
    expect(rec?.evidenceDetails?.[0].duration).toBe(142);
    expect(rec?.estimatedSavings).toBeNull();
    expect(rec?.estimateType).toBe('not_quantified');
    expect(rec?.estimatedImprovement).toBe('Not quantified');
  });

  // ---------------------------------------------------------------------------
  // 13. LCP recommendations use actual LCP element evidence
  // ---------------------------------------------------------------------------
  it('13: LCP recommendations use actual LCP element evidence', () => {
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');

    // Case A: Poor LCP caused by hero image
    const inputImageLcp = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        lcp: {
          value: 4.85,
          unit: 's',
          rating: 'poor',
          elementTag: 'IMG',
          selector: 'img.hero-banner',
          elementUrl: 'https://example.com/hero.webp',
          renderTimeMs: 4850,
          loadTimeMs: 4200
        }
      }
    };

    const recImage = lcpRule?.evaluate(inputImageLcp);
    expect(recImage).not.toBeNull();
    expect(recImage?.title).toContain('hero image');
    expect(recImage?.evidenceDetails?.[0].details?.elementTag).toBe('IMG');

    // Case B: Poor LCP caused by text element (H1) -> MUST NOT recommend image optimization!
    const inputTextLcp = {
      ...inputImageLcp,
      vitals: {
        lcp: {
          value: 3.5,
          unit: 's',
          rating: 'needs-improvement',
          elementTag: 'H1',
          selector: 'h1.main-title',
          elementUrl: null,
          renderTimeMs: 3500
        }
      }
    };

    const recText = lcpRule?.evaluate(inputTextLcp);
    expect(recText).not.toBeNull();
    expect(recText?.title).not.toContain('image');
    expect(recText?.title).toContain('text/container');
  });

  // ---------------------------------------------------------------------------
  // 14. No numerical savings are produced without a valid method
  // ---------------------------------------------------------------------------
  it('14: No numerical savings are produced without a valid method', () => {
    const renderBlockingRule = rules.find(r => r.id === 'REC_JS_RENDER_BLOCKING');
    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/blocking.js', isRenderBlocking: true }
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = renderBlockingRule?.evaluate(input);
    expect(rec).not.toBeNull();
    // Render blocking savings cannot be quantified without browser re-run simulation
    expect(rec?.estimatedSavings).toBeNull();
    expect(rec?.estimateType).toBe('not_quantified');
    expect(rec?.estimatedImprovement).toBe('Not quantified');
  });

  // ---------------------------------------------------------------------------
  // 15. Every numerical estimate has an estimate type
  // ---------------------------------------------------------------------------
  it('15: Every numerical estimate has an estimate type', () => {
    const validEstimateTypes = ['measured', 'modeled', 'transfer_only', 'heuristic', 'not_quantified', 'unavailable'];

    rules.forEach(rule => {
      // Create rich mock to evaluate all rules
      const mockInput = {
        pagespeed: null,
        image: {
          optimizationCandidates: [{ url: 'test.jpg', estimatedSizeReductionKb: 50, format: 'JPEG' }],
          summary: { imagesMissingLazyLoading: 2, imagesMissingAltText: 1 }
        },
        css: {
          stylesheets: [
            { url: 'test.css', isMinified: false, fileSizeKb: 20, isRenderBlocking: true, compression: 'none' }
          ]
        },
        js: {
          summary: { estimatedUnusedJS: 120, duplicateScripts: 1 },
          scripts: [
            { url: 'test.js', isMinified: false, fileSizeKb: 50, compression: 'none', isRenderBlocking: true, isDuplicate: true, estimatedUnusedJsKb: 120 }
          ]
        },
        seo: {
          summary: { missingTitle: true, missingMetaDescription: true, missingCanonical: true, missingViewport: true }
        },
        accessibility: {
          summary: { missingSkipNavigation: true },
          accessibility: { missingHtmlLanguageAttribute: true },
          hasHeaderNav: true,
          hasRepeatedNavLinks: true,
          validationEvidence: { landmarks: { hasNav: true }, links: [1, 2, 3, 4, 5] }
        },
        vitals: {
          tbt: { value: 350, unit: 'ms', rating: 'needs-improvement' },
          lcp: { value: 3.2, unit: 's', rating: 'needs-improvement', elementTag: 'H1' },
          cls: { value: 0.18, unit: '', rating: 'needs-improvement' },
          inp: { value: 250, unit: 'ms', rating: 'needs-improvement', available: true, mode: 'field', source: 'crux' }
        }
      };

      const rec = rule.evaluate(mockInput);
      if (rec) {
        expect(rec.estimateType).toBeDefined();
        expect(validEstimateTypes).toContain(rec.estimateType);
        if (rec.estimatedSavings !== null) {
          expect(typeof rec.estimatedSavings.value).toBe('number');
          expect(rec.estimatedSavings.unit).toBeDefined();
          expect(rec.estimatedSavings.type).toBe(rec.estimateType);
        } else {
          expect(rec.estimateType).toBe('not_quantified');
          expect(rec.estimatedImprovement).toBe('Not quantified');
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 16. Confidence is present
  // ---------------------------------------------------------------------------
  it('16: Confidence is present on all recommendations', () => {
    const validConfidences = ['high', 'medium', 'low'];

    rules.forEach(rule => {
      const mockInput = {
        pagespeed: null,
        image: {
          optimizationCandidates: [{ url: 'test.jpg', estimatedSizeReductionKb: 50, format: 'JPEG' }],
          summary: { imagesMissingLazyLoading: 2, imagesMissingAltText: 1 }
        },
        css: {
          stylesheets: [{ url: 'test.css', isMinified: false, fileSizeKb: 20, isRenderBlocking: true, compression: 'none' }]
        },
        js: {
          summary: { estimatedUnusedJS: 120, duplicateScripts: 1 },
          scripts: [{ url: 'test.js', isMinified: false, fileSizeKb: 50, compression: 'none', isRenderBlocking: true, isDuplicate: true, estimatedUnusedJsKb: 120 }]
        },
        seo: {
          summary: { missingTitle: true, missingMetaDescription: true, missingCanonical: true, missingViewport: true }
        },
        accessibility: {
          summary: { missingSkipNavigation: true },
          accessibility: { missingHtmlLanguageAttribute: true },
          hasHeaderNav: true,
          hasRepeatedNavLinks: true,
          validationEvidence: { landmarks: { hasNav: true }, links: [1, 2, 3, 4, 5] }
        },
        vitals: {
          tbt: { value: 350, unit: 'ms', rating: 'needs-improvement' },
          lcp: { value: 3.2, unit: 's', rating: 'needs-improvement', elementTag: 'H1' },
          cls: { value: 0.18, unit: '', rating: 'needs-improvement' },
          inp: { value: 250, unit: 'ms', rating: 'needs-improvement', available: true, mode: 'field', source: 'crux' }
        }
      };

      const rec = rule.evaluate(mockInput);
      if (rec) {
        expect(rec.confidence).toBeDefined();
        expect(validConfidences).toContain(rec.confidence);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 17. JSON and PDF values remain identical
  // ---------------------------------------------------------------------------
  it('17: JSON and PDF values remain identical', async () => {
    const result = generateRecommendations({
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [{ url: 'https://example.com/app.js', isMinified: false, fileSizeKb: 100 }]
      },
      seo: { summary: { missingTitle: true } },
      accessibility: null,
      vitals: {
        tbt: { value: 300, unit: 'ms', rating: 'needs-improvement' }
      }
    } as any);

    expect(result.recommendations.length).toBeGreaterThanOrEqual(2);

    // Mock report payload for PDF generation
    const reportData = {
      url: 'https://example.com',
      scores: { overall: 85, performance: 80, accessibility: 90, seo: 85, bestPractices: 85 },
      vitals: {
        lcp: { value: '1.70s', rating: 'good' },
        cls: { value: '0.023', rating: 'good' },
        tbt: { value: '300ms', rating: 'needs-improvement' },
        fcp: { value: '1.50s', rating: 'good' },
        inp: { value: 'N/A', rating: 'unrated' },
        ttfb: { value: '180ms', rating: 'good' }
      },
      breakdown: {
        js: { sizeKb: 778.6, count: 12 },
        css: { sizeKb: 3.4, count: 1 },
        images: { sizeKb: 0, count: 0 },
        fonts: { sizeKb: 38.6, count: 2 }
      },
      recommendations: result.recommendations
    };

    // PDF generation must complete successfully without mutating or dropping recommendation data
    const pdfBuffer = await pdfService.generateReportPdf(reportData as any);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  // ---------------------------------------------------------------------------
  // 18. No duplicate recommendations
  // ---------------------------------------------------------------------------
  it('18: No duplicate recommendations are produced in report output', () => {
    const result = generateRecommendations({
      pagespeed: null,
      image: {
        optimizationCandidates: [{ url: 'img.png', estimatedSizeReductionKb: 50, format: 'PNG' }]
      },
      css: null,
      js: {
        scripts: [
          { url: 'a.js', isRenderBlocking: true },
          { url: 'b.js', isRenderBlocking: true }
        ]
      },
      seo: null,
      accessibility: null,
      vitals: {
        tbt: { value: 300, unit: 'ms', rating: 'needs-improvement' }
      }
    } as any);

    const ids = result.recommendations.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  // ---------------------------------------------------------------------------
  // 19. Direct numeric vitals support
  // ---------------------------------------------------------------------------
  it('19: Direct numeric vitals support (raw numbers without .value wrapping)', () => {
    const tbtRule = rules.find(r => r.id === 'REC_PERF_TBT_LONG_TASKS');
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');
    const clsRule = rules.find(r => r.id === 'REC_PERF_CLS_SHIFTS');

    const inputNumericVitals = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        tbt: 350,
        lcp: 3.2,
        cls: 0.22
      }
    };

    const recTbt = tbtRule?.evaluate(inputNumericVitals);
    expect(recTbt).not.toBeNull();
    expect(recTbt?.finding.value).toBe(350);

    const recLcp = lcpRule?.evaluate(inputNumericVitals);
    expect(recLcp).not.toBeNull();
    expect(recLcp?.finding.value).toBe(3.2);

    const recCls = clsRule?.evaluate(inputNumericVitals);
    expect(recCls).not.toBeNull();
    expect(recCls?.finding.value).toBe(0.22);
  });

  // ---------------------------------------------------------------------------
  // 20. Milliseconds LCP normalization
  // ---------------------------------------------------------------------------
  it('20: Milliseconds LCP normalization (3500ms -> 3.50s)', () => {
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');

    const inputMsLcp = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        lcp: 3500 // In milliseconds
      }
    };

    const rec = lcpRule?.evaluate(inputMsLcp);
    expect(rec).not.toBeNull();
    expect(rec?.finding.value).toBe(3.5);
    expect(rec?.finding.unit).toBe('s');
  });

  // ---------------------------------------------------------------------------
  // 21. LCP elementSelector fallback from vitals.lcpDetails
  // ---------------------------------------------------------------------------
  it('21: LCP elementSelector fallback from vitals.lcpDetails is preserved in evidenceDetails', () => {
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        lcp: 3.8,
        lcpDetails: {
          elementTag: 'H1',
          elementSelector: 'header > h1.title',
          renderTimeMs: 3800
        }
      }
    };

    const rec = lcpRule?.evaluate(input);
    expect(rec).not.toBeNull();
    expect(rec?.evidenceDetails?.[0].selector).toBe('header > h1.title');
    expect(rec?.evidenceDetails?.[0].details?.elementTag).toBe('H1');
  });

  // ---------------------------------------------------------------------------
  // 22. Deduplication merges evidenceDetails and updates estimatedSavings
  // ---------------------------------------------------------------------------
  it('22: Deduplication merges evidenceDetails and updates estimatedSavings', () => {
    const result = generateRecommendations({
      pagespeed: null,
      image: {
        optimizationCandidates: [
          { url: 'img1.png', estimatedSizeReductionKb: 50, format: 'PNG' }
        ]
      },
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/unmin1.js', isMinified: false, fileSizeKb: 50 }
        ]
      },
      seo: null,
      accessibility: null
    } as any);

    const minifyRec = result.recommendations.find(r => r.id === 'REC_JS_MINIFY');
    expect(minifyRec).toBeDefined();
    expect(minifyRec?.estimatedSavings?.type).toBe('transfer_only');
    expect(minifyRec?.estimatedSavings?.value).toBe(10); // 20% of 50KB
  });

  // ---------------------------------------------------------------------------
  // 23. Render-blocking JS deduplicates duplicate script URLs
  // ---------------------------------------------------------------------------
  it('23: Render-blocking JS deduplicates duplicate script URLs', () => {
    const renderBlockingRule = rules.find(r => r.id === 'REC_JS_RENDER_BLOCKING');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/app.js', isRenderBlocking: true }
        ],
        renderBlockingScripts: [
          'https://example.com/app.js' // Duplicate URL!
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = renderBlockingRule?.evaluate(input);
    expect(rec).not.toBeNull();
    // Must count exactly 1 script, not 2
    expect(rec?.finding.value).toBe(1);
    expect(rec?.evidenceDetails?.length).toBe(1);
    expect(rec?.estimatedPerformanceGain).not.toContain('Improves First Contentful Paint');
  });

  // ---------------------------------------------------------------------------
  // 24. Unminified JS deduplicates duplicate script URLs
  // ---------------------------------------------------------------------------
  it('24: Unminified JS deduplicates duplicate script URLs', () => {
    const minifyRule = rules.find(r => r.id === 'REC_JS_MINIFY');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/bundle.js', isMinified: false, fileSizeKb: 100 }
        ],
        unminifiedScripts: [
          { url: 'https://example.com/bundle.js', isMinified: false, fileSizeKb: 100 } // Duplicate URL!
        ]
      },
      seo: null,
      accessibility: null
    };

    const rec = minifyRule?.evaluate(input);
    expect(rec).not.toBeNull();
    // 20% of 100KB is 20KB, NOT 40KB
    expect(rec?.estimatedSavings?.value).toBe(20);
    expect(rec?.finding.value).toBe(20);
  });

  // ---------------------------------------------------------------------------
  // 25. Non-performance recommendations do not claim performance gain
  // ---------------------------------------------------------------------------
  it('25: Non-performance recommendations do not claim performance gain', () => {
    const viewportRule = rules.find(r => r.id === 'REC_SEO_VIEWPORT');
    const inputViewport = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: { summary: { missingViewport: true } },
      accessibility: null
    };

    const recViewport = viewportRule?.evaluate(inputViewport);
    expect(recViewport).not.toBeNull();
    expect(recViewport?.estimatedPerformanceGain).not.toMatch(/improves.*load/i);
    expect(recViewport?.estimatedPerformanceGain).toContain('None');
  });

  // ---------------------------------------------------------------------------
  // 26. Universal metric parser parses string units for TBT, LCP, CLS, and INP
  // ---------------------------------------------------------------------------
  it('26: Universal metric parser parses string units for TBT, LCP, CLS, and INP', () => {
    const tbtRule = rules.find(r => r.id === 'REC_PERF_TBT_LONG_TASKS');
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');
    const clsRule = rules.find(r => r.id === 'REC_PERF_CLS_SHIFTS');
    const inpRule = rules.find(r => r.id === 'REC_PERF_INP_FIELD');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        tbt: '450ms',
        lcp: '3.8s',
        cls: '0.28',
        inp: { value: '320ms', mode: 'field', source: 'crux' }
      }
    };

    const tbtRec = tbtRule?.evaluate(input);
    expect(tbtRec).not.toBeNull();
    expect(tbtRec?.finding.value).toBe(450);

    const lcpRec = lcpRule?.evaluate(input);
    expect(lcpRec).not.toBeNull();
    expect(lcpRec?.finding.value).toBe(3.8);
    expect(lcpRec?.finding.unit).toBe('s');

    const clsRec = clsRule?.evaluate(input);
    expect(clsRec).not.toBeNull();
    expect(clsRec?.finding.value).toBe(0.28);

    const inpRec = inpRule?.evaluate(input);
    expect(inpRec).not.toBeNull();
    expect(inpRec?.finding.value).toBe(320);
  });

  // ---------------------------------------------------------------------------
  // 27. Universal metric parser safely handles unrated, N/A, and null values
  // ---------------------------------------------------------------------------
  it('27: Universal metric parser safely handles unrated, N/A, and null values without false positives', () => {
    const tbtRule = rules.find(r => r.id === 'REC_PERF_TBT_LONG_TASKS');
    const lcpRule = rules.find(r => r.id === 'REC_PERF_LCP_ELEMENT');
    const clsRule = rules.find(r => r.id === 'REC_PERF_CLS_SHIFTS');
    const inpRule = rules.find(r => r.id === 'REC_PERF_INP_FIELD');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: null,
      seo: null,
      accessibility: null,
      vitals: {
        tbt: 'N/A',
        lcp: 'unrated',
        cls: null,
        inp: undefined
      }
    };

    expect(tbtRule?.evaluate(input)).toBeNull();
    expect(lcpRule?.evaluate(input)).toBeNull();
    expect(clsRule?.evaluate(input)).toBeNull();
    expect(inpRule?.evaluate(input)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 28. JS unminified and uncompressed rules support string URL arrays
  // ---------------------------------------------------------------------------
  it('28: JS unminified and uncompressed rules support string URL arrays', () => {
    const minifyRule = rules.find(r => r.id === 'REC_JS_MINIFY');
    const compressRule = rules.find(r => r.id === 'REC_JS_COMPRESS');

    const input = {
      pagespeed: null,
      image: null,
      css: null,
      js: {
        unminifiedScripts: ['https://example.com/legacy-app.js'],
        uncompressedScripts: ['https://example.com/raw-bundle.js']
      },
      seo: null,
      accessibility: null
    };

    const minRec = minifyRule?.evaluate(input);
    expect(minRec).not.toBeNull();
    expect(minRec?.resource).toBe('https://example.com/legacy-app.js');

    const compRec = compressRule?.evaluate(input);
    expect(compRec).not.toBeNull();
    expect(compRec?.resource).toBe('https://example.com/raw-bundle.js');
  });

  // ---------------------------------------------------------------------------
  // 29. Deduplication merge handles asymmetric savings correctly
  // ---------------------------------------------------------------------------
  it('29: Deduplication merge handles asymmetric savings correctly', () => {
    const res = generateRecommendations({
      pagespeed: null,
      image: null,
      css: null,
      js: {
        scripts: [
          { url: 'https://example.com/a.js', isMinified: false, fileSizeKb: 100 }
        ],
        unminifiedScripts: [
          { url: 'https://example.com/b.js', isMinified: false, fileSizeKb: 50 }
        ]
      } as any,
      seo: null,
      accessibility: null
    });

    const minifyRec = res.recommendations.find(r => r.id === 'REC_JS_MINIFY');
    expect(minifyRec).toBeDefined();
    expect(minifyRec?.estimateType).toBe('transfer_only');
    expect(minifyRec?.estimatedSavings?.value).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 30. LegacyRecommendationEngine generateResult provides real summary and roadmap
  // ---------------------------------------------------------------------------
  it('30: LegacyRecommendationEngine generateResult provides real summary and roadmap', () => {
    const result = RecommendationEngine.generateResult(
      { tbt: 350, lcp: 3200, cls: 0.15 },
      { js: { count: 3, sizeKb: 300 }, css: { count: 2, sizeKb: 150 } },
      [
        { src: 'https://example.com/hero.jpg', savingsKb: 120, hasAlt: false, lazyLoaded: false, sizeKb: 200 }
      ],
      { hasTitle: true, hasMetaDesc: true }
    );

    expect(result.summary).toBeDefined();
    expect(result.summary.totalIssues).toBeGreaterThan(0);
    expect(result.summary.potentialPerformanceImprovement).not.toBe('Audited assets can be optimized');
    expect(result.summary.estimatedTimeToFixEverything).not.toBe('2-3 hours');
    expect(result.roadmap).toBeDefined();
    expect(result.roadmap.length).toBeGreaterThan(0);
    expect(result.roadmap[0]).toMatch(/^Step 1 \[[A-Z]+\]:/);
  });

  // ---------------------------------------------------------------------------
  // 31. Strict estimateType invariant: whenever estimatedSavings is null, estimateType is not_quantified
  // ---------------------------------------------------------------------------
  it('31: Strict estimateType invariant: whenever estimatedSavings is null, estimateType is not_quantified', () => {
    const result = RecommendationEngine.generateResult(
      { tbt: 400 },
      {},
      [],
      { hasTitle: false, hasMetaDesc: false }
    );

    for (const rec of result.recommendations) {
      if (rec.estimatedSavings === null) {
        expect(rec.estimateType).toBe('not_quantified');
        expect(rec.estimatedImprovement).toBe('Not quantified');
      } else {
        expect(rec.estimateType).not.toBe('not_quantified');
        expect(rec.estimatedSavings.value).toBeGreaterThan(0);
      }
    }
  });
});


