import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  SEOAnalysisResult,
  SEOAnalysisSummary,
  SEOAnalysisDetails,
  SEOAnalysisStatistics,
  SEOAnalysisWarning,
  SEOOptimizationCandidate
} from './types.js';
import { calculateSeoScore } from './helpers.js';

/**
 * Analyzes SEO parameters using the output from the Puppeteer service.
 * Inspects metadata, page description, and presence of config files like robots.txt.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns SEOAnalysisResult object conforming to the unified analyzer schema
 */
export const analyzeSEO = (
  puppeteerResult: PuppeteerScanResult | null
): SEOAnalysisResult => {
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

  if (!meta) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No metadata found in Puppeteer result.']
    };
  }

  // 1. Extract details from Puppeteer metadata
  const pageTitle = meta.title || null;
  const metaDescription = meta.metaDescription || null;
  
  // Viewport is saved as width/height object or null
  const viewportStr = meta.viewport 
    ? `width=${meta.viewport.width}, height=${meta.viewport.height}`
    : null;

  const hasRobotsTxt = !!meta.hasRobotsTxt;
  const hasSitemapXml = !!meta.hasSitemapXml;
  const favicon = meta.faviconUrl || null;
  const languageAttribute = meta.language || null;

  // Un-extractable properties from network logs/limited scan default to null/empty
  const metaKeywords = null;
  const charset = 'UTF-8'; // standard default
  const canonicalUrl = null;
  const metaRobots = null;
  const openGraphTags = null;
  const twitterCardTags = null;
  const headingStructure = null;
  const internalLinks = null;
  const externalLinks = null;
  const brokenLinks = null;
  const structuredData = null;

  const seoDetails: SEOAnalysisDetails = {
    pageTitle,
    metaDescription,
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
    brokenLinks,
    hasRobotsTxt,
    hasSitemapXml,
    structuredData,
    favicon
  };

  // 2. Compute Summary
  const missingTitle = !pageTitle || pageTitle.trim().length === 0;
  const missingMetaDescription = !metaDescription || metaDescription.trim().length === 0;
  const missingCanonical = !canonicalUrl;
  const missingViewport = !viewportStr;
  const missingH1 = true; // default since we don't have DOM H1s
  const multipleH1 = false;

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
    openGraphCoverage: 0,
    twitterCardCoverage: 0,
    structuredDataPresence: false
  };

  // 3. Compute Statistics
  const statistics: SEOAnalysisStatistics = {
    titleLength: pageTitle ? pageTitle.length : 0,
    descriptionLength: metaDescription ? metaDescription.length : 0,
    headingsCount: null,
    linksCount: null
  };

  // 4. Generate Warnings
  if (missingTitle) {
    warnings.push({
      code: 'SEO_NO_TITLE',
      message: 'Page title is missing. Titles are critical for search engine rankings and tab descriptions.',
      severity: 'error'
    });
  }

  if (missingMetaDescription) {
    warnings.push({
      code: 'SEO_NO_DESCRIPTION',
      message: 'Meta description tag is missing. Descriptions summarize page contents in search engine results snippets.',
      severity: 'warning'
    });
  }

  if (missingCanonical) {
    warnings.push({
      code: 'SEO_NO_CANONICAL',
      message: 'Canonical URL link tag is missing. A canonical link avoids duplicate content penalty risks.',
      severity: 'warning'
    });
  }

  if (missingViewport) {
    warnings.push({
      code: 'SEO_NO_VIEWPORT',
      message: 'Viewport meta tag is missing. Viewport specifications ensure correct mobile layout responsiveness.',
      severity: 'error'
    });
  }

  // OG tags & Structured Data are missing due to limited scanner capabilities
  warnings.push({
    code: 'SEO_NO_OG_TAGS',
    message: 'Open Graph (OG) social tags are missing. Open Graph tags ensure links look rich when shared on social networks.',
    severity: 'info'
  });

  warnings.push({
    code: 'SEO_NO_STRUCTURED_DATA',
    message: 'Structured Data schema markup is missing. Schema markup helps search engines parse and display rich snippets.',
    severity: 'info'
  });

  // 5. Build Optimization Candidates
  const targetUrl = meta.url || 'website';
  warnings.forEach((warn) => {
    optimizationCandidates.push({
      url: targetUrl,
      type: 'seo',
      estimatedSizeReductionKb: 0,
      suggestion: warn.message,
      isIssue: warn.severity === 'error' || warn.severity === 'warning'
    });
  });

  return {
    summary,
    seo: seoDetails,
    statistics,
    optimizationCandidates,
    warnings,
    errors
  };
};
