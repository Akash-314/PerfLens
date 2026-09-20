import { Page } from 'puppeteer';
import axios from 'axios';
import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  SEOAnalysisResult,
  SEOAnalysisSummary,
  SEOAnalysisDetails,
  SEOAnalysisStatistics,
  SEOAnalysisWarning,
  SEOOptimizationCandidate,
  RobotsTxtDetails,
  SitemapXmlDetails,
  HreflangTag,
  FrameworkSignal
} from './types.js';
import {
  validateHeadingHierarchy,
  validateCanonicalUrl,
  validateJsonLdScripts,
  parseRobotsDirectives,
  validateSocialCards,
  getSeoScoreExplanation
} from './helpers.js';

/**
 * Fetches and verifies target domain's robots.txt with deep status discrimination.
 * Distinguishes verified_exists vs missing (404) vs unreachable (5xx/timeout) vs invalid (HTML fallback).
 */
export const fetchAndVerifyRobotsTxt = async (origin: string): Promise<RobotsTxtDetails> => {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await axios.get(robotsUrl, {
      timeout: 3500,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PerfLensBot/2.0; +https://perflens.dev)' }
    });

    if (res.status === 200) {
      const dataStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const isHtml = /<html|<!doctype/i.test(dataStr);

      if (isHtml) {
        return {
          status: 'invalid',
          statusCode: 200,
          sitemaps: [],
          disallowCount: 0,
          allowCount: 0,
          isMissing: false,
          isUnreachable: false,
          isInvalid: true,
          snippet: 'Server returned HTTP 200 with HTML markup instead of plain text robots directives.'
        };
      }

      // Parse sitemaps and rules
      const sitemaps: string[] = [];
      let disallowCount = 0;
      let allowCount = 0;

      const lines = dataStr.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (/^sitemap:\s*/i.test(trimmed)) {
          const sUrl = trimmed.replace(/^sitemap:\s*/i, '').trim();
          if (sUrl && !sitemaps.includes(sUrl)) sitemaps.push(sUrl);
        } else if (/^disallow:\s*/i.test(trimmed)) {
          disallowCount++;
        } else if (/^allow:\s*/i.test(trimmed)) {
          allowCount++;
        }
      });

      return {
        status: 'verified_exists',
        statusCode: 200,
        sitemaps,
        disallowCount,
        allowCount,
        isMissing: false,
        isUnreachable: false,
        isInvalid: false,
        snippet: dataStr.slice(0, 200)
      };
    }

    if (res.status === 403) {
      return {
        status: 'access_blocked',
        statusCode: 403,
        sitemaps: [],
        disallowCount: 0,
        allowCount: 0,
        isMissing: false,
        isUnreachable: false,
        isInvalid: false,
        snippet: 'Server responded with HTTP 403 Forbidden'
      };
    }

    if (res.status === 404 || res.status === 410) {
      return {
        status: 'missing',
        statusCode: res.status,
        sitemaps: [],
        disallowCount: 0,
        allowCount: 0,
        isMissing: true,
        isUnreachable: false,
        isInvalid: false
      };
    }

    // 5xx or unexpected status
    return {
      status: 'unreachable',
      statusCode: res.status,
      sitemaps: [],
      disallowCount: 0,
      allowCount: 0,
      isMissing: false,
      isUnreachable: true,
      isInvalid: false,
      snippet: `Server responded with HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      status: 'unreachable',
      statusCode: null,
      sitemaps: [],
      disallowCount: 0,
      allowCount: 0,
      isMissing: false,
      isUnreachable: true,
      isInvalid: false,
      snippet: `Network error: ${err.message}`
    };
  }
};

/**
 * Fetches and verifies target domain's sitemap.xml with XML structure validation.
 */
export const fetchAndVerifySitemapXml = async (
  origin: string,
  discoveredSitemaps: string[]
): Promise<SitemapXmlDetails> => {
  const targetSitemapUrl = discoveredSitemaps.length > 0 ? discoveredSitemaps[0] : `${origin}/sitemap.xml`;

  try {
    const res = await axios.get(targetSitemapUrl, {
      timeout: 3500,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PerfLensBot/2.0; +https://perflens.dev)' }
    });

    if (res.status === 200) {
      const dataStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const isHtml = /<html|<!doctype/i.test(dataStr);
      const isXml = /<urlset|<sitemapindex/i.test(dataStr);

      if (isHtml || !isXml) {
        return {
          status: 'invalid',
          sitemapStatus: 'SITEMAP_INVALID',
          statusCode: 200,
          urlCount: 0,
          isSitemapIndex: false,
          url: targetSitemapUrl,
          isMissing: false,
          isUnreachable: false,
          isInvalid: true,
          error: 'Endpoint returned HTTP 200 but content is not valid XML sitemap markup.'
        };
      }

      const isSitemapIndex = /<sitemapindex/i.test(dataStr);
      const matchUrls = dataStr.match(/<loc>/gi) || [];

      return {
        status: 'verified_exists',
        sitemapStatus: 'SITEMAP_VALID',
        statusCode: 200,
        urlCount: matchUrls.length,
        isSitemapIndex,
        url: targetSitemapUrl,
        isMissing: false,
        isUnreachable: false,
        isInvalid: false
      };
    }

    if (res.status === 403) {
      return {
        status: 'access_blocked',
        sitemapStatus: 'SITEMAP_ACCESS_BLOCKED',
        statusCode: 403,
        urlCount: 0,
        isSitemapIndex: false,
        url: targetSitemapUrl,
        isMissing: false,
        isUnreachable: false,
        isInvalid: false,
        isAccessBlocked: true,
        error: 'HTTP 403 Forbidden'
      };
    }

    if (res.status === 404 || res.status === 410) {
      return {
        status: 'missing',
        sitemapStatus: 'SITEMAP_NOT_FOUND',
        statusCode: res.status,
        urlCount: 0,
        isSitemapIndex: false,
        url: targetSitemapUrl,
        isMissing: true,
        isUnreachable: false,
        isInvalid: false
      };
    }

    return {
      status: 'unreachable',
      sitemapStatus: 'SITEMAP_UNREACHABLE',
      statusCode: res.status,
      urlCount: 0,
      isSitemapIndex: false,
      url: targetSitemapUrl,
      isMissing: false,
      isUnreachable: true,
      isInvalid: false,
      error: `HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      status: 'unreachable',
      sitemapStatus: 'SITEMAP_UNABLE_TO_VERIFY',
      statusCode: null,
      urlCount: 0,
      isSitemapIndex: false,
      url: targetSitemapUrl,
      isMissing: false,
      isUnreachable: true,
      isInvalid: false,
      error: err.message
    };
  }
};

/**
 * Analyzes SEO parameters using the active Puppeteer Page object.
 * Inspects headings, tags, link paths, social tags, config files, and JSON-LD structured data.
 */
export const analyzeSEO = async (
  page: Page | null,
  puppeteerResult: PuppeteerScanResult | null
): Promise<SEOAnalysisResult> => {
  const errors: string[] = [];
  const warnings: SEOAnalysisWarning[] = [];
  const optimizationCandidates: SEOOptimizationCandidate[] = [];

  const emptyResult: SEOAnalysisResult = {
    summary: {
      seoScoreEstimate: 0,
      missingMetaDescription: true,
      missingTitle: true,
      missingCanonical: true,
      missingViewport: true,
      missingH1: true,
      multipleH1: false,
      headingHierarchyValid: true,
      openGraphCoverage: 0,
      twitterCardCoverage: 0,
      structuredDataPresence: false,
      structuredDataValid: false,
      robotsTxtStatus: 'missing',
      sitemapXmlStatus: 'missing',
      noindexDetected: false
    },
    seo: {
      pageTitle: null,
      metaDescription: null,
      metaKeywords: null,
      charset: null,
      viewport: null,
      canonicalUrl: null,
      metaRobots: null,
      openGraphTags: null,
      twitterCardTags: null,
      languageAttribute: null,
      headingStructure: null,
      internalLinks: null,
      externalLinks: null,
      brokenLinks: null,
      hasRobotsTxt: false,
      hasSitemapXml: false,
      structuredData: null,
      favicon: null
    },
    statistics: {
      titleLength: 0,
      descriptionLength: 0,
      headingsCount: null,
      linksCount: null
    },
    optimizationCandidates: [],
    warnings: [],
    errors: []
  };

  if (!puppeteerResult) {
    errors.push('No Puppeteer result provided.');
    return { ...emptyResult, errors };
  }

  if (puppeteerResult.errors && puppeteerResult.errors.length > 0) {
    errors.push(...puppeteerResult.errors);
  }

  const meta = puppeteerResult.metadata;
  const targetPageUrl = meta?.redirectUrl || meta?.url || (puppeteerResult.timings as any)?.navigationTiming?.name || (page ? page.url() : '') || '';
  let origin = '';
  try {
    if (targetPageUrl && targetPageUrl.startsWith('http')) {
      origin = new URL(targetPageUrl).origin;
    }
  } catch {
    // leave origin empty
  }

  let domData: any = {
    title: { value: '', selector: 'none', count: 0 },
    description: { value: '', selector: 'none', count: 0 },
    canonical: { value: '', selector: 'none', count: 0 },
    keywords: { value: '', selector: 'none' },
    charset: { value: '', selector: 'none' },
    viewport: { value: '', selector: 'none' },
    robots: { value: '', selector: 'none' },
    og: {},
    twitter: {},
    headingsList: [],
    internalLinks: [],
    externalLinks: [],
    hreflangs: [],
    languageAttribute: 'en',
    jsonLd: [],
    frameworkSignal: null
  };

  if (page) {
    try {
      domData = await page.evaluate(() => {
        const titleEls = Array.from(document.querySelectorAll('title'));
        const descEls = Array.from(document.querySelectorAll('meta[name="description"]'));
        const canonicalEls = Array.from(document.head ? document.head.querySelectorAll('link[rel="canonical"]') : document.querySelectorAll('link[rel="canonical"]'));
        const keywordsEl = document.querySelector('meta[name="keywords"]');
        const charsetEl = document.querySelector('meta[charset]') || document.querySelector('meta[http-equiv*="Content-Type"]');
        const viewportEl = document.querySelector('meta[name="viewport"]');
        const robotsEl = document.querySelector('meta[name="robots"]');

        // OG & Twitter Tags
        const og: Record<string, string> = {};
        document.querySelectorAll('meta[property^="og:" i], meta[name^="og:" i]').forEach(el => {
          const rawProp = el.getAttribute('property') || el.getAttribute('name');
          if (rawProp) {
            const prop = rawProp.toLowerCase();
            if (prop.startsWith('og:')) {
              og[prop] = el.getAttribute('content') || '';
            }
          }
        });

        const twitter: Record<string, string> = {};
        document.querySelectorAll('meta[name^="twitter:" i], meta[property^="twitter:" i]').forEach(el => {
          const rawName = el.getAttribute('name') || el.getAttribute('property');
          if (rawName) {
            const name = rawName.toLowerCase();
            if (name.startsWith('twitter:')) {
              twitter[name] = el.getAttribute('content') || '';
            }
          }
        });

        // Headings sequence in DOM order
        const headingsList: Array<{ tag: string; text: string; html: string }> = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
          headingsList.push({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || '',
            html: el.outerHTML.slice(0, 100)
          });
        });

        // Links
        const internal: string[] = [];
        const external: string[] = [];
        const currentOrigin = window.location.origin;
        document.querySelectorAll('a').forEach(el => {
          const href = el.getAttribute('href');
          if (href) {
            try {
              const resolved = new URL(href, currentOrigin).href;
              const isInternal = resolved.startsWith(currentOrigin) || href.startsWith('/') || href.startsWith('#');
              if (isInternal) {
                if (!internal.includes(resolved)) internal.push(resolved);
              } else {
                if (!external.includes(resolved)) external.push(resolved);
              }
            } catch {}
          }
        });

        // Hreflang alternates
        const hreflangs: Array<{ lang: string; href: string }> = [];
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => {
          const lang = el.getAttribute('hreflang');
          const href = el.getAttribute('href');
          if (lang && href) {
            hreflangs.push({ lang, href });
          }
        });

        // JSON-LD scripts
        const jsonLd: string[] = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
          const content = el.textContent?.trim();
          if (content) jsonLd.push(content);
        });

        // Framework Detection Signals in DOM / scripts
        let frameworkSignal: { name: string; evidence: string; confidence: 'verified' | 'inferred' } | null = null;
        if ((window as any).__NEXT_DATA__ || document.querySelector('script[src*="/_next/"]')) {
          frameworkSignal = { name: 'Next.js', evidence: 'Detected __NEXT_DATA__ or /_next/ scripts', confidence: 'verified' };
        } else if ((window as any).__NUXT__ || document.querySelector('script[src*="/_nuxt/"]')) {
          frameworkSignal = { name: 'Nuxt', evidence: 'Detected __NUXT__ or /_nuxt/ scripts', confidence: 'verified' };
        } else if (document.querySelector('astro-island') || document.querySelector('script[src*="/_astro/"]')) {
          frameworkSignal = { name: 'Astro', evidence: 'Detected <astro-island> component', confidence: 'verified' };
        } else if (document.querySelector('meta[name="generator"][content*="WordPress"]') || document.querySelector('link[href*="/wp-content/"]')) {
          frameworkSignal = { name: 'WordPress', evidence: 'Detected WordPress generator or /wp-content/ asset path', confidence: 'verified' };
        } else if (document.querySelector('script[src*="/@vite/client"]') || document.querySelector('script[type="module"][src*="/src/main"]')) {
          frameworkSignal = { name: 'Vite', evidence: 'Detected Vite HMR client or module script', confidence: 'verified' };
        }

        const primaryTitle = document.title || (titleEls[0] ? titleEls[0].textContent || '' : '');
        const primaryDesc = descEls[0] ? descEls[0].getAttribute('content') || '' : '';
        const primaryCanonical = canonicalEls[0] ? canonicalEls[0].getAttribute('href') || '' : '';
        const charsetVal = charsetEl ? charsetEl.getAttribute('charset') || (charsetEl.getAttribute('content')?.match(/charset=([^;]+)/i)?.[1] || '') : '';

        return {
          title: {
            value: primaryTitle,
            selector: titleEls.length > 0 ? 'head > title' : 'none',
            count: titleEls.length
          },
          description: {
            value: primaryDesc,
            selector: descEls.length > 0 ? 'meta[name="description"]' : 'none',
            count: descEls.length
          },
          canonical: {
            value: primaryCanonical,
            selector: canonicalEls.length > 0 ? 'link[rel="canonical"]' : 'none',
            count: canonicalEls.length
          },
          keywords: {
            value: keywordsEl ? keywordsEl.getAttribute('content') || '' : '',
            selector: keywordsEl ? 'meta[name="keywords"]' : 'none'
          },
          charset: {
            value: charsetVal || 'UTF-8',
            selector: charsetEl ? 'meta[charset]' : 'none'
          },
          viewport: {
            value: viewportEl ? viewportEl.getAttribute('content') || '' : '',
            selector: viewportEl ? 'meta[name="viewport"]' : 'none'
          },
          robots: {
            value: robotsEl ? robotsEl.getAttribute('content') || '' : '',
            selector: robotsEl ? 'meta[name="robots"]' : 'none'
          },
          og,
          twitter,
          headingsList,
          internalLinks: internal,
          externalLinks: external,
          hreflangs,
          languageAttribute: document.documentElement.lang || 'en',
          jsonLd,
          frameworkSignal
        };
      });
    } catch (err: any) {
      console.error(`[SEO Service DOM extraction error]: ${err.message}`);
      errors.push(`DOM Extraction Failed: ${err.message}`);
    }
  }

  // 1. Process Core Metadata
  const pageTitle = domData.title.value || meta?.title || null;
  const metaDescription = domData.description.value || meta?.metaDescription || null;
  const charset = domData.charset.value || 'UTF-8';
  const viewportStr = domData.viewport.value || (meta?.viewport ? `width=${meta.viewport.width}, height=${meta.viewport.height}` : null);
  const languageAttribute = domData.languageAttribute || meta?.language || 'en';

  // 2. Canonical Validation
  const canonicalCount = domData.canonical.count ?? (domData.canonical.value ? 1 : 0);
  const canonicalDetails = validateCanonicalUrl(domData.canonical.value, targetPageUrl, canonicalCount);
  const canonicalUrl = canonicalDetails.url;

  // 3. Headings Hierarchy
  const headingStructure = validateHeadingHierarchy(domData.headingsList);

  // 4. Structured Data
  const structuredDataDetails = validateJsonLdScripts(domData.jsonLd);

  // 5. Robots Meta
  const robotsMetaDetails = parseRobotsDirectives(domData.robots.value);

  // 6. Social Cards
  const socialCards = validateSocialCards(domData.og, domData.twitter);

  // 7. Verify robots.txt and sitemap.xml against actual domain origin
  let robotsTxtDetails: RobotsTxtDetails = {
    status: meta?.hasRobotsTxt ? 'verified_exists' : 'missing',
    statusCode: meta?.hasRobotsTxt ? 200 : 404,
    sitemaps: [],
    disallowCount: 0,
    allowCount: 0,
    isMissing: !meta?.hasRobotsTxt,
    isUnreachable: false,
    isInvalid: false
  };

  let sitemapXmlDetails: SitemapXmlDetails = {
    status: meta?.hasSitemapXml ? 'verified_exists' : 'missing',
    statusCode: meta?.hasSitemapXml ? 200 : 404,
    urlCount: meta?.hasSitemapXml ? 1 : 0,
    isSitemapIndex: false,
    url: origin ? `${origin}/sitemap.xml` : null,
    isMissing: !meta?.hasSitemapXml,
    isUnreachable: false,
    isInvalid: false
  };

  // Perform active verification if origin is a valid HTTP/HTTPS URL
  if (origin && origin.startsWith('http')) {
    try {
      const robotsRes = await fetchAndVerifyRobotsTxt(origin);
      robotsTxtDetails = robotsRes;
      const sitemapRes = await fetchAndVerifySitemapXml(origin, robotsRes.sitemaps);
      sitemapXmlDetails = sitemapRes;
    } catch {
      // Keep passive fallbacks if network fetch fails
    }
  }

  const hasRobotsTxt = robotsTxtDetails.status === 'verified_exists';
  const hasSitemapXml = sitemapXmlDetails.status === 'verified_exists';

  // 8. Hreflang Validation
  const hreflangs: HreflangTag[] = domData.hreflangs.map((h: any) => ({
    lang: h.lang,
    href: h.href,
    isValidLangCode: /^[a-z]{2}(-[a-z]{2,4})?$/i.test(h.lang) || h.lang === 'x-default'
  }));

  // 9. Detected Framework
  const detectedFramework: FrameworkSignal | null = domData.frameworkSignal;

  // 10. Summary & Scoring
  const missingTitle = !pageTitle || pageTitle.trim().length === 0;
  const missingMetaDescription = !metaDescription || metaDescription.trim().length === 0;
  const missingCanonical = canonicalDetails.isMissing;
  const missingViewport = !viewportStr || viewportStr.trim().length === 0;
  const missingH1 = !headingStructure.hasH1;
  const multipleH1 = headingStructure.multipleH1;

  const scoreExplanation = getSeoScoreExplanation({
    title: pageTitle,
    metaDescription,
    language: languageAttribute,
    viewport: viewportStr,
    canonicalValid: canonicalDetails.status === 'valid',
    hasH1: headingStructure.hasH1,
    hasRobotsTxt,
    hasSitemapXml,
    sitemapStatus: sitemapXmlDetails.sitemapStatus,
    sitemapAccessBlocked: sitemapXmlDetails.status === 'access_blocked',
    sitemapUnableToVerify: sitemapXmlDetails.status === 'unable_to_verify',
    noindex: robotsMetaDetails.noindex
  });
  const seoScoreEstimate = scoreExplanation.score;

  const titleStatus: SEOAnalysisSummary['titleStatus'] = missingTitle
    ? 'MISSING'
    : (pageTitle && pageTitle.length > 70 ? 'GUIDELINE_WARNING' : 'VALID');

  const metaDescriptionStatus: SEOAnalysisSummary['metaDescriptionStatus'] = missingMetaDescription
    ? 'MISSING'
    : (metaDescription && (metaDescription.length < 50 || metaDescription.length > 160) ? 'GUIDELINE_WARNING' : 'VALID');

  const canonicalStatus: SEOAnalysisSummary['canonicalStatus'] = canonicalDetails.canonicalState || (missingCanonical ? 'MISSING' : 'PRESENT_VALID');
  const structuredDataStatus: SEOAnalysisSummary['structuredDataStatus'] = structuredDataDetails.status;
  const sitemapStatus: SEOAnalysisSummary['sitemapStatus'] = sitemapXmlDetails.sitemapStatus || (hasSitemapXml ? 'SITEMAP_VALID' : 'SITEMAP_NOT_FOUND');

  const summary: SEOAnalysisSummary = {
    seoScoreEstimate,
    missingMetaDescription,
    missingTitle,
    missingCanonical,
    missingViewport,
    missingH1,
    multipleH1,
    headingHierarchyValid: headingStructure.isHierarchyValid,
    openGraphCoverage: socialCards.openGraph.coveragePercentage,
    twitterCardCoverage: socialCards.twitter.coveragePercentage,
    structuredDataPresence: structuredDataDetails.presence,
    structuredDataValid: structuredDataDetails.validCount > 0 && structuredDataDetails.syntaxErrors.length === 0,
    robotsTxtStatus: robotsTxtDetails.status,
    sitemapXmlStatus: sitemapXmlDetails.status,
    sitemapStatus,
    structuredDataStatus,
    canonicalStatus,
    titleStatus,
    metaDescriptionStatus,
    noindexDetected: robotsMetaDetails.noindex,
    scoreExplanation
  };

  const statistics: SEOAnalysisStatistics = {
    titleLength: pageTitle ? pageTitle.length : 0,
    descriptionLength: metaDescription ? metaDescription.length : 0,
    headingsCount: {
      h1: headingStructure.h1.length,
      h2: headingStructure.h2.length,
      h3: headingStructure.h3.length,
      h4: headingStructure.h4.length,
      h5: headingStructure.h5.length,
      h6: headingStructure.h6.length
    },
    linksCount: {
      internal: domData.internalLinks.length,
      external: domData.externalLinks.length,
      total: domData.internalLinks.length + domData.externalLinks.length
    }
  };

  // 11. Evidence-Based Warnings & Issues
  if (missingTitle) {
    warnings.push({
      code: 'SEO_NO_TITLE',
      message: 'Page title is missing. Search engines rely on <title> tags to understand page topic and generate search result headings.',
      severity: 'error',
      element: 'head > title',
      observed: 'No <title> tag found in rendered <head>',
      expected: 'One descriptive <title> tag (approximately 30 to 60 characters is a useful practical guideline)'
    });
  } else if (domData.title.count > 1) {
    warnings.push({
      code: 'SEO_DUPLICATE_TITLE',
      message: `${domData.title.count} <title> elements were found in the rendered document head.`,
      severity: 'warning',
      element: 'head > title',
      observed: `${domData.title.count} <title> tags detected in rendered DOM`,
      expected: 'Exactly one <title> element in document head'
    });
  } else if (pageTitle && pageTitle.length > 70) {
    warnings.push({
      code: 'SEO_TITLE_GUIDELINE_WARNING',
      message: `Page title is ${pageTitle.length} characters. This is slightly longer than the analyzer's preferred guideline (approximately 30 to 60 characters) and may be truncated in some search results. This is a presentation guideline recommendation rather than a validity failure.`,
      severity: 'info',
      element: 'head > title',
      observed: `"${pageTitle.slice(0, 60)}..." (${pageTitle.length} characters)`,
      expected: 'A concise title under 60-70 characters'
    });
  }

  if (missingMetaDescription) {
    warnings.push({
      code: 'SEO_NO_DESCRIPTION',
      message: 'No meta description was found in the rendered document head. Your page does not currently provide a description specifically written for search-result snippets.',
      severity: 'warning',
      element: 'meta[name="description"]',
      observed: 'No <meta name="description"> found in rendered <head>',
      expected: 'A page-specific meta description (approximately 120–160 characters is a useful practical guideline)'
    });
  } else if (domData.description.count > 1) {
    warnings.push({
      code: 'SEO_DUPLICATE_DESCRIPTION',
      message: `${domData.description.count} <meta name="description"> elements were found in the rendered document head.`,
      severity: 'warning',
      element: 'meta[name="description"]',
      observed: `${domData.description.count} meta description tags detected in rendered DOM`,
      expected: 'Exactly one <meta name="description"> element in document head'
    });
  } else if (metaDescription && metaDescription.length < 50) {
    warnings.push({
      code: 'SEO_DESC_GUIDELINE_WARNING',
      message: `Meta description is present (${metaDescription.length} characters), but is shorter than the analyzer's preferred guideline (approximately 120–160 characters). Search engines may choose to generate their own snippet from page content instead. This is a recommendation rather than a validity failure.`,
      severity: 'info',
      element: 'meta[name="description"]',
      observed: `"${metaDescription}" (${metaDescription.length} characters)`,
      expected: 'A summary of approximately 120–160 characters'
    });
  } else if (metaDescription && metaDescription.length > 160) {
    warnings.push({
      code: 'SEO_DESC_GUIDELINE_WARNING',
      message: `Meta description is present (${metaDescription.length} characters), but is longer than the analyzer's preferred guideline (approximately 120–160 characters) and may be truncated in search result previews. This is a recommendation rather than a validity failure.`,
      severity: 'info',
      element: 'meta[name="description"]',
      observed: `"${metaDescription.slice(0, 70)}..." (${metaDescription.length} characters)`,
      expected: 'A summary under 160 characters'
    });
  }

  if (missingH1) {
    warnings.push({
      code: 'SEO_NO_H1',
      message: 'Page does not contain an <h1> element. A primary H1 heading provides assistive tech and search engines with the main topic of the page.',
      severity: 'error',
      element: 'h1',
      observed: '0 <h1> elements found in rendered DOM',
      expected: 'At least one descriptive <h1> element per page'
    });
  }

  if (!headingStructure.isHierarchyValid && headingStructure.skippedLevels.length > 0) {
    const skip = headingStructure.skippedLevels[0];
    warnings.push({
      code: 'SEO_HEADING_HIERARCHY_SKIP',
      message: `Heading levels are skipped (${skip.from.toUpperCase()} followed directly by ${skip.to.toUpperCase()}). Headings should follow logical sequential nesting without jumping levels.`,
      severity: 'info',
      element: skip.to,
      observed: `Jumped from <${skip.from}> directly to <${skip.to}> ("${skip.text}")`,
      expected: 'Sequential heading structure (e.g. H1 followed by H2, then H3)'
    });
  }

  const robotsTarget = origin ? `${origin}/robots.txt` : '/robots.txt';
  const sitemapTarget = sitemapXmlDetails.url || (origin ? `${origin}/sitemap.xml` : '/sitemap.xml');

  if (canonicalDetails.status === 'duplicate') {
    warnings.push({
      code: 'SEO_CANONICAL_DUPLICATE',
      message: `${canonicalCount} canonical elements were found in the document head. Search engines require a single authoritative canonical declaration.`,
      severity: 'warning',
      element: 'link[rel="canonical"]',
      observed: `${canonicalCount} canonical elements detected in document head`,
      expected: 'Exactly one <link rel="canonical"> element in document head'
    });
  } else if (missingCanonical) {
    warnings.push({
      code: 'SEO_NO_CANONICAL',
      message: 'No canonical URL was found in the rendered document head. Canonical declarations tell search crawlers the preferred URL to index.',
      severity: 'warning',
      element: 'link[rel="canonical"]',
      observed: 'No <link rel="canonical"> element was found in the rendered document head.',
      expected: 'One intended <link rel="canonical" href="..."> declaration in <head>'
    });
  } else if (canonicalDetails.status === 'relative') {
    warnings.push({
      code: 'SEO_CANONICAL_RELATIVE',
      message: `The canonical URL is declared as a relative path ("${canonicalDetails.url}"). Search engines require an absolute canonical URL including protocol and hostname.`,
      severity: 'warning',
      element: 'link[rel="canonical"]',
      observed: canonicalDetails.url,
      expected: origin ? `An absolute URL (e.g. ${origin}${canonicalDetails.url?.startsWith('/') ? '' : '/'}${canonicalDetails.url || ''})` : 'An absolute URL including protocol and domain'
    });
  } else if (canonicalDetails.status === 'mismatch') {
    warnings.push({
      code: 'SEO_CANONICAL_MISMATCH',
      message: canonicalDetails.error || 'The canonical URL points to a different domain than the page being analyzed.',
      severity: 'warning',
      element: 'link[rel="canonical"]',
      observed: canonicalDetails.url,
      expected: origin ? `Authoritative URL on ${origin}` : 'Authoritative URL matching target origin'
    });
  }

  if (missingViewport) {
    warnings.push({
      code: 'SEO_NO_VIEWPORT',
      message: 'Viewport meta tag is missing. Mobile browsers will render pages at desktop width, causing layout breakage and poor mobile search rankings.',
      severity: 'error',
      element: 'meta[name="viewport"]',
      observed: 'No <meta name="viewport"> found in rendered <head>',
      expected: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    });
  }

  if (robotsMetaDetails.noindex) {
    warnings.push({
      code: 'SEO_ROBOTS_NOINDEX',
      message: 'Active "noindex" directive detected in robots meta tag. Search engines are explicitly instructed NOT to index this page in search results.',
      severity: 'error',
      element: 'meta[name="robots"]',
      observed: robotsMetaDetails.content,
      expected: 'Omit "noindex" directive if this page is intended for public search indexing'
    });
  }

  if (structuredDataDetails.syntaxErrors.length > 0) {
    const firstErr = structuredDataDetails.syntaxErrors[0];
    warnings.push({
      code: 'SEO_STRUCTURED_DATA_SYNTAX_ERROR',
      message: `JSON-LD structured data script contains a syntax error: ${firstErr.error}. Search engine rich snippet parsers will fail to parse this block.`,
      severity: 'error',
      element: 'script[type="application/ld+json"]',
      observed: firstErr.rawSnippet,
      expected: 'Valid JSON-LD Schema.org markup syntax'
    });
  }

  if (robotsTxtDetails.status === 'unreachable') {
    warnings.push({
      code: 'SEO_ROBOTS_TXT_UNREACHABLE',
      message: `robots.txt is unreachable (${robotsTxtDetails.snippet || 'server error/timeout'}). Search crawlers that encounter server errors on robots.txt will often postpone crawling the site.`,
      severity: 'warning',
      element: robotsTarget,
      observed: robotsTxtDetails.snippet,
      expected: 'Accessible robots.txt responding with HTTP 200 or clean HTTP 404'
    });
  } else if (robotsTxtDetails.status === 'invalid') {
    warnings.push({
      code: 'SEO_ROBOTS_TXT_INVALID',
      message: 'robots.txt returned an HTML response instead of plain text. Single Page Apps often incorrectly route 404s to an index.html file with a 200 status code.',
      severity: 'warning',
      element: robotsTarget,
      observed: 'HTTP 200 with HTML markup',
      expected: 'Plain text robots.txt rules or clean HTTP 404 status'
    });
  }

  if (sitemapXmlDetails.status === 'access_blocked') {
    warnings.push({
      code: 'SEO_SITEMAP_ACCESS_BLOCKED',
      message: `Sitemap access was blocked when PerfLens tried to retrieve ${sitemapTarget}. Verify that the sitemap is publicly accessible to search-engine crawlers and that access rules are not blocking legitimate crawler requests.`,
      severity: 'info',
      element: sitemapTarget,
      observed: 'HTTP 403 Forbidden',
      expected: 'Publicly accessible sitemap endpoint for search-engine crawlers'
    });
  } else if (sitemapXmlDetails.status === 'invalid') {
    warnings.push({
      code: 'SEO_SITEMAP_INVALID',
      message: 'Sitemap XML returned invalid or non-XML content. Search engines will reject this sitemap file.',
      severity: 'warning',
      element: sitemapTarget,
      observed: sitemapXmlDetails.error || 'Non-XML response',
      expected: 'Valid XML containing <urlset> or <sitemapindex>'
    });
  }

  // 12. Build Optimization Candidates
  warnings.forEach(warn => {
    optimizationCandidates.push({
      url: targetPageUrl,
      type: 'seo',
      estimatedSizeReductionKb: 0,
      suggestion: `${warn.message} [Element: ${warn.element || 'head'}, Observed: ${JSON.stringify(warn.observed || '')}]`,
      isIssue: warn.severity === 'error' || warn.severity === 'warning'
    });
  });

  const seoDetails: SEOAnalysisDetails & {
    title: string | null;
    description: string | null;
    canonical: string | null;
    sitemap: string | null;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  } = {
    pageTitle,
    metaDescription,
    title: pageTitle,
    description: metaDescription,
    canonical: canonicalUrl,
    sitemap: hasSitemapXml ? 'Verified' : sitemapXmlDetails.status === 'missing' ? 'Missing' : sitemapXmlDetails.status === 'access_blocked' ? 'Access Blocked (HTTP 403)' : sitemapXmlDetails.status,
    metaKeywords: domData.keywords.value ? domData.keywords.value.split(',').map((k: string) => k.trim()) : null,
    charset,
    viewport: viewportStr,
    canonicalUrl,
    metaRobots: domData.robots.value || null,
    openGraphTags: Object.keys(domData.og).length > 0 ? domData.og : null,
    twitterCardTags: Object.keys(domData.twitter).length > 0 ? domData.twitter : null,
    languageAttribute,
    headingStructure,
    headingsHierarchy: headingStructure,
    internalLinks: domData.internalLinks,
    externalLinks: domData.externalLinks,
    brokenLinks: [],
    hasRobotsTxt,
    hasSitemapXml,
    robotsTxtDetails,
    sitemapXmlDetails,
    canonicalDetails,
    structuredDataDetails,
    robotsMetaDetails,
    robotsMeta: robotsMetaDetails,
    hreflangs,
    socialCards,
    openGraph: socialCards.openGraph,
    twitterCard: socialCards.twitter,
    detectedFramework,
    structuredData: structuredDataDetails.schemas,
    favicon: meta?.faviconUrl || null,
    ogTitle: socialCards.openGraph.title || '',
    ogDescription: socialCards.openGraph.description || '',
    ogImage: socialCards.openGraph.image || '',
    seoScoreExplanation: scoreExplanation
  };

  return {
    summary,
    seo: seoDetails,
    statistics,
    optimizationCandidates,
    warnings,
    errors,
    validationEvidence: domData
  };
};
