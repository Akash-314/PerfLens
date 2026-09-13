import { describe, it, expect } from 'vitest';
import { analyzeJavaScript } from '../services/jsAnalyzer/jsAnalyzer.service.js';
import { PuppeteerScanResult } from '../services/puppeteer/types.js';
import RecommendationEngine from '../services/recommendation/index.js';

describe('TASK-011: JavaScript Analyzer Correctness', () => {
  const createMockPuppeteerResult = (
    resources: any[] = [],
    options: {
      jsCoverage?: any[];
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
    jsCoverage: options.jsCoverage || [],
    errors: options.errors || []
  });

  // ---------------------------------------------------------------------------
  // 1. Total JS size is measured separately from minification state
  // ---------------------------------------------------------------------------
  it('measures total JS size separately from minification state and distinguishes sizes', async () => {
    const resources = [
      {
        url: 'https://example.com/app.min.js',
        type: 'js',
        sizeKb: 500,
        transferSizeKb: 150,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: 'max-age=31536000',
        durationMs: 120,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/legacy-unminified.js',
        type: 'js',
        sizeKb: 80,
        transferSizeKb: 80,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'none',
        cacheControl: 'max-age=3600',
        durationMs: 80,
        httpVersion: 'HTTP/2'
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources));
    expect(result.status).toBe('SUCCESS');
    expect(result.summary.totalJSFiles).toBe(2);
    expect(result.summary.totalJSWeight).toBe(580);
    expect(result.statistics.countByMinified.minified).toBe(1);
    expect(result.statistics.countByMinified.unminified).toBe(1);
    expect(result.statistics.sizeByMinifiedKb.minified).toBe(500);
    expect(result.statistics.sizeByMinifiedKb.unminified).toBe(80);
  });

  // ---------------------------------------------------------------------------
  // 2. Minification is NEVER inferred solely from payload size
  // ---------------------------------------------------------------------------
  it('does NOT infer minification solely from payload size', async () => {
    // Large 2000KB bundle that is minified (e.g. standard vendor bundle)
    const largeMinified = {
      url: 'https://example.com/assets/vendor-8f3a2b1c.js',
      type: 'js',
      sizeKb: 2000,
      transferSizeKb: 600,
      statusCode: 200,
      contentType: 'application/javascript',
      compression: 'gzip',
      cacheControl: 'max-age=31536000',
      durationMs: 200,
      httpVersion: 'HTTP/2'
    };

    // Small 5KB script that is unminified
    const smallUnminified = {
      url: 'https://example.com/analytics-tracker.js',
      type: 'js',
      sizeKb: 5,
      transferSizeKb: 5,
      statusCode: 200,
      contentType: 'application/javascript',
      compression: 'none',
      cacheControl: 'max-age=3600',
      durationMs: 30,
      httpVersion: 'HTTP/2'
    };

    const mockCoverage = [
      {
        url: 'https://example.com/analytics-tracker.js',
        text: 'function trackEvent(category, action) {\n  // Log tracking event\n  console.log(category, action);\n  return true;\n}',
        ranges: [{ start: 0, end: 50 }]
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult([largeMinified, smallUnminified], { jsCoverage: mockCoverage }));
    
    const largeItem = result.scripts.find(s => s.url.includes('vendor'));
    const smallItem = result.scripts.find(s => s.url.includes('analytics-tracker'));

    expect(largeItem?.isMinified).toBe(true); // Large JS is correctly recognized as minified via bundle hash
    expect(smallItem?.isMinified).toBe(false); // Small JS is recognized as unminified via formatted text
  });

  // ---------------------------------------------------------------------------
  // 3. Unused JS is NEVER inferred from payload size
  // ---------------------------------------------------------------------------
  it('returns 0 for estimatedUnusedJS when CDP coverage is absent, never using arbitrary percentage', async () => {
    const resources = [
      {
        url: 'https://example.com/bundle.min.js',
        type: 'js',
        sizeKb: 800,
        transferSizeKb: 250,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=31536000',
        durationMs: 150,
        httpVersion: 'HTTP/2'
      }
    ];

    // No jsCoverage provided
    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources, { jsCoverage: [] }));
    expect(result.summary.estimatedUnusedJS).toBe(0);
    expect(result.summary.hasCoverageData).toBe(false);
    expect(result.scripts[0].estimatedUnusedJsKb).toBe(0);
  });

  it('measures unused JS accurately when CDP coverage profile is provided', async () => {
    const resources = [
      {
        url: 'https://example.com/bundle.min.js',
        type: 'js',
        sizeKb: 200,
        transferSizeKb: 60,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=31536000',
        durationMs: 100,
        httpVersion: 'HTTP/2'
      }
    ];

    // 200KB text (204,800 bytes), only 50KB used (ranges total 51,200 bytes)
    const codeText = 'a'.repeat(204800);
    const mockCoverage = [
      {
        url: 'https://example.com/bundle.min.js',
        text: codeText,
        ranges: [{ start: 0, end: 51200 }]
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources, { jsCoverage: mockCoverage }));
    expect(result.summary.hasCoverageData).toBe(true);
    // Unused = (204800 - 51200) / 1024 = 150 KB
    expect(result.summary.estimatedUnusedJS).toBe(150);
    expect(result.scripts[0].estimatedUnusedJsKb).toBe(150);
  });

  // ---------------------------------------------------------------------------
  // 4. Async / defer / module attributes are inspected
  // ---------------------------------------------------------------------------
  it('correctly flags render-blocking scripts in <head> while exempting async, defer, and module scripts', async () => {
    const mockPage: any = {
      evaluate: async () => [
        {
          src: 'https://example.com/sync-head.js',
          async: false,
          defer: false,
          type: '',
          inHead: true,
          location: '<head>'
        },
        {
          src: 'https://example.com/async-head.js',
          async: true,
          defer: false,
          type: '',
          inHead: true,
          location: '<head>'
        },
        {
          src: 'https://example.com/defer-head.js',
          async: false,
          defer: true,
          type: '',
          inHead: true,
          location: '<head>'
        },
        {
          src: 'https://example.com/module-head.js',
          async: false,
          defer: false,
          type: 'module',
          inHead: true,
          location: '<head>'
        },
        {
          src: 'https://example.com/body-sync.js',
          async: false,
          defer: false,
          type: '',
          inHead: false,
          location: '<body>'
        }
      ]
    };

    const resources = [
      { url: 'https://example.com/sync-head.js', type: 'js', sizeKb: 30, transferSizeKb: 10, statusCode: 200, contentType: 'application/javascript', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/async-head.js', type: 'js', sizeKb: 30, transferSizeKb: 10, statusCode: 200, contentType: 'application/javascript', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/defer-head.js', type: 'js', sizeKb: 30, transferSizeKb: 10, statusCode: 200, contentType: 'application/javascript', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/module-head.js', type: 'js', sizeKb: 30, transferSizeKb: 10, statusCode: 200, contentType: 'application/javascript', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' },
      { url: 'https://example.com/body-sync.js', type: 'js', sizeKb: 30, transferSizeKb: 10, statusCode: 200, contentType: 'application/javascript', compression: 'gzip', cacheControl: '', durationMs: 40, httpVersion: 'HTTP/2' }
    ];

    const result = await analyzeJavaScript(mockPage, createMockPuppeteerResult(resources));
    expect(result.summary.renderBlockingScripts).toBe(1);

    const syncHead = result.scripts.find(s => s.url.includes('sync-head'));
    expect(syncHead?.isRenderBlocking).toBe(true);
    expect(syncHead?.parserBlockingStatus).toBe(true);

    const asyncHead = result.scripts.find(s => s.url.includes('async-head'));
    expect(asyncHead?.isRenderBlocking).toBe(false);

    const deferHead = result.scripts.find(s => s.url.includes('defer-head'));
    expect(deferHead?.isRenderBlocking).toBe(false);

    const moduleHead = result.scripts.find(s => s.url.includes('module-head'));
    expect(moduleHead?.isRenderBlocking).toBe(false);

    const bodySync = result.scripts.find(s => s.url.includes('body-sync'));
    expect(bodySync?.isRenderBlocking).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Recommendations use measured evidence
  // ---------------------------------------------------------------------------
  it('triggers REC_JS_UNUSED only when measured CDP coverage indicates >50KB unused code', () => {
    // Case A: Large JS but NO coverage evidence -> Must NOT trigger REC_JS_UNUSED
    const noCoverageInput = {
      js: {
        summary: { totalJSWeight: 1500, estimatedUnusedJS: 0 },
        scripts: [{ url: 'https://example.com/bundle.js', fileSizeKb: 1500, estimatedUnusedJsKb: 0 }]
      }
    };
    const recsNoCov = RecommendationEngine.generate({} as any, {} as any, [], {} as any, null, noCoverageInput);
    expect(recsNoCov.find(r => r.id === 'REC_JS_UNUSED')).toBeUndefined();

    // Case B: Measured CDP coverage with 120KB unused code -> Must trigger REC_JS_UNUSED with evidence
    const withCoverageInput = {
      js: {
        summary: { totalJSWeight: 500, estimatedUnusedJS: 120 },
        scripts: [
          {
            url: 'https://example.com/huge-unused.js',
            fileSizeKb: 500,
            estimatedUnusedJsKb: 120
          }
        ]
      }
    };
    const recsCov = RecommendationEngine.generate({} as any, {} as any, [], {} as any, null, withCoverageInput);
    const unusedRec = recsCov.find(r => r.id === 'REC_JS_UNUSED');
    expect(unusedRec).toBeDefined();
    expect(unusedRec?.evidenceDetails?.[0].resource).toBe('https://example.com/huge-unused.js');
    expect(unusedRec?.evidenceDetails?.[0].details?.coverageMethod).toBe('Chrome DevTools Protocol');
    expect(unusedRec?.estimateType).toBe('transfer_only');
  });
});
