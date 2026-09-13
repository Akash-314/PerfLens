import { describe, it, expect } from 'vitest';
import { analyzeJavaScript } from '../services/jsAnalyzer/jsAnalyzer.service.js';
import { JsAnalyzer } from '../services/analysis/helpers.js';
import { PuppeteerScanResult } from '../services/puppeteer/types.js';

describe('TASK-014: Bundle Analyzer Correctness', () => {
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
  // 1. Bundle and chunk sizes are real (no fabricated or default fallback numbers)
  // ---------------------------------------------------------------------------
  it('records real bundle/chunk sizes without arbitrary fallback values', async () => {
    const resources = [
      {
        url: 'https://example.com/_next/static/chunks/framework-a7b8c9d0.js',
        type: 'js',
        sizeKb: 145.2,
        transferSizeKb: 42.1,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: 'max-age=31536000',
        durationMs: 85,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/assets/vendor-d4e5f6.js',
        type: 'js',
        sizeKb: 88.5,
        transferSizeKb: 28.3,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=31536000',
        durationMs: 60,
        httpVersion: 'HTTP/2'
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources));
    expect(result.status).toBe('SUCCESS');
    expect(result.packages).toBeDefined();
    expect(result.packages?.length).toBe(2);

    const frameworkBundle = result.packages?.find(p => p.url.includes('framework'));
    expect(frameworkBundle).toBeDefined();
    expect(frameworkBundle?.sizeKb).toBe(145.2);
    expect(frameworkBundle?.transferSizeKb).toBe(42.1);
    expect(frameworkBundle?.compression).toBe('brotli');

    const vendorBundle = result.packages?.find(p => p.url.includes('vendor'));
    expect(vendorBundle).toBeDefined();
    expect(vendorBundle?.sizeKb).toBe(88.5);
    expect(vendorBundle?.transferSizeKb).toBe(28.3);
    expect(vendorBundle?.compression).toBe('gzip');
  });

  // ---------------------------------------------------------------------------
  // 2. Compression sizes are distinguished from raw uncompressed sizes
  // ---------------------------------------------------------------------------
  it('distinguishes wire transfer compressed size from raw uncompressed script size', async () => {
    const resources = [
      {
        url: 'https://example.com/main.bundle.js',
        type: 'js',
        sizeKb: 350.0,
        transferSizeKb: 95.0,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: 'max-age=3600',
        durationMs: 110,
        httpVersion: 'HTTP/2'
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources));
    const bundle = result.packages?.[0];
    expect(bundle).toBeDefined();
    expect(bundle?.sizeKb).toBe(350.0);
    expect(bundle?.transferSizeKb).toBe(95.0);
    expect(bundle?.sizeKb).toBeGreaterThan(bundle?.transferSizeKb || 0);
    expect(bundle?.compression).toBe('brotli');
  });

  // ---------------------------------------------------------------------------
  // 3. Source-map presence is detected from response text or .map network resource
  // ---------------------------------------------------------------------------
  it('detects source map presence from script comment and .map network resources', async () => {
    const resourcesWithMap = [
      {
        url: 'https://example.com/app.js',
        type: 'js',
        sizeKb: 100,
        transferSizeKb: 30,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 50,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/app.js.map',
        type: 'other',
        sizeKb: 250,
        transferSizeKb: 80,
        statusCode: 200,
        contentType: 'application/json',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 30,
        httpVersion: 'HTTP/2'
      }
    ];

    const resultWithMap = await analyzeJavaScript(null, createMockPuppeteerResult(resourcesWithMap));
    expect(resultWithMap.packages?.[0]?.hasSourceMap).toBe(true);

    // Test detection from sourceMappingURL in coverage text
    const resourcesWithInlineComment = [
      {
        url: 'https://example.com/bundle.js',
        type: 'js',
        sizeKb: 80,
        transferSizeKb: 25,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 40,
        httpVersion: 'HTTP/2'
      }
    ];
    const jsCoverage = [
      {
        url: 'https://example.com/bundle.js',
        text: 'console.log("hello");\n//# sourceMappingURL=bundle.js.map',
        ranges: [{ start: 0, end: 20 }]
      }
    ];

    const resultWithComment = await analyzeJavaScript(
      null,
      createMockPuppeteerResult(resourcesWithInlineComment, { jsCoverage })
    );
    expect(resultWithComment.packages?.[0]?.hasSourceMap).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Duplicate module findings require actual network/URL evidence
  // ---------------------------------------------------------------------------
  it('flags duplicate modules only when identical URL is loaded multiple times or repeated library', async () => {
    const resources = [
      {
        url: 'https://cdn.example.com/lodash.min.js',
        type: 'js',
        sizeKb: 70,
        transferSizeKb: 25,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 40,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://cdn.example.com/lodash.min.js',
        type: 'js',
        sizeKb: 70,
        transferSizeKb: 25,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 40,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/single-instance.js',
        type: 'js',
        sizeKb: 40,
        transferSizeKb: 15,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 30,
        httpVersion: 'HTTP/2'
      }
    ];

    const result = await analyzeJavaScript(null, createMockPuppeteerResult(resources));
    const lodashPackages = result.packages?.filter(p => p.url.includes('lodash'));
    expect(lodashPackages?.length).toBe(2);
    // Both loads of duplicate URL are marked as duplicate
    expect(lodashPackages?.every(p => p.isDuplicate)).toBe(true);

    const singlePackage = result.packages?.find(p => p.url.includes('single-instance'));
    expect(singlePackage?.isDuplicate).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. No arbitrary unused-code percentage: requires CDP coverage evidence
  // ---------------------------------------------------------------------------
  it('never invents an arbitrary unused-code percentage when CDP coverage is absent', async () => {
    const resources = [
      {
        url: 'https://example.com/large-app.js',
        type: 'js',
        sizeKb: 600,
        transferSizeKb: 180,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: 'max-age=31536000',
        durationMs: 150,
        httpVersion: 'HTTP/2'
      }
    ];

    // No coverage profile provided
    const resultNoCoverage = await analyzeJavaScript(null, createMockPuppeteerResult(resources));
    const bundle = resultNoCoverage.packages?.[0];
    expect(bundle?.isUnused).toBe(false);
    expect(resultNoCoverage.summary.estimatedUnusedJS).toBe(0);

    // Now test with verified CDP coverage: 400KB unused out of 600KB (>50% and >10KB)
    const codeLength = 600 * 1024;
    const usedLength = 100 * 1024;
    const jsCoverage = [
      {
        url: 'https://example.com/large-app.js',
        text: 'x'.repeat(codeLength),
        ranges: [{ start: 0, end: usedLength }]
      }
    ];

    const resultWithCoverage = await analyzeJavaScript(
      null,
      createMockPuppeteerResult(resources, { jsCoverage })
    );
    const coveredBundle = resultWithCoverage.packages?.[0];
    expect(coveredBundle?.isUnused).toBe(true);
    expect(resultWithCoverage.summary.estimatedUnusedJS).toBeGreaterThan(400);
  });

  // ---------------------------------------------------------------------------
  // 6. JsAnalyzer in analysis/helpers aligns with real sizes and no fallbacks
  // ---------------------------------------------------------------------------
  it('validates JsAnalyzer helper produces real bundle analysis with no arbitrary fallbacks', () => {
    const helper = new JsAnalyzer();
    const resources: any[] = [
      {
        url: 'https://example.com/_next/static/chunks/main-chunk.js',
        type: 'js',
        sizeKb: 210.5,
        transferSizeKb: 65.2,
        compression: 'brotli'
      },
      {
        url: 'https://example.com/assets/index.js',
        type: 'js',
        sizeKb: 120.0,
        transferSizeKb: 38.0,
        compression: 'gzip'
      }
    ];

    const result = helper.analyze(resources);
    expect(result.bundleAnalysis.length).toBe(2);
    expect(result.bundleAnalysis[0].packageName).toBe('main (bundle)');
    expect(result.bundleAnalysis[0].sizeKb).toBe(210.5);
    expect(result.bundleAnalysis[0].transferSizeKb).toBe(65.2);
    expect(result.bundleAnalysis[0].compression).toBe('brotli');
    expect(result.bundleAnalysis[0].isUnused).toBe(false);
    expect(result.bundleAnalysis[0].isDuplicate).toBe(false);
  });
});
