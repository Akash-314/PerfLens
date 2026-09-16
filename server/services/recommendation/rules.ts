import {
  Recommendation,
  EstimatedSavings,
  RecommendationFinding,
  RecommendationEvidence,
  IStandardFinding
} from './types.js';
import { generateAiFixPrompt } from './aiFixEngine.js';
import { DetectedFrameworkInfo } from './frameworkDetector.js';
import { OpenGraphPropertyCheck } from '../seoAnalyzer/types.js';

export interface RecommendationInput {
  pagespeed?: any;
  image?: any;
  css?: any;
  js?: any;
  seo?: any;
  accessibility?: any;
  vitals?: any;
  frameworkInfo?: DetectedFrameworkInfo;
  targetUrl?: string;
}

export interface RecommendationRule {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices';
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  hoursToImplement: number;
  evaluate(input: RecommendationInput): Recommendation | null;
}

/**
 * Standardized builder for IStandardFinding, AI Fix Prompt, and humanized explanation.
 * Strictly adheres to PerfLens Zero-Fabrication Rules.
 */
export const buildStandardFindingAndPrompt = (opts: {
  id?: string;
  category: 'seo' | 'performance' | 'accessibility' | 'best-practices';
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status?: 'pass' | 'fail' | 'warning' | 'info';
  confidence?: 'verified' | 'unable-to-verify' | 'high-confidence' | 'medium-confidence';
  url: string;
  element?: string;
  selector?: string;
  observed?: any;
  expected?: any;
  snippet?: string;
  details?: Record<string, any>;
  observedValue?: string | number | null;
  expectedCondition?: string;
  problem: string;
  whyItMatters: string;
  impact: string;
  task: string;
  fixStrategy: string;
  guidance?: string;
  validationSteps: string[];
  frameworkInfo?: DetectedFrameworkInfo;
}): { standardFinding: IStandardFinding; aiFixPrompt: string; whyItMatters: string } => {
  const evidenceStr = opts.snippet || (opts.selector ? `Element: ${opts.selector}, Observed: ${typeof opts.observed === 'object' ? JSON.stringify(opts.observed) : String(opts.observed || '')}` : String(opts.observed || ''));

  const aiFixPrompt = generateAiFixPrompt({
    category: opts.category,
    problem: opts.problem,
    url: opts.url,
    evidence: evidenceStr,
    task: opts.task,
    guidance: opts.guidance,
    frameworkInfo: opts.frameworkInfo,
    validationSteps: opts.validationSteps
  });

  const standardFinding: IStandardFinding = {
    id: opts.id,
    category: opts.category,
    rule: opts.rule,
    severity: opts.severity,
    status: opts.status || 'fail',
    confidence: opts.confidence || 'verified',
    url: opts.url,
    evidence: {
      url: opts.url,
      element: opts.element,
      selector: opts.selector,
      observed: opts.observed,
      expected: opts.expected,
      snippet: opts.snippet,
      details: opts.details
    },
    observedValue: opts.observedValue,
    expectedCondition: opts.expectedCondition,
    explanation: {
      problem: opts.problem,
      whyItMatters: opts.whyItMatters,
      observedEvidence: evidenceStr
    },
    impact: opts.impact,
    recommendation: opts.task,
    fixStrategy: opts.fixStrategy,
    validation: opts.validationSteps,
    validationSteps: opts.validationSteps,
    aiFixPrompt,
    frameworkAwareness: opts.frameworkInfo ? {
      detectedFramework: opts.frameworkInfo.framework,
      confidence: opts.frameworkInfo.confidence === 'verified' ? 'verified' : 'none',
      evidenceSnippet: opts.frameworkInfo.evidence
    } : undefined
  };

  return { standardFinding, aiFixPrompt, whyItMatters: opts.whyItMatters };
};

/**
 * Calculates network transfer savings based on Fast 3G profile (1.6 Mbps / 200 KB/s).
 * IMPORTANT: This represents wire transfer time only, NEVER runtime FCP/LCP/TBT rendering savings.
 */
export const createTransferSavings = (savingsKb: number): EstimatedSavings | null => {
  if (savingsKb <= 0) {
    return null;
  }
  const roundedKb = Math.round(savingsKb);
  const seconds = (roundedKb / 200).toFixed(2);
  return {
    value: roundedKb,
    unit: 'KB',
    type: 'transfer_only',
    assumption: 'TRANSFER-ONLY MODEL: Fast 3G network profile (200 KB/s wire transfer rate; does NOT predict FCP/LCP/TBT improvement)',
    displayString: `TRANSFER-ONLY MODEL: Save ~${seconds}s transfer on Fast 3G (${roundedKb} KB @ 200 KB/s)`
  };
};

export const createTransferGainString = (savingsKb: number): string => {
  if (savingsKb <= 0) return 'Not quantified';
  const seconds = (savingsKb / 200).toFixed(2);
  return `TRANSFER-ONLY MODEL: Save ~${seconds}s transfer on Fast 3G (${Math.round(savingsKb)} KB @ 200 KB/s)`;
};

export const createNonQuantifiedSavings = (): null => null;

/**
 * Universal metric parser supporting raw numbers, string units ("350ms", "3.5s", "0.22"),
 * and wrapped objects ({ value: ... }, { rawValue: ... }).
 */
export const parseMetricNumeric = (metric: any): number | null => {
  if (metric === null || metric === undefined) return null;
  if (typeof metric === 'number') return isNaN(metric) ? null : metric;
  if (typeof metric === 'string') {
    if (metric === 'N/A' || metric === 'unrated') return null;
    const parsed = parseFloat(metric.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
  if (metric.available === false || metric.value === 'N/A' || metric.value === 'unrated') return null;
  if (typeof metric.value === 'number') return isNaN(metric.value) ? null : metric.value;
  if (typeof metric.value === 'string') {
    if (metric.value === 'N/A' || metric.value === 'unrated') return null;
    const parsed = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof metric.rawValue === 'number') return isNaN(metric.rawValue) ? null : metric.rawValue;
  return null;
};

export const rules: RecommendationRule[] = [
  // ==========================================
  // 1. PERFORMANCE: CORE WEB VITALS - TBT
  // ==========================================
  {
    id: 'REC_PERF_TBT_LONG_TASKS',
    title: 'Split long JavaScript tasks to minimize Total Blocking Time',
    description: 'Long tasks (>50ms) occupy the main browser thread, delaying input processing and degrading user responsiveness.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 3.0,
    evaluate(input) {
      const vitals = input.vitals || input.pagespeed?.vitals;
      if (!vitals?.tbt) return null;

      if (vitals.tbt?.available === false || vitals.tbt?.value === 'N/A') {
        return null;
      }

      const tbtMs = parseMetricNumeric(vitals.tbt);
      if (tbtMs === null || isNaN(tbtMs) || tbtMs <= 200) {
        return null; // TBT is within good threshold (<= 200ms)
      }

      const tbtDetails = vitals.tbtDetails || input.pagespeed?.tbtDetails || input.pagespeed?.vitals?.tbtDetails;
      const puppeteerTbt = vitals.puppeteerTbtDetails;
      const longTasks: any[] = (tbtDetails?.tasks && tbtDetails.tasks.length > 0) ? tbtDetails.tasks : (puppeteerTbt?.tasks || []);

      const evidenceDetails: RecommendationEvidence[] = [];
      if (longTasks.length > 0) {
        longTasks.slice(0, 5).forEach((t: any) => {
          const hasAttribution = t.scriptUrl && t.scriptUrl !== 'unknown' && t.scriptUrl !== 'Main thread execution';
          evidenceDetails.push({
            type: 'long-task',
            duration: Math.round(t.duration || 0),
            resource: hasAttribution ? t.scriptUrl : 'Attribution unavailable (main thread execution)',
            details: {
              startTime: Math.round(t.startTime || 0),
              blockingDuration: Math.round(t.blockingDuration || Math.max(0, (t.duration || 0) - 50)),
              containerType: t.containerType || 'script',
              attributionAvailable: !!hasAttribution
            }
          });
        });
      } else {
        evidenceDetails.push({
          type: 'tbt-metric',
          duration: Math.round(tbtMs),
          resource: 'Main thread CPU execution (task attribution unavailable)',
          details: { measuredTbtMs: Math.round(tbtMs), attributionAvailable: false }
        });
      }

      const mainThreadWork: any[] = tbtDetails?.mainThreadWork || [];

      if (mainThreadWork.length > 0) {
        mainThreadWork.slice(0, 3).forEach((mw: any) => {
          evidenceDetails.push({
            type: 'main-thread-work',
            duration: Math.round(mw.durationMs || 0),
            resource: mw.group || 'CPU Work Category'
          });
        });
      }

      const tbtSource = vitals.tbt?.source || 'lab';
      const cleanSourceLabel = tbtSource === 'pagespeed' || tbtSource === 'lighthouse'
        ? 'Google Lighthouse lab audit'
        : 'Lab measurement';

      const finding: RecommendationFinding = {
        description: `Total Blocking Time is ${Math.round(tbtMs)}ms, exceeding the 200ms recommended target. Main-thread execution delays user interaction responsiveness.`,
        metric: 'TBT',
        value: Math.round(tbtMs),
        unit: 'ms'
      };

      const potentialImpact = 'Relieves main-thread CPU congestion and eliminates input latency during page load.';
      const evidence = `TBT: ${Math.round(tbtMs)}ms (target: <= 200ms). Source: ${cleanSourceLabel}`;

      return {
        id: this.id,
        findingId: 'REC_PERF_TBT_LONG_TASKS_001',
        analyzer: 'performance',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: tbtMs > 600 ? 'high' : 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Reduce JavaScript blocking work and break up long main-thread tasks (>50ms) using scheduler.yield() or requestIdleCallback(), and offload CPU-intensive operations to Web Workers.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/tbt',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        priority: tbtMs > 600 ? 'critical' : 'high',
        sourceAnalyzer: 'puppeteer',
        estimatedBandwidthSaving: 0,
        actualValue: `Total Blocking Time: ${Math.round(tbtMs)}ms`,
        expectedValue: 'Total Blocking Time <= 200ms',
        reason: 'Long JavaScript tasks block the browser main thread from responding to user interactions.'
      };
    }
  },

  // ==========================================
  // 2. PERFORMANCE: CORE WEB VITALS - LCP
  // ==========================================
  {
    id: 'REC_PERF_LCP_ELEMENT',
    title: 'Optimize Largest Contentful Paint (LCP) element bottleneck',
    description: 'The Largest Contentful Paint metric marks when the main visual content of the page has likely loaded.',
    category: 'performance',
    estimatedDifficulty: 'medium',
    hoursToImplement: 2.0,
    evaluate(input) {
      const vitals = input.vitals || input.pagespeed?.vitals;
      if (!vitals?.lcp) return null;

      if (vitals.lcp?.available === false || vitals.lcp?.value === 'N/A') {
        return null;
      }

      const rawLcp = parseMetricNumeric(vitals.lcp);
      if (rawLcp === null || isNaN(rawLcp)) {
        return null;
      }

      const isMs = vitals.lcp?.unit === 'ms' || 
                   (typeof vitals.lcp === 'string' && vitals.lcp.includes('ms')) || 
                   (typeof vitals.lcp?.value === 'string' && vitals.lcp.value.includes('ms')) ||
                   rawLcp > 100;
      const lcpSeconds = isMs ? rawLcp / 1000 : rawLcp;

      // Strictly trigger ONLY when LCP exceeds the 2.5s good threshold
      if (lcpSeconds <= 2.5) {
        return null;
      }

      const lcpDetails = vitals.lcpDetails || input.pagespeed?.vitals?.lcpDetails || input.pagespeed?.lcpDetails || vitals.lcp || {};
      const elementTag = (lcpDetails.elementTag || vitals.lcp?.elementTag || '').toUpperCase();
      const selector = lcpDetails.selector || lcpDetails.elementSelector || vitals.lcp?.selector || null;
      const elementUrl = lcpDetails.elementUrl || vitals.lcp?.elementUrl || null;
      const isImage = elementTag === 'IMG' || elementTag === 'IMAGE' || elementTag === 'PICTURE' || elementTag === 'SVG' || (elementUrl && /\.(webp|avif|png|jpe?g|gif|svg)/i.test(elementUrl));

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'lcp-element',
          resource: elementUrl || selector || elementTag || 'Primary visual element',
          selector: selector,
          details: {
            elementTag: elementTag || 'element',
            renderTimeMs: lcpDetails.renderTimeMs || null,
            loadTimeMs: lcpDetails.loadTimeMs || null,
            isFallback: lcpDetails.isFallback || false
          }
        }
      ];

      const finding: RecommendationFinding = {
        description: `Largest Contentful Paint is ${lcpSeconds.toFixed(2)}s, exceeding the 2.5s threshold for good user experience.`,
        metric: 'LCP',
        value: Number(lcpSeconds.toFixed(2)),
        unit: 's'
      };

      let dynamicTitle = this.title;
      let dynamicFix = 'Ensure the LCP resource is discovered early in HTML, preloaded with <link rel="preload">, and served with optimal caching.';
      let potentialImpact = 'Accelerates time-to-render for the primary content block seen by users.';

      if (isImage) {
        dynamicTitle = 'Preload and compress the Largest Contentful Paint hero image';
        dynamicFix = `Add <link rel="preload" as="image" href="${elementUrl || 'image_url'}"> in <head> and serve modern WebP/AVIF format with fetchpriority="high".`;
        potentialImpact = 'Reduces resource discovery and download latency for the primary hero image.';
      } else {
        dynamicTitle = 'Reduce render delay for Largest Contentful Paint text/container block';
        dynamicFix = 'Eliminate render-blocking CSS/JS and inline critical styles required to paint the LCP text block immediately after DOM parse.';
        potentialImpact = 'Unblocks browser layout and font styling to render the main heading or text block earlier.';
      }

      const evidence = `Largest Contentful Paint: ${lcpSeconds.toFixed(2)}s (${elementTag || 'element'}: ${elementUrl || selector || 'primary visual block'})`;

      return {
        id: this.id,
        findingId: 'REC_PERF_LCP_ELEMENT_001',
        analyzer: 'performance',
        title: dynamicTitle,
        description: this.description,
        category: this.category,
        severity: lcpSeconds > 4.0 ? 'high' : 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: dynamicFix,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/lcp',
        // Backward-compatibility fields
        issue: dynamicTitle,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        priority: lcpSeconds > 4.0 ? 'critical' : 'high',
        sourceAnalyzer: 'puppeteer',
        estimatedBandwidthSaving: 0,
        resource: elementUrl || selector || 'LCP Element',
        actualValue: `Largest Contentful Paint: ${lcpSeconds.toFixed(2)}s (Element: ${elementTag || 'container'})`,
        expectedValue: 'Largest Contentful Paint <= 2.50s',
        reason: 'Delayed LCP element loading increases perceived page wait time for users.'
      };
    }
  },

  // ==========================================
  // 3. PERFORMANCE: CORE WEB VITALS - CLS
  // ==========================================
  {
    id: 'REC_PERF_CLS_SHIFTS',
    title: 'Reserve dimensions for dynamic elements to eliminate layout shifts',
    description: 'Unexpected layout shifts disrupt reading and can cause users to accidentally click the wrong links or buttons.',
    category: 'performance',
    estimatedDifficulty: 'medium',
    hoursToImplement: 1.0,
    evaluate(input) {
      const vitals = input.vitals || input.pagespeed?.vitals;
      if (!vitals?.cls) return null;

      if (vitals.cls?.available === false || vitals.cls?.value === 'N/A') {
        return null;
      }

      const clsVal = parseMetricNumeric(vitals.cls);

      // STRICT CWV THRESHOLD: CLS <= 0.10 is GOOD. Absolutely DO NOT fire recommendation on good CLS!
      if (clsVal === null || isNaN(clsVal) || clsVal <= 0.10) {
        return null;
      }

      const clsDetails = vitals.clsDetails || input.pagespeed?.vitals?.clsDetails || input.pagespeed?.clsDetails || vitals.cls || {};
      const shifts: any[] = clsDetails?.shifts || vitals.cls?.shifts || [];
      const shiftCount = clsDetails?.shiftCount ?? vitals.cls?.shiftCount ?? (shifts.length > 0 ? shifts.length : null);
      const largestShift = clsDetails?.largestShift ?? vitals.cls?.largestShift ?? (shifts.length > 0 ? Math.max(...shifts.map((s: any) => s.value || 0)) : 0);

      const evidenceDetails: RecommendationEvidence[] = [];
      if (shifts.length > 0) {
        shifts.slice(0, 5).forEach((s: any) => {
          evidenceDetails.push({
            type: 'layout-shift-event',
            selector: s.sources?.[0]?.node?.selector || s.selector || 'dynamic-node',
            details: {
              shiftScore: s.value,
              previousRect: s.sources?.[0]?.previousRect || null,
              currentRect: s.sources?.[0]?.currentRect || null
            }
          });
        });
      } else {
        evidenceDetails.push({
          type: 'cls-metric',
          value: Number(clsVal.toFixed(3)),
          details: { shiftCount, largestShift: Number(largestShift.toFixed(3)) }
        });
      }

      const finding: RecommendationFinding = {
        description: `Cumulative Layout Shift is ${clsVal.toFixed(3)}, exceeding the 0.10 threshold for visual stability${shiftCount ? ` (${shiftCount} shift event(s))` : ''}`,
        metric: 'CLS',
        value: Number(clsVal.toFixed(3)),
        unit: ''
      };

      const potentialImpact = 'Prevents unexpected page shifts and eliminates visual disorientation during scrolling and reading.';
      const evidence = `Cumulative Layout Shift: ${clsVal.toFixed(3)} (${shiftCount} layout shift(s), largest: ${Number(largestShift).toFixed(3)})`;

      return {
        id: this.id,
        findingId: 'REC_PERF_CLS_SHIFTS_001',
        analyzer: 'performance',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: clsVal > 0.25 ? 'high' : 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Set explicit width and height attributes on all images and video tags, and use CSS aspect-ratio or min-height to reserve space for dynamic widgets and banners.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hour`,
        refUrl: 'https://web.dev/articles/cls',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        priority: clsVal > 0.25 ? 'critical' : 'high',
        sourceAnalyzer: 'puppeteer',
        estimatedBandwidthSaving: 0,
        actualValue: `Cumulative Layout Shift: ${clsVal.toFixed(3)} (${shiftCount} shifts, largest: ${Number(largestShift).toFixed(3)})`,
        expectedValue: 'Cumulative Layout Shift <= 0.100',
        reason: 'Unreserved dimensions on dynamic assets push existing content downward as they render.'
      };
    }
  },

  // ==========================================
  // 4. PERFORMANCE: CORE WEB VITALS - INP (FIELD ONLY)
  // ==========================================
  {
    id: 'REC_PERF_INP_FIELD',
    title: 'Optimize event handler responsiveness to improve Interaction to Next Paint',
    description: 'Interaction to Next Paint (INP) measures the latency of all user interactions (clicks, taps, and keypresses) throughout the page lifecycle.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 4.0,
    evaluate(input) {
      const vitals = input.vitals || input.pagespeed?.vitals;
      if (!vitals?.inp) return null;

      // INP is ONLY valid if measured from real field interactions (CrUX)
      // Lab crawls MUST NOT generate an INP recommendation from TTI, TBT, or fallbacks
      const isField = vitals.inp?.mode === 'field' || vitals.inp?.source === 'crux' || vitals.mode === 'field' || vitals.source === 'crux';
      if (!isField || vitals.inp?.available === false || vitals.inp?.value === 'N/A') {
        return null;
      }

      const inpMs = parseMetricNumeric(vitals.inp);
      if (inpMs === null || isNaN(inpMs) || inpMs <= 200) {
        return null; // INP is good (<= 200ms)
      }

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'field-inp-measurement',
          resource: 'Chrome User Experience Report (CrUX)',
          duration: Math.round(inpMs),
          details: {
            source: vitals.inp.source || 'crux',
            mode: 'field',
            p75ValueMs: Math.round(inpMs)
          }
        }
      ];

      const finding: RecommendationFinding = {
        description: `Real-world field Interaction to Next Paint is ${Math.round(inpMs)}ms, exceeding the 200ms threshold (CrUX 75th percentile).`,
        metric: 'INP',
        value: Math.round(inpMs),
        unit: 'ms'
      };

      const potentialImpact = 'Accelerates visual response to user clicks, taps, and keypresses, eliminating UI lag.';
      const evidence = `Real-world field INP (CrUX 75th percentile): ${Math.round(inpMs)}ms exceeding 200ms threshold`;

      return {
        id: this.id,
        findingId: 'REC_PERF_INP_FIELD_001',
        analyzer: 'performance',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: inpMs > 500 ? 'high' : 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Debounce fast-firing event handlers, avoid synchronous layout recalculations inside click handlers, and use startTransition or scheduler.postTask for non-urgent DOM mutations.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/inp',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        priority: inpMs > 500 ? 'critical' : 'high',
        sourceAnalyzer: 'crux',
        estimatedBandwidthSaving: 0,
        actualValue: `Interaction to Next Paint: ${Math.round(inpMs)}ms (CrUX field p75)`,
        expectedValue: 'Interaction to Next Paint <= 200ms',
        reason: 'Long-running event listeners and heavy DOM updates delay the next paint after user input.'
      };
    }
  },

  // ==========================================
  // 5. ASSETS: IMAGE COMPRESSION & FORMATS
  // ==========================================
  {
    id: 'REC_IMAGE_COMPRESSION',
    title: 'Compress page images and convert to next-gen formats (WebP/AVIF)',
    description: 'WebP and AVIF image formats provide superior compression performance compared to legacy PNG/JPEG, reducing download latency.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      let totalSavings = 0;
      const candidates: any[] = [];
      
      if (input.image && input.image.optimizationCandidates) {
        input.image.optimizationCandidates.forEach((cand: any) => {
          if (cand.estimatedSizeReductionKb > 5) {
            totalSavings += cand.estimatedSizeReductionKb;
            candidates.push(cand);
          }
        });
      }

      if (candidates.length === 0 && Array.isArray(input.image?.images)) {
        input.image.images.forEach((img: any) => {
          const savings = img.savingsKb || img.estimatedSavingsKb || 0;
          if (savings > 5) {
            totalSavings += savings;
            candidates.push({
              url: img.url || img.src || 'image',
              sizeKb: img.fileSizeKb || img.sizeKb || null,
              format: img.extension || img.format || 'legacy',
              estimatedSizeReductionKb: savings
            });
          }
        });
      }

      if (totalSavings <= 10 || candidates.length === 0) {
        return null;
      }

      const savingsKb = Math.round(totalSavings);
      const sample = candidates[0];

      const evidenceDetails: RecommendationEvidence[] = candidates.slice(0, 5).map((cand: any) => ({
        type: 'uncompressed-image',
        resource: cand.url,
        sizeKb: cand.sizeKb || null,
        details: {
          currentFormat: cand.format || cand.currentType || 'Standard format',
          estimatedReductionKb: Math.round(cand.estimatedSizeReductionKb || 0)
        }
      }));

      const finding: RecommendationFinding = {
        description: `${candidates.length} uncompressed or legacy image(s) detected with ${savingsKb} KB potential reduction`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces initial image payload bytes transmitted across the network.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Analyzed ${candidates.length} images; sample: ${sample.url} can save ${sample.estimatedSizeReductionKb || 0} KB using WebP/AVIF`;

      return {
        id: this.id,
        findingId: 'REC_IMAGE_COMPRESSION_001',
        analyzer: 'image',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: savingsKb > 500 ? 'high' : 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Optimize raw image assets using sharp, imagemin, or dynamic CDN image transforms to compress payloads and serve next-gen formats (WebP/AVIF).',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/serve-images-webp',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: savingsKb > 500 ? 'critical' : savingsKb > 100 ? 'high' : 'medium',
        sourceAnalyzer: 'image',
        estimatedBandwidthSaving: savingsKb,
        resource: sample.url,
        actualValue: `${candidates.length} uncompressed or legacy image(s) (${savingsKb} KB potential savings)`,
        expectedValue: 'Serve modern WebP or AVIF image formats compressed for web viewing',
        reason: 'Legacy image formats transfer excess bytes over the network, consuming bandwidth.'
      };
    }
  },

  // ==========================================
  // 6. ASSETS: IMAGE LAZY LOADING
  // ==========================================
  {
    id: 'REC_IMAGE_LAZY_LOAD',
    title: 'Implement lazy loading for below-the-fold images',
    description: 'Deferring offscreen images reduces initial page network competition and payload weight.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const imagesList: any[] = input.image?.images || [];
      const belowTheFoldUnlazy = imagesList.filter((img: any) =>
        (img.isBelowTheFold === true || (!img.heroImageCandidate && img.fetchPriority !== 'high')) &&
        img.lazyLoading !== true &&
        img.lazyLoaded !== true
      );
      const missingCount = belowTheFoldUnlazy.length > 0
        ? belowTheFoldUnlazy.length
        : (input.image?.summary?.belowTheFoldImagesMissingLazyLoading ?? input.image?.summary?.imagesMissingLazyLoading ?? 0);

      if (missingCount <= 0) return null;

      const evidenceDetails: RecommendationEvidence[] = belowTheFoldUnlazy.length > 0
        ? belowTheFoldUnlazy.slice(0, 5).map((img: any) => ({
            type: 'missing-lazy-load',
            resource: img.url || img.selector || 'img:not([loading="lazy"])',
            details: {
              selector: img.selector,
              isBelowTheFold: img.isBelowTheFold,
              renderedDimensions: img.renderedWidth && img.renderedHeight ? `${img.renderedWidth}x${img.renderedHeight}` : undefined
            }
          }))
        : [
            {
              type: 'missing-lazy-load',
              resource: 'img:not([loading="lazy"])',
              details: { unlazyImageCount: missingCount }
            }
          ];

      const finding: RecommendationFinding = {
        description: `${missingCount} below-the-fold image(s) loaded synchronously without loading="lazy"`,
        metric: 'NETWORK',
        value: missingCount,
        unit: 'images'
      };

      const potentialImpact = 'Relieves initial network contention by deferring image requests outside the viewport.';
      const evidence = `${missingCount} img element(s) detected without loading="lazy" attribute`;

      return {
        id: this.id,
        findingId: 'REC_IMAGE_LAZY_LOAD_001',
        analyzer: 'image',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: `Add loading="lazy" attribute to all ${missingCount} images that appear below the viewport fold.`,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/browser-level-image-lazy-loading',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'Not quantified',
        priority: 'medium',
        sourceAnalyzer: 'image',
        estimatedBandwidthSaving: 0,
        resource: 'img[loading="lazy"]',
        actualValue: `${missingCount} below-the-fold image(s) loaded synchronously`,
        expectedValue: 'Add loading="lazy" attribute to all non-hero images outside the initial viewport',
        reason: 'Offscreen images load during critical page initialization, competing for network bandwidth.'
      };
    }
  },

  // ==========================================
  // 6b. ASSETS: OVERSIZED IMAGES
  // ==========================================
  {
    id: 'REC_IMAGE_OVERSIZED',
    title: 'Properly size images to match rendered display dimensions',
    description: 'Serving images with natural pixel dimensions significantly larger than rendered display dimensions wastes network bandwidth and memory.',
    category: 'performance',
    estimatedDifficulty: 'medium',
    hoursToImplement: 1.0,
    evaluate(input) {
      const candidates: any[] = (input.image?.images || []).filter((img: any) => img.isOversized === true);
      if (candidates.length === 0) {
        const candList = (input.image?.optimizationCandidates || []).filter((c: any) => c.isOversized && c.naturalDimensions && c.renderedDimensions);
        if (candList.length === 0) return null;
        candidates.push(...candList);
      }

      const count = candidates.length;
      const sample = candidates[0];
      const sampleUrl = sample.url || sample.src || 'image';

      const evidenceDetails: RecommendationEvidence[] = candidates.slice(0, 5).map((img: any) => ({
        type: 'oversized-image',
        resource: img.url || img.src || 'image',
        details: {
          naturalDimensions: img.naturalDimensions || (img.naturalWidth && img.naturalHeight ? `${img.naturalWidth}x${img.naturalHeight}` : 'Not measured'),
          renderedDimensions: img.renderedDimensions || (img.renderedWidth && img.renderedHeight ? `${img.renderedWidth}x${img.renderedHeight}` : 'Not measured'),
          oversizedRatio: img.oversizedRatio || 'Not measured',
          selector: img.selector
        }
      }));

      const finding: RecommendationFinding = {
        description: `${count} image(s) exceed rendered display dimensions by >1.5x, transferring excess pixels`,
        metric: 'NETWORK',
        value: count,
        unit: 'images'
      };

      const potentialImpact = 'Reduces image download payload and browser image decoding/memory overhead.';
      const sampleNatural = sample.naturalDimensions || (sample.naturalWidth && sample.naturalHeight ? `${sample.naturalWidth}x${sample.naturalHeight}` : 'natural dimensions');
      const sampleRendered = sample.renderedDimensions || (sample.renderedWidth && sample.renderedHeight ? `${sample.renderedWidth}x${sample.renderedHeight}` : 'display dimensions');
      const evidence = `${count} oversized image(s) detected; sample: ${sampleUrl} is ${sampleNatural} but rendered at ${sampleRendered}`;

      return {
        id: this.id,
        findingId: 'REC_IMAGE_OVERSIZED_001',
        analyzer: 'image',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Resize source images or implement responsive srcset/sizes attributes so the browser downloads image assets tailored to the viewport resolution.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/serve-responsive-images',
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'Not quantified',
        priority: 'medium',
        sourceAnalyzer: 'image',
        estimatedBandwidthSaving: 0,
        resource: sampleUrl,
        actualValue: `${count} oversized image(s) (natural dimensions > 1.5x rendered dimensions)`,
        expectedValue: 'Serve appropriately sized images matching display dimensions or use srcset/sizes',
        reason: 'Large images scaled down via CSS waste download bytes and increase memory pressure.'
      };
    }
  },

  // ==========================================
  // 7. JAVASCRIPT: MINIFICATION (EVIDENCE-ONLY)
  // ==========================================
  {
    id: 'REC_JS_MINIFY',
    title: 'Minify JavaScript assets to reduce payload size',
    description: 'Minifying JavaScript removes whitespace, comments, and redundant formatting without altering behavior.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      // Strictly require actual unminified scripts with concrete evidence.
      // Large JS DOES NOT automatically imply unminified JS!
      const unminifiedMap = new Map<string, any>();
      (input.js?.scripts || []).filter((s: any) => !s.isMinified && ((s.fileSizeKb || s.sizeKb || 0) > 10)).forEach((s: any) => {
        const url = s.url || 'script.js';
        if (!unminifiedMap.has(url)) unminifiedMap.set(url, s);
      });
      (input.js?.unminifiedScripts || []).filter((s: any) => typeof s === 'string' || ((s.fileSizeKb || s.sizeKb || 0) > 10)).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'script.js');
        const sizeKb = typeof s === 'string' ? 25 : (s.fileSizeKb || s.sizeKb || 25);
        if (!unminifiedMap.has(url)) {
          unminifiedMap.set(url, typeof s === 'string' ? { url: s, fileSizeKb: sizeKb, isMinified: false } : s);
        }
      });
      const unminifiedScripts = Array.from(unminifiedMap.values());
      
      if (unminifiedScripts.length === 0) {
        return null;
      }

      let reductionKb = 0;
      unminifiedScripts.forEach((s: any) => {
        const size = s.fileSizeKb || s.sizeKb || 0;
        reductionKb += (size * 0.20); // ~20% conservative minification estimate
      });

      const sampleScript = unminifiedScripts[0];
      const savingsKb = Math.round(reductionKb);
      const sampleSize = (sampleScript.fileSizeKb || sampleScript.sizeKb || 0).toFixed(1);

      const evidenceDetails: RecommendationEvidence[] = unminifiedScripts.slice(0, 5).map((s: any) => ({
        type: 'unminified-js',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { isMinified: false }
      }));

      const finding: RecommendationFinding = {
        description: `${unminifiedScripts.length} unminified JavaScript file(s) detected with ${savingsKb} KB potential reduction`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces JavaScript asset download size and initial script parse overhead.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Unminified script: ${sampleScript.url} (Size: ${sampleSize} KB, Minified: false)`;

      return {
        id: this.id,
        findingId: 'REC_JS_MINIFY_001',
        analyzer: 'js',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: savingsKb > 100 ? 'high' : 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Integrate Terser, esbuild, or SWC into your production build pipeline to strip whitespace and shorten identifiers.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/reduce-javascript-payloads-with-code-splitting',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: savingsKb > 100 ? 'high' : 'medium',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: savingsKb,
        resource: sampleScript.url,
        actualValue: `${unminifiedScripts.length} unminified script(s) (${savingsKb} KB projected savings)`,
        expectedValue: 'All production JavaScript assets should be minified with whitespace and comments stripped',
        reason: 'Unminified JavaScript includes whitespace, comments, and un-mangled identifiers that increase download size.'
      };
    }
  },

  // ==========================================
  // 8. JAVASCRIPT: NETWORK COMPRESSION
  // ==========================================
  {
    id: 'REC_JS_COMPRESS',
    title: 'Enable network compression for JavaScript assets',
    description: 'Compressing text assets with Brotli or Gzip significantly decreases wire transfer payload sizes.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const uncompressedScriptsMap = new Map<string, any>();
      (input.js?.scripts || []).filter((s: any) => s.compression === 'none' && (s.fileSizeKb || s.sizeKb || 0) > 10).forEach((s: any) => {
        const url = s.url || 'script.js';
        if (!uncompressedScriptsMap.has(url)) uncompressedScriptsMap.set(url, s);
      });
      (Array.isArray(input.js?.uncompressedScripts) ? input.js.uncompressedScripts : []).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'script.js');
        const sizeKb = typeof s === 'string' ? 30 : (s.fileSizeKb || s.sizeKb || 30);
        if (!uncompressedScriptsMap.has(url)) {
          uncompressedScriptsMap.set(url, typeof s === 'string' ? { url: s, fileSizeKb: sizeKb, compression: 'none' } : s);
        }
      });
      const uncompressedScripts = Array.from(uncompressedScriptsMap.values());
      if (uncompressedScripts.length === 0) return null;

      let reductionKb = 0;
      uncompressedScripts.forEach((s: any) => {
        const size = s.fileSizeKb || s.sizeKb || 0;
        reductionKb += (size * 0.60); // ~60% compression ratio
      });

      const sampleScript = uncompressedScripts[0];
      const savingsKb = Math.round(reductionKb);
      const evidenceDetails: RecommendationEvidence[] = uncompressedScripts.slice(0, 5).map((s: any) => ({
        type: 'uncompressed-js',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { contentEncoding: 'none' }
      }));

      const finding: RecommendationFinding = {
        description: `${uncompressedScripts.length} uncompressed JavaScript file(s) served without Content-Encoding header (${savingsKb} KB potential reduction)`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Shrinks raw wire transfer sizes over HTTP by 60-70%.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Script ${sampleScript.url} (${sampleScript.fileSizeKb?.toFixed(1) || 'large'} KB) served without compression headers`;

      return {
        id: this.id,
        findingId: 'REC_JS_COMPRESS_001',
        analyzer: 'js',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Configure your web server or CDN (Cloudflare, CloudFront, Nginx) to serve JavaScript with Brotli (br) or Gzip (gzip) compression.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/optimizing-content-efficiency-effective-compression',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'high',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: savingsKb,
        resource: sampleScript.url,
        actualValue: `${uncompressedScripts.length} uncompressed JavaScript file(s) (Content-Encoding: none)`,
        expectedValue: 'Serve JavaScript files compressed with Brotli (br) or Gzip (gzip)',
        reason: 'Serving raw uncompressed text files over HTTP wastes network transit bandwidth.'
      };
    }
  },

  // ==========================================
  // 9. JAVASCRIPT: DUPLICATE SCRIPTS
  // ==========================================
  {
    id: 'REC_JS_DUPLICATE',
    title: 'Remove duplicate JavaScript library loads',
    description: 'Loading identical scripts multiple times wastes network bandwidth and causes redundant V8 compilation.',
    category: 'best-practices',
    estimatedDifficulty: 'medium',
    hoursToImplement: 1.0,
    evaluate(input) {
      const duplicateCount = input.js?.summary?.duplicateScripts || 0;
      if (duplicateCount <= 0) return null;

      const duplicateScripts = (input.js?.scripts || []).filter((s: any) => s.isDuplicate);
      if (duplicateScripts.length === 0 && Array.isArray(input.js?.packages)) {
        input.js.packages.filter((p: any) => p.isDuplicate).forEach((p: any) => {
          duplicateScripts.push({ url: p.packageName || p.name || 'package', fileSizeKb: p.sizeKb || 0, isDuplicate: true });
        });
      }

      let sizeKb = 0;
      duplicateScripts.forEach((s: any) => sizeKb += (s.fileSizeKb || s.sizeKb || 0));
      const savingsKb = Math.round(sizeKb / 2);
      const sampleUrl = duplicateScripts[0]?.url || 'script.js';

      const evidenceDetails: RecommendationEvidence[] = duplicateScripts.slice(0, 5).map((s: any) => ({
        type: 'duplicate-script',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { duplicateCount: duplicateCount }
      }));

      const finding: RecommendationFinding = {
        description: `${duplicateCount} duplicate script request(s) detected in network log`,
        metric: 'NETWORK',
        value: duplicateCount,
        unit: 'scripts'
      };

      const potentialImpact = 'Eliminates redundant network round-trips and prevents duplicate JavaScript evaluation in the browser engine.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Duplicate script: ${sampleUrl} requested multiple times in page network logs`;

      return {
        id: this.id,
        findingId: 'REC_JS_DUPLICATE_001',
        analyzer: 'js',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Audit script tags and bundler dependencies to ensure shared modules are only imported once.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hour`,
        refUrl: 'https://web.dev/',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'critical',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: savingsKb,
        resource: sampleUrl,
        actualValue: `${duplicateCount} duplicate script request(s) detected`,
        expectedValue: 'Each JavaScript library should be bundled or requested exactly once per page load',
        reason: 'Duplicate scripts force redundant network round-trips and duplicate JavaScript compilation.'
      };
    }
  },

  // ==========================================
  // 10. JAVASCRIPT: RENDER BLOCKING (EVIDENCE-ONLY)
  // ==========================================
  {
    id: 'REC_JS_RENDER_BLOCKING',
    title: 'Defer or load render-blocking JavaScript asynchronously',
    description: 'Synchronous scripts in the document head block the HTML parser until they are downloaded and executed.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      // Require actual blocking scripts discovered in DOM <head> without async/defer/module
      const scriptMap = new Map<string, any>();
      const rawScripts = input.js?.scripts || [];
      rawScripts.filter((s: any) => s.isRenderBlocking).forEach((s: any) => {
        const url = s.url || 'inline script';
        if (!scriptMap.has(url)) scriptMap.set(url, s);
      });
      (Array.isArray(input.js?.renderBlockingScripts) ? input.js.renderBlockingScripts : []).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'inline script');
        if (!scriptMap.has(url)) {
          scriptMap.set(url, typeof s === 'string' ? { url: s, isRenderBlocking: true } : s);
        }
      });
      const blockingScripts = Array.from(scriptMap.values());
      if (blockingScripts.length === 0) {
        if (rawScripts.length === 0) {
          const summaryCount = input.js?.summary?.renderBlockingScripts || input.js?.summary?.renderBlockingJSFiles || 0;
          if (summaryCount > 0) {
            blockingScripts.push({ url: '<head> script', isRenderBlocking: true, parserBlockingStatus: true });
          } else {
            return null;
          }
        } else {
          return null;
        }
      }

      const sample = blockingScripts[0];
      const evidenceDetails: RecommendationEvidence[] = blockingScripts.slice(0, 5).map((s: any) => ({
        type: 'render-blocking-script',
        resource: s.url,
        details: {
          scriptUrl: s.url,
          async: s.isAsync ?? false,
          defer: s.isDefer ?? false,
          module: s.isModuleScript ?? false,
          documentPosition: s.documentPosition || '<head>',
          parserBlockingStatus: s.parserBlockingStatus ?? true,
          blockingDurationMs: s.estimatedMainThreadBlockingMs ?? null
        }
      }));

      const finding: RecommendationFinding = {
        description: `${blockingScripts.length} parser-blocking script(s) located in <head> without async/defer attributes`,
        metric: 'RENDER_BLOCKING',
        value: blockingScripts.length,
        unit: 'scripts'
      };

      const potentialImpact = 'Unblocks the browser HTML parser to construct DOM and Render Tree earlier.';
      const evidence = blockingScripts.slice(0, 3).map((s: any) =>
        `Script: ${s.url} | Position: ${s.documentPosition || '<head>'} | async: ${s.isAsync ?? false} | defer: ${s.isDefer ?? false} | module: ${s.isModuleScript ?? false} | parserBlocking: ${s.parserBlockingStatus ?? true}${s.estimatedMainThreadBlockingMs ? ` | duration: ${s.estimatedMainThreadBlockingMs}ms` : ''}`
      ).join(' ; ');

      return {
        id: this.id,
        findingId: 'REC_JS_RENDER_BLOCKING_001',
        analyzer: 'js',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Add the defer or async attribute to non-critical script tags in <head>, or convert scripts to type="module".',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/render-blocking-resources',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'Not quantified',
        priority: 'high',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: 0,
        resource: sample.url,
        actualValue: `${blockingScripts.length} parser-blocking script(s) in <head>`,
        expectedValue: 'Non-critical scripts should declare async, defer, or type="module"',
        reason: 'Synchronous scripts in the document head block the HTML parser until downloaded and executed.'
      };
    }
  },

  // ==========================================
  // 11. JAVASCRIPT: UNUSED JS (MEASURED COVERAGE ONLY)
  // ==========================================
  {
    id: 'REC_JS_UNUSED',
    title: 'Reduce JavaScript not required during initial page load',
    description: 'Observed unexecuted JavaScript code increases initial download weight and CPU parsing/compilation overhead.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 4.0,
    evaluate(input) {
      // Strictly require actual measured coverage (CDP) evidence > 50KB.
      // Large JS DOES NOT automatically imply unused JS! No arbitrary percentages!
      const unusedJsKb = input.js?.summary?.estimatedUnusedJS || 0;
      const hasMeasuredCoverage = (input.js?.scripts || []).some((s: any) => s.estimatedUnusedJsKb !== undefined && s.estimatedUnusedJsKb > 0);
      
      if (unusedJsKb <= 50 || !hasMeasuredCoverage) {
        return null;
      }

      const savingsKb = Math.round(unusedJsKb);
      const measuredScripts = (input.js?.scripts || []).filter((s: any) => (s.estimatedUnusedJsKb || 0) > 0);

      // Check whether build-time evidence (such as bundle analyzer duplicate packages or module exports) exists
      const bundleAnalysis = input.js?.bundleAnalysis || input.js?.bundle;
      const hasBuildTimeEvidence = Boolean(
        bundleAnalysis &&
        ((bundleAnalysis.duplicatePackages && bundleAnalysis.duplicatePackages.length > 0) ||
         (bundleAnalysis.packages && bundleAnalysis.packages.length > 0))
      );

      const evidenceDetails: RecommendationEvidence[] = measuredScripts.slice(0, 5).map((s: any) => ({
        type: 'cdp-coverage-unused-js',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: {
          unusedKb: Math.round(s.estimatedUnusedJsKb || 0),
          coverageMethod: 'Chrome DevTools Protocol'
        }
      }));

      const finding: RecommendationFinding = {
        description: `Approximately ${savingsKb} KB of JavaScript was not executed during this page load.`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces initial script transfer size and deferred compilation overhead on the main thread.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Approximately ${savingsKb} KB of JavaScript remained unexecuted during initial page load.`;

      const suggestedFix = hasBuildTimeEvidence
        ? 'Investigate unused code and dependency bloat: Defer unexecuted interactive code using dynamic import() code splitting, and check build configuration for unused package exports.'
        : 'Reduce JavaScript that is not required during initial page load: Defer non-critical interactive components and third-party scripts using dynamic import() route-based code splitting.';

      const reason = 'Loading unexecuted JavaScript delays page interactivity and consumes unnecessary bandwidth on initial load.';

      return {
        id: this.id,
        findingId: 'REC_JS_UNUSED_001',
        analyzer: 'js',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: savingsKb > 200 ? 'high' : 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/reduce-javascript-payloads-with-code-splitting',
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'medium',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: savingsKb,
        resource: 'JavaScript Bundles',
        actualValue: `Approximately ${savingsKb} KB unexecuted JavaScript during initial load`,
        expectedValue: 'Minimize unexecuted JavaScript during initial load (< 50 KB)',
        reason
      };
    }
  },

  // ==========================================
  // 12. CSS: MINIFICATION
  // ==========================================
  {
    id: 'REC_CSS_MINIFY',
    title: 'Minify CSS stylesheets to reduce weight',
    description: 'Minifying CSS strips comments and redundant whitespace from stylesheets.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const unminifiedCssMap = new Map<string, any>();
      (input.css?.stylesheets || []).filter((s: any) => !s.isMinified && (s.fileSizeKb || s.sizeKb || 0) > 5).forEach((s: any) => {
        const url = s.url || 'stylesheet.css';
        if (!unminifiedCssMap.has(url)) unminifiedCssMap.set(url, s);
      });
      (Array.isArray(input.css?.unminifiedStylesheets) ? input.css.unminifiedStylesheets : []).filter((s: any) => typeof s === 'string' || ((s.fileSizeKb || s.sizeKb || 0) > 5)).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'stylesheet.css');
        const sizeKb = typeof s === 'string' ? 15 : (s.fileSizeKb || s.sizeKb || 15);
        if (!unminifiedCssMap.has(url)) {
          unminifiedCssMap.set(url, typeof s === 'string' ? { url: s, fileSizeKb: sizeKb, isMinified: false } : s);
        }
      });
      const unminifiedCss = Array.from(unminifiedCssMap.values());
      if (unminifiedCss.length === 0) return null;

      let reductionKb = 0;
      unminifiedCss.forEach((s: any) => reductionKb += ((s.fileSizeKb || s.sizeKb || 0) * 0.15));
      const sampleCss = unminifiedCss[0];
      const savingsKb = Math.round(reductionKb);

      const evidenceDetails: RecommendationEvidence[] = unminifiedCss.slice(0, 5).map((s: any) => ({
        type: 'unminified-css',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { isMinified: false }
      }));

      const finding: RecommendationFinding = {
        description: `${unminifiedCss.length} unminified stylesheet(s) detected with ${savingsKb} KB potential reduction`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces stylesheet transfer sizes over the network.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Unminified stylesheet: ${sampleCss.url} (${(sampleCss.fileSizeKb || sampleCss.sizeKb || 0).toFixed(1)} KB, Minified: false)`;

      return {
        id: this.id,
        findingId: 'REC_CSS_MINIFY_001',
        analyzer: 'css',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Minify production CSS using clean-css, cssnano, or esbuild during compilation.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/defer-non-critical-css',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'medium',
        sourceAnalyzer: 'css',
        estimatedBandwidthSaving: savingsKb,
        resource: sampleCss.url,
        actualValue: `${unminifiedCss.length} unminified stylesheet(s) (${savingsKb} KB projected savings)`,
        expectedValue: 'All external CSS stylesheets should be minified with comments and whitespace stripped',
        reason: 'Unminified CSS includes formatting whitespace and comments that expand file transfer size.'
      };
    }
  },

  // ==========================================
  // 13. CSS: NETWORK COMPRESSION
  // ==========================================
  {
    id: 'REC_CSS_COMPRESS',
    title: 'Enable network compression for CSS assets',
    description: 'Enabling Brotli or Gzip compression for stylesheets shrinks network payload sizes.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const uncompressedCssMap = new Map<string, any>();
      (input.css?.stylesheets || []).filter((s: any) => s.compression === 'none' && (s.fileSizeKb || s.sizeKb || 0) > 10).forEach((s: any) => {
        const url = s.url || 'stylesheet.css';
        if (!uncompressedCssMap.has(url)) uncompressedCssMap.set(url, s);
      });
      (Array.isArray(input.css?.uncompressedStylesheets) ? input.css.uncompressedStylesheets : []).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'stylesheet.css');
        const sizeKb = typeof s === 'string' ? 20 : (s.fileSizeKb || s.sizeKb || 20);
        if (!uncompressedCssMap.has(url)) {
          uncompressedCssMap.set(url, typeof s === 'string' ? { url: s, fileSizeKb: sizeKb, compression: 'none' } : s);
        }
      });
      const uncompressedCss = Array.from(uncompressedCssMap.values());
      if (uncompressedCss.length === 0) return null;

      let reductionKb = 0;
      uncompressedCss.forEach((s: any) => reductionKb += ((s.fileSizeKb || s.sizeKb || 0) * 0.70));
      const sampleCss = uncompressedCss[0];
      const savingsKb = Math.round(reductionKb);

      const evidenceDetails: RecommendationEvidence[] = uncompressedCss.slice(0, 5).map((s: any) => ({
        type: 'uncompressed-css',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { contentEncoding: 'none' }
      }));

      const finding: RecommendationFinding = {
        description: `${uncompressedCss.length} uncompressed CSS file(s) served without Content-Encoding (${savingsKb} KB potential reduction)`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces CSS wire transit bytes by 70-80%.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `Stylesheet ${sampleCss.url} (${(sampleCss.fileSizeKb || sampleCss.sizeKb || 0).toFixed(1)} KB) served without compression`;

      return {
        id: this.id,
        findingId: 'REC_CSS_COMPRESS_001',
        analyzer: 'css',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Configure your origin server or CDN to serve stylesheets using Brotli or Gzip encoding.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/optimizing-content-efficiency-effective-compression',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'medium',
        sourceAnalyzer: 'css',
        estimatedBandwidthSaving: savingsKb,
        resource: sampleCss.url,
        actualValue: `${uncompressedCss.length} uncompressed CSS file(s) (Content-Encoding: none)`,
        expectedValue: 'Serve CSS stylesheets compressed with Brotli or Gzip',
        reason: 'Text stylesheets compress by 70-80% when Gzip or Brotli compression is enabled.'
      };
    }
  },

  // ==========================================
  // 14. CSS: RENDER BLOCKING STYLESHEETS
  // ==========================================
  {
    id: 'REC_CSS_RENDER_BLOCKING',
    title: 'Extract critical CSS rules and defer non-critical styles',
    description: 'External stylesheets block the browser from constructing the Render Tree until downloaded and parsed.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 3.0,
    evaluate(input) {
      const totalCssWeight = input.css?.summary?.totalCSSWeight ?? input.css?.summary?.totalCSSSizeKb ?? input.css?.summary?.totalSizeKb;
      if (typeof totalCssWeight === 'number' && totalCssWeight <= 10) {
        return null;
      }

      // Require actual large render-blocking stylesheets (> 10KB)
      const cssMap = new Map<string, any>();
      const rawStylesheets = input.css?.stylesheets || [];
      rawStylesheets.filter((s: any) => s.isRenderBlocking && ((s.fileSizeKb || s.sizeKb || 0) > 10 || (s.fileSizeKb === undefined && s.sizeKb === undefined))).forEach((s: any) => {
        const url = s.url || 'stylesheet.css';
        if (!cssMap.has(url)) cssMap.set(url, s);
      });
      (Array.isArray(input.css?.renderBlockingStylesheets) ? input.css.renderBlockingStylesheets : []).forEach((s: any) => {
        const url = typeof s === 'string' ? s : (s.url || 'stylesheet.css');
        if (!cssMap.has(url)) {
          cssMap.set(url, typeof s === 'string' ? { url: s, isRenderBlocking: true } : s);
        }
      });
      const blockingStylesheets = Array.from(cssMap.values());
      if (blockingStylesheets.length === 0) {
        if (rawStylesheets.length === 0) {
          const summaryCount = input.css?.summary?.renderBlockingCSS || 0;
          if (summaryCount > 0) {
            blockingStylesheets.push({ url: '<head> stylesheet', isRenderBlocking: true });
          } else {
            return null;
          }
        } else {
          return null;
        }
      }

      const sample = blockingStylesheets[0];
      const evidenceDetails: RecommendationEvidence[] = blockingStylesheets.slice(0, 5).map((s: any) => ({
        type: 'render-blocking-css',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: { isRenderBlocking: true, location: '<head>' }
      }));

      const finding: RecommendationFinding = {
        description: `${blockingStylesheets.length} render-blocking external stylesheet(s) >10KB detected in document <head>`,
        metric: 'RENDER_BLOCKING',
        value: blockingStylesheets.length,
        unit: 'stylesheets'
      };

      const potentialImpact = 'Unblocks Render Tree construction, allowing the browser to paint content earlier.';
      const evidence = `Stylesheet ${sample.url} (${(sample.fileSizeKb || sample.sizeKb || 0).toFixed(1)} KB) blocks initial layout render in <head>`;

      return {
        id: this.id,
        findingId: 'REC_CSS_RENDER_BLOCKING_001',
        analyzer: 'css',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Inline critical above-the-fold CSS rules in a <style> block and load secondary stylesheets asynchronously with media="print" onload="this.media=\'all\'".',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/defer-non-critical-css',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'Not quantified',
        priority: 'high',
        sourceAnalyzer: 'css',
        estimatedBandwidthSaving: 0,
        resource: sample.url,
        actualValue: `${blockingStylesheets.length} render-blocking external stylesheet(s) in <head>`,
        expectedValue: 'Inline critical above-the-fold CSS and load non-critical stylesheets asynchronously',
        reason: 'External stylesheets in <head> block the browser from constructing the Render Tree until downloaded and parsed.'
      };
    }
  },

  // ==========================================
  // 14b. CSS: UNUSED CSS (MEASURED COVERAGE ONLY)
  // ==========================================
  {
    id: 'REC_CSS_UNUSED',
    title: 'Purge unused CSS rules from stylesheets',
    description: 'Shipping unused CSS selectors increases stylesheet transfer size and delays Render Tree construction.',
    category: 'performance',
    estimatedDifficulty: 'medium',
    hoursToImplement: 2.0,
    evaluate(input) {
      // Strictly require actual measured coverage (CDP) evidence > 20KB.
      // Small CSS or absence of coverage MUST NOT trigger unused CSS claims!
      const unusedCssKb = input.css?.summary?.estimatedUnusedCSS || 0;
      const hasMeasuredCoverage = (input.css?.stylesheets || []).some((s: any) => s.estimatedUnusedCssKb !== undefined && s.estimatedUnusedCssKb > 0);

      if (unusedCssKb <= 20 || !hasMeasuredCoverage) {
        return null;
      }

      const savingsKb = Math.round(unusedCssKb);
      const measuredSheets = (input.css?.stylesheets || []).filter((s: any) => (s.estimatedUnusedCssKb || 0) > 0);

      const evidenceDetails: RecommendationEvidence[] = measuredSheets.slice(0, 5).map((s: any) => ({
        type: 'cdp-coverage-unused-css',
        resource: s.url,
        sizeKb: s.fileSizeKb || s.sizeKb || 0,
        details: {
          unusedKb: Math.round(s.estimatedUnusedCssKb || 0),
          coverageMethod: 'Chrome DevTools Protocol'
        }
      }));

      const finding: RecommendationFinding = {
        description: `${savingsKb} KB of unused CSS rules measured via Chrome DevTools Protocol Coverage`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces stylesheet transfer sizes and speeds up style recalculation.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = `CDP coverage profile measured ${savingsKb} KB of unused CSS rules across stylesheets`;

      return {
        id: this.id,
        findingId: 'REC_CSS_UNUSED_001',
        analyzer: 'css',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: savingsKb > 50 ? 'high' : 'medium',
        confidence: 'high',
        estimateType,
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings,
        measuredImprovement: null,
        suggestedFix: 'Remove dead CSS rules using PurgeCSS, uncss, or CSS module scoping so only utilized selectors are transmitted.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement} hours`,
        refUrl: 'https://web.dev/articles/unused-css-rules',
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: savingsKb > 50 ? 'high' : 'medium',
        sourceAnalyzer: 'css',
        estimatedBandwidthSaving: savingsKb,
        resource: measuredSheets[0]?.url || 'stylesheet.css',
        actualValue: `${savingsKb} KB unused CSS rules measured via CDP`,
        expectedValue: 'Ship only CSS styles utilized by the current route and components',
        reason: 'Unused CSS bloats network payloads and forces the browser to evaluate redundant CSS selectors.'
      };
    }
  },

  // ==========================================
  // 15. SEO: HTML TITLE
  // ==========================================
  {
    id: 'REC_SEO_TITLE',
    title: 'Define an optimal HTML title element for search indexing',
    description: 'HTML document titles are critical for search engine indexing, social sharing previews, and browser tab identification.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.1,
    evaluate(input) {
      const missingTitle = input.seo?.summary?.missingTitle;
      if (missingTitle === undefined && !input.seo?.seo) return null;

      const hasPageTitle = input.seo?.seo && typeof input.seo.seo.pageTitle === 'string';
      const pageTitle = hasPageTitle ? input.seo.seo.pageTitle : '';
      const titleLen = pageTitle.trim().length;
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const titleCount = (input.seo as any)?.validationEvidence?.title?.count ?? (hasPageTitle && titleLen > 0 ? 1 : 0);

      // Section 5: Brand titles like "Google" (6 chars) are completely valid and GOOD.
      // Do NOT treat arbitrary character ranges as absolute SEO laws.
      // If title is present, single, and not unusually long (<= 70 chars), it passes.
      if (missingTitle === false && (!hasPageTitle || (titleLen > 0 && titleCount <= 1 && titleLen <= 70))) {
        return null;
      }

      let problem = 'No <title> element was found in the rendered document <head>.';
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'high';
      let observedStr = 'No <title> tag detected in rendered DOM';

      if (titleCount > 1) {
        problem = `${titleCount} <title> elements were found in the rendered document <head>. Search engines will select only one, ignoring duplicates.`;
        severity = 'medium';
        observedStr = `${titleCount} <title> tags detected`;
      } else if (missingTitle === true || (!hasPageTitle && missingTitle !== false)) {
        problem = 'No <title> element was found in the rendered document <head>.';
        severity = 'high';
        observedStr = 'No <title> tag detected in rendered DOM';
      } else if (hasPageTitle && titleLen === 0) {
        problem = 'The rendered <title> element is empty or contains only whitespace.';
        severity = 'high';
        observedStr = 'Empty <title> tag detected';
      } else if (missingTitle === false && titleLen > 70) {
        problem = `Title is unusually long (${titleLen} characters) and may be truncated in some search contexts.`;
        severity = 'low';
        observedStr = `"${pageTitle.slice(0, 50)}..." (${titleLen} characters)`;
      }

      const whyItMatters = 'Search engines use the title tag as the primary link headline in search results. Approximately 30 to 60 characters is a useful practical guideline for descriptive page titles, though concise brand names are common.';
      const impact = 'Search engine indexing headline representation and browser tab identification.';
      const task = 'Define one page-specific <title> tag in the page <head> using the project\'s existing SEO configuration.';
      const fixStrategy = 'Add or update the single <title> tag inside document <head> using the project\'s existing SEO/metadata configuration.';
      const validationSteps = [
        'Inspect the rendered page <head> and confirm exactly one <title> element exists.',
        'Verify the title text is non-empty and accurately identifies the page.',
        'Confirm no duplicate <title> tags are rendered by client hydration.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_TITLE_001',
        category: 'seo',
        rule: 'html-title',
        severity,
        url: targetUrl,
        element: 'head > title',
        selector: 'head > title',
        observed: observedStr,
        expected: 'One descriptive <title> tag (approximately 30 to 60 characters is a useful practical guideline)',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_TITLE_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity,
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO', value: titleLen, unit: 'chars' },
        evidence: observedStr,
        evidenceDetails: [{ type: 'title-tag', selector: 'head > title', details: { observed: observedStr, length: titleLen, count: titleCount } }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/appearance/title-link',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (Search indexing & user accessibility)',
        priority: severity === 'high' ? 'high' : 'medium',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'head > title',
        actualValue: observedStr,
        expectedValue: 'One descriptive <title> tag',
        reason: 'The HTML <title> element is the primary anchor used by search crawlers to identify page context.'
      };
    }
  },

  // ==========================================
  // 16. SEO: META DESCRIPTION
  // ==========================================
  {
    id: 'REC_SEO_META_DESC',
    title: 'Provide a meta description for search engine result snippets',
    description: 'The meta description summarizes page content in search engine result pages, directly influencing search user click-through rates.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingDesc = input.seo?.summary?.missingMetaDescription;
      if (missingDesc === undefined && !input.seo?.seo) return null;

      const hasMetaDesc = input.seo?.seo && typeof input.seo.seo.metaDescription === 'string';
      const metaDesc = hasMetaDesc ? input.seo.seo.metaDescription : '';
      const descLen = metaDesc.trim().length;
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const descCount = (input.seo as any)?.validationEvidence?.description?.count ?? (hasMetaDesc && descLen > 0 ? 1 : 0);

      // Section 6: Check missing, empty, duplicate, unusually short, unusually long.
      // Do NOT require an exact 120-160 character range as a hard rule.
      if (missingDesc === false && (!hasMetaDesc || (descLen >= 50 && descLen <= 160 && descCount <= 1))) {
        return null;
      }

      let problem = 'No meta description was found in the rendered document head.';
      let severity: 'high' | 'medium' | 'low' = 'medium';
      let observedStr = 'No <meta name="description"> detected in rendered DOM';

      if (descCount > 1) {
        problem = `${descCount} <meta name="description"> elements were found in the rendered document head.`;
        severity = 'medium';
        observedStr = `${descCount} meta description tags detected`;
      } else if (hasMetaDesc && descLen === 0 && !missingDesc) {
        problem = 'A <meta name="description"> tag was found in the rendered document head, but its content attribute is empty.';
        severity = 'medium';
        observedStr = 'Empty meta description tag detected';
      } else if (missingDesc === false && descLen < 50) {
        problem = `The meta description is relatively short (${descLen} characters). Search engines may choose to generate their own snippet from page content instead.`;
        severity = 'low';
        observedStr = `"${metaDesc}" (${descLen} characters)`;
      } else if (missingDesc === false && descLen > 160) {
        problem = `The meta description is unusually long (${descLen} characters) and may be truncated in search result snippets.`;
        severity = 'low';
        observedStr = `"${metaDesc.slice(0, 60)}..." (${descLen} characters)`;
      }

      // Section 6 human explanation:
      const whyItMatters = 'Your page does not currently provide a description specifically written for search-result snippets. Search engines may generate their own snippet from the page content. Approximately 120–160 characters is a useful practical guideline.';
      const impact = 'Search engine result snippet representation and search user clarity.';
      const task = 'Add a page-specific meta description using the project\'s existing SEO configuration.';
      const fixStrategy = 'Declare one page-specific <meta name="description" content="..."> tag in the document <head> using the project\'s existing metadata architecture.';
      const validationSteps = [
        'Inspect the rendered page <head> and confirm exactly one <meta name="description"> exists.',
        'Verify the content attribute provides an accurate, non-empty summary of the page.',
        'Ensure the description is not duplicated across multiple pages.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_META_DESC_001',
        category: 'seo',
        rule: 'meta-description',
        severity,
        url: targetUrl,
        element: 'meta[name="description"]',
        selector: 'meta[name="description"]',
        observed: observedStr,
        expected: 'A page-specific meta description (approximately 120–160 characters is a useful practical guideline)',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_META_DESC_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity,
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO', value: descLen, unit: 'chars' },
        evidence: observedStr,
        evidenceDetails: [{ type: 'meta-description', selector: 'meta[name="description"]', details: { observed: observedStr, length: descLen, count: descCount } }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/appearance/snippet',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (Search snippet representation & user clarity)',
        priority: 'high',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[name="description"]',
        actualValue: observedStr,
        expectedValue: 'A page-specific meta description (approx 120-160 chars)',
        reason: 'Search engines use the meta description as the primary snippet preview in search result cards.'
      };
    }
  },

  // ==========================================
  // 17. SEO: CANONICAL LINK
  // ==========================================
  {
    id: 'REC_SEO_CANONICAL',
    title: 'Provide a valid canonical URL link tag',
    description: 'Canonical link declarations notify search crawlers of preferred page targets, avoiding duplicate index penalties across URL variants.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingCanonical = input.seo?.summary?.missingCanonical;
      if (missingCanonical === undefined && !input.seo?.seo) return null;

      const canonicalDetails = input.seo?.seo?.canonicalDetails;
      const canonicalCount = (input.seo as any)?.validationEvidence?.canonical?.count ?? (canonicalDetails?.url ? 1 : 0);

      if (missingCanonical === false && canonicalCount <= 1) {
        if (!canonicalDetails || canonicalDetails.status === 'valid') return null;
      }

      const isRelative = canonicalDetails?.status === 'relative';
      const isMismatch = canonicalDetails?.status === 'mismatch';
      const isInvalid = canonicalDetails?.status === 'invalid';
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';

      let problem = 'No <link rel="canonical"> element was found in the rendered document head.';
      let severity: 'high' | 'medium' | 'low' = 'medium';
      let observedStr = 'No <link rel="canonical"> element was found in the rendered document head.';

      if (canonicalCount > 1) {
        problem = `${canonicalCount} canonical elements were found in the document head.`;
        severity = 'high';
        observedStr = `${canonicalCount} canonical elements detected in document head`;
      } else if (isRelative) {
        problem = `The canonical URL is declared as a relative path ("${canonicalDetails.url}"). Search engines require an absolute canonical URL including protocol and domain.`;
        severity = 'high';
        observedStr = `Relative canonical: "${canonicalDetails.url}"`;
      } else if (isMismatch) {
        problem = canonicalDetails?.error || 'The canonical URL points to a different domain than the page being inspected.';
        severity = 'high';
        observedStr = `Mismatched canonical: "${canonicalDetails?.url}"`;
      } else if (isInvalid) {
        problem = canonicalDetails?.error || 'The canonical URL is malformed and could not be parsed as a valid URL.';
        severity = 'high';
        observedStr = `Malformed canonical: "${canonicalDetails?.url}"`;
      }

      const whyItMatters = 'A canonical URL tells search engines which URL should be treated as the preferred version when equivalent URLs exist.';
      const impact = 'Consolidates duplicate URL indexing signals and avoids search ranking fragmentation.';
      
      // Section 2 & 5: Recommended Action
      // "Add the page's intended canonical URL using the project's existing SEO configuration. Verify the authoritative URL before deployment."
      // NEVER output https://example.com/authoritative-path or any made-up domain!
      let task = 'Add the page\'s intended canonical URL using the project\'s existing SEO configuration. Verify the authoritative URL before deployment.';
      let fixStrategy = 'Add the page\'s intended canonical URL using the project\'s existing SEO configuration. Determine the authoritative URL from the project\'s actual routing and domain configuration. Verify the authoritative URL before deployment.';

      if (canonicalCount > 1) {
        task = 'Remove duplicate canonical declarations so that exactly one authoritative canonical URL is present in the document head.';
        fixStrategy = 'Audit the document head and eliminate redundant canonical link tags, retaining only the single authoritative URL.';
      } else if (isRelative) {
        task = 'Update the canonical URL to be an absolute URL including protocol and domain using the project\'s existing SEO configuration.';
        fixStrategy = 'Ensure the canonical link href specifies a full absolute URL with protocol and domain.';
      } else if (isMismatch) {
        task = 'Verify whether the cross-domain canonical URL is intentional. If not, update it to point to the authoritative page URL on this domain.';
        fixStrategy = 'Confirm the authoritative canonical target and update the link href using the project\'s existing SEO configuration.';
      }

      const validationSteps = [
        'Inspect the rendered page <head> and confirm exactly one <link rel="canonical"> exists.',
        'Verify the href is an absolute URL and matches the authoritative URL for the page.',
        'Confirm no duplicate or conflicting canonical links are present.'
      ];

      // Build AI Fix Prompt following exact Section 6 specification
      let customAiFixPrompt: string | undefined;
      if (!isRelative && !isMismatch && !isInvalid && canonicalCount <= 1) {
        customAiFixPrompt = [
          'Fix the verified SEO issue below.',
          '',
          'Problem:',
          'No canonical URL is declared on the affected page.',
          '',
          'Evidence:',
          'No <link rel="canonical"> element was found in the rendered document head.',
          '',
          'Task:',
          'Add the page\'s intended canonical URL using the project\'s existing SEO/metadata architecture.',
          '',
          'Important:',
          'Determine the authoritative URL from the project\'s actual routing and domain configuration.',
          'Do not use a placeholder or guessed URL.',
          '',
          'Constraints:',
          '- Do not introduce a new SEO dependency.',
          '- Do not create duplicate canonical tags.',
          '- Do not modify unrelated UI or functionality.',
          '- Reuse the existing SEO/metadata architecture.',
          '',
          'Validation:',
          'Render the affected page and confirm exactly one valid canonical URL is present.'
        ].join('\n');
      }

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_CANONICAL_001',
        category: 'seo',
        rule: 'canonical-url',
        severity,
        url: targetUrl,
        element: 'link[rel="canonical"]',
        selector: 'link[rel="canonical"]',
        observed: observedStr,
        expected: 'One intended <link rel="canonical" href="..."> declaration in <head>',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      const finalAiFixPrompt = customAiFixPrompt || aiFixPrompt;

      return {
        id: this.id,
        findingId: 'REC_SEO_CANONICAL_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity,
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: observedStr,
        evidenceDetails: [{ type: 'canonical-link', selector: 'link[rel="canonical"]', details: { observed: observedStr, count: canonicalCount } }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
        standardFinding,
        aiFixPrompt: finalAiFixPrompt,
        fixStrategy,
        validationSteps,
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: severity === 'high' ? 'high' : 'medium',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'link[rel="canonical"]',
        actualValue: canonicalDetails?.url || observedStr,
        expectedValue: 'One intended <link rel="canonical" href="..."> declaration in <head>',
        reason: 'Canonical link declarations prevent duplicate content indexing penalties across query-parameter variations.'
      };
    }
  },

  // ==========================================
  // 18. SEO: MOBILE VIEWPORT
  // ==========================================
  {
    id: 'REC_SEO_VIEWPORT',
    title: 'Define a mobile-responsive viewport meta tag',
    description: 'Viewport declarations instruct mobile browsers how to scale page layout to match screen width.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingViewport = input.seo?.summary?.missingViewport || false;
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      if (!missingViewport) return null;

      const problem = 'No viewport meta tag was detected in document <head>.';
      const whyItMatters = 'Without a viewport tag, mobile devices render pages at a default desktop width (typically 980px) and scale down, causing tiny text, horizontal scrolling, and mobile indexing penalties.';
      const impact = 'Mobile responsive layout presentation and mobile search ranking eligibility.';
      const task = 'Declare <meta name="viewport" content="width=device-width, initial-scale=1"> in the page <head>.';
      const fixStrategy = 'Add the standard responsive viewport meta tag inside document <head>.';
      const validationSteps = [
        'Inspect the rendered page <head> and confirm <meta name="viewport"> is present.',
        'Verify content attribute contains width=device-width, initial-scale=1.',
        'Test on mobile device/emulator to confirm proper responsive scaling.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_VIEWPORT_001',
        category: 'seo',
        rule: 'viewport-meta',
        severity: 'high',
        url: targetUrl,
        element: 'meta[name="viewport"]',
        selector: 'meta[name="viewport"]',
        observed: 'No viewport meta tag found in rendered DOM',
        expected: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_VIEWPORT_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: 'No viewport meta tag detected in page <head>',
        evidenceDetails: [{ type: 'missing-meta-tag', selector: 'meta[name="viewport"]', details: { found: 0 } }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/responsive-web-design-basics',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (Mobile responsive presentation & SEO)',
        priority: 'critical',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[name="viewport"]',
        actualValue: 'Missing (<meta name="viewport"> absent)',
        expectedValue: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        reason: 'Mobile browsers default to desktop viewport widths unless a responsive viewport meta tag is declared.'
      };
    }
  },

  // ==========================================
  // 18B. SEO: PRIMARY H1 HEADING
  // ==========================================
  {
    id: 'REC_SEO_H1',
    title: 'Structure the page with a primary H1 heading',
    description: 'A primary H1 heading communicates the main topic of the page to search crawlers and assistive screen readers.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingH1 = input.seo?.summary?.missingH1 || false;
      const h1Count = input.seo?.seo?.headingStructure?.h1Count ?? (missingH1 ? 0 : 1);
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';

      // Section 11:
      // Multiple H1 elements are NOT automatically an SEO failure.
      // If the page has 1 or more H1s with non-empty content, it PASSES!
      if (!missingH1 && h1Count >= 1) return null;

      const problem = 'No <h1> element was found in the rendered document.';
      const severity: 'critical' | 'high' | 'medium' | 'low' = 'high';
      const observedStr = '0 <h1> elements found in rendered DOM';
      const whyItMatters = 'Search engines and screen readers use the H1 heading to identify the primary subject of the page.';
      const impact = 'Semantic page outline clarity for assistive tech and search engine topical relevance.';
      const task = 'Add one primary <h1> element containing the main headline of the page.';
      const fixStrategy = 'Include a descriptive <h1> element in the page template to serve as the document headline.';
      const validationSteps = [
        'Inspect the rendered page and confirm an <h1> element exists.',
        'Verify the <h1> contains descriptive text identifying the main topic of the page.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_H1_001',
        category: 'seo',
        rule: 'h1-heading',
        severity,
        url: targetUrl,
        element: 'h1',
        selector: 'h1',
        observed: observedStr,
        expected: 'At least one descriptive <h1> element per page',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_H1_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity,
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO', value: h1Count, unit: 'count' },
        evidence: observedStr,
        evidenceDetails: [{ type: 'h1-heading', selector: 'h1', details: { observed: observedStr, count: h1Count } }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/headings-and-landmarks',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (Accessibility & semantic SEO)',
        priority: 'high',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'h1',
        actualValue: observedStr,
        expectedValue: 'At least one primary <h1> element',
        reason: 'Semantic document outlines should anchor with a primary <h1> heading.'
      };
    }
  },

  // ==========================================
  // 18C. SEO: HEADING HIERARCHY SKIPS
  // ==========================================
  {
    id: 'REC_SEO_HEADING_HIERARCHY',
    title: 'Avoid skipping heading levels in document outline',
    description: 'Heading tags should follow a sequential hierarchy without jumping levels (e.g. H1 followed immediately by H3).',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const headingStructure = input.seo?.seo?.headingStructure;
      if (!headingStructure || headingStructure.isHierarchyValid || !headingStructure.skippedLevels || headingStructure.skippedLevels.length === 0) {
        return null;
      }

      const skip = headingStructure.skippedLevels[0];
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const problem = `The document skips heading levels: a <${skip.from}> is followed directly by a <${skip.to}> ("${skip.text}").`;
      const whyItMatters = 'Skipping heading levels creates a broken outline for screen reader users who navigate by heading level, and disrupts semantic topical hierarchy for search engine parsers.';
      const impact = 'Semantic accessibility navigation and structured content hierarchy.';
      const task = `Adjust heading levels so that <${skip.from}> is followed by the appropriate sequential level (e.g. <h${parseInt(skip.from.replace('h', ''), 10) + 1}>) instead of jumping directly to <${skip.to}>.`;
      const fixStrategy = 'Review heading tags in your template or markdown and ensure every sub-heading nests sequentially under its parent level.';
      const validationSteps = [
        'Inspect the heading structure of the page.',
        'Ensure heading levels decrease sequentially (e.g. H1 -> H2 -> H3).',
        'Verify no headings jump levels (e.g. H1 -> H3 without H2).'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_HEADING_HIERARCHY_001',
        category: 'seo',
        rule: 'heading-hierarchy',
        severity: 'low',
        url: targetUrl,
        element: skip.to,
        selector: skip.to,
        observed: `Jumped from <${skip.from}> directly to <${skip.to}>: "${skip.text}"`,
        expected: 'Sequential heading structure (e.g. H1 -> H2 -> H3)',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_HEADING_HIERARCHY_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'low',
        confidence: 'medium',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: `Skipped heading: <${skip.from}> directly to <${skip.to}>`,
        evidenceDetails: [{ type: 'skipped-heading', selector: skip.to, details: skip }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'low',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: skip.to,
        actualValue: `<${skip.from}> jumped directly to <${skip.to}>`,
        expectedValue: 'Sequential heading structure',
        reason: 'Screen reader users rely on consistent heading nesting to understand relationship between sections.'
      };
    }
  },

  // ==========================================
  // 18D. SEO: ROBOTS.TXT INTEGRITY
  // ==========================================
  {
    id: 'REC_SEO_ROBOTS_TXT',
    title: 'Resolve robots.txt access or configuration issues',
    description: 'Ensure robots.txt returns clean plain text directives or a clean HTTP 404 response without server errors or HTML fallbacks.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const robotsDetails = input.seo?.seo?.robotsTxtDetails;
      if (!robotsDetails || (!robotsDetails.isUnreachable && !robotsDetails.isInvalid)) {
        return null;
      }

      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const isUnreachable = robotsDetails.isUnreachable;
      const problem = isUnreachable
        ? `robots.txt is unreachable (${robotsDetails.snippet || 'server error/timeout'}).`
        : 'robots.txt returned an HTML page instead of plain text directives (common in Single Page Applications where 404s route to index.html with a 200 status).';
      const whyItMatters = 'When search crawlers encounter server errors (5xx) or timeouts on robots.txt, they typically delay or postpone crawling the site to prevent overloading the server.';
      const impact = 'Search engine crawling stability and indexing freshness.';
      const task = isUnreachable
        ? 'Ensure your web server or CDN returns a valid 200 plain text robots.txt file, or a clean HTTP 404 if no rules are needed.'
        : 'Configure your web server so that requests to /robots.txt return a text/plain response rather than your SPA index.html fallback.';
      const fixStrategy = 'Serve a static text/plain file at /robots.txt containing valid crawler directives.';
      const validationSteps = [
        'Send a curl or browser request to /robots.txt.',
        'Confirm the response status is 200 (or clean 404) and Content-Type is text/plain.',
        'Verify no HTML markup (e.g. <!DOCTYPE html>) is returned.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_ROBOTS_TXT_001',
        category: 'seo',
        rule: 'robots-txt',
        severity: 'high',
        url: targetUrl,
        element: '/robots.txt',
        selector: '/robots.txt',
        observed: robotsDetails.snippet || (isUnreachable ? 'Unreachable' : 'HTML response'),
        expected: 'HTTP 200 text/plain with crawler directives or clean HTTP 404',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_ROBOTS_TXT_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: robotsDetails.snippet || (isUnreachable ? 'robots.txt unreachable' : 'robots.txt returned HTML'),
        evidenceDetails: [{ type: 'robots-txt', details: robotsDetails }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'high',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: '/robots.txt',
        actualValue: robotsDetails.snippet || 'Issue detected',
        expectedValue: 'Plain text robots.txt',
        reason: 'Search engines must be able to read crawl permissions without encountering server errors.'
      };
    }
  },

  // ==========================================
  // 18E. SEO: SITEMAP.XML INTEGRITY
  // ==========================================
  {
    id: 'REC_SEO_SITEMAP',
    title: 'Provide a valid, accessible sitemap.xml',
    description: 'An XML sitemap helps search crawlers discover new and updated pages across your site efficiently.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      const sitemapDetails = input.seo?.seo?.sitemapXmlDetails;
      const isAccessBlocked = sitemapDetails?.status === 'access_blocked' || sitemapDetails?.isAccessBlocked;
      if (!sitemapDetails || (!sitemapDetails.isInvalid && !sitemapDetails.isUnreachable && !isAccessBlocked)) {
        return null;
      }

      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const sitemapUrl = sitemapDetails.url || '/sitemap.xml';

      let problem: string;
      let whyItMatters: string;
      let task: string;
      let fixStrategy: string;
      let observedStr: string;
      let expectedStr: string;
      let validationSteps: string[];
      let customAiPrompt: string | undefined;

      if (isAccessBlocked) {
        problem = `Sitemap access was blocked when PerfLens tried to retrieve ${sitemapUrl}.`;
        whyItMatters = 'Search crawlers require public access to the sitemap endpoint to discover updated URLs. Access rules returning HTTP 403 prevent discovery without proving the sitemap itself is invalid or missing.';
        task = 'Verify that the sitemap is publicly accessible to search-engine crawlers and that access rules are not blocking legitimate crawler requests.';
        fixStrategy = 'Review firewall, CDN, WAF, or server permissions at the sitemap URL to ensure legitimate search crawler requests are not denied with HTTP 403.';
        observedStr = 'HTTP 403 Forbidden';
        expectedStr = 'Publicly accessible sitemap endpoint for search-engine crawlers';
        validationSteps = [
          `Send an HTTP request to ${sitemapUrl} using curl or a crawler user-agent simulation.`,
          'Confirm the response status is HTTP 200 rather than HTTP 403 Forbidden.',
          'Verify that WAF/firewall access rules permit legitimate search engine crawler requests.'
        ];
        customAiPrompt = 'Investigate why the site\'s sitemap endpoint returns HTTP 403 to legitimate crawlers. Ensure the sitemap is publicly accessible where intended and returns valid XML with an appropriate HTTP response. Do not change unrelated robots, routing, or application behavior.';
      } else if (sitemapDetails.isInvalid) {
        problem = `The sitemap (${sitemapUrl}) returned invalid or non-XML content.`;
        whyItMatters = 'Sitemaps tell search engines which pages exist, when they were last updated, and their relative priority. Invalid non-XML content cannot be parsed by search engines.';
        task = 'Provide a valid XML sitemap conforming to the sitemaps.org schema at /sitemap.xml (or link to it in robots.txt).';
        fixStrategy = 'Generate and serve a compliant XML sitemap containing <urlset> or <sitemapindex>.';
        observedStr = sitemapDetails.error || 'Invalid sitemap XML';
        expectedStr = 'Valid XML containing <urlset> or <sitemapindex>';
        validationSteps = [
          `Access ${sitemapUrl} in your browser or curl.`,
          'Verify the response status is HTTP 200 with Content-Type application/xml or text/xml.',
          'Validate the XML schema structure with an XML validator.'
        ];
      } else {
        problem = `The sitemap (${sitemapUrl}) is unreachable (${sitemapDetails.error || 'network error'}).`;
        whyItMatters = 'When search engines encounter server errors or timeouts accessing sitemaps, URL discovery may be delayed or postponed.';
        task = 'Ensure the sitemap endpoint responds reliably to HTTP requests without server errors or timeouts.';
        fixStrategy = 'Inspect server error logs and ensure the sitemap route returns HTTP 200 with appropriate caching headers.';
        observedStr = sitemapDetails.error || 'Network error/timeout';
        expectedStr = 'Reliable HTTP 200 response';
        validationSteps = [
          `Send an HTTP request to ${sitemapUrl} and confirm standard 200 response time under 1000ms.`,
          'Ensure the web server handles sitemap requests without 5xx errors or timeouts.'
        ];
      }

      const impact = isAccessBlocked
        ? 'Crawler accessibility to XML sitemap index.'
        : 'Search crawler page discovery and indexing coverage.';

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_SITEMAP_001',
        category: 'seo',
        rule: 'sitemap-xml',
        severity: isAccessBlocked ? 'low' : 'medium',
        url: targetUrl,
        element: sitemapUrl,
        selector: '/sitemap.xml',
        observed: observedStr,
        expected: expectedStr,
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_SITEMAP_001',
        analyzer: 'seo',
        title: isAccessBlocked ? 'Verify sitemap crawler accessibility' : this.title,
        description: isAccessBlocked ? 'Ensure sitemap.xml is accessible to legitimate search-engine crawlers without HTTP 403 access blocks.' : this.description,
        category: this.category,
        severity: isAccessBlocked ? 'low' : 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: observedStr,
        evidenceDetails: [{ type: 'sitemap-xml', details: sitemapDetails }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
        standardFinding,
        aiFixPrompt: customAiPrompt || aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: isAccessBlocked ? 'Verify sitemap crawler accessibility' : this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: isAccessBlocked ? 'low' : 'medium',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: '/sitemap.xml',
        actualValue: observedStr,
        expectedValue: expectedStr,
        reason: isAccessBlocked
          ? 'Sitemap endpoints must permit crawler access without HTTP 403 access blocks.'
          : 'Search engines use sitemaps for rapid discovery and indexing of website URLs.'
      };
    }
  },

  // ==========================================
  // 18F. SEO: ROBOTS NOINDEX WARNING
  // ==========================================
  {
    id: 'REC_SEO_ROBOTS_META',
    title: 'Remove unintentional "noindex" directive on public pages',
    description: 'The "noindex" directive explicitly tells search crawlers not to include the page in search engine results.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.1,
    evaluate(input) {
      const robotsMeta = input.seo?.seo?.robotsMetaDetails;
      if (!robotsMeta || !robotsMeta.noindex) return null;

      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const problem = 'The rendered page contains an active "noindex" directive in its robots meta tag.';
      const whyItMatters = 'Search engines will completely exclude this page from search results as long as the "noindex" directive is present. This is often left on accidentally after staging deployments.';
      const impact = 'Total loss of search engine organic visibility and traffic for this URL.';
      const task = 'Remove the "noindex" directive from <meta name="robots"> if this page is intended to be publicly discoverable in search engines.';
      const fixStrategy = 'Update the robots metadata declaration to allow indexing (e.g. "index, follow" or remove the meta tag entirely).';
      const validationSteps = [
        'Inspect the rendered page <head> and check <meta name="robots">.',
        'Confirm "noindex" is not present in the content attribute.',
        'Ensure HTTP X-Robots-Tag header is also not returning noindex.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_ROBOTS_META_001',
        category: 'seo',
        rule: 'robots-noindex',
        severity: 'critical',
        url: targetUrl,
        element: 'meta[name="robots"]',
        selector: 'meta[name="robots"]',
        observed: robotsMeta.content || 'noindex',
        expected: 'Omit "noindex" on public pages',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_ROBOTS_META_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'critical',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: `Active directive: ${robotsMeta.content}`,
        evidenceDetails: [{ type: 'robots-meta', selector: 'meta[name="robots"]', details: robotsMeta }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'critical',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[name="robots"]',
        actualValue: robotsMeta.content || 'noindex',
        expectedValue: 'Omit noindex',
        reason: 'Search engines obey noindex directives and purge matching pages from search indices.'
      };
    }
  },

  // ==========================================
  // 18G. SEO: STRUCTURED DATA SYNTAX ERROR
  // ==========================================
  {
    id: 'REC_SEO_STRUCTURED_DATA',
    title: 'Fix JSON-LD structured data syntax errors',
    description: 'Structured data scripts must be valid JSON conforming to Schema.org standards to enable rich search snippets.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const structDetails = input.seo?.seo?.structuredDataDetails;
      if (!structDetails || !structDetails.syntaxErrors || structDetails.syntaxErrors.length === 0) {
        return null;
      }

      const firstErr = structDetails.syntaxErrors[0];
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const problem = `A JSON-LD structured data script contains a syntax error: ${firstErr.error}.`;
      const whyItMatters = 'Search engines will completely fail to parse malformed JSON-LD scripts, preventing your page from qualifying for rich snippet cards, star ratings, FAQs, or breadcrumb previews in search results.';
      const impact = 'Rich search snippet eligibility and semantic knowledge graph recognition.';
      const task = 'Correct the JSON syntax error in your <script type="application/ld+json"> tag.';
      const fixStrategy = 'Validate your JSON-LD with a JSON validator or JSON.stringify() to ensure valid commas, quotes, and brackets.';
      const validationSteps = [
        'Extract the script content and test with JSON.parse() or Schema Markup Validator.',
        'Confirm the JSON parses without syntax errors.',
        'Verify required @context ("https://schema.org") and @type are present.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_STRUCTURED_DATA_001',
        category: 'seo',
        rule: 'structured-data-syntax',
        severity: 'high',
        url: targetUrl,
        element: 'script[type="application/ld+json"]',
        selector: 'script[type="application/ld+json"]',
        observed: firstErr.rawSnippet,
        expected: 'Valid Schema.org JSON-LD syntax',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_STRUCTURED_DATA_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'high',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: `JSON syntax error: ${firstErr.error}`,
        evidenceDetails: [{ type: 'structured-data', details: firstErr }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'high',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'script[type="application/ld+json"]',
        actualValue: firstErr.error,
        expectedValue: 'Valid JSON-LD',
        reason: 'Malformed JSON prevents Schema.org rich snippet parsers from interpreting structured data.'
      };
    }
  },

  // ==========================================
  // 18H. SEO: OPEN GRAPH SOCIAL TAGS
  // ==========================================
  {
    id: 'REC_SEO_OPEN_GRAPH',
    title: 'Provide essential Open Graph metadata for social sharing',
    description: 'Open Graph tags control how your links look when shared on LinkedIn, Facebook, Slack, and messaging apps.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const ogDetails = input.seo?.seo?.socialCards?.openGraph;
      if (!ogDetails || ogDetails.coveragePercentage >= 60) return null;

      const missing = ogDetails.missingTags;
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const presentCount = ogDetails.presentCount ?? (ogDetails.properties ? ogDetails.properties.filter((p: OpenGraphPropertyCheck) => p.present).length : (5 - missing.length));
      const totalCount = ogDetails.totalCount ?? 5;
      const coveragePct = ogDetails.coveragePercentage ?? Math.round((presentCount / totalCount) * 100);
      const propertyReport = (ogDetails.properties || []).map((p: OpenGraphPropertyCheck) => `${p.present ? '✓' : '✗'} ${p.property}`).join(', ');
      const observedStr = `${presentCount} / ${totalCount} present (${coveragePct}%)${propertyReport ? ` [${propertyReport}]` : ''}`;

      const problem = `The page has incomplete Open Graph metadata (${presentCount} / ${totalCount} present, ${coveragePct}%). Missing properties: ${missing.join(', ')}.`;
      const whyItMatters = 'When users share your page link on social platforms or messaging apps, missing Open Graph tags result in blank previews without an image, title, or description, significantly reducing engagement.';
      const impact = 'Social media preview card appearance and link click-through rate.';
      const task = `Add the missing Open Graph tags (${missing.join(', ')}) to your document <head>.`;
      const fixStrategy = 'Declare <meta property="og:title">, <meta property="og:description">, <meta property="og:image">, and <meta property="og:url"> in the document <head>.';
      const validationSteps = [
        'Inspect the rendered page <head> and verify og:title, og:description, og:image, and og:url are present.',
        'Verify og:image points to a valid absolute image URL (minimum 1200x630px recommended).',
        'Test the URL with social preview debuggers (e.g. LinkedIn Post Inspector).'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_OPEN_GRAPH_001',
        category: 'seo',
        rule: 'open-graph-tags',
        severity: 'low',
        url: targetUrl,
        element: 'meta[property^="og:"]',
        selector: 'meta[property^="og:"]',
        observed: observedStr,
        expected: 'Full Open Graph tag suite (og:title, og:description, og:image, og:url, og:type)',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_OPEN_GRAPH_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'low',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: `${presentCount} / ${totalCount} present (${coveragePct}%). Missing: ${missing.join(', ')}`,
        evidenceDetails: [{ type: 'open-graph', details: ogDetails }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://ogp.me/',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'low',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[property^="og:"]',
        actualValue: `${presentCount} / ${totalCount} present (${coveragePct}%)`,
        expectedValue: 'Complete OG tags (og:title, og:description, og:image, og:url, og:type)',
        reason: 'Social platforms compile rich link preview cards from Open Graph metadata.'
      };
    }
  },

  // ==========================================
  // 18I. SEO: TWITTER CARD METADATA
  // ==========================================
  {
    id: 'REC_SEO_TWITTER_CARD',
    title: 'Provide Twitter Card metadata for X / Twitter link previews',
    description: 'Twitter card tags ensure shared links generate rich summary cards on X / Twitter.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const twitterDetails = input.seo?.seo?.socialCards?.twitter;
      if (!twitterDetails || twitterDetails.coveragePercentage >= 60) return null;

      const missing = twitterDetails.missingTags;
      const targetUrl = input.targetUrl || input.seo?.seo?.canonicalUrl || 'target page';
      const problem = `The page is missing Twitter Card tags: ${missing.join(', ')}.`;
      const whyItMatters = 'Without twitter:card metadata, tweets linking to your website will render as plain text links instead of rich visual media preview cards.';
      const impact = 'X / Twitter link preview appearance and engagement.';
      const task = `Add <meta name="twitter:card" content="summary_large_image"> along with twitter:title and twitter:image to the document <head>.`;
      const fixStrategy = 'Declare twitter:card, twitter:title, twitter:description, and twitter:image in document <head>.';
      const validationSteps = [
        'Inspect the rendered page <head> and confirm twitter:card is declared.',
        'Confirm twitter:title, twitter:description, and twitter:image are present.',
        'Verify twitter:image is an absolute URL.'
      ];

      const { standardFinding, aiFixPrompt } = buildStandardFindingAndPrompt({
        id: 'REC_SEO_TWITTER_CARD_001',
        category: 'seo',
        rule: 'twitter-card-tags',
        severity: 'low',
        url: targetUrl,
        element: 'meta[name^="twitter:"]',
        selector: 'meta[name^="twitter:"]',
        observed: `Missing tags: ${missing.join(', ')} (${twitterDetails.coveragePercentage}% coverage)`,
        expected: 'Complete Twitter Card tag suite',
        problem,
        whyItMatters,
        impact,
        task,
        fixStrategy,
        validationSteps,
        frameworkInfo: input.frameworkInfo
      });

      return {
        id: this.id,
        findingId: 'REC_SEO_TWITTER_CARD_001',
        analyzer: 'seo',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'low',
        confidence: 'low',
        estimateType: 'not_quantified',
        finding: { description: problem, metric: 'SEO' },
        evidence: `Missing: ${missing.join(', ')}`,
        evidenceDetails: [{ type: 'twitter-card', details: twitterDetails }],
        potentialImpact: impact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: task,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards',
        standardFinding,
        aiFixPrompt,
        fixStrategy,
        validationSteps,
        issue: this.title,
        whyItMatters,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'low',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[name^="twitter:"]',
        actualValue: `${twitterDetails.coveragePercentage}% coverage`,
        expectedValue: 'Complete Twitter tags',
        reason: 'X / Twitter reads twitter:card meta tags to display media preview cards.'
      };
    }
  },

  // ==========================================
  // 19. ACCESSIBILITY: HTML LANG
  // ==========================================
  {
    id: 'REC_A11Y_LANG',
    title: 'Add HTML language attribute to root element',
    description: 'Specifying a lang attribute helps screen readers load the correct pronunciation and speech synthesizer rules.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.15,
    evaluate(input) {
      const missingLang = input.accessibility?.accessibility?.missingHtmlLanguageAttribute || false;
      if (!missingLang) return null;

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-attribute',
          selector: 'html',
          details: { attribute: 'lang', found: false }
        }
      ];

      const finding: RecommendationFinding = {
        description: 'Root <html> element does not specify a valid lang attribute',
        metric: 'ACCESSIBILITY'
      };

      const potentialImpact = 'Screen reader pronunciation and localized text-to-speech synthesis.';
      const evidence = 'Root <html> element does not specify a lang attribute';

      return {
        id: this.id,
        findingId: 'REC_A11Y_LANG_001',
        analyzer: 'accessibility',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Add the lang attribute to the root HTML element, e.g. <html lang="en">.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: '9 mins',
        refUrl: 'https://www.w3.org/WAI/tutorials/page-structure/labels/',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'high',
        sourceAnalyzer: 'accessibility',
        estimatedBandwidthSaving: 0,
        selector: 'html',
        actualValue: 'Missing (<html lang="..."> absent)',
        expectedValue: '<html lang="en"> (or appropriate ISO language code)',
        reason: 'Screen readers use the html lang attribute to set text-to-speech pronunciation libraries.'
      };
    }
  },

  // ==========================================
  // 20. ACCESSIBILITY: IMAGE ALT TEXT
  // ==========================================
  {
    id: 'REC_IMAGE_ALT_TEXT',
    title: 'Add descriptive alt attributes to image tags',
    description: 'Screen readers require descriptive alt text to convey visual content to users with vision impairments.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      const missingCountImg = input.image?.summary?.imagesMissingAltText || 0;
      const missingCountA11y = input.accessibility?.summary?.missingAltCount ?? input.accessibility?.summary?.imagesMissingAlt ?? 0;
      const totalMissing = Math.max(missingCountImg, missingCountA11y);

      const hasA11yAltWarn = input.accessibility?.warnings?.some((w: any) => w.code === 'A11Y_MISSING_ALT' || w.code === 'A11Y_EMPTY_ALT');

      if (totalMissing <= 0 && !hasA11yAltWarn) {
        return null;
      }

      const count = totalMissing || 1;
      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-alt-attribute',
          selector: 'img:not([alt])',
          details: { missingCount: count }
        }
      ];

      const finding: RecommendationFinding = {
        description: `${count} image tag(s) lack alternative text descriptions in the rendered DOM`,
        metric: 'ACCESSIBILITY',
        value: count,
        unit: 'images'
      };

      const potentialImpact = 'Enables screen readers to describe visual content to visually impaired users.';
      const evidence = `${count} <img> tag(s) without valid alt attribute identified in DOM`;

      return {
        id: this.id,
        findingId: 'REC_IMAGE_ALT_TEXT_001',
        analyzer: 'accessibility',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: `Provide descriptive alt="..." text descriptions for all image tags (affecting ~${count} images) or empty alt="" for purely decorative graphics.`,
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://www.w3.org/WAI/tutorials/images/',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'medium',
        sourceAnalyzer: 'accessibility',
        estimatedBandwidthSaving: 0,
        resource: 'img:not([alt])',
        actualValue: `${count} image(s) lack alternative text descriptions`,
        expectedValue: 'All <img> tags must possess meaningful alt attributes or alt="" if purely decorative',
        reason: 'Screen readers announce uncaptioned filenames when alt attributes are missing, degrading accessible user experience.'
      };
    }
  },

  // ==========================================
  // 21. ACCESSIBILITY: SKIP NAVIGATION LINK
  // ==========================================
  {
    id: 'REC_A11Y_SKIP_LINK',
    title: 'Add a skip navigation link for keyboard users',
    description: 'Skip links permit screen reader and keyboard navigators to bypass repeated header navigation blocks and jump straight to primary content.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingSkipLink = input.accessibility?.summary?.missingSkipNavigation ?? (input.accessibility?.hasSkipLink === false);
      const navLinksCount = input.accessibility?.validationEvidence?.links?.length ?? (input.accessibility?.hasRepeatedNavLinks ? 5 : (input.accessibility?.navLandmarksCount ? 5 : 0));
      const hasNavLandmarks = !!(input.accessibility?.validationEvidence?.landmarks?.hasNav || input.accessibility?.validationEvidence?.landmarks?.hasHeader || input.accessibility?.hasHeaderNav || (input.accessibility?.navLandmarksCount && input.accessibility.navLandmarksCount > 0));

      // WCAG 2.4.1 (Bypass Blocks) compliance check:
      // A skip link is ONLY required when repeated multi-link navigation blocks exist before main content.
      // Minimal single-action pages (such as Google search homepage) do NOT require skip links.
      if (!missingSkipLink || !hasNavLandmarks || navLinksCount < 4) {
        return null;
      }

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'wcag-bypass-blocks',
          selector: 'body > a.skip-link',
          details: {
            navLinksCount,
            hasNavLandmarks,
            standard: 'WCAG 2.4.1'
          }
        }
      ];

      const finding: RecommendationFinding = {
        description: `Navigation landmark detected with ${navLinksCount} links before main content, but no bypass link mechanism exists`,
        metric: 'ACCESSIBILITY'
      };

      const potentialImpact = 'Allows keyboard and screen reader users to jump past repetitive navigation directly to main content.';
      const evidence = `Page features <header>/<nav> containing ${navLinksCount} links with no bypass anchor (WCAG 2.4.1)`;

      return {
        id: this.id,
        findingId: 'REC_A11Y_SKIP_LINK_001',
        analyzer: 'accessibility',
        title: this.title,
        description: this.description,
        category: this.category,
        severity: 'medium',
        confidence: 'high',
        estimateType: 'not_quantified',
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Add an accessible skip link as the very first focusable element inside <body>, e.g. <a href="#main" class="skip-link">Skip to main content</a>.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'medium',
        sourceAnalyzer: 'accessibility',
        estimatedBandwidthSaving: 0,
        selector: 'body > a.skip-link',
        actualValue: `Navigation landmark detected with ${navLinksCount} links but no skip mechanism`,
        expectedValue: '<a href="#main" class="skip-link">Skip to main content</a> before navigation block',
        reason: 'Keyboard navigators must tab through all repeated navigation links on every page load unless a bypass skip link is provided.'
      };
    }
  }
];

