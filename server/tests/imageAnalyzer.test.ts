import { describe, it, expect } from 'vitest';
import { analyzeImages } from '../services/imageAnalyzer/imageAnalyzer.service.js';
import { PuppeteerScanResult } from '../services/puppeteer/types.js';
import RecommendationEngine from '../services/recommendation/index.js';

describe('TASK-010: Image Optimization Analyzer Correctness', () => {
  const createMockPuppeteerResult = (
    resources: any[] = [],
    errors: string[] = []
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
    errors
  });

  // ---------------------------------------------------------------------------
  // 1. NO_IMAGES_FOUND vs RESOURCE_TIMING_UNAVAILABLE vs ANALYZER_ERROR
  // ---------------------------------------------------------------------------
  it('distinguishes NO_IMAGES_FOUND when page has 0 image resources and 0 DOM images', async () => {
    const result = await analyzeImages(null, createMockPuppeteerResult([]));
    expect(result.status).toBe('NO_IMAGES_FOUND');
    expect(result.summary.measurementStatus).toBe('NO_IMAGES_FOUND');
    expect(result.summary.totalImages).toBe(0);
    expect(result.images).toHaveLength(0);
  });

  it('distinguishes ANALYZER_ERROR when scan result is null', async () => {
    const result = await analyzeImages(null, null);
    expect(result.status).toBe('ANALYZER_ERROR');
    expect(result.summary.measurementStatus).toBe('ANALYZER_ERROR');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('distinguishes RESOURCE_TIMING_UNAVAILABLE when DOM has images but network has 0 image resources', async () => {
    // Mock page.evaluate returning DOM images
    const mockPage: any = {
      evaluate: async () => [
        {
          src: 'https://example.com/logo.png',
          alt: 'Company Logo',
          loading: 'eager',
          clientWidth: 200,
          clientHeight: 50,
          naturalWidth: 200,
          naturalHeight: 50,
          isBelowTheFold: false,
          selector: 'img.logo'
        }
      ]
    };

    const result = await analyzeImages(mockPage, createMockPuppeteerResult([]));
    expect(result.status).toBe('RESOURCE_TIMING_UNAVAILABLE');
    expect(result.summary.measurementStatus).toBe('RESOURCE_TIMING_UNAVAILABLE');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].isTimingUnavailable).toBe(true);
    expect(result.images[0].fileSizeKb).toBe(-1);
    expect(result.images[0].altText).toBe('Company Logo');
  });

  // ---------------------------------------------------------------------------
  // 2. Natural dimensions versus rendered dimensions
  // ---------------------------------------------------------------------------
  it('distinguishes natural dimensions from rendered dimensions and detects oversized images', async () => {
    const mockPage: any = {
      evaluate: async () => [
        {
          src: 'https://example.com/oversized-banner.jpg',
          alt: 'Big Banner',
          loading: 'lazy',
          clientWidth: 300,
          clientHeight: 200,
          naturalWidth: 1600,
          naturalHeight: 1000,
          isBelowTheFold: true,
          selector: 'img.banner'
        },
        {
          src: 'https://example.com/proper-thumb.jpg',
          alt: 'Thumbnail',
          loading: 'lazy',
          clientWidth: 150,
          clientHeight: 150,
          naturalWidth: 150,
          naturalHeight: 150,
          isBelowTheFold: true,
          selector: 'img.thumb'
        }
      ]
    };

    const resources = [
      {
        url: 'https://example.com/oversized-banner.jpg',
        type: 'image',
        sizeKb: 650,
        transferSizeKb: 650,
        statusCode: 200,
        contentType: 'image/jpeg',
        durationMs: 250,
        cacheControl: 'max-age=3600',
        compression: 'none',
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://example.com/proper-thumb.jpg',
        type: 'image',
        sizeKb: 20,
        transferSizeKb: 20,
        statusCode: 200,
        contentType: 'image/jpeg',
        durationMs: 80,
        cacheControl: 'max-age=3600',
        compression: 'none',
        httpVersion: 'HTTP/2'
      }
    ];

    const result = await analyzeImages(mockPage, createMockPuppeteerResult(resources));
    expect(result.status).toBe('SUCCESS');
    expect(result.summary.measurementStatus).toBe('SUCCESS');
    expect(result.images).toHaveLength(2);

    const oversized = result.images.find(img => img.url.includes('oversized-banner'));
    expect(oversized).toBeDefined();
    expect(oversized?.naturalWidth).toBe(1600);
    expect(oversized?.naturalHeight).toBe(1000);
    expect(oversized?.renderedWidth).toBe(300);
    expect(oversized?.renderedHeight).toBe(200);
    expect(oversized?.isOversized).toBe(true);
    expect(oversized?.oversizedRatio).toBeGreaterThan(5);

    const normal = result.images.find(img => img.url.includes('proper-thumb'));
    expect(normal?.isOversized).toBe(false);

    expect(result.summary.oversizedImagesCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Cached / unavailable resource timing is not converted to 0 KB
  // ---------------------------------------------------------------------------
  it('correctly handles cached resources without converting unmeasured sizes to 0 KB', async () => {
    const resources = [
      {
        url: 'https://example.com/cached-image.png',
        type: 'image',
        sizeKb: 140,
        transferSizeKb: 0,
        statusCode: 200,
        contentType: 'image/png',
        durationMs: 5,
        cacheControl: 'max-age=86400',
        compression: 'none',
        httpVersion: 'HTTP/2',
        fromCache: true
      }
    ];

    const result = await analyzeImages(null, createMockPuppeteerResult(resources));
    expect(result.images).toHaveLength(1);
    const cached = result.images[0];
    expect(cached.fromCache).toBe(true);
    expect(cached.transferSizeKb).toBe(0); // Wire transfer was 0 because cached
    expect(cached.fileSizeKb).toBe(140); // Actual decoded file size preserved
  });

  // ---------------------------------------------------------------------------
  // 4. Recommendation Engine Image Rules with Evidence
  // ---------------------------------------------------------------------------
  it('triggers REC_IMAGE_OVERSIZED with natural vs rendered dimension evidence', () => {
    const mockImageAnalysis = {
      images: [
        {
          url: 'https://example.com/huge-photo.jpg',
          isOversized: true,
          naturalWidth: 2400,
          naturalHeight: 1600,
          renderedWidth: 400,
          renderedHeight: 266,
          oversizedRatio: 36,
          selector: 'img.hero-photo'
        }
      ],
      optimizationCandidates: [
        {
          url: 'https://example.com/huge-photo.jpg',
          isOversized: true,
          naturalDimensions: '2400x1600',
          renderedDimensions: '400x266',
          oversizedRatio: 36
        }
      ],
      summary: { oversizedImagesCount: 1 }
    };

    const recs = RecommendationEngine.generate(
      {} as any,
      {} as any,
      mockImageAnalysis.images as any,
      {} as any,
      null,
      { image: mockImageAnalysis }
    );

    const oversizedRec = recs.find(r => r.id === 'REC_IMAGE_OVERSIZED');
    expect(oversizedRec).toBeDefined();
    expect(oversizedRec?.evidenceDetails?.[0].details?.naturalDimensions).toBe('2400x1600');
    expect(oversizedRec?.evidenceDetails?.[0].details?.renderedDimensions).toBe('400x266');
    expect(oversizedRec?.estimateType).toBe('not_quantified');
  });

  it('requires below-the-fold evidence for REC_IMAGE_LAZY_LOAD and excludes hero images', () => {
    const mockImageAnalysis = {
      images: [
        {
          url: 'https://example.com/hero.jpg',
          isBelowTheFold: false,
          heroImageCandidate: true,
          fetchPriority: 'high',
          lazyLoading: false,
          selector: 'img.hero'
        },
        {
          url: 'https://example.com/footer-logo.jpg',
          isBelowTheFold: true,
          heroImageCandidate: false,
          fetchPriority: 'auto',
          lazyLoading: false,
          selector: 'img.footer-logo',
          renderedWidth: 100,
          renderedHeight: 50
        }
      ],
      summary: {
        imagesMissingLazyLoading: 2,
        belowTheFoldImagesMissingLazyLoading: 1
      }
    };

    const recs = RecommendationEngine.generate(
      {} as any,
      {} as any,
      mockImageAnalysis.images as any,
      {} as any,
      null,
      { image: mockImageAnalysis }
    );

    const lazyRec = recs.find(r => r.id === 'REC_IMAGE_LAZY_LOAD');
    expect(lazyRec).toBeDefined();
    // Only the footer logo should be identified as needing lazy loading, not the hero!
    expect(lazyRec?.evidenceDetails?.[0].resource).toBe('https://example.com/footer-logo.jpg');
    expect(lazyRec?.evidenceDetails?.[0].details?.isBelowTheFold).toBe(true);
  });
});
