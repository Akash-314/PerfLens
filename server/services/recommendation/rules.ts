import {
  Recommendation,
  EstimatedSavings,
  RecommendationFinding,
  RecommendationEvidence
} from './types.js';

export interface RecommendationInput {
  pagespeed?: any;
  image?: any;
  css?: any;
  js?: any;
  seo?: any;
  accessibility?: any;
  vitals?: any;
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
      const longTaskCount = tbtDetails?.longTaskCount ?? (puppeteerTbt?.longTaskCount ?? (longTasks.length > 0 ? longTasks.length : null));
      const longestTaskMs = tbtDetails?.maxTaskDurationMs ?? (puppeteerTbt?.maxTaskDurationMs ?? (longTasks.length > 0 ? Math.max(...longTasks.map((t: any) => t.duration || 0)) : null));

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
      const topScripts: any[] = tbtDetails?.topScriptsByExecution || [];

      if (mainThreadWork.length > 0) {
        mainThreadWork.slice(0, 3).forEach((mw: any) => {
          evidenceDetails.push({
            type: 'main-thread-work',
            duration: Math.round(mw.durationMs || 0),
            resource: mw.group || 'CPU Work Category'
          });
        });
      }

      const tasksBlockingSum = longTasks.reduce((sum: number, t: any) => sum + (t.blockingDuration || Math.max(0, (t.duration || 0) - 50)), 0);
      const tbtSource = vitals.tbt?.source || 'lab';
      const isConsistentWithTasks = longTasks.length > 0 && (tasksBlockingSum >= (tbtMs * 0.4) || tbtMs <= 250);

      const validScript = (longTasks.length > 0 && longTasks[0]?.scriptUrl && longTasks[0].scriptUrl !== 'unknown' && longTasks[0].scriptUrl !== 'Main thread execution')
        ? longTasks[0].scriptUrl
        : (topScripts.length > 0 && topScripts[0]?.url ? `${topScripts[0].url} (${topScripts[0].totalCpuMs}ms)` : null);
      const scriptSummary = validScript
        ? ` | Script: ${validScript}`
        : ' | Script attribution: unavailable';

      const workSummary = mainThreadWork.length > 0
        ? ` | Work breakdown: ${mainThreadWork.slice(0, 2).map((m: any) => `${m.group} (${m.durationMs}ms)`).join(', ')}`
        : '';

      let taskSummary: string;
      let evidenceStr: string;

      if (isConsistentWithTasks) {
        taskSummary = `across ${longTaskCount} long task(s) (longest: ${longestTaskMs}ms, ${tasksBlockingSum}ms blocking)`;
        evidenceStr = `TBT: ${Math.round(tbtMs)}ms [${tbtSource}] | Long tasks: ${longTaskCount} (max: ${longestTaskMs}ms, ${tasksBlockingSum}ms blocking)`;
      } else if (longTasks.length > 0) {
        // Expose BOTH sources separately: Never imply short tasks produced large TBT
        taskSummary = `measured via Google Lighthouse simulated throttling (${Math.round(tbtMs)}ms TBT); separate local browser crawl observed ${longTaskCount} task (${longestTaskMs}ms duration, ${tasksBlockingSum}ms blocking)`;
        evidenceStr = `Lighthouse TBT: ${Math.round(tbtMs)}ms [simulated CPU] | Puppeteer local crawl: ${longTaskCount} task (max: ${longestTaskMs}ms, ${tasksBlockingSum}ms blocking)`;
      } else {
        taskSummary = `measured via Google Lighthouse lab audit (${Math.round(tbtMs)}ms TBT)`;
        evidenceStr = `TBT: ${Math.round(tbtMs)}ms [${tbtSource}] | Task attribution: main thread CPU execution`;
      }

      const finding: RecommendationFinding = {
        description: `Total Blocking Time of ${Math.round(tbtMs)}ms exceeds the 200ms recommended threshold (${taskSummary})${scriptSummary}${workSummary}`,
        metric: 'TBT',
        value: Math.round(tbtMs),
        unit: 'ms'
      };

      const potentialImpact = 'Relieves main-thread CPU congestion and eliminates input latency during page load.';
      const evidence = `${evidenceStr}${scriptSummary}${workSummary}`;

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
        suggestedFix: 'Break up long tasks (>50ms) using scheduler.yield() or requestIdleCallback(), defer non-critical JavaScript execution, and offload CPU-intensive work to Web Workers.',
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
        actualValue: `Total Blocking Time: ${Math.round(tbtMs)}ms (${longTaskCount ? `${longTaskCount} long tasks, max: ${longestTaskMs}ms` : 'high CPU load'})`,
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
            elementTag: elementTag || 'UNKNOWN',
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
          currentFormat: cand.format || cand.currentType || 'unknown',
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
          naturalDimensions: img.naturalDimensions || (img.naturalWidth && img.naturalHeight ? `${img.naturalWidth}x${img.naturalHeight}` : 'unknown'),
          renderedDimensions: img.renderedDimensions || (img.renderedWidth && img.renderedHeight ? `${img.renderedWidth}x${img.renderedHeight}` : 'unknown'),
          oversizedRatio: img.oversizedRatio || 'unknown',
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
    title: 'Investigate unused code / code splitting for JavaScript scripts',
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
        description: hasBuildTimeEvidence
          ? `${savingsKb} KB of unexecuted JavaScript code observed at runtime via Chrome DevTools Protocol Coverage (build-time bundle evidence detected)`
          : `${savingsKb} KB of unexecuted JavaScript code observed at runtime via Chrome DevTools Protocol Coverage (investigate unused code / code splitting)`,
        metric: 'NETWORK',
        value: savingsKb,
        unit: 'KB'
      };

      const potentialImpact = 'Reduces initial script transfer size and deferred compilation overhead on the main thread.';
      const estimatedSavings = savingsKb > 0 ? createTransferSavings(savingsKb) : null;
      const estimateType = estimatedSavings ? 'transfer_only' : 'not_quantified';
      const evidence = hasBuildTimeEvidence
        ? `CDP runtime coverage measured ${savingsKb} KB of unexecuted code | Build-time bundle analysis indicates duplicate/unnecessary dependencies`
        : `CDP runtime coverage measured ${savingsKb} KB of unexecuted code during page load (investigate unused code / code splitting; tree-shaking requires build-time evidence)`;

      const suggestedFix = hasBuildTimeEvidence
        ? 'Investigate unused code and dependency bloat: (1) Defer unexecuted interactive code using dynamic import() code splitting. (2) Build-time bundle evidence indicates possible unused exports or duplicate packages; enable production tree-shaking (ESM sideEffects: false) and deduplicate package imports.'
        : 'Investigate unused code / code splitting: CDP runtime coverage observes unexecuted code during initial load, not dead code. Defer non-critical interactive code using dynamic import() route-based code splitting. Do not assume tree-shaking is applicable unless build-time static analysis confirms unreferenced exports.';

      const reason = 'Observed unexecuted JavaScript transfers unnecessary initial bytes. Note: CDP coverage reflects runtime execution during page load (candidate for code splitting); genuine dead-code elimination (tree-shaking) requires build-time static export verification.';

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
        issue: 'Investigate unused code / code splitting',
        whyItMatters: potentialImpact,
        estimatedImprovement: estimatedSavings ? estimatedSavings.displayString : 'Not quantified',
        estimatedPerformanceGain: createTransferGainString(savingsKb),
        priority: 'medium',
        sourceAnalyzer: 'js',
        estimatedBandwidthSaving: savingsKb,
        resource: 'JavaScript Bundles',
        actualValue: `${savingsKb} KB of unexecuted JavaScript measured via Chrome DevTools Protocol Coverage`,
        expectedValue: 'Keep unexecuted JavaScript code under 50 KB through route-based code splitting',
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
    title: 'Define an HTML title element for document metadata',
    description: 'HTML document titles are critical for search engine indexing, social sharing, and browser tab identification.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.1,
    evaluate(input) {
      const missingTitle = input.seo?.summary?.missingTitle ?? false;
      if (!missingTitle) return null;

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-dom-element',
          selector: 'head > title',
          details: { element: 'title', status: 'absent_or_empty' }
        }
      ];

      const finding: RecommendationFinding = {
        description: 'Document <head> is missing an HTML <title> tag',
        metric: 'SEO'
      };

      const potentialImpact = 'Search engine indexing, social snippet generation, and browser tab identification.';
      const evidence = 'No <title> tag found within document <head>';

      return {
        id: this.id,
        findingId: 'REC_SEO_TITLE_001',
        analyzer: 'seo',
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
        suggestedFix: 'Add a unique, descriptive <title> tag (50-60 characters) inside the <head> element.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/appearance/title-link',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (Search indexing & user accessibility)',
        priority: 'critical',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'head > title',
        actualValue: 'Missing (<title> tag absent or empty)',
        expectedValue: 'A unique, descriptive <title> tag (50-60 characters)',
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
    description: 'The meta description summarizes page content in search engine result pages, improving user click-through rates.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingDesc = input.seo?.summary?.missingMetaDescription ?? false;
      if (!missingDesc) return null;

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-meta-tag',
          selector: 'meta[name="description"]',
          details: { found: 0 }
        }
      ];

      const finding: RecommendationFinding = {
        description: 'No <meta name="description"> tag was found in document <head>',
        metric: 'SEO'
      };

      const potentialImpact = 'Search engine result snippet presentation and click-through rate (CTR).';
      const evidence = 'No <meta name="description"> element detected in document <head>';

      return {
        id: this.id,
        findingId: 'REC_SEO_META_DESC_001',
        analyzer: 'seo',
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
        suggestedFix: 'Declare a <meta name="description" content="..."> tag (120-160 characters) in the page <head> section.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/appearance/snippet',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None (CTR & search snippet presentation)',
        priority: 'high',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'meta[name="description"]',
        actualValue: 'Missing (<meta name="description"> tag absent)',
        expectedValue: 'A descriptive meta description tag between 120 and 160 characters',
        reason: 'Search engines use the meta description as the primary snippet preview in search result cards.'
      };
    }
  },

  // ==========================================
  // 17. SEO: CANONICAL LINK
  // ==========================================
  {
    id: 'REC_SEO_CANONICAL',
    title: 'Provide a canonical URL link tag',
    description: 'Canonical link declarations notify search crawlers of preferred page targets, avoiding duplicate index penalties.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingCanonical = input.seo?.summary?.missingCanonical || false;
      if (!missingCanonical) return null;

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-link-tag',
          selector: 'link[rel="canonical"]',
          details: { found: 0 }
        }
      ];

      const finding: RecommendationFinding = {
        description: 'No <link rel="canonical"> element found in document <head>',
        metric: 'SEO'
      };

      const potentialImpact = 'Consolidates duplicate URL indexing signals and avoids search ranking fragmentation.';
      const evidence = 'No link element with rel="canonical" found in <head>';

      return {
        id: this.id,
        findingId: 'REC_SEO_CANONICAL_001',
        analyzer: 'seo',
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
        suggestedFix: 'Declare <link rel="canonical" href="https://example.com/authoritative-path"> in the <head> of every page.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
        estimatedImprovement: 'Not quantified',
        estimatedPerformanceGain: 'None',
        priority: 'medium',
        sourceAnalyzer: 'seo',
        estimatedBandwidthSaving: 0,
        selector: 'link[rel="canonical"]',
        actualValue: 'Missing (<link rel="canonical"> absent)',
        expectedValue: '<link rel="canonical" href="..."> pointing to authoritative canonical URL',
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
      if (!missingViewport) return null;

      const evidenceDetails: RecommendationEvidence[] = [
        {
          type: 'missing-meta-tag',
          selector: 'meta[name="viewport"]',
          details: { found: 0 }
        }
      ];

      const finding: RecommendationFinding = {
        description: 'No viewport meta tag was detected in document <head>',
        metric: 'SEO'
      };

      const potentialImpact = 'Mobile responsive layout presentation and mobile search ranking eligibility.';
      const evidence = 'No viewport meta tag detected in page <head>';

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
        finding,
        evidence,
        evidenceDetails,
        potentialImpact,
        estimatedSavings: null,
        measuredImprovement: null,
        suggestedFix: 'Declare <meta name="viewport" content="width=device-width, initial-scale=1"> in the page <head>.',
        estimatedDifficulty: this.estimatedDifficulty,
        estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
        refUrl: 'https://web.dev/articles/responsive-web-design-basics',
        // Backward-compatibility fields
        issue: this.title,
        whyItMatters: potentialImpact,
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

