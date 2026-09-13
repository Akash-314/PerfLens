import { Page } from 'puppeteer';
import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  JSScriptItem,
  JSAnalysisSummary,
  JSAnalysisStatistics,
  JSAnalysisWarning,
  JSOptimizationCandidate,
  JSAnalysisResult,
  BundleChunkItem
} from './types.js';
import {
  isScriptMinified,
  detectCommonLibrary,
  detectChunkOrPackageName,
  estimateJSCosts,
  isThirdPartyScript
} from './helpers.js';

/**
 * Analyzes the JavaScript scripts discovered in a website scan.
 * Uses real JS coverage profiles to calculate exact unused byte sizes.
 * Queries DOM scripts for async, defer, and module attributes.
 * 
 * @param page Active Puppeteer page instance
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns JSAnalysisResult object containing summary, scripts, stats, optimization candidates, warnings, and errors.
 */
export const analyzeJavaScript = async (
  page: Page | null,
  puppeteerResult: PuppeteerScanResult | null
): Promise<JSAnalysisResult> => {
  const errors: string[] = [];
  const scripts: JSScriptItem[] = [];
  const warnings: JSAnalysisWarning[] = [];
  const optimizationCandidates: JSOptimizationCandidate[] = [];

  const emptyResult: JSAnalysisResult = {
    status: 'NO_JS_FOUND',
    summary: {
      measurementStatus: 'NO_JS_FOUND',
      totalJSFiles: 0,
      largestJSFile: null,
      totalJSWeight: 0,
      thirdPartyScripts: 0,
      duplicateScripts: 0,
      renderBlockingScripts: 0,
      estimatedUnusedJS: 0,
      hasCoverageData: false,
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

  // 1. Scan DOM for script attributes with document position if page is available
  let domScripts: any[] = [];
  if (page) {
    try {
      domScripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(el => {
          const inHead = !!el.closest('head');
          return {
            src: el.src || '',
            async: el.async,
            defer: el.defer,
            type: el.getAttribute('type') || '',
            html: el.outerHTML,
            inHead,
            location: inHead ? '<head>' : '<body>'
          };
        });
      });
    } catch (err: any) {
      console.error(`[JS Service DOM extraction error]: ${err.message}`);
      errors.push(`DOM Script Scrape Failed: ${err.message}`);
    }
  }

  const resources = puppeteerResult.resources || [];
  const jsResources = resources.filter((res) => res.type === 'js');

  if (jsResources.length === 0) {
    if (domScripts.length === 0) {
      return {
        ...emptyResult,
        status: 'NO_JS_FOUND',
        summary: { ...emptyResult.summary, measurementStatus: 'NO_JS_FOUND' },
        errors: errors.length > 0 ? errors : ['No JavaScript resources found.']
      };
    }

    return {
      ...emptyResult,
      status: 'RESOURCE_TIMING_UNAVAILABLE',
      summary: { ...emptyResult.summary, measurementStatus: 'RESOURCE_TIMING_UNAVAILABLE' },
      errors: [...errors, 'Script elements detected in DOM but network resource timing was unavailable.']
    };
  }

  // Count script URL occurrences to flag duplicates
  const urlCountMap = new Map<string, number>();
  jsResources.forEach((res) => {
    urlCountMap.set(res.url, (urlCountMap.get(res.url) || 0) + 1);
  });

  const siteUrl = puppeteerResult.metadata?.redirectUrl || puppeteerResult.metadata?.url || '';
  const coverageList = puppeteerResult.jsCoverage || [];

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
  const packagesList: BundleChunkItem[] = [];

  const detectedNames = new Set<string>();

  jsResources.forEach((res) => {
    const filename = res.url.split('/').pop()?.split('?')[0] || 'script.js';
    
    // Find matching DOM script tag
    const matchedDom = domScripts.find((s: any) => {
      if (!s.src) return false;
      const cleanSrc = s.src.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      const cleanRes = res.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return cleanSrc === cleanRes || cleanSrc.includes(cleanRes) || cleanRes.includes(cleanSrc);
    });

    const isAsync = matchedDom ? matchedDom.async : false;
    const isDefer = matchedDom ? matchedDom.defer : false;
    const isModuleScript = matchedDom ? matchedDom.type === 'module' : false;

    // Check Puppeteer coverage for unused JS calculation
    const matchingCoverage = coverageList.find(c => {
      const cleanCovUrl = c.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      const cleanResUrl = res.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return cleanCovUrl === cleanResUrl || cleanCovUrl.includes(cleanResUrl) || cleanResUrl.includes(cleanCovUrl);
    });

    const isMinified = isScriptMinified(res.url, matchingCoverage?.text);
    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;
    const isThirdParty = isThirdPartyScript(res.url, siteUrl);

    let unusedJsKb = 0;
    if (matchingCoverage && matchingCoverage.text) {
      const totalBytes = matchingCoverage.text.length;
      const usedBytes = matchingCoverage.ranges.reduce((acc: number, r: any) => acc + (r.end - r.start), 0);
      const unusedBytes = Math.max(0, totalBytes - usedBytes);
      unusedJsKb = parseFloat((unusedBytes / 1024).toFixed(1));
      if (unusedJsKb > res.sizeKb) {
        unusedJsKb = res.sizeKb;
      }
    } else {
      // If code coverage was not tracked via CDP, do NOT fabricate an arbitrary 15% multiplier
      unusedJsKb = 0;
    }

    const { parseCostMs, executionCostMs, mainThreadBlockingMs } = estimateJSCosts(res.sizeKb);
    const detectedLibrary = detectCommonLibrary(res.url);

    const inHead = matchedDom ? (matchedDom.inHead ?? (matchedDom.location === '<head>')) : false;
    const documentPosition = matchedDom?.location || (inHead ? '<head>' : '<body>');

    // Script is render-blocking ONLY if matched in DOM in <head> and lacks async, defer, and type="module"
    const isRenderBlocking = matchedDom ? (inHead && !isAsync && !isDefer && !isModuleScript) : false;

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

    // Catalog chunk or package in bundle analysis with real sizes and evidence
    const chunkOrPkgName = detectChunkOrPackageName(res.url);
    const hasSourceMap = (matchingCoverage?.text && (matchingCoverage.text.includes('sourceMappingURL=') || matchingCoverage.text.includes('//# sourceMappingURL='))) || resources.some(r => r.url === res.url + '.map') || false;
    const isPkgDuplicate = (urlCountMap.get(res.url) || 0) > 1 || (detectedLibrary ? detectedNames.has(detectedLibrary) : detectedNames.has(chunkOrPkgName));
    detectedNames.add(detectedLibrary || chunkOrPkgName);

    // Unused modules require actual CDP code coverage evidence (>50% unused and >10KB)
    const isPkgUnused = matchingCoverage && matchingCoverage.text ? (unusedJsKb > (res.sizeKb * 0.5) && unusedJsKb > 10) : false;

    packagesList.push({
      packageName: chunkOrPkgName,
      name: chunkOrPkgName,
      sizeKb: res.sizeKb,
      transferSizeKb: typeof res.transferSizeKb === 'number' ? res.transferSizeKb : res.sizeKb,
      compression: res.compression || 'none',
      isDuplicate: isPkgDuplicate,
      duplicate: isPkgDuplicate,
      isUnused: isPkgUnused,
      unused: isPkgUnused,
      hasSourceMap,
      url: res.url
    });

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
      isAsync,
      isDefer,
      isModuleScript,
      isThirdParty,
      estimatedUnusedJsKb: unusedJsKb,
      estimatedParseCostMs: parseCostMs,
      estimatedExecutionCostMs: executionCostMs,
      estimatedMainThreadBlockingMs: mainThreadBlockingMs,
      detectedLibrary,
      hasDynamicImports: null,
      isRenderBlocking,
      documentPosition,
      parserBlockingStatus: isRenderBlocking
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
        message: `Script "${filename}" is render-blocking. Consider adding "async" or "defer" attributes or loading it dynamically.`,
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
        message: `Script "${filename}" contains an estimated ${unusedJsKb}KB of unused code (${Math.round((unusedJsKb / res.sizeKb) * 100)}% unused). Consider code-splitting or removing dead imports.`,
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
  const hasCoverageData = coverageList.length > 0 && coverageList.some(c => c.text && c.text.length > 0);

  const summary: JSAnalysisSummary = {
    measurementStatus: 'SUCCESS',
    totalJSFiles,
    largestJSFile,
    totalJSWeight: parseFloat(totalJSWeight.toFixed(1)),
    thirdPartyScripts: thirdPartyCount,
    duplicateScripts: duplicateCount,
    renderBlockingScripts: renderBlockingCount,
    estimatedUnusedJS: parseFloat(estimatedUnusedJS.toFixed(1)),
    hasCoverageData,
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
    status: 'SUCCESS',
    summary,
    scripts,
    statistics,
    optimizationCandidates,
    warnings,
    errors,
    packages: packagesList, // aligned for frontend AppContext mapping
    bundleAnalysis: packagesList
  } as any;
};
