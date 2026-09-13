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
  checkCriticalCssCandidate
} from './helpers.js';

/**
 * Analyzes the CSS stylesheets discovered in a website scan.
 * Uses real CSS coverage profiles to compute exact unused byte sizes.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns CSSAnalysisResult object containing summary, stylesheets, stats, optimization candidates, warnings, and errors.
 */
export const analyzeCSS = (
  puppeteerResult: PuppeteerScanResult | null,
  domStylesheetsOrPage?: any
): CSSAnalysisResult => {
  const errors: string[] = [];
  const stylesheets: CSSStylesheetItem[] = [];
  const warnings: CSSAnalysisWarning[] = [];
  const optimizationCandidates: CSSOptimizationCandidate[] = [];

  const emptyResult: CSSAnalysisResult = {
    status: 'NO_CSS_FOUND',
    summary: {
      measurementStatus: 'NO_CSS_FOUND',
      totalCSSFiles: 0,
      largestCSSFile: null,
      totalCSSWeight: 0,
      estimatedUnusedCSS: 0,
      hasCoverageData: false,
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
    return {
      ...emptyResult,
      status: 'ANALYZER_ERROR',
      summary: { ...emptyResult.summary, measurementStatus: 'ANALYZER_ERROR' },
      errors
    };
  }

  if (puppeteerResult.errors && puppeteerResult.errors.length > 0) {
    errors.push(...puppeteerResult.errors);
  }

  const domStylesheets: any[] = Array.isArray(domStylesheetsOrPage)
    ? domStylesheetsOrPage
    : (puppeteerResult.domStylesheets || []);

  const resources = puppeteerResult.resources || [];
  const cssResources = resources.filter((res) => res.type === 'css');

  if (cssResources.length === 0) {
    if (domStylesheets.length === 0) {
      return {
        ...emptyResult,
        status: 'NO_CSS_FOUND',
        summary: { ...emptyResult.summary, measurementStatus: 'NO_CSS_FOUND' },
        errors: errors.length > 0 ? errors : ['No CSS stylesheets found.']
      };
    }

    return {
      ...emptyResult,
      status: 'RESOURCE_TIMING_UNAVAILABLE',
      summary: { ...emptyResult.summary, measurementStatus: 'RESOURCE_TIMING_UNAVAILABLE' },
      errors: [...errors, 'Stylesheet elements detected in DOM but network resource timing was unavailable.']
    };
  }

  // Also include coverages mapping
  const coverageList = puppeteerResult.cssCoverage || [];

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
  let externalCount = cssResources.length;

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
    
    // Check actual Puppeteer CSS coverage for this stylesheet
    const matchingCoverage = coverageList.find(c => {
      const cleanCovUrl = c.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      const cleanResUrl = res.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return cleanCovUrl === cleanResUrl || cleanCovUrl.includes(cleanResUrl) || cleanResUrl.includes(cleanCovUrl);
    });

    // Reconcile with DOM stylesheets to inspect real attributes (media, disabled, async, inHead)
    const matchedDom = domStylesheets.find((s: any) => {
      if (!s.href) return false;
      const cleanHref = s.href.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      const cleanRes = res.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return cleanHref === cleanRes || cleanHref.includes(cleanRes) || cleanRes.includes(cleanHref);
    });

    const isMinified = isStylesheetMinified(res.url, matchingCoverage?.text);
    const isRenderBlocking = matchedDom
      ? matchedDom.isRenderBlocking ?? isRenderBlockingCSS(matchedDom.media, matchedDom.isAsync, matchedDom.disabled, matchedDom.inHead)
      : (res as any).isRenderBlocking !== undefined 
        ? (res as any).isRenderBlocking 
        : isRenderBlockingCSS((res as any).media, (res as any).isAsync, (res as any).disabled, (res as any).inHead);

    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;

    let unusedCssKb = 0;
    if (matchingCoverage && matchingCoverage.text) {
      const totalBytes = matchingCoverage.text.length;
      const usedBytes = matchingCoverage.ranges.reduce((acc: number, r: any) => acc + (r.end - r.start), 0);
      const unusedBytes = Math.max(0, totalBytes - usedBytes);
      unusedCssKb = parseFloat((unusedBytes / 1024).toFixed(1));
      // Clamp to maximum resource size
      if (unusedCssKb > res.sizeKb) {
        unusedCssKb = res.sizeKb;
      }
    } else {
      // If coverage was not tracked, do not fabricate an arbitrary 15% multiplier
      unusedCssKb = 0; 
    }

    const isCriticalCandidate = checkCriticalCssCandidate(res.sizeKb, isRenderBlocking);

    // Track aggregates
    if (!largestCSSFile || res.sizeKb > largestCSSFile.sizeKb) {
      largestCSSFile = { url: res.url, sizeKb: res.sizeKb };
    }
    totalCSSWeight += res.sizeKb;
    estimatedUnusedCSS += unusedCssKb;
    if (isDuplicate) duplicateCount++;
    if (isRenderBlocking) renderBlockingCount++;
    
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
      isInline: false,
      fileSizeKb: res.sizeKb,
      transferSizeKb: res.transferSizeKb,
      statusCode: res.statusCode,
      mimeType: res.contentType,
      compression: res.compression,
      cacheControl: res.cacheControl,
      isMinified,
      isDuplicate,
      isRenderBlocking,
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
        message: `Stylesheet "${filename}" has an estimated ${unusedCssKb}KB of unused styles (${Math.round((unusedCssKb / res.sizeKb) * 100)}% unused). Purge unused selectors to trim weight.`,
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

  // Extract inline styles count from metadata if present
  const inlineCount = puppeteerResult.metadata && (puppeteerResult.metadata as any).inlineCSSCount 
    ? (puppeteerResult.metadata as any).inlineCSSCount 
    : 0;

  const totalCSSFiles = stylesheets.length;
  const hasCoverageData = coverageList.length > 0 && coverageList.some(c => c.text && c.text.length > 0);

  const summary: CSSAnalysisSummary = {
    measurementStatus: 'SUCCESS',
    totalCSSFiles,
    largestCSSFile,
    totalCSSWeight: parseFloat(totalCSSWeight.toFixed(1)),
    estimatedUnusedCSS: parseFloat(estimatedUnusedCSS.toFixed(1)),
    hasCoverageData,
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
    status: 'SUCCESS',
    summary,
    stylesheets,
    statistics,
    optimizationCandidates,
    warnings,
    errors
  };
};
