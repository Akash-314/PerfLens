import { describe, it, expect } from 'vitest';
import { NetworkAnalyzer } from '../services/analysis/helpers.js';
import { ResourceItem } from '../services/puppeteer/types.js';

describe('TASK-013: Network and Waterfall Analyzer Correctness', () => {
  const analyzer = new NetworkAnalyzer();

  // ---------------------------------------------------------------------------
  // 1. Requests include URL, type, status, timing, transfer size, cache, initiator
  // ---------------------------------------------------------------------------
  it('captures full request details including URL, type, status, timing, transfer size, cache, and initiator', () => {
    const mockResources: ResourceItem[] = [
      {
        url: 'https://example.com/api/data.json',
        type: 'fetch',
        sizeKb: 45.5,
        transferSizeKb: 12.3,
        statusCode: 200,
        contentType: 'application/json',
        compression: 'gzip',
        cacheControl: 'max-age=3600',
        durationMs: 120,
        httpVersion: 'HTTP/2',
        initiator: 'script',
        startTimeMs: 1500,
        fromCache: false,
        timingBreakdown: {
          dnsMs: 15,
          tcpMs: 25,
          tlsMs: 30,
          ttfbMs: 50,
          downloadMs: 10,
          startTimeMs: 1500,
          durationMs: 120
        }
      }
    ];

    const result = analyzer.analyze(mockResources, 'https://example.com');
    expect(result.resourcesList).toHaveLength(1);

    const item = result.resourcesList[0];
    expect(item.url).toBe('https://example.com/api/data.json');
    expect(item.type).toBe('fetch');
    expect(item.statusCode).toBe(200);
    expect(item.sizeKb).toBe(45.5);
    expect(item.transferSizeKb).toBe(12.3);
    expect(item.durationMs).toBe(120);
    expect(item.initiator).toBe('script');
    expect(item.cacheControl).toBe('max-age=3600');
    expect(item.fromCache).toBe(false);
    expect(item.timingBreakdown?.dnsMs).toBe(15);
    expect(item.timingBreakdown?.tcpMs).toBe(25);
    expect(item.timingBreakdown?.tlsMs).toBe(30);
    expect(item.timingBreakdown?.ttfbMs).toBe(50);
  });

  // ---------------------------------------------------------------------------
  // 2. DNS/TCP/TLS/TTFB timing is NOT fabricated & failed timing is unavailable (null)
  // ---------------------------------------------------------------------------
  it('preserves null for unavailable timing rather than fabricating placeholder numbers', () => {
    const mockResources: ResourceItem[] = [
      {
        url: 'https://example.com/unmeasurable.js',
        type: 'js',
        sizeKb: 10,
        transferSizeKb: 10,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'none',
        cacheControl: 'no-store',
        durationMs: null,
        httpVersion: 'HTTP/1.1',
        initiator: 'parser',
        startTimeMs: null,
        fromCache: false,
        timingBreakdown: null
      }
    ];

    const result = analyzer.analyze(mockResources, 'https://example.com');
    const item = result.resourcesList[0];

    // Must be null, NOT 0 and NOT 50
    expect(item.durationMs).toBeNull();
    expect(item.timeMs).toBeNull();
    expect(item.startTimeMs).toBeNull();
    expect(item.timingBreakdown).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 3. Cached resources are identified and transferSizeKb is preserved
  // ---------------------------------------------------------------------------
  it('correctly identifies cached resources with 0 transfer size while preserving decoded size', () => {
    const mockResources: ResourceItem[] = [
      {
        url: 'https://example.com/cached-logo.svg',
        type: 'image',
        sizeKb: 30,
        transferSizeKb: 0,
        statusCode: 200,
        contentType: 'image/svg+xml',
        compression: 'none',
        cacheControl: 'public, max-age=86400',
        durationMs: 4,
        httpVersion: 'HTTP/2',
        fromCache: true,
        startTimeMs: 100,
        timingBreakdown: null
      }
    ];

    const result = analyzer.analyze(mockResources, 'https://example.com');
    const item = result.resourcesList[0];

    expect(item.fromCache).toBe(true);
    expect(item.transferSizeKb).toBe(0);
    expect(item.sizeKb).toBe(30);
    expect(result.stats.cacheCoverageRate).toBe(100);
  });

  // ---------------------------------------------------------------------------
  // 4. Waterfall ordering is consistent with browser timestamps
  // ---------------------------------------------------------------------------
  it('orders waterfall items chronologically based on browser startTimeMs', () => {
    const mockResources: ResourceItem[] = [
      {
        url: 'https://example.com/third.js',
        type: 'js',
        sizeKb: 10,
        transferSizeKb: 10,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'none',
        cacheControl: '',
        durationMs: 50,
        httpVersion: 'HTTP/2',
        startTimeMs: 3000
      },
      {
        url: 'https://example.com/first.html',
        type: 'document',
        sizeKb: 15,
        transferSizeKb: 5,
        statusCode: 200,
        contentType: 'text/html',
        compression: 'gzip',
        cacheControl: '',
        durationMs: 100,
        httpVersion: 'HTTP/2',
        startTimeMs: 1000
      },
      {
        url: 'https://example.com/second.css',
        type: 'css',
        sizeKb: 20,
        transferSizeKb: 8,
        statusCode: 200,
        contentType: 'text/css',
        compression: 'gzip',
        cacheControl: '',
        durationMs: 60,
        httpVersion: 'HTTP/2',
        startTimeMs: 2000
      }
    ];

    const result = analyzer.analyze(mockResources, 'https://example.com');
    // Expect sorted by startTimeMs: first.html (1000) -> second.css (2000) -> third.js (3000)
    expect(result.resourcesList[0].url).toBe('https://example.com/first.html');
    expect(result.resourcesList[1].url).toBe('https://example.com/second.css');
    expect(result.resourcesList[2].url).toBe('https://example.com/third.js');
  });

  // ---------------------------------------------------------------------------
  // 5. Third-party resource identification
  // ---------------------------------------------------------------------------
  it('accurately identifies third-party resources against target origin', () => {
    const mockResources: ResourceItem[] = [
      {
        url: 'https://example.com/app.js',
        type: 'js',
        sizeKb: 100,
        transferSizeKb: 30,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: '',
        durationMs: 50,
        httpVersion: 'HTTP/2'
      },
      {
        url: 'https://cdn.thirdparty.com/library.js',
        type: 'js',
        sizeKb: 80,
        transferSizeKb: 25,
        statusCode: 200,
        contentType: 'application/javascript',
        compression: 'brotli',
        cacheControl: '',
        durationMs: 70,
        httpVersion: 'HTTP/2'
      }
    ];

    const result = analyzer.analyze(mockResources, 'https://example.com');
    expect(result.stats.thirdPartyCount).toBe(1);
    expect(result.stats.thirdPartySizeKb).toBe(80);
    expect(result.resourcesList.find(r => r.url.includes('thirdparty'))?.isThirdParty).toBe(true);
    expect(result.resourcesList.find(r => r.url.includes('app.js'))?.isThirdParty).toBe(false);
  });
});
