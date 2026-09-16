import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  getPageSpeedTelemetry,
  classifyGoogleError,
  isPubliclyReachableUrl,
  logServerDiagnostic
} from '../services/pagespeed.service.js';
import ReportGenerator from '../services/analysis/index.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Google PageSpeed Insights / Lighthouse Provider Integration', () => {
  const originalEnvKey = process.env.PAGESPEED_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAGESPEED_API_KEY = 'test_secret_key_abc123';
  });

  afterEach(() => {
    process.env.PAGESPEED_API_KEY = originalEnvKey;
  });

  const mockValidPageSpeedResponse = {
    data: {
      lighthouseResult: {
        categories: {
          performance: { score: 0.85, auditRefs: [{ id: 'largest-contentful-paint', weight: 25 }] },
          accessibility: { score: 0.95 },
          seo: { score: 1.0 },
          'best-practices': { score: 0.90 }
        },
        audits: {
          'largest-contentful-paint': { score: 0.85, numericValue: 1200, displayValue: '1.2 s' },
          'first-contentful-paint': { score: 0.90, numericValue: 800, displayValue: '0.8 s' },
          'cumulative-layout-shift': { score: 1.0, numericValue: 0.01, displayValue: '0.01' },
          'total-blocking-time': { score: 0.80, numericValue: 150, displayValue: '150 ms' },
          'server-response-time': { score: 0.95, numericValue: 120, displayValue: '120 ms' },
          'speed-index': { score: 0.88, numericValue: 1400, displayValue: '1.4 s' },
          'long-tasks': { details: { items: [] } },
          'mainthread-work-breakdown': { details: { items: [] } },
          'bootup-time': { details: { items: [] } }
        }
      }
    },
    status: 200
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Successfully queries Google PageSpeed and returns status SUCCESS with parsed metrics', async () => {
    mockedAxios.get.mockResolvedValueOnce(mockValidPageSpeedResponse as any);

    const result = await getPageSpeedTelemetry('https://example.com');

    expect(result).toBeDefined();
    expect(result?.status).toBe('SUCCESS');
    expect(result?.available).toBe(true);
    expect(result?.performance).toBe(85);
    expect(result?.accessibility).toBe(95);
    expect(result?.seo).toBe(100);
    expect(result?.bestPractices).toBe(90);
    expect(result?.metrics?.lcp).toBe('1.2 s');
    expect(result?.metrics?.fcp).toBe('0.8 s');
    expect(result?.metrics?.cls).toBe('0.01');
    expect(result?.metrics?.tbt).toBe('150 ms');
    expect(result?.metrics?.ttfb).toBe('120ms');

    // Verify 60-second timeout configuration
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('https://www.googleapis.com/pagespeedonline/v5/runPagespeed'),
      expect.objectContaining({ timeout: 60000 })
    );
  });

  it('2. Retries at most once on 60-second timeout and returns status TIMEOUT', async () => {
    const timeoutError = {
      code: 'ECONNABORTED',
      message: 'timeout of 60000ms exceeded',
      response: { status: 408 }
    };

    mockedAxios.get.mockRejectedValueOnce(timeoutError).mockRejectedValueOnce(timeoutError);

    const result = await getPageSpeedTelemetry('https://example.com');

    expect(result).toBeDefined();
    expect(result?.status).toBe('TIMEOUT');
    expect(result?.errorCode).toBe('TIMEOUT');
    expect(result?.available).toBe(false);
    expect(result?.httpStatus).toBe(408);
    // Initial attempt + 1 retry = 2 calls
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  }, 10000);

  it('3. Retries HTTP 429 with bounded exponential backoff (max 2 retries) and returns RATE_LIMITED', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: { error: { message: 'Quota exceeded for quota metric Queries' } }
      },
      message: 'Request failed with status code 429'
    };

    mockedAxios.get
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError);

    const result = await getPageSpeedTelemetry('https://example.com');

    expect(result?.status).toBe('RATE_LIMITED');
    expect(result?.errorCode).toBe('RATE_LIMITED');
    expect(result?.available).toBe(false);
    expect(result?.httpStatus).toBe(429);
    // Initial attempt + 2 retries = 3 calls total
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  }, 15000);

  it('4. Classifies HTTP 400 as INVALID_REQUEST without retrying', async () => {
    const invalidRequestError = {
      response: {
        status: 400,
        data: { error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST' } }
      },
      message: 'Request failed with status code 400'
    };

    mockedAxios.get.mockRejectedValueOnce(invalidRequestError);

    const result = await getPageSpeedTelemetry('https://example.com');

    expect(result?.status).toBe('INVALID_REQUEST');
    expect(result?.errorCode).toBe('INVALID_REQUEST');
    expect(result?.available).toBe(false);
    expect(result?.httpStatus).toBe(400);
    // No retries for 400
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('5. Classifies HTTP 403 as FORBIDDEN without retrying', async () => {
    const forbiddenError = {
      response: {
        status: 403,
        data: { error: { message: 'The request is forbidden for this IP/Referrer' } }
      },
      message: 'Request failed with status code 403'
    };

    mockedAxios.get.mockRejectedValueOnce(forbiddenError);

    const result = await getPageSpeedTelemetry('https://example.com');

    expect(result?.status).toBe('FORBIDDEN');
    expect(result?.errorCode).toBe('FORBIDDEN');
    expect(result?.available).toBe(false);
    expect(result?.httpStatus).toBe(403);
    // No retries for 403
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('6. Classifies API key failure as API_KEY_ERROR / AUTH_ERROR', async () => {
    const apiKeyError = {
      response: {
        status: 400,
        data: {
          error: {
            message: 'API key not valid. Please pass a valid API key.',
            errors: [{ reason: 'keyInvalid' }]
          }
        }
      },
      message: 'Request failed with status code 400'
    };

    const classified = classifyGoogleError(apiKeyError);
    expect(classified.providerStatus).toBe('API_KEY_ERROR');
    expect(classified.errorCategory).toBe('AUTH_ERROR');
  });

  it('7. Skips localhost and private URLs gracefully without calling Google API', async () => {
    const localTargets = [
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://192.168.1.5',
      'http://10.0.0.1',
      'http://169.254.169.254',
      'http://dev-server'
    ];

    for (const target of localTargets) {
      expect(isPubliclyReachableUrl(target)).toBe(false);

      const result = await getPageSpeedTelemetry(target);
      expect(result?.status).toBe('UNAVAILABLE');
      expect(result?.errorCode).toBe('PRIVATE_OR_LOCAL_URL');
      expect(result?.available).toBe(false);
    }

    // Axios should never have been invoked for private addresses
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('8. Falls back cleanly to Puppeteer when PageSpeed fails, maintaining analysisSources', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 60000ms exceeded'
    }).mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 60000ms exceeded'
    });

    const report = await ReportGenerator.generate('https://example.com', 'test-user', true);

    expect(report).toBeDefined();
    // Google Lighthouse is marked unavailable
    expect(report.analysisSources?.googleLighthouse).toBe(false);
    expect(report.analysisSources?.googleLighthouseStatus).toBe('TIMEOUT');
    // Puppeteer remains active fallback
    expect(report.analysisSources?.puppeteerRuntime).toBe(true);
    // PageSpeed data is null in final public report property
    expect(report.pageSpeed).toBeNull();
    // Internal telemetry status is preserved
    expect(report.pageSpeedTelemetry?.status).toBe('TIMEOUT');
    // CWV vitals are populated from Puppeteer lab crawl
    expect(report.vitals?.lcp).toBeDefined();
    expect(report.vitals?.fcp).toBeDefined();
  }, 45000);

  it('9. Never leaks or prints the raw API key in server diagnostic logs', () => {
    const secretKey = 'SUPER_SECRET_GOOGLE_KEY_9999';
    process.env.PAGESPEED_API_KEY = secretKey;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logServerDiagnostic({
      targetUrl: `https://example.com?key=${secretKey}&category=performance`,
      durationMs: 1500,
      httpStatus: 200,
      providerStatus: 'SUCCESS',
      retryCount: 0
    });

    expect(logSpy).toHaveBeenCalled();
    const loggedOutput = logSpy.mock.calls[0][0];

    // Verify secret key was redacted
    expect(loggedOutput).not.toContain(secretKey);
    expect(loggedOutput).toContain('[REDACTED_KEY]');

    logSpy.mockRestore();
  });
});
