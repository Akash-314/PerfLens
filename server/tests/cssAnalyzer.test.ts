import { describe, it, expect } from 'vitest';
import { analyzeCSS } from '../services/cssAnalyzer/cssAnalyzer.service.js';
import { PuppeteerScanResult } from '../services/puppeteer/types.js';
import RecommendationEngine from '../services/recommendation/index.js';

describe('TASK-012: CSS Analyzer Correctness', () => {
  const createMockPuppeteerResult = (
    resources: any[] = [],
    options: {
      cssCoverage?: any[];
      domStylesheets?: any[];
      errors?: string[];
    } = {}
  ): PuppeteerScanResult => ({
    success: true,
    metadata: {
      title: 'Test Page',
      url: 'https://example.com',
      redirectUrl: 'https://example.com',
      metaDescription: 'Test',
      language: 'en',
      viewport: { width: 1280, height: 800 },
      htmlSizeKb: 50,
      domNodesCount: 100,
      faviconUrl: '',
      manifestUrl: null,
      hasRobotsTxt: false,
      hasSitemapXml: false
    },
    performance: {
      vitals: { fcp: 1000, lcp: 1500, cls: 0.01, fid: null, tbt: 50, ttfb: 100 }
    },
    resources,
    network: {
      totalRequests: resources.length,
      failedRequests: 0,
      redirectCount: 0,
      largestResource: null,
      slowestResource: null,
      compressionRate: 100,
      cacheCoverageRate: 50
    },
    timings: {
      navigationStart: 0,
      dnsLookupMs: 10,
      tcpConnectionMs: 20,
      tlsHandshakeMs: 30,
      requestStartMs: 40,
      responseStartMs: 50,
      responseEndMs: 100,
      domContentLoadedEventMs: 200,
      loadEventMs: 300
    },
    screenshots: { fullPagePath: '', viewportPath: '' },
    cssCoverage: options.cssCoverage || [],
    domStylesheets: options.domStylesheets || [],
    errors: options.errors || []
  });

  // ---------------------------------------------------------------------------
  // 1. CSS size is measured correctly & zero-size vs unavailable timing
  // ---------------------------------------------------------------------------
  it('distinguishes NO_CSS_FOUND from RESOURCE_TIMING_UNAVAILABLE', () => {
    // 0 resources, 0 DOM stylesheets -> NO_CSS_FOUND
    const noCss = analyzeCSS(createMockPuppeteerResult([]));
    expect(noCss.status).toBe('NO_CSS_FOUND');
    expect(noCss.summary.measurementStatus).toBe('NO_CSS_FOUND');
    expect(noCss.summary.totalCSSFiles).toBe(0);

    // 0 network resources, but DOM stylesheets exist -> RESOURCE_TIMING_UNAVAILABLE
    const unavail = analyzeCSS(
      createMockPuppeteerResult([], {
        domStylesheets: [{ href: 'https://example.com/style.css', inHead: true }]
      })
    );
    expect(unavail.status).toBe('RESOURCE_TIMING_UNAVAILABLE');
    expect(unavail.summary.measurementStatus).toBe('RESOURCE_TIMING_UNAVAILABLE');
  });

  // ---------------------------------------------------------------------------
  // 2. Minification is NOT inferred solely from file size
  // ---------------------------------------------------------------------------
  it('does NOT infer minification solely from file size', () => {
    const resources = [
      {
        url: 'https://example.com/custom-design.css',
        type: 'css',
        sizeKb: 8,
        transferSizeKb: 8,
        statusCode: 200,
        contentType: 'text/css',
        compression: 'none',
        cacheControl: 'max-age=3600',
        durationMs: 40,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/assets/vendor-bundle-a8f3b2c1.css',
        type: 'css',
        sizeKb: 350,
        transferSizeKb: 80,
        statusCode: 200,
        contentType: 'text/css',
        compression: 'brotli',
        cacheControl: 'max-age=31536000',
        durationMs: 120,
        httpVersion: 'HTTP/2'
      }
    ];

    // Formatted CSS source with line breaks and indentation
    const mockCoverage = [
      {
        url: 'https://example.com/custom-design.css',
        text: 'body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}\n.container {\n  max-width: 1200px;\n  margin: auto;\n}\n.header {\n  color: #333;\n}\n',
        ranges: [{ start: 0, end: 120 }]
      }
    ];

    const result = analyzeCSS(createMockPuppeteerResult(resources, { cssCoverage: mockCoverage }));
    const smallCustom = result.stylesheets.find(s => s.url.includes('custom-design'));
    const largeVendor = result.stylesheets.find(s => s.url.includes('vendor-bundle'));

    // Even though smallCustom is only 8KB, it is NOT minified because of formatted source lines
    expect(smallCustom?.isMinified).toBe(false);
    // Even though largeVendor is 350KB, it is minified because of production bundler hash pattern
    expect(largeVendor?.isMinified).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. Render-blocking CSS is identified from actual HTML/resource behavior
  // ---------------------------------------------------------------------------
  it('identifies render-blocking CSS based on actual DOM link attributes and media type', () => {
    const domStylesheets = [
      {
        href: 'https://example.com/critical-head.css',
        media: 'all',
        rel: 'stylesheet',
        disabled: false,
        inHead: true,
        isAsync: false,
        isPrint: false,
        isRenderBlocking: true
      },
      {
        href: 'https://example.com/print-only.css',
        media: 'print',
        rel: 'stylesheet',
        disabled: false,
        inHead: true,
        isAsync: false,
        isPrint: true,
        isRenderBlocking: false
      },
      {
        href: 'https://example.com/preloaded-async.css',
        media: 'all',
        rel: 'preload',
        as: 'style',
        disabled: false,
        inHead: true,
        isAsync: true,
        isPrint: false,
        isRenderBlocking: false
      }
    ];

    const resources = [
      { url: 'https://example.com/critical-head.css', type: 'css', sizeKb: 45, transferSizeKb: 12, statusCode: 200, contentType: 'text/css', compression: 'gzip', cacheControl: '', durationMs: 50, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/print-only.css', type: 'css', sizeKb: 20, transferSizeKb: 6, statusCode: 200, contentType: 'text/css', compression: 'gzip', cacheControl: '', durationMs: 30, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/preloaded-async.css', type: 'css', sizeKb: 30, transferSizeKb: 8, statusCode: 200, contentType: 'text/css', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' }
    ];

    const result = analyzeCSS(createMockPuppeteerResult(resources, { domStylesheets }));
    expect(result.summary.renderBlockingCSS).toBe(1);

    const crit = result.stylesheets.find(s => s.url.includes('critical-head'));
    expect(crit?.isRenderBlocking).toBe(true);

    const print = result.stylesheets.find(s => s.url.includes('print-only'));
    expect(print?.isRenderBlocking).toBe(false);

    const asyncCss = result.stylesheets.find(s => s.url.includes('preloaded-async'));
    expect(asyncCss?.isRenderBlocking).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Unused CSS claims require coverage evidence
  // ---------------------------------------------------------------------------
  it('triggers REC_CSS_UNUSED only when measured CDP coverage indicates >20KB unused CSS', () => {
    // Case A: Unprofiled CSS (no coverage) -> Must NOT trigger REC_CSS_UNUSED
    const noCovInput = {
      css: {
        summary: { totalCSSWeight: 300, estimatedUnusedCSS: 0 },
        stylesheets: [{ url: 'https://example.com/styles.css', fileSizeKb: 300, estimatedUnusedCssKb: 0 }]
      }
    };
    const recsNoCov = RecommendationEngine.generate({} as any, {} as any, [], {} as any, null, noCovInput);
    expect(recsNoCov.find(r => r.id === 'REC_CSS_UNUSED')).toBeUndefined();

    // Case B: Measured CDP coverage with 60KB unused CSS -> Must trigger REC_CSS_UNUSED
    const withCovInput = {
      css: {
        summary: { totalCSSWeight: 100, estimatedUnusedCSS: 60 },
        stylesheets: [{ url: 'https://example.com/bloated.css', fileSizeKb: 100, estimatedUnusedCssKb: 60 }]
      }
    };
    const recsCov = RecommendationEngine.generate({} as any, {} as any, [], {} as any, null, withCovInput);
    const unusedRec = recsCov.find(r => r.id === 'REC_CSS_UNUSED');
    expect(unusedRec).toBeDefined();
    expect(unusedRec?.evidenceDetails?.[0].resource).toBe('https://example.com/bloated.css');
    expect(unusedRec?.evidenceDetails?.[0].details?.coverageMethod).toBe('Chrome DevTools Protocol');
    expect(unusedRec?.estimateType).toBe('transfer_only');
  });

  // ---------------------------------------------------------------------------
  // 5. Critical CSS recommendations require evidence (no false alarms on tiny CSS)
  // ---------------------------------------------------------------------------
  it('does NOT recommend critical CSS extraction when total CSS is tiny (e.g. <= 10KB)', () => {
    const tinyInput = {
      css: {
        summary: { totalCSSWeight: 3.4, renderBlockingCSS: 1 },
        stylesheets: [
          { url: 'https://example.com/tiny.css', fileSizeKb: 3.4, isRenderBlocking: true }
        ]
      }
    };
    const recs = RecommendationEngine.generate({} as any, {} as any, [], {} as any, null, tinyInput);
    expect(recs.find(r => r.id === 'REC_CSS_RENDER_BLOCKING')).toBeUndefined();
  });
});
