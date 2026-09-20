import { getPageSpeedTelemetry } from '../pagespeed.service.js';
import { analyzeWebsiteWithPuppeteer } from '../puppeteer/index.js';
import RecommendationEngine from '../recommendation/index.js';
import { NetworkAnalyzer } from './helpers.js';
import { classifyMetric } from '../../config/performanceThresholds.js';
import { ScoreAnalyzer } from './scoreAnalyzer.js';

// Import real sub-analyzer functions
import { analyzeSEO } from '../seoAnalyzer/index.js';
import { analyzeAccessibility } from '../accessibilityAnalyzer/index.js';
import { analyzeImages } from '../imageAnalyzer/index.js';
import { analyzeCSS } from '../cssAnalyzer/index.js';
import { analyzeJavaScript } from '../jsAnalyzer/index.js';

class ReportGenerator {
  /**
   * Orchestrate all crawlers, PageSpeed audits and sub-analyzer modules.
   * Uses a shared browser DOM session and reconciles data formats.
   *
   * @param {string} url - Scanned target URL
   * @param {string | null} ownerId - Authenticated User ID (if logged in)
   * @param {boolean} includePageSpeed - If true, fetch PageSpeed Insights telemetry
   * @returns {Promise<object>} - Fully populated Report object properties
   */
  async generate(url: string, ownerId: string | null = null, includePageSpeed: boolean = true) {
    console.log(`[Report Generator]: Initiating orchestrator pipelines for: ${url} (includePageSpeed: ${includePageSpeed})`);
    
    let pageSpeedTelemetry: any = null;
    let crawlData: any = null;

    try {
      const [psResult, crawlResult] = await Promise.all([
        getPageSpeedTelemetry(url, !includePageSpeed),
        analyzeWebsiteWithPuppeteer(url).catch(err => {
          console.error(`[Report Generator]: Puppeteer crawl failed internally - ${err.message}`);
          return {
            success: false,
            resources: [],
            metadata: { title: '', metaDescription: '', redirectUrl: '', language: '', viewport: { width: 1366, height: 768 }, htmlSizeKb: 0, domNodesCount: 0, faviconUrl: '', manifestUrl: null, hasRobotsTxt: false, hasSitemapXml: false },
            performance: { vitals: { fcp: null, lcp: null, cls: null, fid: null, tbt: null, ttfb: null } },
            resourcesList: [],
            network: { totalRequests: 0, failedRequests: 0, redirectCount: 0, largestResource: null, slowestResource: null, compressionRate: 0, cacheCoverageRate: 0 }
          } as any;
        })
      ]);
      pageSpeedTelemetry = psResult;
      crawlData = crawlResult;
    } catch (err: any) {
      console.error(`[Report Generator]: Concurrent audit pipelines failed - ${err.message}`);
      crawlData = {
        success: false,
        resources: [],
        metadata: { title: '', metaDescription: '', redirectUrl: '', language: '', viewport: { width: 1366, height: 768 }, htmlSizeKb: 0, domNodesCount: 0, faviconUrl: '', manifestUrl: null, hasRobotsTxt: false, hasSitemapXml: false },
        performance: { vitals: { fcp: null, lcp: null, cls: null, fid: null, tbt: null, ttfb: null } },
        resourcesList: [],
        network: { totalRequests: 0, failedRequests: 0, redirectCount: 0, largestResource: null, slowestResource: null, compressionRate: 0, cacheCoverageRate: 0 }
      } as any;
    }

    const networkAnalyzer = new NetworkAnalyzer();
    const crawledResources = crawlData.resources || [];

    // Run sub-analyzers or retrieve pre-run results from the shared page session with fault isolation
    const imageAnalysis = crawlData.imageAnalysis || await analyzeImages(null, crawlData).catch((e: any) => ({
      images: [],
      summary: { totalImages: 0, totalImageWeight: 0, nonWebpImages: 0, imagesMissingAltText: 0, oversizedImages: 0 },
      warnings: [],
      errors: [`Image analysis fallback failed: ${e.message}`]
    }));

    let cssAnalysis: any = crawlData.cssAnalysis;
    if (!cssAnalysis) {
      try {
        cssAnalysis = analyzeCSS(crawlData);
      } catch (e: any) {
        cssAnalysis = {
          stylesheets: [],
          summary: { totalCSSFiles: 0, totalCSSWeight: 0, unminifiedCSSFiles: 0, renderBlockingCSSFiles: 0, estimatedUnusedCSS: 0 },
          warnings: [],
          errors: [`CSS analysis fallback failed: ${e.message}`]
        };
      }
    }

    const jsAnalysis = crawlData.jsAnalysis || await analyzeJavaScript(null, crawlData).catch((e: any) => ({
      scripts: [],
      packages: [],
      summary: { totalJSFiles: 0, totalJSWeight: 0, unminifiedJSFiles: 0, renderBlockingJSFiles: 0, estimatedUnusedJS: 0 },
      warnings: [],
      errors: [`JS analysis fallback failed: ${e.message}`]
    }));

    let networkAnalysis: any;
    try {
      networkAnalysis = networkAnalyzer.analyze(crawledResources, url);
    } catch {
      networkAnalysis = { resources: [], stats: { totalRequests: 0, totalWeightKb: 0, thirdPartyCount: 0, thirdPartySizeKb: 0, failedRequests: 0 } };
    }

    const seoAnalysis = crawlData.seoAnalysis || await analyzeSEO(null, crawlData).catch((e: any) => ({
      meta: {},
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], totalCount: 0, isHierarchyValid: true },
      openGraph: {},
      validationEvidence: {},
      warnings: [],
      errors: [`SEO analysis fallback failed: ${e.message}`]
    }));

    const accessibilityAnalysis = crawlData.accessibilityAnalysis || await analyzeAccessibility(null, crawlData).catch((e: any) => ({
      summary: { totalImages: 0, missingAltCount: 0, formElements: 0, unlabeledForms: 0, missingAriaLabels: 0, contrastViolations: 0, landmarksCount: 0 },
      violations: [],
      warnings: [],
      errors: [`Accessibility analysis fallback failed: ${e.message}`]
    }));

    // Reconcile results to adapt to backend-frontend mapping constructs
    const reconciledImage = {
      stats: {
        sizeKb: imageAnalysis.summary.totalImageWeight,
        count: imageAnalysis.summary.totalImages,
        missingAltCount: imageAnalysis.summary.imagesMissingAltText
      },
      imagesList: imageAnalysis.images,
      ...imageAnalysis
    };

    const reconciledCss = {
      stats: {
        sizeKb: cssAnalysis.summary.totalCSSWeight,
        count: cssAnalysis.summary.totalCSSFiles,
        unusedKb: cssAnalysis.summary.estimatedUnusedCSS
      },
      ...cssAnalysis
    };

    const reconciledJs = {
      stats: {
        sizeKb: jsAnalysis.summary.totalJSWeight,
        count: jsAnalysis.summary.totalJSFiles,
        unusedKb: jsAnalysis.summary.estimatedUnusedJS
      },
      bundleAnalysis: (jsAnalysis as any).packages || [],
      ...jsAnalysis
    };

    const breakdown = {
      images: { sizeKb: reconciledImage.stats.sizeKb, count: reconciledImage.stats.count },
      js: { sizeKb: reconciledJs.stats.sizeKb, count: reconciledJs.stats.count, unusedKb: reconciledJs.stats.unusedKb },
      css: { sizeKb: reconciledCss.stats.sizeKb, count: reconciledCss.stats.count, unusedKb: reconciledCss.stats.unusedKb },
      fonts: {
        sizeKb: parseFloat(crawledResources.filter((r: any) => r.type === 'font').reduce((sum: number, r: any) => sum + r.sizeKb, 0).toFixed(1)),
        count: crawledResources.filter((r: any) => r.type === 'font').length
      },
      thirdParty: { sizeKb: networkAnalysis.stats.thirdPartySizeKb, count: networkAnalysis.stats.thirdPartyCount }
    };

    const domStats = {
      hasTitle: (crawlData.metadata?.title || '').length > 0,
      hasMetaDesc: (crawlData.metadata?.metaDescription || '').length > 0
    };

    // Calculate dynamic scores & vitals from observations
    let scores: any;
    let vitals: any;

    const parseSec = (str: string | undefined | null) => {
      if (!str) return null;
      const match = str.match(/([\d.]+)\s*s/);
      return match ? parseFloat(match[1]) : (!isNaN(Number(str)) ? parseFloat(str) : null);
    };

    const parseMs = (str: string | undefined | null) => {
      if (!str) return null;
      const match = str.match(/([\d.]+)\s*ms/);
      return match ? parseFloat(match[1]) : (!isNaN(Number(str)) ? parseFloat(str) : null);
    };

    let scoreExplanation: any = null;

    const isPageSpeedSuccess = Boolean(
      pageSpeedTelemetry &&
      (pageSpeedTelemetry.status === undefined || pageSpeedTelemetry.status === 'SUCCESS') &&
      typeof pageSpeedTelemetry.performance === 'number' &&
      pageSpeedTelemetry.metrics
    );

    if (isPageSpeedSuccess) {
      // Establish single source of truth for SEO score: PerfLens deterministic seoAnalysis is authoritative
      const authoritativeSeoScore = typeof seoAnalysis?.summary?.seoScoreEstimate === 'number'
        ? seoAnalysis.summary.seoScoreEstimate
        : pageSpeedTelemetry.seo;

      scores = {
        overall: Math.round((pageSpeedTelemetry.performance + pageSpeedTelemetry.accessibility + authoritativeSeoScore + pageSpeedTelemetry.bestPractices) / 4),
        performance: pageSpeedTelemetry.performance,
        accessibility: pageSpeedTelemetry.accessibility,
        seo: authoritativeSeoScore,
        bestPractices: pageSpeedTelemetry.bestPractices
      };

      const fcpSec = parseSec(pageSpeedTelemetry.metrics?.fcp);
      const lcpSec = parseSec(pageSpeedTelemetry.metrics?.lcp);
      const clsNum = pageSpeedTelemetry.metrics?.cls !== undefined && pageSpeedTelemetry.metrics?.cls !== null && !isNaN(Number(pageSpeedTelemetry.metrics.cls)) 
        ? parseFloat(pageSpeedTelemetry.metrics.cls) 
        : null;
      const tbtMs = parseMs(pageSpeedTelemetry.metrics?.tbt);
      const ttfbMs = parseMs(pageSpeedTelemetry.metrics?.ttfb);
      const inpMs = parseMs(pageSpeedTelemetry.metrics?.inp);

      const fcpClass = classifyMetric('fcp', fcpSec, 's');
      const lcpClass = classifyMetric('lcp', lcpSec, 's');
      const clsClass = classifyMetric('cls', clsNum);
      const tbtClass = classifyMetric('tbt', tbtMs, 'ms');
      const ttfbClass = classifyMetric('ttfb', ttfbMs, 'ms');
      const inpClass = classifyMetric('inp', inpMs, 'ms');

      vitals = {
        fcp: { 
          score: fcpClass.isAvailable ? fcpClass.score : null, 
          value: fcpClass.isAvailable ? (pageSpeedTelemetry.metrics?.fcp || fcpClass.displayValue) : 'N/A', 
          rawValue: fcpClass.rawValue,
          normalizedValueMs: fcpClass.normalizedValueMs,
          unit: fcpClass.unit,
          rating: fcpClass.rating,
          source: 'lighthouse',
          mode: 'lab',
          available: fcpClass.isAvailable,
          reason: fcpClass.unavailableReason,
          unavailableReason: fcpClass.unavailableReason
        },
        lcp: { 
          score: lcpClass.isAvailable ? lcpClass.score : null, 
          value: lcpClass.isAvailable ? (pageSpeedTelemetry.metrics?.lcp || lcpClass.displayValue) : 'N/A', 
          rawValue: lcpClass.rawValue,
          normalizedValueMs: lcpClass.normalizedValueMs,
          unit: lcpClass.unit,
          rating: lcpClass.rating,
          source: 'lighthouse',
          mode: 'lab',
          available: lcpClass.isAvailable,
          reason: lcpClass.unavailableReason,
          unavailableReason: lcpClass.unavailableReason,
          elementTag: crawlData?.performance?.vitals?.lcpDetails?.elementTag || null,
          selector: crawlData?.performance?.vitals?.lcpDetails?.elementSelector || null,
          elementUrl: crawlData?.performance?.vitals?.lcpDetails?.elementUrl || null,
          renderTimeMs: crawlData?.performance?.vitals?.lcpDetails?.renderTimeMs || null,
          loadTimeMs: crawlData?.performance?.vitals?.lcpDetails?.loadTimeMs || null
        },
        cls: { 
          score: clsClass.isAvailable ? clsClass.score : null, 
          value: clsClass.isAvailable ? (pageSpeedTelemetry.metrics?.cls !== undefined && pageSpeedTelemetry.metrics?.cls !== null ? String(pageSpeedTelemetry.metrics.cls) : clsClass.displayValue) : 'N/A', 
          rawValue: clsClass.rawValue,
          normalizedValueMs: clsClass.normalizedValueMs,
          unit: '',
          rating: clsClass.rating,
          source: 'lighthouse',
          mode: 'lab',
          available: clsClass.isAvailable,
          reason: clsClass.unavailableReason,
          unavailableReason: clsClass.unavailableReason,
          shiftCount: crawlData?.performance?.vitals?.clsDetails?.shiftCount ?? null,
          largestShift: crawlData?.performance?.vitals?.clsDetails?.largestShift ?? null,
          shifts: crawlData?.performance?.vitals?.clsDetails?.shifts ?? []
        },
        tbt: { 
          score: tbtClass.isAvailable ? tbtClass.score : null, 
          value: tbtClass.isAvailable ? (pageSpeedTelemetry.metrics?.tbt || tbtClass.displayValue) : 'N/A', 
          rawValue: tbtClass.rawValue,
          normalizedValueMs: tbtClass.normalizedValueMs,
          unit: tbtClass.unit,
          rating: tbtClass.rating,
          source: 'lighthouse',
          mode: 'lab',
          available: tbtClass.isAvailable,
          reason: tbtClass.unavailableReason,
          unavailableReason: tbtClass.unavailableReason
        },
        tbtDetails: pageSpeedTelemetry?.tbtDetails || null,
        puppeteerTbtDetails: crawlData?.performance?.vitals?.tbtDetails || null,
        ttfb: { 
          score: ttfbClass.isAvailable ? ttfbClass.score : null, 
          value: ttfbClass.isAvailable ? (pageSpeedTelemetry.metrics?.ttfb || ttfbClass.displayValue) : 'N/A', 
          rawValue: ttfbClass.rawValue,
          normalizedValueMs: ttfbClass.normalizedValueMs,
          unit: ttfbClass.unit,
          rating: ttfbClass.rating,
          source: 'lighthouse',
          mode: 'lab',
          available: ttfbClass.isAvailable,
          reason: ttfbClass.unavailableReason,
          unavailableReason: ttfbClass.unavailableReason,
          method: 'Measured in lab (Google Lighthouse)',
          evidence: {
            method: 'Measured in lab (Google Lighthouse)',
            auditId: 'server-response-time',
            measuredValueMs: ttfbClass.normalizedValueMs,
            source: 'Google Lighthouse lab audit',
            formula: 'Measured in lab'
          }
        },
        inp: {
          score: inpClass.isAvailable ? inpClass.score : null,
          value: inpClass.isAvailable ? (pageSpeedTelemetry.metrics?.inp || inpClass.displayValue) : 'N/A',
          rawValue: inpClass.rawValue,
          normalizedValueMs: inpClass.normalizedValueMs,
          unit: inpClass.unit,
          rating: inpClass.rating,
          source: inpClass.isAvailable ? (pageSpeedTelemetry.metrics?.inpSource || 'crux') : 'lighthouse',
          mode: inpClass.isAvailable ? (pageSpeedTelemetry.metrics?.inpMode || 'field') : 'lab',
          available: inpClass.isAvailable,
          reason: inpClass.unavailableReason,
          unavailableReason: inpClass.unavailableReason
        },
        fid: { 
          score: null, 
          value: 'N/A', 
          unit: 'ms',
          rating: 'unrated' as const,
          source: 'lighthouse',
          mode: 'lab',
          available: false,
          reason: 'FID deprecated and replaced by INP (March 2024)',
          unavailableReason: 'FID deprecated and replaced by INP (March 2024)'
        }
      };

      // Score Explainability for Lighthouse Telemetry
      const breakdownRef = pageSpeedTelemetry.lighthouseScoreBreakdown || {};
      const fcpScore: number | null = typeof breakdownRef['first-contentful-paint']?.score === 'number' ? breakdownRef['first-contentful-paint'].score : fcpClass.score;
      const lcpScore: number | null = typeof breakdownRef['largest-contentful-paint']?.score === 'number' ? breakdownRef['largest-contentful-paint'].score : lcpClass.score;
      const tbtScore: number | null = typeof breakdownRef['total-blocking-time']?.score === 'number' ? breakdownRef['total-blocking-time'].score : tbtClass.score;
      const clsScore: number | null = typeof breakdownRef['cumulative-layout-shift']?.score === 'number' ? breakdownRef['cumulative-layout-shift'].score : clsClass.score;
      const siScore: number | null = typeof breakdownRef['speed-index']?.score === 'number' ? breakdownRef['speed-index'].score : 95;

      const safeCalcContrib = (scoreVal: number | null, weight: number): number | null => {
        return scoreVal !== null && typeof scoreVal === 'number' && !isNaN(scoreVal)
          ? parseFloat((scoreVal * weight).toFixed(2))
          : null;
      };

      const lhMetrics: Record<string, any> = {
        lcp: {
          name: 'Largest Contentful Paint',
          metric: 'Largest Contentful Paint',
          raw: vitals.lcp.value,
          classification: vitals.lcp.rating,
          score: lcpScore,
          weight: 0.25,
          weightFormatted: '25%',
          normalizedWeight: 0.25,
          contribution: safeCalcContrib(lcpScore, 0.25),
          available: lcpScore !== null,
          isCoreVital: true,
          category: 'core-web-vital'
        },
        tbt: {
          name: 'Total Blocking Time',
          metric: 'Total Blocking Time',
          raw: vitals.tbt.value,
          classification: vitals.tbt.rating,
          score: tbtScore,
          weight: 0.30,
          weightFormatted: '30%',
          normalizedWeight: 0.30,
          contribution: safeCalcContrib(tbtScore, 0.30),
          available: tbtScore !== null,
          isCoreVital: false,
          category: 'other-performance-metric'
        },
        cls: {
          name: 'Cumulative Layout Shift',
          metric: 'Cumulative Layout Shift',
          raw: vitals.cls.value,
          classification: vitals.cls.rating,
          score: clsScore,
          weight: 0.25,
          weightFormatted: '25%',
          normalizedWeight: 0.25,
          contribution: safeCalcContrib(clsScore, 0.25),
          available: clsScore !== null,
          isCoreVital: true,
          category: 'core-web-vital'
        },
        fcp: {
          name: 'First Contentful Paint',
          metric: 'First Contentful Paint',
          raw: vitals.fcp.value,
          classification: vitals.fcp.rating,
          score: fcpScore,
          weight: 0.10,
          weightFormatted: '10%',
          normalizedWeight: 0.10,
          contribution: safeCalcContrib(fcpScore, 0.10),
          available: fcpScore !== null,
          isCoreVital: false,
          category: 'other-performance-metric'
        },
        speedIndex: {
          name: 'Speed Index',
          metric: 'Speed Index',
          raw: pageSpeedTelemetry.metrics?.speedIndex || 'N/A',
          classification: siScore !== null && siScore >= 90 ? 'good' : siScore !== null && siScore >= 50 ? 'needs-improvement' : (siScore !== null ? 'poor' : 'unrated'),
          score: siScore,
          weight: 0.10,
          weightFormatted: '10%',
          normalizedWeight: 0.10,
          contribution: safeCalcContrib(siScore, 0.10),
          available: siScore !== null,
          isCoreVital: false,
          category: 'other-performance-metric'
        },
        inp: {
          name: 'Interaction to Next Paint',
          metric: 'Interaction to Next Paint',
          raw: vitals.inp.value,
          classification: vitals.inp.rating,
          score: vitals.inp.available ? vitals.inp.score : null,
          weight: 0.00,
          weightFormatted: '0%',
          normalizedWeight: 0.00,
          contribution: null,
          available: vitals.inp.available,
          isCoreVital: true,
          category: 'core-web-vital',
          note: 'CrUX Field Core Web Vital; not included in lab performance formula'
        },
        ttfb: {
          name: 'Time to First Byte',
          metric: 'Time to First Byte',
          raw: vitals.ttfb.value,
          classification: vitals.ttfb.rating,
          score: vitals.ttfb.available ? vitals.ttfb.score : null,
          weight: 0.00,
          weightFormatted: '0%',
          normalizedWeight: 0.00,
          contribution: null,
          available: vitals.ttfb.available,
          isCoreVital: false,
          category: 'other-performance-metric',
          note: 'Diagnostic metric; not included in lab performance formula'
        }
      };

      scoreExplanation = {
        finalScore: pageSpeedTelemetry.performance,
        overallPerformanceScore: pageSpeedTelemetry.performance,
        source: 'lighthouse',
        method: 'Google Lighthouse Performance Audit',
        formula: 'Performance Score = (Normalized LCP Score × 25%) + (Normalized TBT Score × 30%) + (Normalized CLS Score × 25%) + (Normalized FCP Score × 10%) + (Normalized Speed Index Score × 10%)',
        formulaDescription: 'Calculated from normalized metric scores (0–100) using the configured metric weights.',
        breakdown: [
          lhMetrics.lcp,
          lhMetrics.inp,
          lhMetrics.cls,
          lhMetrics.tbt,
          lhMetrics.fcp,
          lhMetrics.speedIndex,
          lhMetrics.ttfb
        ],
        metrics: lhMetrics
      };
      scores.explanation = scoreExplanation;

    } else {
      const vitalsData = crawlData.performance?.vitals || {};
      const fcpSec = vitalsData.fcp !== null && vitalsData.fcp !== undefined ? vitalsData.fcp : null;
      const lcpSec = vitalsData.lcp !== null && vitalsData.lcp !== undefined ? vitalsData.lcp : null;
      const clsVal = vitalsData.cls !== null && vitalsData.cls !== undefined ? vitalsData.cls : null;
      const tbtVal = vitalsData.tbt !== null && vitalsData.tbt !== undefined ? vitalsData.tbt : null;
      const ttfbSec = vitalsData.ttfb !== null && vitalsData.ttfb !== undefined ? vitalsData.ttfb : null;

      const fcpClass = classifyMetric('fcp', fcpSec, 's');
      const lcpClass = classifyMetric('lcp', lcpSec, 's');
      const clsClass = classifyMetric('cls', clsVal);
      const tbtClass = classifyMetric('tbt', tbtVal, 'ms');
      const ttfbClass = classifyMetric('ttfb', ttfbSec, 's');
      
      // Construct canonical vitals from classification results
      vitals = {
        fcp: { 
          score: fcpClass.isAvailable ? fcpClass.score : null, 
          value: fcpClass.isAvailable ? fcpClass.displayValue : 'N/A', 
          rawValue: fcpClass.rawValue,
          normalizedValueMs: fcpClass.normalizedValueMs,
          unit: fcpClass.unit,
          rating: fcpClass.rating,
          source: 'puppeteer',
          mode: 'lab',
          available: fcpClass.isAvailable,
          reason: fcpClass.unavailableReason,
          unavailableReason: fcpClass.unavailableReason
        },
        lcp: { 
          score: lcpClass.isAvailable ? lcpClass.score : null, 
          value: lcpClass.isAvailable ? lcpClass.displayValue : 'N/A', 
          rawValue: lcpClass.rawValue,
          normalizedValueMs: lcpClass.normalizedValueMs,
          unit: lcpClass.unit,
          rating: lcpClass.rating,
          source: 'puppeteer',
          mode: 'lab',
          available: lcpClass.isAvailable,
          reason: lcpClass.unavailableReason,
          unavailableReason: lcpClass.unavailableReason,
          elementTag: vitalsData.lcpDetails?.elementTag || null,
          selector: vitalsData.lcpDetails?.elementSelector || null,
          elementUrl: vitalsData.lcpDetails?.elementUrl || null,
          renderTimeMs: vitalsData.lcpDetails?.renderTimeMs || null,
          loadTimeMs: vitalsData.lcpDetails?.loadTimeMs || null,
          isFallback: vitalsData.lcpDetails?.isFallback || false
        },
        cls: { 
          score: clsClass.isAvailable ? clsClass.score : null, 
          value: clsClass.isAvailable ? (clsVal !== null && clsVal !== undefined ? clsVal.toFixed(3) : clsClass.displayValue) : 'N/A', 
          rawValue: clsClass.rawValue,
          normalizedValueMs: clsClass.normalizedValueMs,
          unit: '',
          rating: clsClass.rating,
          source: 'puppeteer',
          mode: 'lab',
          available: clsClass.isAvailable,
          reason: clsClass.unavailableReason,
          unavailableReason: clsClass.unavailableReason,
          shiftCount: vitalsData.clsDetails?.shiftCount ?? 0,
          largestShift: vitalsData.clsDetails?.largestShift ?? 0,
          shifts: vitalsData.clsDetails?.shifts ?? []
        },
        tbt: { 
          score: tbtClass.isAvailable ? tbtClass.score : null, 
          value: tbtClass.isAvailable ? tbtClass.displayValue : 'N/A', 
          rawValue: tbtClass.rawValue,
          normalizedValueMs: tbtClass.normalizedValueMs,
          unit: tbtClass.unit,
          rating: tbtClass.rating,
          source: 'puppeteer',
          mode: 'lab',
          available: tbtClass.isAvailable,
          reason: tbtClass.unavailableReason,
          unavailableReason: tbtClass.unavailableReason
        },
        tbtDetails: vitalsData.tbtDetails || null,
        puppeteerTbtDetails: vitalsData.tbtDetails || null,
        ttfb: { 
          score: ttfbClass.isAvailable ? ttfbClass.score : null, 
          value: ttfbClass.isAvailable ? ttfbClass.displayValue : 'N/A', 
          rawValue: ttfbClass.rawValue,
          normalizedValueMs: ttfbClass.normalizedValueMs,
          unit: ttfbClass.unit,
          rating: ttfbClass.rating,
          source: 'puppeteer',
          mode: 'lab',
          available: ttfbClass.isAvailable,
          reason: ttfbClass.unavailableReason,
          unavailableReason: ttfbClass.unavailableReason,
          method: 'Measured in lab (Navigation Timing API)',
          evidence: {
            method: 'Navigation Timing API',
            formula: 'Measured in lab',
            requestStartMs: crawlData.performance?.navigationDiagnostics?.requestStart ?? crawlData.performance?.timings?.requestStartMs ?? null,
            responseStartMs: crawlData.performance?.navigationDiagnostics?.responseStart ?? crawlData.performance?.timings?.responseStartMs ?? null,
            measuredValueMs: ttfbClass.normalizedValueMs,
            navigationType: crawlData.performance?.navigationDiagnostics?.navigationType || 'navigate',
            fromCache: crawlData.performance?.navigationDiagnostics?.fromCache ?? false,
            source: 'Navigation Timing API'
          }
        },
        inp: {
          score: null,
          value: 'N/A',
          rawValue: null,
          normalizedValueMs: null,
          unit: 'ms',
          rating: 'unrated' as const,
          source: 'puppeteer',
          mode: 'lab',
          available: false,
          reason: 'INP requires real user input events and is not available in non-interactive lab crawl',
          unavailableReason: 'INP requires real user input events and is not available in non-interactive lab crawl'
        },
        fid: { 
          score: null, 
          value: 'N/A', 
          unit: 'ms',
          rating: 'unrated' as const,
          source: 'puppeteer',
          mode: 'lab',
          available: false,
          reason: 'FID deprecated and replaced by INP (March 2024)',
          unavailableReason: 'FID deprecated and replaced by INP (March 2024)'
        }
      };

      // Calculate authoritative weighted lab score and explainability via ScoreAnalyzer
      const labScoreAnalysis = ScoreAnalyzer.calculateLabScore(vitals);
      const performanceScore = labScoreAnalysis.overallScore;
      scoreExplanation = labScoreAnalysis;

      const seoScore = seoAnalysis.summary.seoScoreEstimate;
      const accessibilityScore = accessibilityAnalysis.summary.accessibilityScoreEstimate;
      
      let bpScore = 100;
      bpScore -= (reconciledJs.summary.duplicateScripts * 5);
      bpScore -= (reconciledCss.summary.duplicateStylesheets * 5);
      bpScore -= (reconciledJs.statistics.countByMinified.unminified * 2);
      bpScore -= (reconciledCss.statistics.countByMinified.unminified * 2);
      const bestPracticesScore = Math.max(50, Math.min(100, bpScore));

      scores = {
        overall: Math.round((performanceScore + accessibilityScore + seoScore + bestPracticesScore) / 4),
        performance: performanceScore,
        accessibility: accessibilityScore,
        seo: seoScore,
        bestPractices: bestPracticesScore,
        explanation: scoreExplanation
      };
    }

    // Synthesize recommendations with correlated metrics and real sub-analyzer outputs
    const recommendationResult = RecommendationEngine.generateResult(
      vitals,
      breakdown,
      reconciledImage.imagesList,
      domStats,
      isPageSpeedSuccess ? pageSpeedTelemetry : null,
      {
        image: reconciledImage,
        css: reconciledCss,
        js: reconciledJs,
        seo: seoAnalysis,
        accessibility: accessibilityAnalysis,
        targetUrl: url
      }
    );
    const recommendations = recommendationResult.recommendations;

    // Detailed Network Analysis using Puppeteer resources tracking
    const resourcesSortedBySize = [...crawledResources].sort((a: any, b: any) => b.sizeKb - a.sizeKb);
    const resourcesSortedByTime = [...crawledResources].sort((a: any, b: any) => (b.durationMs || 0) - (a.durationMs || 0));

    const largestJs = crawledResources.filter((r: any) => r.type === 'js').sort((a: any, b: any) => b.sizeKb - a.sizeKb)[0]?.url || 'None';
    const largestCss = crawledResources.filter((r: any) => r.type === 'css').sort((a: any, b: any) => b.sizeKb - a.sizeKb)[0]?.url || 'None';
    const largestImage = crawledResources.filter((r: any) => r.type === 'image').sort((a: any, b: any) => b.sizeKb - a.sizeKb)[0]?.url || 'None';

    const customAnalysis = {
      network: {
        totalRequests: crawledResources.length,
        thirdPartyRequests: networkAnalysis.stats.thirdPartyCount,
        thirdPartySizeKb: networkAnalysis.stats.thirdPartySizeKb,
        compressionRate: networkAnalysis.stats.compressionRate,
        cacheCoverageRate: networkAnalysis.stats.cacheCoverageRate,
        largestResources: resourcesSortedBySize.slice(0, 5).map((r: any) => ({
          name: r.url.split('/').pop() || r.url,
          url: r.url,
          sizeKb: r.sizeKb
        })),
        slowestRequests: resourcesSortedByTime.slice(0, 5).map((r: any) => ({
          name: r.url.split('/').pop() || r.url,
          url: r.url,
          durationMs: r.durationMs || r.timeMs || 0
        })),
        largestJs,
        largestCss,
        largestImage
      },
      image: reconciledImage.stats,
      css: reconciledCss.stats,
      js: reconciledJs.stats,
      seo: domStats,
      accessibility: {
        missingAltCount: reconciledImage.stats.missingAltCount
      }
    };

    const analysisSources = {
      perfLensEngine: true,
      puppeteerRuntime: crawlData.success ?? true,
      googleLighthouse: isPageSpeedSuccess,
      googleLighthouseStatus: pageSpeedTelemetry?.status || 'UNAVAILABLE',
      googleLighthouseError: pageSpeedTelemetry?.error || null
    };

    return {
      url: url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase(),
      version: '2.0',
      status: (crawlData.success ?? true) ? 'success' : 'partial_success',
      duration: 0,
      createdAt: new Date(),
      scores,
      vitals,
      breakdown,
      bundleAnalysis: reconciledJs.bundleAnalysis,
      images: reconciledImage.imagesList,
      recommendations,
      resources: networkAnalysis.resourcesList,
      owner: ownerId || undefined,

      // Modern structure extensions
      scoreExplanation,
      performanceScoreDetails: scoreExplanation,
      pageSpeed: isPageSpeedSuccess ? pageSpeedTelemetry : null,
      pageSpeedTelemetry,
      customAnalysis,
      analysisSources,
      seo: seoAnalysis,
      accessibility: accessibilityAnalysis,
      recommendation: recommendationResult,
      summary: recommendationResult.summary,
      overallHealthScore: recommendationResult.summary.overallHealthScore,
      overallPerformanceGrade: recommendationResult.summary.overallPerformanceGrade,
      validationData: {
        browserVersion: (crawlData as any).browserVersion || 'Chrome/Headless',
        debugLogs: (crawlData as any).debugLogs || {},
        screenshots: crawlData.screenshots || { fullPagePath: '', viewportPath: '' },
        resources: crawledResources,
        imageAnalysis,
        cssAnalysis,
        jsAnalysis,
        seoAnalysis,
        accessibilityAnalysis,
        pageSpeedTelemetry,
        networkAnalysis
      }
    };
  }
}

export { ScoreAnalyzer };
export default new ReportGenerator();
