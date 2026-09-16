import { describe, it, expect } from 'vitest';
import { rules } from '../services/recommendation/rules.js';
import { generateRecommendations } from '../services/recommendation/recommendation.service.js';
import {
  validateCanonicalUrl,
  calculateSeoScore
} from '../services/seoAnalyzer/helpers.js';

describe('PERFLEX — Anti-Placeholder Regression & SEO Accuracy Engine', () => {
  const FORBIDDEN_PLACEHOLDERS = [
    'example.com',
    'example.org',
    'your-domain.com',
    'your-site.com',
    'authoritative-path'
  ];

  const assertNoPlaceholders = (text: string | null | undefined, context: string) => {
    if (!text) return;
    FORBIDDEN_PLACEHOLDERS.forEach(placeholder => {
      expect(
        text.toLowerCase().includes(placeholder),
        `Found forbidden placeholder "${placeholder}" in ${context}: "${text}"`
      ).toBe(false);
    });
  };

  describe('Section 28: Canonical Anti-Placeholder Hard Regression Test', () => {
    it('NEVER generates placeholder URLs for google.com or any real target when canonical is missing', () => {
      const googleSeoResult: any = {
        summary: {
          missingCanonical: true,
          missingTitle: false,
          missingMetaDescription: false,
          missingViewport: false,
          missingH1: false,
          multipleH1: false,
          headingHierarchyValid: true,
          openGraphCoverage: 0,
          twitterCardCoverage: 0,
          structuredDataPresence: false,
          structuredDataValid: false,
          robotsTxtStatus: 'verified_exists',
          sitemapXmlStatus: 'missing',
          noindexDetected: false,
          seoScoreEstimate: 80
        },
        seo: {
          pageTitle: 'Google',
          metaDescription: 'Search the world\'s information, including webpages, images, videos and more.',
          canonicalUrl: null,
          canonicalDetails: {
            status: 'missing',
            url: null,
            isAbsolute: false,
            matchesPageUrl: false,
            isMissing: true
          },
          charset: 'UTF-8',
          viewport: 'width=device-width, initial-scale=1',
          languageAttribute: 'en',
          metaRobots: null,
          openGraphTags: null,
          twitterCardTags: null,
          internalLinks: [],
          externalLinks: [],
          brokenLinks: [],
          hasRobotsTxt: true,
          hasSitemapXml: false,
          structuredData: null,
          favicon: null,
          metaKeywords: null,
          headingStructure: {
            h1: ['Google'],
            h2: [],
            h3: [],
            h4: [],
            h5: [],
            h6: [],
            hasH1: true,
            h1Count: 1,
            multipleH1: false,
            isHierarchyValid: true,
            skippedLevels: []
          }
        },
        statistics: {
          titleLength: 6,
          descriptionLength: 74,
          headingsCount: { h1: 1, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
          linksCount: { internal: 10, external: 2, total: 12 }
        },
        optimizationCandidates: [],
        warnings: [],
        errors: []
      };

      const result = generateRecommendations({
        pagespeed: null,
        image: null,
        css: null,
        js: null,
        seo: googleSeoResult,
        accessibility: null
      });

      const canonicalRec = result.recommendations.find(r => r.id === 'REC_SEO_CANONICAL');

      expect(canonicalRec).toBeDefined();
      if (!canonicalRec) return;

      // Verify all user-facing fields contain NO forbidden placeholders
      assertNoPlaceholders(canonicalRec.suggestedFix, 'canonicalRec.suggestedFix');
      assertNoPlaceholders(canonicalRec.fixStrategy, 'canonicalRec.fixStrategy');
      assertNoPlaceholders(canonicalRec.aiFixPrompt, 'canonicalRec.aiFixPrompt');
      const explProblem = typeof canonicalRec.standardFinding?.explanation === 'object' ? canonicalRec.standardFinding?.explanation?.problem : canonicalRec.standardFinding?.explanation;
      assertNoPlaceholders(explProblem, 'standardFinding.explanation.problem');
      assertNoPlaceholders(canonicalRec.standardFinding?.recommendation, 'standardFinding.recommendation');
      assertNoPlaceholders(canonicalRec.standardFinding?.fixStrategy, 'standardFinding.fixStrategy');

      // Verify exact prescribed recommendation action (Section 7)
      expect(canonicalRec.suggestedFix).toContain('Add the page\'s intended canonical URL using the project\'s existing SEO configuration');
      expect(canonicalRec.suggestedFix).toContain('Verify the authoritative URL before deployment');

      // Verify exact AI fix prompt structure (Section 27 / Section 6)
      expect(canonicalRec.aiFixPrompt).toContain('Fix the verified SEO issue below.');
      expect(canonicalRec.aiFixPrompt).toContain('Problem:\nNo canonical URL is declared');
      expect(canonicalRec.aiFixPrompt).toContain('Evidence:\nNo <link rel="canonical"> element was found in the rendered document head.');
      expect(canonicalRec.aiFixPrompt).toContain('Task:\nAdd the page\'s intended canonical URL');
      expect(canonicalRec.aiFixPrompt).toContain('Important:\nDetermine the authoritative URL from the project\'s actual routing and domain configuration.');
      expect(canonicalRec.aiFixPrompt).toContain('Do not use a placeholder or guessed URL.');
    });
  });

  describe('Section 5: Title Rules', () => {
    const titleRule = rules.find(r => r.id === 'REC_SEO_TITLE');

    it('passes for brand names like "Google" (6 chars) without dogmatic length errors', () => {
      const input = {
        seo: {
          summary: { missingTitle: false },
          seo: { pageTitle: 'Google' }
        }
      } as any;
      const rec = titleRule?.evaluate(input);
      expect(rec).toBeNull(); // PASS!
    });

    it('flags missing title tag', () => {
      const input = {
        seo: {
          summary: { missingTitle: true },
          seo: { pageTitle: '' }
        }
      } as any;
      const rec = titleRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.finding?.description).toContain('No <title> element was found');
    });

    it('flags unusually long title as a guideline warning (> 70 chars)', () => {
      const input = {
        seo: {
          summary: { missingTitle: false },
          seo: { pageTitle: 'This is an exceptionally and unusually long page title that exceeds seventy characters in total length easily' }
        }
      } as any;
      const rec = titleRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.severity).toBe('low');
      expect(rec?.finding?.description).toContain('unusually long');
    });

    it('flags duplicate titles when multiple exist in DOM', () => {
      const input = {
        seo: {
          summary: { missingTitle: false },
          seo: { pageTitle: 'Home Page' },
          validationEvidence: { title: { count: 2 } }
        }
      } as any;
      const rec = titleRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.finding?.description).toContain('2 <title> elements were found');
    });
  });

  describe('Section 6: Meta Description Rules', () => {
    const descRule = rules.find(r => r.id === 'REC_SEO_META_DESC');

    it('flags missing meta description with exact human explanation', () => {
      const input = {
        seo: {
          summary: { missingMetaDescription: true },
          seo: { metaDescription: '' }
        }
      } as any;
      const rec = descRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.finding?.description).toBe('No meta description was found in the rendered document head.');
      expect(rec?.whyItMatters).toContain('Your page does not currently provide a description specifically written for search-result snippets');
      expect(rec?.whyItMatters).toContain('Search engines may generate their own snippet from the page content');
      expect(rec?.whyItMatters).toContain('Approximately 120–160 characters is a useful practical guideline');
      expect(rec?.suggestedFix).toBe('Add a page-specific meta description using the project\'s existing SEO configuration.');
      // Must NOT claim ranking drops
      expect(rec?.whyItMatters).not.toContain('rankings will decrease');
    });

    it('passes for valid meta description (approx 120-160 chars)', () => {
      const input = {
        seo: {
          summary: { missingMetaDescription: false },
          seo: { metaDescription: 'PerfLens is an advanced automated web performance and SEO diagnostic toolkit that provides verifiable telemetry.' }
        }
      } as any;
      const rec = descRule?.evaluate(input);
      expect(rec).toBeNull(); // PASS!
    });
  });

  describe('Section 7 & 18: Canonical Rules and Duplicate Handling', () => {
    it('validates canonical URL helper with duplicate detection', () => {
      const res = validateCanonicalUrl('https://example.com/page', 'https://example.com/page', 2);
      expect(res.status).toBe('duplicate');
      expect(res.count).toBe(2);
      expect(res.error).toContain('2 canonical elements were found');
    });

    it('flags relative canonical URLs requiring absolute URLs', () => {
      const res = validateCanonicalUrl('/docs/start', 'https://react.dev/docs/start', 1);
      expect(res.status).toBe('relative');
      expect(res.isAbsolute).toBe(false);
      expect(res.error).toContain('relative');
    });

    it('flags cross-domain canonical mismatches accurately', () => {
      const res = validateCanonicalUrl('https://otherdomain.com/docs', 'https://react.dev/docs', 1);
      expect(res.status).toBe('mismatch');
      expect(res.matchesPageUrl).toBe(false);
    });

    it('passes matching absolute canonical URLs', () => {
      const res = validateCanonicalUrl('https://react.dev/learn', 'https://react.dev/learn', 1);
      expect(res.status).toBe('valid');
      expect(res.matchesPageUrl).toBe(true);
    });
  });

  describe('Section 11: Heading Rules (Non-Dogmatic)', () => {
    const h1Rule = rules.find(r => r.id === 'REC_SEO_H1');

    it('PASSES when multiple H1 elements exist on a page (HTML5 compliant)', () => {
      const input = {
        seo: {
          summary: { missingH1: false, multipleH1: true },
          seo: {
            headingStructure: {
              hasH1: true,
              h1Count: 2,
              multipleH1: true,
              isHierarchyValid: true,
              skippedLevels: []
            }
          }
        }
      } as any;
      const rec = h1Rule?.evaluate(input);
      expect(rec).toBeNull(); // PASS! Multiple H1 is not penalized!
    });

    it('flags missing H1 (0 H1s detected)', () => {
      const input = {
        seo: {
          summary: { missingH1: true, multipleH1: false },
          seo: {
            headingStructure: {
              hasH1: false,
              h1Count: 0,
              multipleH1: false,
              isHierarchyValid: true,
              skippedLevels: []
            }
          }
        }
      } as any;
      const rec = h1Rule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.finding?.description).toContain('No <h1> element was found');
    });
  });

  describe('Section 16 & 17: Robots.txt & Sitemap (Non-Fatal for Missing)', () => {
    const robotsRule = rules.find(r => r.id === 'REC_SEO_ROBOTS_TXT');
    const sitemapRule = rules.find(r => r.id === 'REC_SEO_SITEMAP');

    it('does NOT create a failure recommendation when robots.txt is cleanly missing (404)', () => {
      const input = {
        seo: {
          seo: {
            robotsTxtDetails: {
              status: 'missing',
              statusCode: 404,
              sitemaps: [],
              disallowCount: 0,
              allowCount: 0,
              isMissing: true,
              isUnreachable: false,
              isInvalid: false
            }
          }
        }
      } as any;
      const rec = robotsRule?.evaluate(input);
      expect(rec).toBeNull(); // Missing is NOT fatal!
    });

    it('does NOT create a failure recommendation when sitemap is missing', () => {
      const input = {
        seo: {
          seo: {
            sitemapXmlDetails: {
              status: 'missing',
              statusCode: 404,
              urlCount: 0,
              isSitemapIndex: false,
              url: null,
              isMissing: true,
              isUnreachable: false,
              isInvalid: false
            }
          }
        }
      } as any;
      const rec = sitemapRule?.evaluate(input);
      expect(rec).toBeNull(); // Missing is NOT fatal!
    });
  });

  describe('Section 23: SEO Score Traceability', () => {
    it('awards full title score (20 pts) to concise brand titles like "Google" (6 chars)', () => {
      const score = calculateSeoScore({
        title: 'Google',
        metaDescription: 'Search the world\'s information, including webpages, images, videos and more.',
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

    it('caps score at 50 when noindex is present', () => {
      const score = calculateSeoScore({
        title: 'Google',
        metaDescription: 'Search the world\'s information, including webpages, images, videos and more.',
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
  });

  describe('Section 8: Canonical Recommendation Forensic Tests (Required)', () => {
    const canonicalRule = rules.find(r => r.id === 'REC_SEO_CANONICAL');

    it('TEST 1: Missing canonical generates recommendation without invented URL or "authoritative-path"', () => {
      const input = {
        targetUrl: 'https://mysite.org/products',
        seo: {
          summary: { missingCanonical: true },
          seo: {
            canonicalUrl: null,
            canonicalDetails: { status: 'missing', url: null, isMissing: true }
          }
        }
      } as any;
      const rec = canonicalRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.finding?.description).toBe('No <link rel="canonical"> element was found in the rendered document head.');
      expect(rec?.suggestedFix).not.toContain('authoritative-path');
      expect(rec?.suggestedFix).not.toContain('example.com');
      expect(rec?.aiFixPrompt).not.toContain('authoritative-path');
      expect(rec?.aiFixPrompt).not.toContain('example.com');
    });

    it('TEST 2: Missing canonical on example.com MUST NOT contain https://example.com/authoritative-path', () => {
      const input = {
        targetUrl: 'https://example.com/',
        seo: {
          summary: { missingCanonical: true },
          seo: {
            canonicalUrl: null,
            canonicalDetails: { status: 'missing', url: null, isMissing: true }
          }
        }
      } as any;
      const rec = canonicalRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.suggestedFix).not.toContain('https://example.com/authoritative-path');
      expect(rec?.suggestedFix).not.toContain('/authoritative-path');
      expect(rec?.aiFixPrompt).not.toContain('/authoritative-path');
      expect(rec?.suggestedFix).toContain('Add the page\'s intended canonical URL using the project\'s existing SEO configuration');
    });

    it('TEST 3: Existing canonical preserves the actual observed canonical URL and never replaces it', () => {
      // Test 3a: Valid canonical matches page -> no recommendation needed (PASS)
      const validCanonicalInput = {
        targetUrl: 'https://example.com/actual-page',
        seo: {
          summary: { missingCanonical: false },
          seo: {
            canonicalUrl: 'https://example.com/actual-page',
            canonicalDetails: { status: 'valid', url: 'https://example.com/actual-page', isAbsolute: true }
          }
        }
      } as any;
      const validRec = canonicalRule?.evaluate(validCanonicalInput);
      expect(validRec).toBeNull();

      // Test 3b: When an issue exists with the existing canonical (e.g. cross-domain mismatch),
      // it MUST use the exact observed URL and NEVER replace it with a placeholder
      const mismatchInput = {
        targetUrl: 'https://example.com/actual-page',
        seo: {
          summary: { missingCanonical: false },
          seo: {
            canonicalUrl: 'https://other-domain.com/actual-page',
            canonicalDetails: {
              status: 'mismatch',
              url: 'https://other-domain.com/actual-page',
              error: 'Canonical domain mismatch'
            }
          }
        }
      } as any;
      const mismatchRec = canonicalRule?.evaluate(mismatchInput);
      expect(mismatchRec).not.toBeNull();
      expect(mismatchRec?.evidence).toContain('https://other-domain.com/actual-page');
      expect(mismatchRec?.actualValue).toBe('https://other-domain.com/actual-page');
      expect(mismatchRec?.suggestedFix).not.toContain('authoritative-path');
    });

    it('TEST 4: Missing canonical with uncertain authoritative URL advises determining the intended canonical URL', () => {
      const input = {
        targetUrl: 'https://example.com/catalog?sort=price&filter=shoes&session=abc123xyz',
        seo: {
          summary: { missingCanonical: true },
          seo: {
            canonicalUrl: null,
            canonicalDetails: { status: 'missing', url: null, isMissing: true }
          }
        }
      } as any;
      const rec = canonicalRule?.evaluate(input);
      expect(rec).not.toBeNull();
      expect(rec?.suggestedFix).toContain('Add the page\'s intended canonical URL using the project\'s existing SEO configuration');
      expect(rec?.aiFixPrompt).toContain('Determine the authoritative URL from the project\'s actual routing and domain configuration');
      expect(rec?.aiFixPrompt).toContain('Do not use a placeholder or guessed URL');
      expect(rec?.suggestedFix).not.toContain('/catalog');
      expect(rec?.suggestedFix).not.toContain('authoritative-path');
    });

    it('TEST 5: Placeholder protection asserts canonical recommendations cannot contain fabricated paths', () => {
      const FORBIDDEN_CANONICAL_PATTERNS = [
        'authoritative-path',
        'preferred-url',
        'canonical-url',
        'your-domain.com',
        'your-site.com',
        '/your-path',
        '/your-page'
      ];

      const input = {
        targetUrl: 'https://my-real-app.com/',
        seo: {
          summary: { missingCanonical: true },
          seo: {
            canonicalUrl: null,
            canonicalDetails: { status: 'missing', url: null, isMissing: true }
          }
        }
      } as any;
      const rec = canonicalRule?.evaluate(input);
      expect(rec).not.toBeNull();

      FORBIDDEN_CANONICAL_PATTERNS.forEach(pattern => {
        expect(rec?.suggestedFix.toLowerCase()).not.toContain(pattern);
        expect(rec?.fixStrategy?.toLowerCase()).not.toContain(pattern);
        expect(rec?.aiFixPrompt?.toLowerCase()).not.toContain(pattern);
        expect(rec?.whyItMatters.toLowerCase()).not.toContain(pattern);
      });
    });
  });
});
