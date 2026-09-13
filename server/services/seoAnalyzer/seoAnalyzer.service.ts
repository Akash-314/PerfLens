import { Page } from 'puppeteer';
import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  SEOAnalysisResult,
  SEOAnalysisSummary,
  SEOAnalysisDetails,
  SEOAnalysisStatistics,
  SEOAnalysisWarning,
  SEOOptimizationCandidate,
  SEOHeadings
} from './types.js';
import { calculateSeoScore } from './helpers.js';

/**
 * Analyzes SEO parameters using the active Puppeteer Page object.
 * Inspects headings, tags, link paths, social tags, and config files.
 * 
 * @param page Active Puppeteer page instance
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns SEOAnalysisResult object conforming to the unified analyzer schema
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
      openGraphCoverage: 0,
      twitterCardCoverage: 0,
      structuredDataPresence: false
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
  if (!meta || !page) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No active browser tab found for SEO extraction.']
    };
  }

  let domData: any = {
    title: { value: '', selector: 'none', html: '' },
    description: { value: '', selector: 'none', html: '' },
    canonical: { value: '', selector: 'none', html: '' },
    keywords: { value: '', selector: 'none', html: '' },
    charset: { value: '', selector: 'none', html: '' },
    viewport: { value: '', selector: 'none', html: '' },
    robots: { value: '', selector: 'none', html: '' },
    og: {},
    twitter: {},
    headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
    internalLinks: [],
    externalLinks: [],
    languageAttribute: 'en',
    jsonLd: [],
    headingsDetails: []
  };

  try {
    domData = await page.evaluate(() => {
      const titleEl = document.querySelector('title');
      const descEl = document.querySelector('meta[name="description"]');
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      const keywordsEl = document.querySelector('meta[name="keywords"]');
      const charsetEl = document.querySelector('meta[charset]');
      const viewportEl = document.querySelector('meta[name="viewport"]');
      const robotsEl = document.querySelector('meta[name="robots"]');

      // OG & Twitter Tags
      const og: Record<string, string> = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(el => {
        const prop = el.getAttribute('property');
        if (prop) og[prop] = el.getAttribute('content') || '';
      });

      const twitter: Record<string, string> = {};
      document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
        const name = el.getAttribute('name');
        if (name) twitter[name] = el.getAttribute('content') || '';
      });

      // Headings
      const h1 = Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim() || '');
      const h2 = Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim() || '');
      const h3 = Array.from(document.querySelectorAll('h3')).map(el => el.textContent?.trim() || '');
      const h4 = Array.from(document.querySelectorAll('h4')).map(el => el.textContent?.trim() || '');
      const h5 = Array.from(document.querySelectorAll('h5')).map(el => el.textContent?.trim() || '');
      const h6 = Array.from(document.querySelectorAll('h6')).map(el => el.textContent?.trim() || '');

      const headingsDetails: any[] = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        headingsDetails.push({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim() || '',
          html: el.outerHTML
        });
      });

      // Links
      const internal: string[] = [];
      const external: string[] = [];
      const origin = window.location.origin;
      document.querySelectorAll('a').forEach(el => {
        const href = el.getAttribute('href');
        if (href) {
          try {
            const resolved = new URL(href, origin).href;
            const isInternal = resolved.startsWith(origin) || href.startsWith('/') || href.startsWith('#');
            if (isInternal) {
              if (!internal.includes(resolved)) internal.push(resolved);
            } else {
              if (!external.includes(resolved)) external.push(resolved);
            }
          } catch {}
        }
      });

      // JSON-LD
      const jsonLd: string[] = [];
      document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
        jsonLd.push(el.textContent?.trim() || '');
      });

      return {
        title: {
          value: document.title || (titleEl ? titleEl.textContent || '' : ''),
          selector: titleEl ? 'head > title' : 'none',
          html: titleEl ? titleEl.outerHTML : ''
        },
        description: {
          value: descEl ? descEl.getAttribute('content') || '' : '',
          selector: descEl ? 'meta[name="description"]' : 'none',
          html: descEl ? descEl.outerHTML : ''
        },
        canonical: {
          value: canonicalEl ? canonicalEl.getAttribute('href') || '' : '',
          selector: canonicalEl ? 'link[rel="canonical"]' : 'none',
          html: canonicalEl ? canonicalEl.outerHTML : ''
        },
        keywords: {
          value: keywordsEl ? keywordsEl.getAttribute('content') || '' : '',
          selector: keywordsEl ? 'meta[name="keywords"]' : 'none',
          html: keywordsEl ? keywordsEl.outerHTML : ''
        },
        charset: {
          value: charsetEl ? charsetEl.getAttribute('charset') || '' : '',
          selector: charsetEl ? 'meta[charset]' : 'none',
          html: charsetEl ? charsetEl.outerHTML : ''
        },
        viewport: {
          value: viewportEl ? viewportEl.getAttribute('content') || '' : '',
          selector: viewportEl ? 'meta[name="viewport"]' : 'none',
          html: viewportEl ? viewportEl.outerHTML : ''
        },
        robots: {
          value: robotsEl ? robotsEl.getAttribute('content') || '' : '',
          selector: robotsEl ? 'meta[name="robots"]' : 'none',
          html: robotsEl ? robotsEl.outerHTML : ''
        },
        og,
        twitter,
        headings: { h1, h2, h3, h4, h5, h6 },
        internalLinks: internal,
        externalLinks: external,
        languageAttribute: document.documentElement.lang || 'en',
        jsonLd,
        headingsDetails
      };
    });
  } catch (err: any) {
    console.error(`[SEO Service DOM extraction error]: ${err.message}`);
    errors.push(`DOM Extraction Failed: ${err.message}`);
  }

  // 1. Populate details
  const pageTitle = domData.title.value || meta.title || null;
  const metaDescription = domData.description.value || meta.metaDescription || null;
  const canonicalUrl = domData.canonical.value || null;
  const metaKeywords = domData.keywords.value ? domData.keywords.value.split(',').map((k: string) => k.trim()) : null;
  const charset = domData.charset.value || 'UTF-8';
  const viewportStr = domData.viewport.value || (meta.viewport ? `width=${meta.viewport.width}, height=${meta.viewport.height}` : null);
  const metaRobots = domData.robots.value || null;
  const openGraphTags = Object.keys(domData.og).length > 0 ? domData.og : null;
  const twitterCardTags = Object.keys(domData.twitter).length > 0 ? domData.twitter : null;
  const languageAttribute = domData.languageAttribute || meta.language || null;
  const headingStructure: SEOHeadings = domData.headings;
  const internalLinks = domData.internalLinks;
  const externalLinks = domData.externalLinks;
  const structuredData = domData.jsonLd.length > 0 ? domData.jsonLd.map((s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }) : null;
  
  const hasRobotsTxt = !!meta.hasRobotsTxt;
  const hasSitemapXml = !!meta.hasSitemapXml;
  const favicon = meta.faviconUrl || null;

  // Realignment variables for frontend AppContext mapping compatibility
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
    sitemap: hasSitemapXml ? 'Verified' : 'Missing',
    metaKeywords,
    charset,
    viewport: viewportStr,
    canonicalUrl,
    metaRobots,
    openGraphTags,
    twitterCardTags,
    languageAttribute,
    headingStructure,
    internalLinks,
    externalLinks,
    brokenLinks: [],
    hasRobotsTxt,
    hasSitemapXml,
    structuredData,
    favicon,
    ogTitle: domData.og['og:title'] || '',
    ogDescription: domData.og['og:description'] || '',
    ogImage: domData.og['og:image'] || ''
  };

  // 2. Compute Summary
  const domExtractionFailed = errors.some(e => e.includes('DOM Extraction Failed'));
  const missingTitle = domExtractionFailed ? false : (!pageTitle || pageTitle.trim().length === 0);
  const missingMetaDescription = domExtractionFailed ? false : (!metaDescription || metaDescription.trim().length === 0);
  const missingCanonical = domExtractionFailed ? false : !canonicalUrl;
  const missingViewport = domExtractionFailed ? false : !viewportStr;
  const missingH1 = domExtractionFailed ? false : (headingStructure?.h1 ? headingStructure.h1.length === 0 : false);
  const multipleH1 = domExtractionFailed ? false : (headingStructure?.h1 ? headingStructure.h1.length > 1 : false);

  // Calculate OG & Twitter Card coverage percentage
  const expectedOg = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const expectedTwitter = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  let matchedOg = 0;
  let matchedTwitter = 0;

  expectedOg.forEach(tag => {
    if (domData.og[tag]) matchedOg++;
  });
  expectedTwitter.forEach(tag => {
    if (domData.twitter[tag]) matchedTwitter++;
  });

  const openGraphCoverage = Math.round((matchedOg / expectedOg.length) * 100);
  const twitterCardCoverage = Math.round((matchedTwitter / expectedTwitter.length) * 100);
  const structuredDataPresence = structuredData !== null && structuredData.length > 0;

  const seoScoreEstimate = calculateSeoScore({
    title: pageTitle,
    metaDescription,
    language: languageAttribute,
    viewport: meta.viewport,
    hasRobotsTxt,
    hasSitemapXml
  });

  const summary: SEOAnalysisSummary = {
    seoScoreEstimate,
    missingMetaDescription,
    missingTitle,
    missingCanonical,
    missingViewport,
    missingH1,
    multipleH1,
    openGraphCoverage,
    twitterCardCoverage,
    structuredDataPresence
  };

  // 3. Compute Statistics
  const hCount = headingStructure;
  const statistics: SEOAnalysisStatistics = {
    titleLength: pageTitle ? pageTitle.length : 0,
    descriptionLength: metaDescription ? metaDescription.length : 0,
    headingsCount: {
      h1: hCount.h1.length,
      h2: hCount.h2.length,
      h3: hCount.h3.length,
      h4: hCount.h4.length,
      h5: hCount.h5.length,
      h6: hCount.h6.length
    },
    linksCount: {
      internal: internalLinks.length,
      external: externalLinks.length,
      total: internalLinks.length + externalLinks.length
    }
  };

  // 4. Generate Warnings & Evidence Mode findings
  if (missingTitle) {
    warnings.push({
      code: 'SEO_NO_TITLE',
      message: 'Page title is missing. Defining a unique title is critical for search engine page indexing and rankings.',
      severity: 'error'
    });
  }

  if (missingMetaDescription) {
    warnings.push({
      code: 'SEO_NO_DESCRIPTION',
      message: 'Meta description tag is missing. Meta descriptions represent the default summary snippet on search engine listings.',
      severity: 'warning'
    });
  }

  if (missingCanonical) {
    warnings.push({
      code: 'SEO_NO_CANONICAL',
      message: 'Canonical URL link tag is missing. Canonical indicators eliminate duplicate indexing penalty risks.',
      severity: 'warning'
    });
  }

  if (missingViewport) {
    warnings.push({
      code: 'SEO_NO_VIEWPORT',
      message: 'Viewport meta tag is missing. Responsive layouts require correct scaling instructions.',
      severity: 'error'
    });
  }

  if (missingH1) {
    warnings.push({
      code: 'SEO_NO_TITLE', // mapped code
      message: 'HTML H1 element is missing. Headings provide screen readers and search crawlers with semantic outlines of the page.',
      severity: 'error'
    } as any);
  } else if (multipleH1) {
    warnings.push({
      code: 'SEO_MULTIPLE_H1',
      message: `Multiple H1 elements detected (${headingStructure.h1.length}). Each page should contain exactly one primary H1 header.`,
      severity: 'warning'
    });
  }

  if (openGraphCoverage < 60) {
    warnings.push({
      code: 'SEO_NO_OG_TAGS',
      message: `Open Graph tags coverage is low (${openGraphCoverage}%). Social media shares require OG metadata to compile rich listings.`,
      severity: 'info'
    });
  }

  if (!structuredDataPresence) {
    warnings.push({
      code: 'SEO_NO_STRUCTURED_DATA',
      message: 'JSON-LD Structured Data script missing. Providing Schema.org markup assists rich search snippet cards compiler.',
      severity: 'info'
    });
  }

  // 5. Build Optimization Candidates
  const targetUrl = meta.url || 'website';
  warnings.forEach((warn) => {
    let selector = 'none';
    let html = '';
    let val = 'Missing';

    if (warn.code === 'SEO_NO_TITLE' && !missingTitle) {
      selector = domData.title.selector;
      html = domData.title.html;
      val = domData.title.value;
    } else if (warn.code === 'SEO_NO_DESCRIPTION' && !missingMetaDescription) {
      selector = domData.description.selector;
      html = domData.description.html;
      val = domData.description.value;
    }

    optimizationCandidates.push({
      url: targetUrl,
      type: 'seo',
      estimatedSizeReductionKb: 0,
      suggestion: `${warn.message} [Evidence: Selector='${selector}', Value='${val}', Source='${html}']`,
      isIssue: warn.severity === 'error' || warn.severity === 'warning'
    });
  });

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
