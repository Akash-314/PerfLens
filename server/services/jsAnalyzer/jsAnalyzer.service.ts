import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  JSScriptItem,
  JSAnalysisSummary,
  JSAnalysisStatistics,
  JSAnalysisWarning,
  JSOptimizationCandidate,
  JSAnalysisResult
} from './types.js';
import {
  isScriptMinified,
  detectCommonLibrary,
  estimateUnusedJS,
  estimateJSCosts,
  isThirdPartyScript
} from './helpers.js';

/**
 * Analyzes the JavaScript scripts discovered in a website scan.
 * Operating solely on network resource records, it identifies minification, compression,
 * third-party status, duplicate requests, and estimates CPU parsing/execution costs.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns JSAnalysisResult object containing summary, scripts, stats, optimization candidates, warnings, and errors.
 */
export const analyzeJavaScript = (
  puppeteerResult: PuppeteerScanResult | null
): JSAnalysisResult => {
  const errors: string[] = [];
  const scripts: JSScriptItem[] = [];
  const warnings: JSAnalysisWarning[] = [];
  const optimizationCandidates: JSOptimizationCandidate[] = [];

  const emptyResult: JSAnalysisResult = {
    summary: {
      totalJSFiles: 0,
      largestJSFile: null,
      totalJSWeight: 0,
      thirdPartyScripts: 0,
      duplicateScripts: 0,
      renderBlockingScripts: 0,
      estimatedUnusedJS: 0,
      largestLibrary: null
    },
    scripts: [],
    statistics: {
      countByMinified: { minified: 0, unminified: 0 },
      sizeByMinifiedKb: { minified: 0, unminified: 0 },
      countByCompression: { brotli: 0, gzip: 0, none: 0 },
      thirdPartyCount: 0,
      thirdPartySizeKb: 0,
      detectedLibraries: {},
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
  const jsResources = resources.filter((res) => res.type === 'js');

  if (jsResources.length === 0) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No JavaScript resources found.']
    };
  }

  // Count script URL occurrences to flag duplicates
  const urlCountMap = new Map<string, number>();
  jsResources.forEach((res) => {
    urlCountMap.set(res.url, (urlCountMap.get(res.url) || 0) + 1);
  });

  const siteUrl = puppeteerResult.metadata?.redirectUrl || puppeteerResult.metadata?.url || '';

  let largestJSFile: { url: string; sizeKb: number } | null = null;
  let totalJSWeight = 0;
  let estimatedUnusedJS = 0;
  let duplicateCount = 0;
  let renderBlockingCount = 0;
  let thirdPartyCount = 0;
  let thirdPartySizeKb = 0;
  let largestLibrary: { name: string; sizeKb: number } | null = null;

  // Statistics accumulators
  let minifiedCount = 0;
  let unminifiedCount = 0;
  let minifiedSizeKb = 0;
  let unminifiedSizeKb = 0;
  let brotliCount = 0;
  let gzipCount = 0;
  let noneCount = 0;
  const detectedLibrariesMap: Record<string, { count: number; sizeKb: number }> = {};

  jsResources.forEach((res) => {
    const filename = res.url.split('/').pop()?.split('?')[0] || 'script.js';
    
    const isMinified = isScriptMinified(res.url);
    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;
    const isThirdParty = isThirdPartyScript(res.url, siteUrl);
    
    // Heuristic: script blocks rendering if unminified, large (> 50KB), or has no public caching
    const isRenderBlocking = !isMinified || res.sizeKb > 50 || !res.cacheControl.toLowerCase().includes('public');
    
    const unusedJsKb = estimateUnusedJS(res.sizeKb);
    const { parseCostMs, executionCostMs, mainThreadBlockingMs } = estimateJSCosts(res.sizeKb);
    const detectedLibrary = detectCommonLibrary(res.url);

    // Track aggregates
    if (!largestJSFile || res.sizeKb > largestJSFile.sizeKb) {
      largestJSFile = { url: res.url, sizeKb: res.sizeKb };
    }
    totalJSWeight += res.sizeKb;
    estimatedUnusedJS += unusedJsKb;
    
    if (isDuplicate) duplicateCount++;
    if (isRenderBlocking) renderBlockingCount++;
    if (isThirdParty) {
      thirdPartyCount++;
      thirdPartySizeKb += res.sizeKb;
    }

    if (detectedLibrary) {
      if (!detectedLibrariesMap[detectedLibrary]) {
        detectedLibrariesMap[detectedLibrary] = { count: 0, sizeKb: 0 };
      }
      detectedLibrariesMap[detectedLibrary].count++;
      detectedLibrariesMap[detectedLibrary].sizeKb = parseFloat(
        (detectedLibrariesMap[detectedLibrary].sizeKb + res.sizeKb).toFixed(1)
      );

      if (!largestLibrary || res.sizeKb > largestLibrary.sizeKb) {
        largestLibrary = { name: detectedLibrary, sizeKb: res.sizeKb };
      }
    }

    // Statistics
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

    const item: JSScriptItem = {
      url: res.url,
      filename,
      fileSizeKb: res.sizeKb,
      transferSizeKb: res.transferSizeKb,
      statusCode: res.statusCode,
      mimeType: res.contentType,
      compression: res.compression,
      cacheControl: res.cacheControl,
      isDuplicate,
      isMinified,
      // DOM-specific configurations default to null (unknown/not detectable from network logs)
      isAsync: null,
      isDefer: null,
      isModuleScript: null,
      isThirdParty,
      estimatedUnusedJsKb: unusedJsKb,
      estimatedParseCostMs: parseCostMs,
      estimatedExecutionCostMs: executionCostMs,
      estimatedMainThreadBlockingMs: mainThreadBlockingMs,
      detectedLibrary,
      hasDynamicImports: null,
      isRenderBlocking
    };

    scripts.push(item);

    // Build warnings
    if (!isMinified) {
      warnings.push({
        code: 'JS_NOT_MINIFIED',
        message: `Script "${filename}" is not minified. Minifying JavaScript reduces parse and download latency.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (res.compression === 'none' && res.sizeKb > 10) {
      warnings.push({
        code: 'JS_NO_COMPRESSION',
        message: `Script "${filename}" is not compressed. Enable Gzip or Brotli compression for JS assets on your hosting server.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (isRenderBlocking) {
      warnings.push({
        code: 'JS_RENDER_BLOCKING',
        message: `Script "${filename}" is render-blocking. Consider using "async" or "defer" attributes or loading it at the bottom of the page.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (isDuplicate) {
      warnings.push({
        code: 'JS_DUPLICATE',
        message: `Script "${filename}" is loaded multiple times. Remove duplicate network script requests.`,
        severity: 'error',
        url: res.url
      });
    }

    if (res.sizeKb > 100) {
      warnings.push({
        code: 'JS_LARGE_LIBRARY',
        message: `Script "${filename}" is a large script (${res.sizeKb}KB). Large scripts increase CPU parse and execution times.`,
        severity: 'warning',
        url: res.url
      });
    }

    if (unusedJsKb > 30) {
      warnings.push({
        code: 'JS_UNUSED_CODE',
        message: `Script "${filename}" contains an estimated ${unusedJsKb}KB of unused code. Consider code-splitting or removing dead imports.`,
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

    if (unusedJsKb > 10) {
      estimatedSizeReductionKb += unusedJsKb;
      suggestionsList.push('code-split / shake tree');
    }

    if (res.compression === 'none') {
      const compressionSavings = parseFloat((res.sizeKb * 0.65).toFixed(1));
      estimatedSizeReductionKb += compressionSavings;
      suggestionsList.push('enable compression');
    }

    if (isDuplicate) {
      estimatedSizeReductionKb += res.sizeKb;
      suggestionsList.push('remove duplicate load');
    }

    estimatedSizeReductionKb = parseFloat(Math.min(res.sizeKb, estimatedSizeReductionKb).toFixed(1));

    if (estimatedSizeReductionKb > 0 || isRenderBlocking || res.sizeKb > 100) {
      optimizationCandidates.push({
        url: res.url,
        type: 'js',
        sizeKb: res.sizeKb,
        estimatedUnusedJsKb: unusedJsKb,
        isRenderBlocking,
        isMinified,
        isDuplicate,
        estimatedSizeReductionKb,
        suggestion: suggestionsList.length > 0
          ? `Optimize script by: ${suggestionsList.join(', ')}.`
          : 'Load script asynchronously.'
      });
    }
  });

  const totalJSFiles = scripts.length;

  const summary: JSAnalysisSummary = {
    totalJSFiles,
    largestJSFile,
    totalJSWeight: parseFloat(totalJSWeight.toFixed(1)),
    thirdPartyScripts: thirdPartyCount,
    duplicateScripts: duplicateCount,
    renderBlockingScripts: renderBlockingCount,
    estimatedUnusedJS: parseFloat(estimatedUnusedJS.toFixed(1)),
    largestLibrary
  };

  const statistics: JSAnalysisStatistics = {
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
    thirdPartyCount,
    thirdPartySizeKb: parseFloat(thirdPartySizeKb.toFixed(1)),
    detectedLibraries: detectedLibrariesMap,
    averageSizeKb: totalJSFiles > 0 ? parseFloat((totalJSWeight / totalJSFiles).toFixed(1)) : 0
  };

  return {
    summary,
    scripts,
    statistics,
    optimizationCandidates,
    warnings,
    errors
  };
};
