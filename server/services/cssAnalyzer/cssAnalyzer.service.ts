import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  CSSStylesheetItem,
  CSSAnalysisSummary,
  CSSAnalysisStatistics,
  CSSAnalysisWarning,
  CSSOptimizationCandidate,
  CSSAnalysisResult
} from './types.js';
import {
  isStylesheetMinified,
  isRenderBlockingCSS,
  estimateUnusedCSS,
  checkCriticalCssCandidate
} from './helpers.js';

/**
 * Analyzes the CSS stylesheets discovered in a website scan.
 * Operating solely on network resource records, it identifies minification, caching,
 * render-blocking rules, duplication, and unused code estimations.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns CSSAnalysisResult object containing summary, stylesheets, stats, optimization candidates, warnings, and errors.
 */
export const analyzeCSS = (
  puppeteerResult: PuppeteerScanResult | null
): CSSAnalysisResult => {
  const errors: string[] = [];
  const stylesheets: CSSStylesheetItem[] = [];
  const warnings: CSSAnalysisWarning[] = [];
  const optimizationCandidates: CSSOptimizationCandidate[] = [];

  const emptyResult: CSSAnalysisResult = {
    summary: {
      totalCSSFiles: 0,
      largestCSSFile: null,
      totalCSSWeight: 0,
      estimatedUnusedCSS: 0,
      duplicateStylesheets: 0,
      renderBlockingCSS: 0,
      inlineCSSCount: 0,
      externalCSSCount: 0
    },
    stylesheets: [],
    statistics: {
      countByMinified: { minified: 0, unminified: 0 },
      sizeByMinifiedKb: { minified: 0, unminified: 0 },
      countByCompression: { brotli: 0, gzip: 0, none: 0 },
      averageSizeKb: 0
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

  const resources = puppeteerResult.resources || [];
  const cssResources = resources.filter((res) => res.type === 'css');

  if (cssResources.length === 0) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No CSS resources found.']
    };
  }

  // Count stylesheet URL occurrences to flag duplicates
  const urlCountMap = new Map<string, number>();
  cssResources.forEach((res) => {
    urlCountMap.set(res.url, (urlCountMap.get(res.url) || 0) + 1);
  });

  let largestCSSFile: { url: string; sizeKb: number } | null = null;
  let totalCSSWeight = 0;
  let estimatedUnusedCSS = 0;
  let duplicateCount = 0;
  let renderBlockingCount = 0;
  let inlineCount = 0;
  let externalCount = 0;

  // Breakdown metrics
  let minifiedCount = 0;
  let unminifiedCount = 0;
  let minifiedSizeKb = 0;
  let unminifiedSizeKb = 0;
  let brotliCount = 0;
  let gzipCount = 0;
  let noneCount = 0;

  cssResources.forEach((res) => {
    const filename = res.url.split('/').pop()?.split('?')[0] || 'style.css';
    
    // Check minification, render-blocking, and unused CSS estimations
    const isMinified = isStylesheetMinified(res.url);
    const isRenderBlocking = isRenderBlockingCSS(res.sizeKb, res.cacheControl);
    const unusedCssKb = estimateUnusedCSS(res.sizeKb);
    const isCriticalCandidate = checkCriticalCssCandidate(res.sizeKb, isRenderBlocking);
    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;

    // Track aggregates
    if (!largestCSSFile || res.sizeKb > largestCSSFile.sizeKb) {
      largestCSSFile = { url: res.url, sizeKb: res.sizeKb };
    }
    totalCSSWeight += res.sizeKb;
    estimatedUnusedCSS += unusedCssKb;
    if (isDuplicate) duplicateCount++;
    if (isRenderBlocking) renderBlockingCount++;
    
    // All network request stylesheets are external.
    const isInline = false;
    if (isInline) {
      inlineCount++;
    } else {
      externalCount++;
    }

    // Breakdown for statistics
    if (isMinified) {
      minifiedCount++;
      minifiedSizeKb += res.sizeKb;
    } else {
      unminifiedCount++;
      unminifiedSizeKb += res.sizeKb;
    }

    if (res.compression === 'brotli') brotliCount++;
    else if (res.compression === 'gzip') gzipCount++;
    else noneCount++;

    const item: CSSStylesheetItem = {
      url: res.url,
      filename,
      isInline,
      fileSizeKb: res.sizeKb,
      transferSizeKb: res.transferSizeKb,
      statusCode: res.statusCode,
      mimeType: res.contentType,
      compression: res.compression,
      cacheControl: res.cacheControl,
      isMinified,
      isDuplicate,
      isRenderBlocking,
      // DOM-specific configurations default to null (unknown/not detectable from network logs)
      hasAtImport: null,
      hasMediaQueries: null,
      hasCssVariables: null,
      estimatedUnusedCssKb: unusedCssKb,
      isCriticalCssCandidate: isCriticalCandidate
    };

    stylesheets.push(item);

    // Build warnings
    if (!isMinified) {
      warnings.push({
        code: 'CSS_NOT_MINIFIED',
        message: `Stylesheet "${filename}" is not minified. Minifying stylesheet rules can reduce size and speed up CSS parsing.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (isDuplicate) {
      warnings.push({
        code: 'CSS_DUPLICATE_LOAD',
        message: `Stylesheet "${filename}" is loaded multiple times. Consolidate your asset imports.`,
        severity: 'error',
        url: res.url
      });
    }

    if (isRenderBlocking) {
      warnings.push({
        code: 'CSS_RENDER_BLOCKING',
        message: `Stylesheet "${filename}" blocks the initial page render. Consider inlining critical styles or loading this file asynchronously.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (res.compression === 'none' && res.sizeKb > 10) {
      warnings.push({
        code: 'CSS_NO_COMPRESSION',
        message: `Stylesheet "${filename}" is not compressed. Enable Gzip or Brotli compression on your server.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (unusedCssKb > 20) {
      warnings.push({
        code: 'CSS_HIGH_UNUSED',
        message: `Stylesheet "${filename}" has an estimated ${unusedCssKb}KB of unused styles. Purge unused selectors to trim weight.`,
        severity: 'info',
        url: res.url
      });
    }

    // Build optimization candidate
    let estimatedSizeReductionKb = 0;
    let suggestionsList: string[] = [];

    if (!isMinified) {
      const minificationSavings = parseFloat((res.sizeKb * 0.15).toFixed(1));
      estimatedSizeReductionKb += minificationSavings;
      suggestionsList.push('minify code');
    }

    if (unusedCssKb > 10) {
      estimatedSizeReductionKb += unusedCssKb;
      suggestionsList.push('purge unused classes');
    }

    if (res.compression === 'none') {
      const compressionSavings = parseFloat((res.sizeKb * 0.60).toFixed(1));
      estimatedSizeReductionKb += compressionSavings;
      suggestionsList.push('enable brotli/gzip compression');
    }

    if (isDuplicate) {
      estimatedSizeReductionKb += res.sizeKb;
      suggestionsList.push('remove duplicate requests');
    }

    estimatedSizeReductionKb = parseFloat(Math.min(res.sizeKb, estimatedSizeReductionKb).toFixed(1));

    if (estimatedSizeReductionKb > 0 || isRenderBlocking || isDuplicate) {
      optimizationCandidates.push({
        url: res.url,
        type: 'css',
        sizeKb: res.sizeKb,
        estimatedUnusedCssKb: unusedCssKb,
        isRenderBlocking,
        isMinified,
        isDuplicate,
        estimatedSizeReductionKb,
        suggestion: suggestionsList.length > 0
          ? `Optimize stylesheet by: ${suggestionsList.join(', ')}.`
          : isRenderBlocking
            ? 'Inline critical styles and load this stylesheet asynchronously.'
            : 'Consolidate styles.'
      });
    }
  });

  const totalCSSFiles = stylesheets.length;

  const summary: CSSAnalysisSummary = {
    totalCSSFiles,
    largestCSSFile,
    totalCSSWeight: parseFloat(totalCSSWeight.toFixed(1)),
    estimatedUnusedCSS: parseFloat(estimatedUnusedCSS.toFixed(1)),
    duplicateStylesheets: duplicateCount,
    renderBlockingCSS: renderBlockingCount,
    inlineCSSCount: inlineCount,
    externalCSSCount: externalCount
  };

  const statistics: CSSAnalysisStatistics = {
    countByMinified: {
      minified: minifiedCount,
      unminified: unminifiedCount
    },
    sizeByMinifiedKb: {
      minified: parseFloat(minifiedSizeKb.toFixed(1)),
      unminified: parseFloat(unminifiedSizeKb.toFixed(1))
    },
    countByCompression: {
      brotli: brotliCount,
      gzip: gzipCount,
      none: noneCount
    },
    averageSizeKb: totalCSSFiles > 0 ? parseFloat((totalCSSWeight / totalCSSFiles).toFixed(1)) : 0
  };

  return {
    summary,
    stylesheets,
    statistics,
    optimizationCandidates,
    warnings,
    errors
  };
};
