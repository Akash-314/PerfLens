import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import {
  validateHeadingHierarchy,
  validateCanonicalUrl,
  validateJsonLdScripts,
  parseRobotsDirectives,
  validateSocialCards,
  calculateSeoScore,
  getSeoScoreExplanation
} from '../services/seoAnalyzer/helpers.js';
import { fetchAndVerifySitemapXml } from '../services/seoAnalyzer/seoAnalyzer.service.js';
import { rules } from '../services/recommendation/rules.js';

describe('PERFLEX SEO Analyzer & Evidence Engine', () => {
  describe('validateHeadingHierarchy', () => {
    it('passes for a valid sequential heading structure', () => {
      const headings = [
        { level: 1, text: 'Main Title', tag: 'h1' },
        { level: 2, text: 'Section 1', tag: 'h2' },
        { level: 3, text: 'Subsection 1.1', tag: 'h3' },
        { level: 2, text: 'Section 2', tag: 'h2' }
      ];
      const result = validateHeadingHierarchy(headings);
      expect(result.isHierarchyValid).toBe(true);
      expect(result.skippedLevels).toHaveLength(0);
      expect(result.h1Count).toBe(1);
    });

    it('detects skipped heading levels (e.g. H1 directly to H3)', () => {
      const headings = [
        { level: 1, text: 'Main Title', tag: 'h1' },
        { level: 3, text: 'Skipped Section', tag: 'h3' }
      ];
      const result = validateHeadingHierarchy(headings);
      expect(result.isHierarchyValid).toBe(false);
      expect(result.skippedLevels).toHaveLength(1);
      expect(result.skippedLevels[0]).toEqual({
        from: 'h1',
        to: 'h3',
        text: 'Skipped Section'
      });
    });

    it('handles empty headings gracefully without errors', () => {
      const result = validateHeadingHierarchy([]);
      expect(result.isHierarchyValid).toBe(true);
      expect(result.h1Count).toBe(0);
      expect(result.skippedLevels).toHaveLength(0);
    });
  });

  describe('validateCanonicalUrl', () => {
    const pageUrl = 'https://example.com/products/widgets';

    it('validates matching absolute canonical URL', () => {
      const result = validateCanonicalUrl('https://example.com/products/widgets', pageUrl);
      expect(result.status).toBe('valid');
      expect(result.matchesPageUrl).toBe(true);
      expect(result.url).toBe('https://example.com/products/widgets');
    });

    it('flags relative canonical URLs as invalid for search crawlers', () => {
      const result = validateCanonicalUrl('/products/widgets', pageUrl);
      expect(result.status).toBe('relative');
      expect(result.error).toContain('relative');
    });

    it('detects domain mismatches for cross-domain canonicals', () => {
      const result = validateCanonicalUrl('https://other-domain.com/widgets', pageUrl);
      expect(result.status).toBe('mismatch');
      expect(result.matchesPageUrl).toBe(false);
    });

    it('flags malformed URLs without throwing exceptions', () => {
      const result = validateCanonicalUrl('https://[invalid-url', pageUrl);
      expect(result.status).toBe('invalid');
      expect(result.error).toBeDefined();
    });

    it('correctly handles missing canonical tags', () => {
      const result = validateCanonicalUrl(null, pageUrl);
      expect(result.status).toBe('missing');
      expect(result.url).toBeNull();
    });
  });

  describe('validateJsonLdScripts', () => {
    it('validates compliant JSON-LD schemas and extracts @type and @context', () => {
      const rawScripts = [
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'PerfLens Test'
        })
      ];
      const result = validateJsonLdScripts(rawScripts);
      expect(result.itemCount).toBe(1);
      expect(result.validCount).toBe(1);
      expect(result.syntaxErrors).toHaveLength(0);
      expect(result.schemaTypes).toContain('WebSite');
      expect(result.presence).toBe(true);
    });

    it('captures malformed JSON syntax errors with snippet evidence', () => {
      const rawScripts = ['{ "name": "unclosed json'];
      const result = validateJsonLdScripts(rawScripts);
      expect(result.itemCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.syntaxErrors).toHaveLength(1);
      expect(result.syntaxErrors[0].error).toBeDefined();
      expect(result.syntaxErrors[0].rawSnippet).toContain('unclosed');
    });
  });

  describe('parseRobotsDirectives', () => {
    it('parses noindex and nofollow directives accurately', () => {
      const result = parseRobotsDirectives('noindex, nofollow');
      expect(result.noindex).toBe(true);
      expect(result.nofollow).toBe(true);
      expect(result.directives).toContain('noindex');
      expect(result.directives).toContain('nofollow');
    });

    it('handles permissive directives cleanly', () => {
      const result = parseRobotsDirectives('index, follow, max-image-preview:large');
      expect(result.noindex).toBe(false);
      expect(result.nofollow).toBe(false);
      expect(result.directives).toContain('index');
      expect(result.directives).toContain('follow');
    });
  });

  describe('validateSocialCards', () => {
    it('identifies complete Open Graph and Twitter metadata', () => {
      const ogData = {
        'og:title': 'Title',
        'og:description': 'Description',
        'og:image': 'https://example.com/og.png',
        'og:url': 'https://example.com',
        'og:type': 'website'
      };
      const twitterData = {
        'twitter:card': 'summary_large_image',
        'twitter:title': 'Title',
        'twitter:description': 'Description',
        'twitter:image': 'https://example.com/og.png'
      };
      const result = validateSocialCards(ogData, twitterData);
      expect(result.openGraph.coveragePercentage).toBe(100);
      expect(result.openGraph.missingTags).toHaveLength(0);
      expect(result.twitter.coveragePercentage).toBe(100);
      expect(result.twitter.missingTags).toHaveLength(0);
    });

    it('reports missing required social preview attributes', () => {
      const ogData = {
        'og:title': 'Title'
      };
      const twitterData = {};
      const result = validateSocialCards(ogData, twitterData);
      expect(result.openGraph.missingTags).toContain('og:description');
      expect(result.openGraph.missingTags).toContain('og:image');
      expect(result.twitter.missingTags).toContain('twitter:card');
    });
  });

  describe('calculateSeoScore', () => {
    it('returns 100 for a completely compliant SEO implementation', () => {
      const score = calculateSeoScore({
        title: 'Perfect SEO Title with 40 Characters Long',
        metaDescription: 'A comprehensive and descriptive meta description that satisfies optimal search engine indexing criteria easily.',
        canonicalValid: true,
        hasH1: true,
        viewport: { width: 1280, height: 800 },
        language: 'en',
        hasRobotsTxt: true,
        hasSitemapXml: true,
        noindex: false
      });
      expect(score).toBe(100);
    });

    it('penalizes missing title and meta description appropriately', () => {
      const score = calculateSeoScore({
        title: null,
        metaDescription: null,
        canonicalValid: true,
        hasH1: true,
        viewport: { width: 1280, height: 800 },
        language: 'en',
        hasRobotsTxt: true,
        hasSitemapXml: true,
        noindex: false
      });
      // Missing title (-20) and metaDescription (-20) from 100 => 60
      expect(score).toBe(60);
    });

    it('caps score at 50 if noindex is active on page', () => {
      const score = calculateSeoScore({
        title: 'Perfect SEO Title with 40 Characters Long',
        metaDescription: 'A comprehensive and descriptive meta description that satisfies optimal search engine indexing criteria easily.',
        canonicalValid: true,
        hasH1: true,
        viewport: { width: 1280, height: 800 },
        language: 'en',
        hasRobotsTxt: true,
        hasSitemapXml: true,
        noindex: true
      });
      expect(score).toBe(50);
    });

    it('neutralizes ACCESS_BLOCKED or UNABLE_TO_VERIFY sitemap states without penalizing score', () => {
      const blockedScore = calculateSeoScore({
        title: 'Perfect SEO Title with 40 Characters Long',
        metaDescription: 'A comprehensive and descriptive meta description that satisfies optimal search engine indexing criteria easily.',
        canonicalValid: true,
        hasH1: true,
        viewport: { width: 1280, height: 800 },
        language: 'en',
        hasRobotsTxt: true,
        hasSitemapXml: false,
        sitemapStatus: 'SITEMAP_ACCESS_BLOCKED',
        sitemapAccessBlocked: true,
        noindex: false
      });
      // All other factors are 95 pts. Blocked sitemap must NOT be penalized (full 5 awarded => 100)
      expect(blockedScore).toBe(100);

      const unverifiedScore = calculateSeoScore({
        title: 'Perfect SEO Title with 40 Characters Long',
        metaDescription: 'A comprehensive and descriptive meta description that satisfies optimal search engine indexing criteria easily.',
        canonicalValid: true,
        hasH1: true,
        viewport: { width: 1280, height: 800 },
        language: 'en',
        hasRobotsTxt: true,
        hasSitemapXml: false,
        sitemapStatus: 'SITEMAP_UNABLE_TO_VERIFY',
        sitemapUnableToVerify: true,
        noindex: false
      });
      expect(unverifiedScore).toBe(100);
    });
  });

  describe('SEO Correctness — Section 9 Comprehensive Verification', () => {
    describe('A, B, C, D: Sitemap Verification Semantics', () => {
      it('A: HTTP 403 produces ACCESS_BLOCKED (NOT INVALID, NOT BROKEN)', async () => {
        vi.spyOn(axios, 'get').mockResolvedValueOnce({
          status: 403,
          data: 'Forbidden'
        });

        const result = await fetchAndVerifySitemapXml('https://example.com', []);
        expect(result.status).toBe('access_blocked');
        expect(result.sitemapStatus).toBe('SITEMAP_ACCESS_BLOCKED');
        expect(result.isAccessBlocked).toBe(true);
        expect(result.isInvalid).toBe(false);
        expect(result.error).toContain('403');
        expect(result.error).not.toContain('broken');
        expect(result.error).not.toContain('invalid');
      });

      it('B: HTTP 404 produces NOT_FOUND / missing', async () => {
        vi.spyOn(axios, 'get').mockResolvedValueOnce({
          status: 404,
          data: 'Not Found'
        });

        const result = await fetchAndVerifySitemapXml('https://example.com', []);
        expect(result.status).toBe('missing');
        expect(result.sitemapStatus).toBe('SITEMAP_NOT_FOUND');
        expect(result.isMissing).toBe(true);
        expect(result.isInvalid).toBe(false);
      });

      it('C: HTTP 200 + valid XML produces VALID', async () => {
        vi.spyOn(axios, 'get').mockResolvedValueOnce({
          status: 200,
          data: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>'
        });

        const result = await fetchAndVerifySitemapXml('https://example.com', []);
        expect(result.status).toBe('verified_exists');
        expect(result.sitemapStatus).toBe('SITEMAP_VALID');
        expect(result.isInvalid).toBe(false);
        expect(result.urlCount).toBe(1);
      });

      it('D: HTTP 200 + malformed HTML response produces INVALID', async () => {
        vi.spyOn(axios, 'get').mockResolvedValueOnce({
          status: 200,
          data: '<!DOCTYPE html><html><body>SPA 404 fallback page</body></html>'
        });

        const result = await fetchAndVerifySitemapXml('https://example.com', []);
        expect(result.status).toBe('invalid');
        expect(result.sitemapStatus).toBe('SITEMAP_INVALID');
        expect(result.isInvalid).toBe(true);
      });
    });

    describe('E, F, G: JSON-LD State Distinction', () => {
      it('E: No JSON-LD scripts produces NOT_DETECTED with explicit wording', () => {
        const result = validateJsonLdScripts([]);
        expect(result.status).toBe('NOT_DETECTED');
        expect(result.presence).toBe(false);
        expect(result.humanMessage).toBe('No JSON-LD structured data was detected on this rendered page.');
        expect(result.humanMessage).not.toContain('Invalid');
      });

      it('F: Valid JSON-LD scripts produces VALID and extracts types', () => {
        const scripts = [
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Acme Corp'
          })
        ];
        const result = validateJsonLdScripts(scripts);
        expect(result.status).toBe('VALID');
        expect(result.presence).toBe(true);
        expect(result.validCount).toBe(1);
        expect(result.schemaTypes).toContain('Organization');
        expect(result.humanMessage).toContain('JSON-LD structured data detected');
      });

      it('G: Malformed JSON-LD scripts produces INVALID without inventing cause', () => {
        const scripts = ['{ "@context": "https://schema.org", broken json'];
        const result = validateJsonLdScripts(scripts);
        expect(result.status).toBe('INVALID');
        expect(result.syntaxErrors.length).toBeGreaterThan(0);
        expect(result.humanMessage).toContain('could not be parsed as valid JSON');
      });
    });

    describe('H: OpenGraph Item-Level Breakdown', () => {
      it('reports item-level presence and calculates coverage strictly from checked items', () => {
        const og = {
          'og:title': 'My Title',
          'og:description': 'My Description',
          'og:url': 'https://example.com/page'
          // missing og:image and og:type
        };
        const result = validateSocialCards(og, {});
        expect(result.openGraph.properties).toBeDefined();
        expect(result.openGraph.properties).toHaveLength(5);

        const titleCheck = result.openGraph.properties?.find(p => p.property === 'og:title');
        expect(titleCheck?.present).toBe(true);
        expect(titleCheck?.value).toBe('My Title');

        const imageCheck = result.openGraph.properties?.find(p => p.property === 'og:image');
        expect(imageCheck?.present).toBe(false);
        expect(imageCheck?.value).toBeNull();

        expect(result.openGraph.presentCount).toBe(3);
        expect(result.openGraph.totalCount).toBe(5);
        expect(result.openGraph.coveragePercentage).toBe(60);
      });
    });

    describe('I: SEO Score Explainability', () => {
      it('displayed score mathematically matches actual contributing breakdown items', () => {
        const explanation = getSeoScoreExplanation({
          title: 'A Valid Title Within Guidelines',
          metaDescription: 'A descriptive meta description that comfortably fits the guideline character range.',
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true,
          noindex: false
        });

        const breakdownSum = explanation.breakdown.reduce((sum, item) => sum + item.score, 0);
        expect(explanation.score).toBe(breakdownSum);
        expect(explanation.score).toBe(100);
        expect(explanation.breakdown).toHaveLength(8);
      });

      it('breakdown reflects ACCESS_BLOCKED as neutral without deduction', () => {
        const explanation = getSeoScoreExplanation({
          title: 'A Valid Title Within Guidelines',
          metaDescription: 'A descriptive meta description that comfortably fits the guideline character range.',
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: false,
          sitemapStatus: 'SITEMAP_ACCESS_BLOCKED',
          sitemapAccessBlocked: true,
          noindex: false
        });

        const sitemapItem = explanation.breakdown.find(item => item.name.includes('sitemap'));
        expect(sitemapItem?.status).toBe('ACCESS_BLOCKED');
        expect(sitemapItem?.score).toBe(5);
        expect(explanation.score).toBe(100);
      });
    });

    describe('J: Canonical States from Rendered Head', () => {
      const pageUrl = 'https://example.com/item';

      it('missing canonical produces MISSING', () => {
        const result = validateCanonicalUrl(null, pageUrl, 0);
        expect(result.canonicalState).toBe('MISSING');
        expect(result.status).toBe('missing');
      });

      it('valid absolute canonical produces PRESENT_VALID', () => {
        const result = validateCanonicalUrl('https://example.com/item', pageUrl, 1);
        expect(result.canonicalState).toBe('PRESENT_VALID');
        expect(result.status).toBe('valid');
      });

      it('multiple canonical links produce DUPLICATE', () => {
        const result = validateCanonicalUrl('https://example.com/item', pageUrl, 2);
        expect(result.canonicalState).toBe('DUPLICATE');
        expect(result.status).toBe('duplicate');
      });

      it('relative or unparseable canonical produces MALFORMED', () => {
        const relativeResult = validateCanonicalUrl('/item', pageUrl, 1);
        expect(relativeResult.canonicalState).toBe('MALFORMED');
        expect(relativeResult.status).toBe('relative');

        const unparseable = validateCanonicalUrl('https://[bad-url', pageUrl, 1);
        expect(unparseable.canonicalState).toBe('MALFORMED');
        expect(unparseable.status).toBe('invalid');
      });
    });

    describe('K & L: Title & Meta Description Guideline Warnings', () => {
      it('K: Title exceeding preferred length is GUIDELINE_WARNING, not failure', () => {
        const explanation = getSeoScoreExplanation({
          title: 'This is an unusually long page title that deliberately exceeds the seventy character guideline threshold',
          metaDescription: 'A valid meta description inside the standard character guideline limits.',
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true
        });

        const titleItem = explanation.breakdown.find(item => item.name.includes('Title'));
        expect(titleItem?.status).toBe('GUIDELINE_WARNING');
        expect(titleItem?.score).toBe(14); // Partial credit awarded, not 0
      });

      it('L: Meta description outside preferred length is GUIDELINE_WARNING, not failure', () => {
        const shortDescExplanation = getSeoScoreExplanation({
          title: 'Valid Title',
          metaDescription: 'Too short.', // < 50 chars
          canonicalValid: true,
          hasH1: true,
          viewport: 'width=device-width',
          language: 'en',
          hasRobotsTxt: true,
          hasSitemapXml: true
        });

        const descItem = shortDescExplanation.breakdown.find(item => item.name.includes('Description'));
        expect(descItem?.status).toBe('GUIDELINE_WARNING');
        expect(descItem?.score).toBe(14); // Partial credit awarded, not 0
      });
    });
  });

  describe('Section 20 & 19 Regression: Report Consistency & Open Graph Accuracy', () => {
    // Test A & E: Exact Amazon-type deterministic fixture derived from actual scoring configuration
    it('Test A & E: Exact Amazon-type deterministic breakdown equals derived score (79/100) and matches across summary/details', () => {
      const amazonParams = {
        title: 'Online Shopping site in India: Shop Online for Mobiles, Books, Watches, Shoes and More - Amazon.in', // 98 chars -> GUIDELINE_WARNING (14/20)
        metaDescription: 'Amazon.in: Online Shopping India - Buy mobiles, laptops, cameras, books, watches, apparel, shoes and e-Gift Cards. Free Shipping & Cash on Delivery Available.', // 158 chars -> VALID (20/20)
        canonicalValid: true, // PRESENT_VALID (10/10)
        hasH1: false, // 0/15
        viewport: 'width=device-width, initial-scale=1.0', // 15/15
        language: 'en-in', // 10/10
        hasRobotsTxt: true, // 5/5
        hasSitemapXml: false,
        sitemapStatus: 'SITEMAP_UNABLE_TO_VERIFY' as const, // Neutral (5/5)
        sitemapUnableToVerify: true,
        noindex: false
      };

      const explanation = getSeoScoreExplanation(amazonParams);
      const calculatedScore = calculateSeoScore(amazonParams);

      // Verify that summary score equals detailed score
      expect(calculatedScore).toBe(explanation.score);

      // Verify mathematical derivation of each component
      const breakdownMap = new Map(explanation.breakdown.map(b => [b.name, b.score]));
      expect(breakdownMap.get('Document Title')).toBe(14);
      expect(breakdownMap.get('Meta Description')).toBe(20);
      expect(breakdownMap.get('Primary H1 Heading')).toBe(0);
      expect(breakdownMap.get('Mobile Viewport')).toBe(15);
      expect(breakdownMap.get('Canonical Link')).toBe(10);
      expect(breakdownMap.get('Language Declaration')).toBe(10);
      expect(breakdownMap.get('robots.txt Probe')).toBe(5);
      expect(breakdownMap.get('sitemap.xml Probe')).toBe(5);

      const sum = explanation.breakdown.reduce((acc, item) => acc + item.score, 0);
      expect(sum).toBe(79);
      expect(explanation.score).toBe(79);
      expect(calculatedScore).toBe(79);
    });

    // Test B: Open Graph consistency
    it('Test B: Open Graph consistency — 2/5 present (title & description), missing = [og:image, og:url, og:type], recommendation does not claim title is missing', () => {
      const ogEvidence = {
        'og:title': 'Amazon.in: Online Shopping',
        'og:description': 'Shop Online'
      };
      const socialCards = validateSocialCards(ogEvidence, {});

      expect(socialCards.openGraph.presentCount).toBe(2);
      expect(socialCards.openGraph.totalCount).toBe(5);
      expect(socialCards.openGraph.coveragePercentage).toBe(40);
      expect(socialCards.openGraph.missingTags).toEqual(['og:image', 'og:url', 'og:type']);

      const ogRule = rules.find(r => r.id === 'REC_SEO_OPEN_GRAPH');
      expect(ogRule).toBeDefined();

      const rec = ogRule?.evaluate({
        targetUrl: 'https://www.amazon.in',
        seo: {
          seo: {
            socialCards
          }
        }
      });

      expect(rec).toBeDefined();
      // Must NOT claim og:title is missing
      expect(rec?.finding.description).not.toContain('og:title');
      expect(rec?.evidence).not.toContain('og:title');
      expect(rec?.suggestedFix).not.toContain('og:title');
      expect(rec?.standardFinding?.fixStrategy).not.toContain('og:title');
      expect(rec?.standardFinding?.validationSteps?.join(' ')).not.toContain('og:title');

      // Must address exactly the 3 missing properties
      expect(rec?.finding.description).toContain('og:image');
      expect(rec?.finding.description).toContain('og:url');
      expect(rec?.finding.description).toContain('og:type');

      // Fix strategy declares only missing tags and includes og:type
      expect(rec?.standardFinding?.fixStrategy).toBe(
        'Declare <meta property="og:image">, <meta property="og:url">, and <meta property="og:type"> in the document <head> using the site\'s intended metadata configuration.'
      );
    });

    // Test C: No recommendation for present metadata
    it('Test C: No recommendation for present metadata — if a property is present, no recommendation may claim it is missing', () => {
      // 4 of 5 present, only og:image missing
      const ogEvidence = {
        'og:title': 'My Title',
        'og:description': 'My Description',
        'og:url': 'https://example.com',
        'og:type': 'website'
      };
      // Coverage is 80%, which is >= 60% threshold, so REC_SEO_OPEN_GRAPH returns null
      const socialCardsFull = validateSocialCards(ogEvidence, {});
      expect(socialCardsFull.openGraph.coveragePercentage).toBe(80);
      expect(socialCardsFull.openGraph.missingTags).toEqual(['og:image']);

      const ogRule = rules.find(r => r.id === 'REC_SEO_OPEN_GRAPH');
      const rec = ogRule?.evaluate({
        targetUrl: 'https://example.com',
        seo: {
          seo: {
            socialCards: socialCardsFull
          }
        }
      });
      expect(rec).toBeNull();

      // Incomplete case with 1 present: og:type present, others missing
      const ogEvidencePartial = {
        'og:type': 'website'
      };
      const socialCardsPartial = validateSocialCards(ogEvidencePartial, {});
      const recPartial = ogRule?.evaluate({
        targetUrl: 'https://example.com',
        seo: {
          seo: {
            socialCards: socialCardsPartial
          }
        }
      });
      expect(recPartial).toBeDefined();
      expect(recPartial?.finding.description).not.toContain('og:type');
      expect(recPartial?.suggestedFix).not.toContain('og:type');
      expect(recPartial?.standardFinding?.fixStrategy).not.toContain('og:type');
    });
  });
});

