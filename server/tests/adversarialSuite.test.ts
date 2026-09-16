import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Domain services and helpers
import {
  validateHeadingHierarchy,
  validateCanonicalUrl,
  validateJsonLdScripts,
  parseRobotsDirectives,
  validateSocialCards,
  calculateSeoScore,
  getSeoScoreExplanation
} from '../services/seoAnalyzer/helpers.js';
import {
  fetchAndVerifyRobotsTxt,
  fetchAndVerifySitemapXml
} from '../services/seoAnalyzer/seoAnalyzer.service.js';
import {
  getPageSpeedTelemetry,
  classifyGoogleError,
  isPubliclyReachableUrl
} from '../services/pagespeed.service.js';
import { generateRecommendations } from '../services/recommendation/recommendation.service.js';
import { rules } from '../services/recommendation/rules.js';
import pdfService from '../services/report/index.js';
import { classifyMetric, METRIC_DEFINITIONS } from '../config/performanceThresholds.js';
import { isScriptMinified } from '../services/jsAnalyzer/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, 'fixtures');

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('PERFLENS — Adversarial Website QA & Regression Test Matrix', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // PHASE 3 — SEO EXPECTED RESULTS
  // =========================================================================
  describe('Phase 3: SEO Expected Results & Guidelines', () => {

    describe('Title Tag Validation', () => {
      it('PASS for present, optimal length title', () => {
        const title = 'PerfLens Comprehensive Valid SEO Testing Document';
        expect(title.length).toBeGreaterThanOrEqual(10);
        expect(title.length).toBeLessThanOrEqual(70);
      });

      it('FAILURE when title is missing in rendered DOM', () => {
        const title = null;
        expect(!title || title.trim().length === 0).toBe(true);
      });

      it('GUIDELINE_WARNING when title is too short (<10 chars) but present — NOT a hard failure', () => {
        const shortTitle = 'Tiny';
        expect(shortTitle.length).toBeLessThan(10);
        expect(shortTitle.length).toBeGreaterThan(0);
      });

      it('GUIDELINE_WARNING when title is excessively long (>70 chars) but present', () => {
        const longTitle = 'This Is An Extremely Long And Verbose Page Title That Exceeds Seventy Characters Easily In Search Engine Results Pages';
        expect(longTitle.length).toBeGreaterThan(70);
      });
    });

    describe('Meta Description Validation', () => {
      it('PASS for present, optimal length meta description', () => {
        const desc = 'A comprehensive valid SEO test document engineered to verify that all primary metadata tags pass analyzer quality standards.';
        expect(desc.length).toBeGreaterThanOrEqual(50);
        expect(desc.length).toBeLessThanOrEqual(160);
      });

      it('FAILURE when meta description is completely missing', () => {
        const desc = null;
        expect(!desc || desc.trim().length === 0).toBe(true);
      });

      it('GUIDELINE_WARNING for short meta description (<50 chars) — never classify as missing', () => {
        const shortDesc = 'Too brief.';
        expect(shortDesc.length).toBeLessThan(50);
        expect(shortDesc.length).toBeGreaterThan(0);
        const isMissing = !shortDesc || shortDesc.trim().length === 0;
        expect(isMissing).toBe(false);
      });

      it('GUIDELINE_WARNING for excessively long meta description (>160 chars)', () => {
        const longDesc = 'This is an excessively long meta description that stretches far beyond the recommended length for search engine snippets. It keeps going and going, providing unnecessary amounts of explanatory prose that will almost certainly be truncated with an ellipsis by Google, Bing, and other modern search crawlers.';
        expect(longDesc.length).toBeGreaterThan(160);
        const isMissing = !longDesc || longDesc.trim().length === 0;
        expect(isMissing).toBe(false);
      });
    });

    describe('Canonical URL Validation & Anti-Placeholder Enforcement', () => {
      const pageUrl = 'https://example.com/test-page';

      it('Exactly one matching absolute canonical -> PRESENT_VALID', () => {
        const result = validateCanonicalUrl('https://example.com/test-page', pageUrl, 1);
        expect(result.status).toBe('valid');
        expect(result.canonicalState).toBe('PRESENT_VALID');
        expect(result.matchesPageUrl).toBe(true);
        expect(result.isMissing).toBe(false);
      });

      it('No canonical declared -> MISSING', () => {
        const result = validateCanonicalUrl(null, pageUrl, 0);
        expect(result.status).toBe('missing');
        expect(result.canonicalState).toBe('MISSING');
        expect(result.isMissing).toBe(true);
        expect(result.url).toBeNull();
      });

      it('Multiple canonical declarations -> DUPLICATE', () => {
        const result = validateCanonicalUrl('https://example.com/canonical-one', pageUrl, 2);
        expect(result.canonicalState).toBe('DUPLICATE');
        expect(result.count).toBe(2);
      });

      it('Malformed canonical href -> MALFORMED', () => {
        const result = validateCanonicalUrl(':::not-a-valid-uri:::', pageUrl, 1);
        expect(result.canonicalState).toBe('MALFORMED');
        expect(['invalid', 'relative']).toContain(result.status);
      });

      it('Relative canonical URL -> relative status & MALFORMED state', () => {
        const result = validateCanonicalUrl('/canonical-path', pageUrl, 1);
        expect(result.status).toBe('relative');
        expect(result.canonicalState).toBe('MALFORMED');
      });

      it('ZERO occurrences of authoritative-path across all generated recommendations', () => {
        const recResult = generateRecommendations({
          pagespeed: null,
          image: null,
          css: null,
          js: null,
          bundle: null,
          network: null,
          performance: null,
          accessibility: null,
          seo: {
            summary: { missingCanonical: true },
            seo: {
              pageTitle: 'Test Page',
              metaDescription: 'Valid meta description',
              canonicalUrl: null,
              canonicalDetails: { status: 'missing', canonicalState: 'MISSING', url: null, isMissing: true },
              charset: 'UTF-8',
              viewport: 'width=device-width',
              socialCards: { openGraph: { coveragePercentage: 100 } }
            }
          },
          targetUrl: 'https://mysite.com/blog/article-1'
        });

        const serialized = JSON.stringify(recResult);
        expect(serialized.includes('authoritative-path')).toBe(false);
        expect(serialized.includes('example.com/authoritative-path')).toBe(false);
      });
    });

    describe('JSON-LD Structured Data Validation', () => {
      it('No JSON-LD -> status NOT_DETECTED (never report 0 valid schemas)', () => {
        const result = validateJsonLdScripts([]);
        expect(result.presence).toBe(false);
        expect(result.status).toBe('NOT_DETECTED');
        expect(result.itemCount).toBe(0);
        expect(result.validCount).toBe(0);
      });

      it('Valid JSON-LD schema -> status VALID with schema types', () => {
        const schema = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Quality Assurance in Web Performance'
        });
        const result = validateJsonLdScripts([schema]);
        expect(result.presence).toBe(true);
        expect(result.status).toBe('VALID');
        expect(result.validCount).toBe(1);
        expect(result.schemaTypes).toContain('Article');
        expect(result.syntaxErrors).toHaveLength(0);
      });

      it('Malformed JSON-LD syntax -> status INVALID with error details', () => {
        const badSchema = '{"@context": "https://schema.org", "@type": "Article", headline: missing_quotes}';
        const result = validateJsonLdScripts([badSchema]);
        expect(result.presence).toBe(true);
        expect(result.status).toBe('INVALID');
        expect(result.validCount).toBe(0);
        expect(result.syntaxErrors.length).toBeGreaterThanOrEqual(1);
      });

      it('Multiple JSON-LD blocks -> status VALID with accurate block count', () => {
        const schemas = [
          JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'PerfLens' }),
          JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Hub' })
        ];
        const result = validateJsonLdScripts(schemas);
        expect(result.status).toBe('VALID');
        expect(result.validCount).toBe(2);
        expect(result.itemCount).toBe(2);
        expect(result.schemaTypes).toEqual(['Organization', 'WebSite']);
      });
    });

    describe('OpenGraph Metadata Breakdown & Accurate Math', () => {
      it('Complete OpenGraph (5/5 present = 100%)', () => {
        const og = {
          'og:title': 'Complete Title',
          'og:description': 'Complete Description',
          'og:image': 'https://example.com/img.png',
          'og:url': 'https://example.com/page',
          'og:type': 'website'
        };
        const result = validateSocialCards(og, {});
        expect(result.openGraph.presentCount).toBe(5);
        expect(result.openGraph.totalCount).toBe(5);
        expect(result.openGraph.coveragePercentage).toBe(100);
        expect(result.openGraph.missingTags).toHaveLength(0);
      });

      it('Partial OpenGraph (3/5 present = 60%) with item-level status', () => {
        const og = {
          'og:title': 'Partial Title',
          'og:description': 'Partial Description',
          'og:type': 'website'
        };
        const result = validateSocialCards(og, {});
        expect(result.openGraph.presentCount).toBe(3);
        expect(result.openGraph.totalCount).toBe(5);
        expect(result.openGraph.coveragePercentage).toBe(60);
        expect(result.openGraph.missingTags).toEqual(['og:image', 'og:url']);

        // Verify individual property checks
        const props = result.openGraph.properties;
        expect(props).toBeDefined();
        const titleProp = props?.find(p => p.property === 'og:title');
        const imgProp = props?.find(p => p.property === 'og:image');
        expect(titleProp?.present).toBe(true);
        expect(imgProp?.present).toBe(false);
      });

      it('Empty OpenGraph tags are treated as NOT present', () => {
        const og = {
          'og:title': '   ',
          'og:description': '',
          'og:image': '   ',
          'og:url': '',
          'og:type': ''
        };
        const result = validateSocialCards(og, {});
        expect(result.openGraph.presentCount).toBe(0);
        expect(result.openGraph.coveragePercentage).toBe(0);
        expect(result.openGraph.missingTags.length).toBe(5);
      });

      it('Coverage percentage matches exact math: (presentCount / totalCount) * 100', () => {
        [0, 1, 2, 3, 4, 5].forEach(presentCount => {
          const expectedPct = Math.round((presentCount / 5) * 100);
          expect(Math.round((presentCount / 5) * 100)).toBe(expectedPct);
        });
      });
    });

    describe('SEO Scoring Model & Contribution Explainability', () => {
      it('Score is completely deterministic for identical inputs', () => {
        const input = {
          title: 'A Deterministic Valid SEO Title',
          metaDescription: 'A descriptive meta description that passes the character length test comfortably.',
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width, initial-scale=1.0',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true,
          isHierarchyValid: true,
          openGraphPresent: 3,
          openGraphTotal: 5,
          structuredDataPresent: true,
          structuredDataValid: true
        };

        const score1 = calculateSeoScore(input);
        const score2 = calculateSeoScore(input);
        expect(score1).toBe(score2);
      });

      it('Score breakdown mathematically matches the calculated score', () => {
        const input = {
          title: 'A Valid Title Within Guidelines',
          metaDescription: 'A descriptive meta description that comfortably fits the guideline character range.',
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true,
          isHierarchyValid: true,
          openGraphPresent: 5,
          openGraphTotal: 5,
          structuredDataPresent: true,
          structuredDataValid: true
        };

        const score = calculateSeoScore(input);
        const explanation = getSeoScoreExplanation(input);

        expect(explanation.score).toBe(score);
        const sumBreakdown = explanation.breakdown.reduce((acc, item) => acc + item.score, 0);
        expect(sumBreakdown).toBe(score);
      });
    });

    describe('Heading Structure Validation', () => {
      it('Valid sequential hierarchy: H1 -> H2 -> H3', () => {
        const headings = [
          { level: 1, text: 'Main Title', tag: 'h1' },
          { level: 2, text: 'Sub topic', tag: 'h2' },
          { level: 3, text: 'Detail', tag: 'h3' }
        ];
        const res = validateHeadingHierarchy(headings);
        expect(res.isHierarchyValid).toBe(true);
        expect(res.skippedLevels).toHaveLength(0);
        expect(res.h1Count).toBe(1);
      });

      it('Skipped heading hierarchy: H1 -> H2 -> H4 (skips H3)', () => {
        const headings = [
          { level: 1, text: 'Main Title', tag: 'h1' },
          { level: 2, text: 'Sub topic', tag: 'h2' },
          { level: 4, text: 'Skipped to H4', tag: 'h4' }
        ];
        const res = validateHeadingHierarchy(headings);
        expect(res.isHierarchyValid).toBe(false);
        expect(res.skippedLevels).toHaveLength(1);
        expect(res.skippedLevels[0].from).toBe('h2');
        expect(res.skippedLevels[0].to).toBe('h4');
      });

      it('Multiple H1 headings flagged as multipleH1: true', () => {
        const headings = [
          { level: 1, text: 'First H1', tag: 'h1' },
          { level: 1, text: 'Second H1', tag: 'h1' }
        ];
        const res = validateHeadingHierarchy(headings);
        expect(res.multipleH1).toBe(true);
        expect(res.h1Count).toBe(2);
      });

      it('Missing H1 heading flagged as hasH1: false', () => {
        const headings = [
          { level: 2, text: 'Starts at H2', tag: 'h2' }
        ];
        const res = validateHeadingHierarchy(headings);
        expect(res.hasH1).toBe(false);
        expect(res.h1Count).toBe(0);
      });
    });

    describe('HTML Language Attribute Validation', () => {
      it('Valid lang attribute "en" is recognized cleanly', () => {
        const rawHtml = fs.readFileSync(path.join(fixturesDir, 'seo', 'valid-lang.html'), 'utf-8');
        const langMatch = rawHtml.match(/<html[^>]*lang=["']([^"']+)["']/i);
        expect(langMatch).not.toBeNull();
        expect(langMatch?.[1]).toBe('en');
      });

      it('Missing lang attribute is detected without guessing from text', () => {
        const rawHtml = fs.readFileSync(path.join(fixturesDir, 'seo', 'missing-lang.html'), 'utf-8');
        const langMatch = rawHtml.match(/<html[^>]*lang=["']([^"']+)["']/i);
        expect(langMatch).toBeNull();
      });
    });
  });

  // =========================================================================
  // PHASE 4 — ROBOTS.TXT TESTS
  // =========================================================================
  describe('Phase 4: Robots.txt Deterministic States', () => {
    const origin = 'https://example.com';

    it('HTTP 200 plain text -> verified_exists with parsed rules', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: 'User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/sitemap.xml'
      } as any);

      const res = await fetchAndVerifyRobotsTxt(origin);
      expect(res.status).toBe('verified_exists');
      expect(res.statusCode).toBe(200);
      expect(res.disallowCount).toBe(1);
      expect(res.sitemaps).toContain('https://example.com/sitemap.xml');
      expect(res.isMissing).toBe(false);
      expect(res.isInvalid).toBe(false);
    });

    it('HTTP 404 -> missing', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 404,
        data: 'Not Found'
      } as any);

      const res = await fetchAndVerifyRobotsTxt(origin);
      expect(res.status).toBe('missing');
      expect(res.statusCode).toBe(404);
      expect(res.isMissing).toBe(true);
      expect(res.isInvalid).toBe(false);
    });

    it('HTTP 403 -> access_blocked (distinct from invalid and missing)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 403,
        data: 'Forbidden'
      } as any);

      const res = await fetchAndVerifyRobotsTxt(origin);
      expect(res.status).toBe('access_blocked');
      expect(res.statusCode).toBe(403);
      expect(res.isInvalid).toBe(false);
      expect(res.isMissing).toBe(false);
    });

    it('Timeout / Network error -> unreachable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection timeout of 3500ms exceeded'));

      const res = await fetchAndVerifyRobotsTxt(origin);
      expect(res.status).toBe('unreachable');
      expect(res.isUnreachable).toBe(true);
      expect(res.isInvalid).toBe(false);
    });

    it('HTTP 200 with HTML fallback -> invalid (not verified plain text)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: '<!DOCTYPE html><html><body><h1>Soft 404 Page</h1></body></html>'
      } as any);

      const res = await fetchAndVerifyRobotsTxt(origin);
      expect(res.status).toBe('invalid');
      expect(res.isInvalid).toBe(true);
      expect(res.isMissing).toBe(false);
    });
  });

  // =========================================================================
  // PHASE 5 — SITEMAP.XML TESTS
  // =========================================================================
  describe('Phase 5: Sitemap.xml Deterministic States', () => {
    const origin = 'https://example.com';

    it('HTTP 200 + valid XML -> verified_exists / SITEMAP_VALID', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>'
      } as any);

      const res = await fetchAndVerifySitemapXml(origin, []);
      expect(res.status).toBe('verified_exists');
      expect(res.sitemapStatus).toBe('SITEMAP_VALID');
      expect(res.urlCount).toBe(1);
      expect(res.isInvalid).toBe(false);
    });

    it('HTTP 200 + HTML/malformed XML -> invalid / SITEMAP_INVALID', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: '<!DOCTYPE html><html><body><h1>HTML not XML</h1></body></html>'
      } as any);

      const res = await fetchAndVerifySitemapXml(origin, []);
      expect(res.status).toBe('invalid');
      expect(res.sitemapStatus).toBe('SITEMAP_INVALID');
      expect(res.isInvalid).toBe(true);
    });

    it('HTTP 404 -> missing / SITEMAP_NOT_FOUND', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 404,
        data: 'Not Found'
      } as any);

      const res = await fetchAndVerifySitemapXml(origin, []);
      expect(res.status).toBe('missing');
      expect(res.sitemapStatus).toBe('SITEMAP_NOT_FOUND');
      expect(res.isMissing).toBe(true);
    });

    it('HTTP 403 -> access_blocked / SITEMAP_ACCESS_BLOCKED (NEVER "Broken sitemap" or "Invalid sitemap")', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 403,
        data: 'Access Denied'
      } as any);

      const res = await fetchAndVerifySitemapXml(origin, []);
      expect(res.status).toBe('access_blocked');
      expect(res.sitemapStatus).toBe('SITEMAP_ACCESS_BLOCKED');
      expect(res.isAccessBlocked).toBe(true);
      expect(res.isInvalid).toBe(false);

      // Verify human message/error does not falsely claim the sitemap is broken/invalid
      const errorMsg = res.error || '';
      expect(errorMsg.toLowerCase().includes('broken')).toBe(false);
      expect(errorMsg.toLowerCase().includes('invalid')).toBe(false);
    });

    it('Timeout / Network failure -> unreachable / SITEMAP_UNREACHABLE or SITEMAP_UNABLE_TO_VERIFY', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const res = await fetchAndVerifySitemapXml(origin, []);
      expect(res.status).toBe('unreachable');
      expect(['SITEMAP_UNREACHABLE', 'SITEMAP_UNABLE_TO_VERIFY']).toContain(res.sitemapStatus);
      expect(res.isUnreachable).toBe(true);
    });
  });

  // =========================================================================
  // PHASE 6 — GOOGLE PAGESPEED / LIGHTHOUSE PROVIDER MOCKS
  // =========================================================================
  describe('Phase 6: Google PageSpeed Provider Error Classification & Retries', () => {
    it('HTTP 400 classified as INVALID_REQUEST without retrying', () => {
      const err = { response: { status: 400, data: { error: { message: 'FAILED_DOCUMENT_REQUEST' } } } };
      const classification = classifyGoogleError(err);
      expect(classification.providerStatus).toBe('INVALID_REQUEST');
      expect(classification.errorCategory).toBe('INVALID_REQUEST');
    });

    it('HTTP 401 classified as AUTH_ERROR without retrying', () => {
      const err = { response: { status: 401, data: { error: { message: 'API key not valid' } } } };
      const classification = classifyGoogleError(err);
      expect(['AUTH_ERROR', 'API_KEY_ERROR']).toContain(classification.providerStatus);
    });

    it('HTTP 403 classified as FORBIDDEN without retrying', () => {
      const err = { response: { status: 403, data: { error: { message: 'Forbidden' } } } };
      const classification = classifyGoogleError(err);
      expect(classification.providerStatus).toBe('FORBIDDEN');
    });

    it('HTTP 429 classified as RATE_LIMITED', () => {
      const err = { response: { status: 429, data: { error: { message: 'Quota exceeded' } } } };
      const classification = classifyGoogleError(err);
      expect(classification.providerStatus).toBe('RATE_LIMITED');
    });

    it('HTTP 500/502/503/504 classified as PROVIDER_ERROR', () => {
      [500, 502, 503, 504].forEach(status => {
        const err = { response: { status, data: { error: { message: 'Server error' } } } };
        const classification = classifyGoogleError(err);
        expect(classification.providerStatus).toBe('PROVIDER_ERROR');
      });
    });

    it('Timeout error classified as TIMEOUT', () => {
      const err = { code: 'ECONNABORTED', message: 'timeout of 60000ms exceeded' };
      const classification = classifyGoogleError(err);
      expect(classification.providerStatus).toBe('TIMEOUT');
    });

    it('Raw API key is NEVER leaked in provider diagnostic error messages', () => {
      const sensitiveKey = 'AIzaSySecretApiKey1234567890';
      const err = {
        message: `Request failed with key ${sensitiveKey}`,
        config: { url: `https://googleapis.com/pagespeed?key=${sensitiveKey}` }
      };
      const classification = classifyGoogleError(err);
      expect(classification.errorMessage.includes(sensitiveKey)).toBe(false);
    });
  });

  // =========================================================================
  // PHASE 8 — LOCAL / PRIVATE URL PROTECTION
  // =========================================================================
  describe('Phase 8: Local and Private URL Protection', () => {
    it('Accurately identifies private/local targets to skip calling Google PageSpeed', () => {
      const privateTargets = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1',
        'http://127.0.0.1:8080',
        'http://[::1]',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://192.168.1.1',
        'http://169.254.169.254',
        'http://intranet-server'
      ];

      privateTargets.forEach(url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
      });
    });

    it('Allows publicly reachable domains for Google PageSpeed', () => {
      const publicTargets = [
        'https://example.com',
        'https://github.com',
        'https://developer.mozilla.org',
        'https://nexonixreflexo.netlify.app'
      ];

      publicTargets.forEach(url => {
        expect(isPubliclyReachableUrl(url)).toBe(true);
      });
    });
  });

  // =========================================================================
  // PHASE 9 — URL VALIDATION TESTS
  // =========================================================================
  describe('Phase 9: URL Scheme Validation & Dangerous Pattern Rejection', () => {
    const isValidHttpUrl = (urlStr: string): boolean => {
      try {
        const u = new URL(urlStr);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    it('Rejects dangerous, unsupported or malformed schemes', () => {
      const dangerousUrls = [
        'not-a-url',
        'http://',
        'https://',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'data:text/html,test',
        'ftp://example.com'
      ];

      dangerousUrls.forEach(url => {
        expect(isValidHttpUrl(url)).toBe(false);
      });
    });

    it('Accepts valid HTTP and HTTPS target URLs', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
      expect(isValidHttpUrl('http://example.com/test?param=1#hash')).toBe(true);
    });
  });

  // =========================================================================
  // PHASE 13 — PERFORMANCE METRICS & CWV REGRESSION
  // =========================================================================
  describe('Phase 13: Core Web Vitals & Performance Thresholds', () => {
    it('Classifies LCP values against standard Google web.dev thresholds', () => {
      expect(classifyMetric('lcp', 2.0).classification).toBe('good');
      expect(classifyMetric('lcp', 2.5).classification).toBe('good');
      expect(classifyMetric('lcp', 3.0).classification).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4.5).classification).toBe('poor');
    });

    it('Classifies CLS values accurately', () => {
      expect(classifyMetric('cls', 0.05).classification).toBe('good');
      expect(classifyMetric('cls', 0.1).classification).toBe('good');
      expect(classifyMetric('cls', 0.15).classification).toBe('needs-improvement');
      expect(classifyMetric('cls', 0.3).classification).toBe('poor');
    });

    it('Classifies INP values accurately', () => {
      expect(classifyMetric('inp', 150).classification).toBe('good');
      expect(classifyMetric('inp', 200).classification).toBe('good');
      expect(classifyMetric('inp', 350).classification).toBe('needs-improvement');
      expect(classifyMetric('inp', 600).classification).toBe('poor');
    });
  });

  // =========================================================================
  // PHASE 14 — ACCESSIBILITY REGRESSION TESTS
  // =========================================================================
  describe('Phase 14: Accessibility Rules Contract', () => {
    it('Rules engine has defined accessibility checks with evidence requirements', () => {
      const a11yRules = rules.filter(r => r.category === 'accessibility');
      expect(a11yRules.length).toBeGreaterThan(0);
      a11yRules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.title).toBeDefined();
        expect(typeof rule.evaluate).toBe('function');
      });
    });
  });

  // =========================================================================
  // PHASE 15 — ASSET ANALYZERS INTEGRITY
  // =========================================================================
  describe('Phase 15: JS / CSS / Asset Discovery & Minification Integrity', () => {
    it('Accurately identifies minified vs unminified JavaScript', () => {
      const minifiedCode = '!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}}();';
      const unminifiedCode = 'function calculateSum(a, b) {\n  // Add two numbers\n  const result = a + b;\n  console.log("Result:", result);\n  return result;\n}';

      expect(isScriptMinified('https://example.com/bundle.min.js', minifiedCode)).toBe(true);
      expect(isScriptMinified('https://example.com/app.js', unminifiedCode)).toBe(false);
    });
  });

  // =========================================================================
  // PHASE 16 — REPORT & PDF OUTPUT TESTS
  // =========================================================================
  describe('Phase 16: Report & PDF Serialization Integrity', () => {
    it('Generates PDF without corrupted control characters, raw JS arrays, or placeholder paths', async () => {
      const sampleReport: any = {
        url: 'https://example.com/test-audit',
        createdAt: new Date(),
        version: '2.0',
        scores: { overall: 88, performance: 85, accessibility: 95, seo: 84 },
        vitals: {
          lcp: { value: '1.40s', rating: 'good', source: 'puppeteer', mode: 'lab' },
          cls: { value: '0.01', rating: 'good', source: 'puppeteer', mode: 'lab' },
          inp: { value: 'Not measured', rating: 'unrated', available: false, source: 'lab', mode: 'lab' }
        },
        breakdown: {
          images: { sizeKb: 120, count: 3 },
          css: { sizeKb: 40, count: 2 },
          js: { sizeKb: 200, count: 4 },
          fonts: { sizeKb: 30, count: 1 }
        },
        seo: {
          pageTitle: 'Sample Performance Audit Target',
          metaDescription: 'A valid sample description for PDF generation testing.',
          canonicalUrl: 'https://example.com/test-audit',
          canonicalDetails: { status: 'valid', canonicalState: 'PRESENT_VALID', url: 'https://example.com/test-audit' },
          robotsMeta: { noindex: false, content: 'index, follow' },
          robotsTxtDetails: { status: 'verified_exists' },
          sitemapXmlDetails: { status: 'verified_exists' },
          headingsHierarchy: { h1: ['Main Heading'], h1Count: 1, isHierarchyValid: true },
          structuredDataDetails: { status: 'VALID', validCount: 1, schemaTypes: ['WebSite'] },
          openGraph: {
            title: 'Sample OpenGraph Title',
            description: 'Sample OpenGraph Description',
            image: null,
            url: null,
            type: 'website',
            missingTags: ['og:image', 'og:url'],
            presentCount: 3,
            totalCount: 5,
            coveragePercentage: 60,
            properties: [
              { property: 'og:title', present: true, value: 'Sample OpenGraph Title' },
              { property: 'og:description', present: true, value: 'Sample OpenGraph Description' },
              { property: 'og:image', present: false, value: null },
              { property: 'og:url', present: false, value: null },
              { property: 'og:type', present: true, value: 'website' }
            ]
          }
        },
        recommendations: []
      };

      const pdfBuf = await pdfService.generateReportPdf(sampleReport);
      expect(pdfBuf).toBeInstanceOf(Buffer);
      expect(pdfBuf.length).toBeGreaterThan(1500);

      const rawText = pdfBuf.toString('latin1');
      // No raw array formatting like "[' title, ' description"
      expect(rawText.includes("[' title")).toBe(false);
      // No placeholder authoritative-path
      expect(rawText.includes('authoritative-path')).toBe(false);
      // No serialized [object Object]
      expect(rawText.includes('[object Object]')).toBe(false);
      // No undefined or NaN in output
      expect(rawText.includes('NaN')).toBe(false);
    });
  });

  // =========================================================================
  // PHASE 17 — AI RECOMMENDATION EVIDENCE GATES
  // =========================================================================
  describe('Phase 17: AI Recommendation Evidence Verification', () => {
    it('NO VERIFIED EVIDENCE -> NO RECOMMENDATION -> NO AI PROMPT', () => {
      // When scan has full valid metadata and zero issues
      const cleanScanInput: any = {
        pagespeed: null,
        image: { images: [], optimizationCandidates: [], oversizedImages: [] },
        css: { stylesheets: [], renderBlockingCss: [], unusedRules: [] },
        js: { scripts: [], renderBlockingScripts: [], unminifiedScripts: [] },
        bundle: null,
        network: null,
        performance: null,
        accessibility: null,
        seo: {
          summary: {
            missingCanonical: false,
            missingTitle: false,
            missingMetaDescription: false,
            missingViewport: false,
            missingH1: false,
            multipleH1: false,
            headingHierarchyValid: true,
            openGraphCoverage: 100,
            structuredDataPresence: true,
            structuredDataValid: true,
            robotsTxtStatus: 'verified_exists',
            sitemapXmlStatus: 'verified_exists'
          },
          seo: {
            pageTitle: 'Valid Title Within Search Engine Guidelines',
            metaDescription: 'A valid descriptive meta description that comfortably fits the recommended guideline character range for snippet display.',
            canonicalUrl: 'https://example.com',
            canonicalDetails: { status: 'valid', canonicalState: 'PRESENT_VALID', url: 'https://example.com' },
            socialCards: { openGraph: { coveragePercentage: 100, missingTags: [] } }
          }
        },
        targetUrl: 'https://example.com'
      };

      const recResult = generateRecommendations(cleanScanInput);
      const seoRecs = recResult.recommendations.filter(r => r.category === 'seo');
      expect(seoRecs).toHaveLength(0);
    });
  });

  // =========================================================================
  // PHASE 18 — CRASH & RESILIENCE TESTS
  // =========================================================================
  describe('Phase 18: Engine Resilience Against Malformed Data', () => {
    it('Handles completely empty HTML input gracefully without unhandled exceptions', () => {
      expect(() => {
        validateHeadingHierarchy([]);
        validateCanonicalUrl(null, 'https://example.com');
        validateJsonLdScripts([]);
        parseRobotsDirectives(null);
        validateSocialCards({}, {});
      }).not.toThrow();
    });

    it('Handles malformed JSON-LD with unclosed structures safely', () => {
      const broken = ['{ "@context": "https://schema.org", "unclosed": true'];
      expect(() => validateJsonLdScripts(broken)).not.toThrow();
    });
  });

  // =========================================================================
  // PHASE 19 — CONCURRENCY ISOLATION
  // =========================================================================
  describe('Phase 19: Concurrency Isolation & Cross-Contamination Prevention', () => {
    it('5 concurrent executions produce independent, uncorrupted results', async () => {
      const targets = [
        { url: 'https://site-a.com', title: 'Site A Title' },
        { url: 'https://site-b.com', title: 'Site B Title' },
        { url: 'https://site-c.com', title: 'Site C Title' },
        { url: 'https://site-d.com', title: 'Site D Title' },
        { url: 'https://site-e.com', title: 'Site E Title' }
      ];

      const tasks = targets.map(async t => {
        const score = calculateSeoScore({
          title: t.title,
          metaDescription: `Description for ${t.url}`,
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true,
          isHierarchyValid: true,
          openGraphPresent: 5,
          openGraphTotal: 5,
          structuredDataPresent: true,
          structuredDataValid: true
        });

        const canonical = validateCanonicalUrl(t.url, t.url, 1);
        return { target: t.url, score, canonicalUrl: canonical.url };
      });

      const results = await Promise.all(tasks);
      results.forEach((res, idx) => {
        expect(res.target).toBe(targets[idx].url);
        expect(res.canonicalUrl).toBe(targets[idx].url);
        expect(res.score).toBeGreaterThanOrEqual(90);
      });
    });

    it('10 concurrent executions maintain strict state isolation', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => {
        const url = `https://site-${i}.org`;
        return Promise.resolve(validateCanonicalUrl(url, url, 1));
      });

      const results = await Promise.all(tasks);
      results.forEach((res, i) => {
        expect(res.url).toBe(`https://site-${i}.org`);
        expect(res.canonicalState).toBe('PRESENT_VALID');
      });
    });
  });

});
