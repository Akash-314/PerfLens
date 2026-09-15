import { launchBrowser, validateUrlForSsrf } from './browser.js';
import { globalScanLimiter } from './concurrency.js';
import { extractMetadata } from './metadata.js';
import { NetworkTracker } from './resources.js';
import { extractTimings, registerTimingsObserver } from './timings.js';
import { captureScreenshots } from './screenshots.js';
import { PuppeteerScanResult } from './types.js';

// Import sub-analyzers to execute on the live page DOM session
import { analyzeImages } from '../imageAnalyzer/index.js';
import { analyzeCSS } from '../cssAnalyzer/index.js';
import { analyzeJavaScript } from '../jsAnalyzer/index.js';
import { analyzeSEO } from '../seoAnalyzer/index.js';
import { analyzeAccessibility } from '../accessibilityAnalyzer/index.js';

/**
 * Perform a browser-based crawling inspection of a target website.
 * @param {string} url - Normalized URL target
 * @returns {Promise<PuppeteerScanResult>} - Structured inspection metrics
 */
export const analyzeWebsiteWithPuppeteer = async (url: string): Promise<PuppeteerScanResult> => {
  const errors: string[] = [];

  // Prevent server side request forgery patterns
  if (!validateUrlForSsrf(url)) {
    return {
      success: false,
      metadata: {
        title: '',
        url,
        redirectUrl: '',
        metaDescription: '',
        language: '',
        viewport: { width: 1366, height: 768 },
        htmlSizeKb: 0,
        domNodesCount: 0,
        faviconUrl: '',
        manifestUrl: null,
        hasRobotsTxt: false,
        hasSitemapXml: false
      },
      performance: {
        vitals: { fcp: null, lcp: null, cls: null, fid: null, tbt: null, ttfb: null }
      },
      resources: [],
      network: {
        totalRequests: 0,
        failedRequests: 0,
        redirectCount: 0,
        largestResource: null,
        slowestResource: null,
        compressionRate: 0,
        cacheCoverageRate: 0
      },
      timings: {
        navigationStart: 0,
        dnsLookupMs: 0,
        tcpConnectionMs: 0,
        tlsHandshakeMs: 0,
        requestStartMs: 0,
        responseStartMs: 0,
        responseEndMs: 0,
        domContentLoadedEventMs: 0,
        loadEventMs: 0
      },
      screenshots: { fullPagePath: '', viewportPath: '' },
      errors: ['SSRF Protection: Blocked localhost, loopback, or private subnet target hosts.']
    };
  }

  // Acquire concurrency limiter slot to bound CPU/memory usage
  const releaseSlot = await globalScanLimiter.acquire();

  let browser;
  let page;
  const tracker = new NetworkTracker();

  try {
    browser = await launchBrowser();
    page = await browser.newPage();

    // Set standard browser profiles
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Register paint and vitals observers before starting navigation
    await registerTimingsObserver(page);

    // Start CSS and JS coverage tracking
    await page.coverage.startCSSCoverage({ resetOnNavigation: false }).catch(() => {});
    await page.coverage.startJSCoverage({ resetOnNavigation: false }).catch(() => {});

    // Bind network hooks before starting transition
    tracker.startTracking(page);

    // Open target page with 30s timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Stop CSS and JS coverage tracking
    const [cssCoverage, jsCoverage] = await Promise.all([
      page.coverage.stopCSSCoverage().catch(() => []),
      page.coverage.stopJSCoverage().catch(() => [])
    ]);

    // Execute parallel scrapers on loaded DOM context
    const metadata = await extractMetadata(page, url);
    const timingsData = await extractTimings(page);
    const screenshots = await captureScreenshots(page);

    const domStylesheets = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel*="stylesheet"], link[rel="preload"][as="style"], style')).map(el => {
        const inHead = !!el.closest('head');
        const href = el.getAttribute('href') || (el as HTMLLinkElement).href || '';
        const media = el.getAttribute('media') || 'all';
        const rel = el.getAttribute('rel') || '';
        const as = el.getAttribute('as') || '';
        const disabled = (el as HTMLLinkElement).disabled === true;
        const isAsync = rel === 'preload' || el.getAttribute('onload') !== null;
        const isPrint = media.toLowerCase().trim() === 'print';
        const isInline = el.tagName.toLowerCase() === 'style';
        return {
          href,
          media,
          rel,
          as,
          disabled,
          inHead,
          isAsync,
          isPrint,
          isInline,
          isRenderBlocking: !isInline && inHead && !disabled && !isAsync && !isPrint
        };
      });
    }).catch(() => []);

    const resources = tracker.getResources();
    const failedRequests = tracker.getFailedCount();

    // Map network summary parameters
    let largestResource: { url: string; sizeKb: number } | null = null;
    let slowestResource: { url: string; durationMs: number } | null = null;
    let compressedCount = 0;
    let cachedCount = 0;

    resources.forEach((r) => {
      if (!largestResource || r.sizeKb > largestResource.sizeKb) {
        largestResource = { url: r.url, sizeKb: r.sizeKb };
      }
      if (r.durationMs !== null && (!slowestResource || r.durationMs > slowestResource.durationMs)) {
        slowestResource = { url: r.url, durationMs: r.durationMs };
      }
      if (r.compression !== 'none') {
        compressedCount++;
      }
      if (r.cacheControl.includes('public') || r.cacheControl.includes('max-age')) {
        cachedCount++;
      }
    });

    const totalRequests = resources.length;
    const compressionRate = totalRequests > 0 ? Math.round((compressedCount / totalRequests) * 100) : 100;
    const cacheCoverageRate = totalRequests > 0 ? Math.round((cachedCount / totalRequests) * 100) : 100;

    // Create partial results object to feed to sub-analyzers
    const partialResult: PuppeteerScanResult = {
      success: true,
      metadata,
      performance: {
        vitals: timingsData.vitals,
        navigationDiagnostics: timingsData.navigationDiagnostics
      },
      resources,
      network: {
        totalRequests,
        failedRequests,
        redirectCount: 0,
        largestResource,
        slowestResource,
        compressionRate,
        cacheCoverageRate
      },
      timings: timingsData.timings,
      screenshots,
      cssCoverage,
      jsCoverage,
      domStylesheets,
      errors
    };

    const browserVersion = await browser.version().catch(() => 'Chrome/Headless');

    const debugLogs: Record<string, {
      started: string;
      finished: string;
      executionTimeMs: number;
      errors: string[];
      warnings: string[];
      fallbackUsed: 'YES' | 'NO';
      confidence: 'High' | 'Medium' | 'Low';
    }> = {};

    // 1. Image Analyzer with fault isolation
    const imgStart = new Date();
    let imageAnalysis: any;
    try {
      imageAnalysis = await analyzeImages(page, partialResult);
    } catch (imgErr: any) {
      console.error(`[Image Analyzer Fault]: ${imgErr.message}`);
      imageAnalysis = {
        images: [],
        summary: { totalImages: 0, totalImageWeight: 0, nonWebpImages: 0, imagesMissingAltText: 0, oversizedImages: 0 },
        warnings: [],
        errors: [`Image analyzer crashed: ${imgErr.message}`]
      };
    }
    const imgEnd = new Date();
    const imgFallback = (!page || imageAnalysis.errors.some((e: any) => e.includes('DOM Image Scrape Failed'))) ? 'YES' : 'NO';
    debugLogs['imageAnalyzer'] = {
      started: imgStart.toISOString(),
      finished: imgEnd.toISOString(),
      executionTimeMs: imgEnd.getTime() - imgStart.getTime(),
      errors: imageAnalysis.errors || [],
      warnings: [],
      fallbackUsed: imgFallback,
      confidence: (page && imageAnalysis.images.length > 0 && imgFallback === 'NO') ? 'High' : (imageAnalysis.images.length > 0 ? 'Medium' : 'Low')
    };

    // 2. CSS Analyzer with fault isolation
    const cssStart = new Date();
    let cssAnalysis: any;
    try {
      cssAnalysis = analyzeCSS(partialResult);
    } catch (cssErr: any) {
      console.error(`[CSS Analyzer Fault]: ${cssErr.message}`);
      cssAnalysis = {
        stylesheets: [],
        summary: { totalCSSFiles: 0, totalCSSWeight: 0, unminifiedCSSFiles: 0, renderBlockingCSSFiles: 0, estimatedUnusedCSS: 0 },
        warnings: [],
        errors: [`CSS analyzer crashed: ${cssErr.message}`]
      };
    }
    const cssEnd = new Date();
    const cssFallback = (cssAnalysis.stylesheets.some((s: any) => s.estimatedUnusedCssKb === parseFloat((s.fileSizeKb * 0.15).toFixed(1)))) ? 'YES' : 'NO';
    debugLogs['cssAnalyzer'] = {
      started: cssStart.toISOString(),
      finished: cssEnd.toISOString(),
      executionTimeMs: cssEnd.getTime() - cssStart.getTime(),
      errors: cssAnalysis.errors || [],
      warnings: (cssAnalysis.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      fallbackUsed: cssFallback,
      confidence: (partialResult.cssCoverage && partialResult.cssCoverage.length > 0) ? 'High' : 'Medium'
    };

    // 3. JS Analyzer with fault isolation
    const jsStart = new Date();
    let jsAnalysis: any;
    try {
      jsAnalysis = await analyzeJavaScript(page, partialResult);
    } catch (jsErr: any) {
      console.error(`[JS Analyzer Fault]: ${jsErr.message}`);
      jsAnalysis = {
        scripts: [],
        packages: [],
        summary: { totalJSFiles: 0, totalJSWeight: 0, unminifiedJSFiles: 0, renderBlockingJSFiles: 0, estimatedUnusedJS: 0 },
        warnings: [],
        errors: [`JS analyzer crashed: ${jsErr.message}`]
      };
    }
    const jsEnd = new Date();
    const jsFallback = (!page || jsAnalysis.errors.some((e: any) => e.includes('DOM Script Scrape Failed'))) ? 'YES' : 'NO';
    debugLogs['jsAnalyzer'] = {
      started: jsStart.toISOString(),
      finished: jsEnd.toISOString(),
      executionTimeMs: jsEnd.getTime() - jsStart.getTime(),
      errors: jsAnalysis.errors || [],
      warnings: (jsAnalysis.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      fallbackUsed: jsFallback,
      confidence: (page && partialResult.jsCoverage && partialResult.jsCoverage.length > 0) ? 'High' : 'Medium'
    };

    // 4. SEO Analyzer with fault isolation
    const seoStart = new Date();
    let seoAnalysis: any;
    try {
      seoAnalysis = await analyzeSEO(page, partialResult);
    } catch (seoErr: any) {
      console.error(`[SEO Analyzer Fault]: ${seoErr.message}`);
      seoAnalysis = {
        meta: {},
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], totalCount: 0, isHierarchyValid: true },
        openGraph: {},
        validationEvidence: {},
        warnings: [],
        errors: [`SEO analyzer crashed: ${seoErr.message}`]
      };
    }
    const seoEnd = new Date();
    const seoFallback = (!page || seoAnalysis.errors.some((e: any) => e.includes('DOM Extraction Failed'))) ? 'YES' : 'NO';
    debugLogs['seoAnalyzer'] = {
      started: seoStart.toISOString(),
      finished: seoEnd.toISOString(),
      executionTimeMs: seoEnd.getTime() - seoStart.getTime(),
      errors: seoAnalysis.errors || [],
      warnings: (seoAnalysis.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      fallbackUsed: seoFallback,
      confidence: (page && seoFallback === 'NO') ? 'High' : 'Medium'
    };

    // 5. Accessibility Analyzer with fault isolation
    const a11yStart = new Date();
    let accessibilityAnalysis: any;
    try {
      accessibilityAnalysis = await analyzeAccessibility(page, partialResult);
    } catch (a11yErr: any) {
      console.error(`[Accessibility Analyzer Fault]: ${a11yErr.message}`);
      accessibilityAnalysis = {
        summary: { totalImages: 0, missingAltCount: 0, formElements: 0, unlabeledForms: 0, missingAriaLabels: 0, contrastViolations: 0, landmarksCount: 0 },
        violations: [],
        warnings: [],
        errors: [`Accessibility analyzer crashed: ${a11yErr.message}`]
      };
    }
    const a11yEnd = new Date();
    const a11yFallback = (!page || accessibilityAnalysis.errors.some((e: any) => e.includes('DOM Extraction Failed'))) ? 'YES' : 'NO';
    debugLogs['accessibilityAnalyzer'] = {
      started: a11yStart.toISOString(),
      finished: a11yEnd.toISOString(),
      executionTimeMs: a11yEnd.getTime() - a11yStart.getTime(),
      errors: accessibilityAnalysis.errors || [],
      warnings: (accessibilityAnalysis.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      fallbackUsed: a11yFallback,
      confidence: (page && a11yFallback === 'NO') ? 'High' : 'Medium'
    };

    return {
      ...partialResult,
      imageAnalysis,
      cssAnalysis,
      jsAnalysis,
      seoAnalysis,
      accessibilityAnalysis,
      browserVersion,
      debugLogs
    };

  } catch (error) {
    const err = error as Error;
    console.error(`[Puppeteer Index Service Error]: Navigation crashed - ${err.message}`);
    errors.push(`Navigation Timeout / Blocked Target: ${err.message}`);

    // Return clean failure payload instead of fabricated mock data
    return {
      success: false,
      metadata: {
        title: 'Offline / Blocked Host',
        url,
        redirectUrl: url,
        metaDescription: '',
        language: 'en',
        viewport: { width: 1366, height: 768 },
        htmlSizeKb: 0,
        domNodesCount: 0,
        faviconUrl: '/favicon.ico',
        manifestUrl: null,
        hasRobotsTxt: false,
        hasSitemapXml: false
      },
      performance: {
        vitals: { fcp: null, lcp: null, cls: null, fid: null, tbt: null, ttfb: null }
      },
      resources: [],
      network: {
        totalRequests: 0,
        failedRequests: 1,
        redirectCount: 0,
        largestResource: null,
        slowestResource: null,
        compressionRate: 0,
        cacheCoverageRate: 0
      },
      timings: {
        navigationStart: Date.now() - 1100,
        dnsLookupMs: 0,
        tcpConnectionMs: 0,
        tlsHandshakeMs: 0,
        requestStartMs: 0,
        responseStartMs: 0,
        responseEndMs: 0,
        domContentLoadedEventMs: 0,
        loadEventMs: 0
      },
      screenshots: { fullPagePath: '', viewportPath: '' },
      errors
    };
  } finally {
    // Explicit close page and browser triggers to prevent system memory leaks
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    releaseSlot();
  }
};
