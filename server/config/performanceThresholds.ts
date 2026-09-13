/**
 * Performance Thresholds & Classification System
 * 
 * Source of Truth: Current Google / Web.dev Core Web Vitals and Lab Performance Standards
 * https://web.dev/articles/vitals
 * https://web.dev/articles/fcp
 * https://web.dev/articles/tbt
 * https://web.dev/articles/ttfb
 */

export type MetricType = 'lcp' | 'inp' | 'cls' | 'fcp' | 'tbt' | 'ttfb';
export type MetricCategory = 'core-web-vital' | 'other-performance-metric';
export type MetricRating = 'good' | 'needs-improvement' | 'poor' | 'unrated';

export interface ThresholdRange {
  goodMax: number;
  needsImprovementMax: number;
}

export interface MetricDefinition {
  name: string;
  shortName: string;
  category: MetricCategory;
  unit: string;
  isCoreVital: boolean;
  thresholdSource: string;
  thresholds: ThresholdRange;
  goodRangeLabel: string;
  needsImprovementRangeLabel: string;
  poorRangeLabel: string;
  description: string;
}

export const METRIC_DEFINITIONS: Record<MetricType, MetricDefinition> = {
  lcp: {
    name: 'Largest Contentful Paint',
    shortName: 'LCP',
    category: 'core-web-vital',
    unit: 's',
    isCoreVital: true,
    thresholdSource: 'Google web.dev (March 2024 standards)',
    thresholds: { goodMax: 2.5, needsImprovementMax: 4.0 },
    goodRangeLabel: '≤ 2.5 s',
    needsImprovementRangeLabel: '2.5 s – 4.0 s',
    poorRangeLabel: '> 4.0 s',
    description: 'Measures perceived loading speed by marking when the page\'s main content likely loaded.'
  },
  inp: {
    name: 'Interaction to Next Paint',
    shortName: 'INP',
    category: 'core-web-vital',
    unit: 'ms',
    isCoreVital: true,
    thresholdSource: 'Google web.dev (Official Core Web Vital replacing FID March 2024)',
    thresholds: { goodMax: 200, needsImprovementMax: 500 },
    goodRangeLabel: '≤ 200 ms',
    needsImprovementRangeLabel: '200 ms – 500 ms',
    poorRangeLabel: '> 500 ms',
    description: 'Assesses page responsiveness to all click, tap, and keyboard interactions made throughout a page visit.'
  },
  cls: {
    name: 'Cumulative Layout Shift',
    shortName: 'CLS',
    category: 'core-web-vital',
    unit: '',
    isCoreVital: true,
    thresholdSource: 'Google web.dev (March 2024 standards)',
    thresholds: { goodMax: 0.1, needsImprovementMax: 0.25 },
    goodRangeLabel: '≤ 0.10',
    needsImprovementRangeLabel: '0.10 – 0.25',
    poorRangeLabel: '> 0.25',
    description: 'Measures visual stability by quantifying how often users experience unexpected layout shifts.'
  },
  fcp: {
    name: 'First Contentful Paint',
    shortName: 'FCP',
    category: 'other-performance-metric',
    unit: 's',
    isCoreVital: false,
    thresholdSource: 'Google web.dev / Lighthouse 11.x',
    thresholds: { goodMax: 1.8, needsImprovementMax: 3.0 },
    goodRangeLabel: '≤ 1.8 s',
    needsImprovementRangeLabel: '1.8 s – 3.0 s',
    poorRangeLabel: '> 3.0 s',
    description: 'Marks the time at which the first text or image is painted.'
  },
  tbt: {
    name: 'Total Blocking Time',
    shortName: 'TBT',
    category: 'other-performance-metric',
    unit: 'ms',
    isCoreVital: false,
    thresholdSource: 'Google web.dev / Lighthouse 11.x',
    thresholds: { goodMax: 200, needsImprovementMax: 600 },
    goodRangeLabel: '≤ 200 ms',
    needsImprovementRangeLabel: '200 ms – 600 ms',
    poorRangeLabel: '> 600 ms',
    description: 'Sum of all time periods between FCP and Time to Interactive when task length exceeded 50ms.'
  },
  ttfb: {
    name: 'Time to First Byte',
    shortName: 'TTFB',
    category: 'other-performance-metric',
    unit: 's',
    isCoreVital: false,
    thresholdSource: 'Google web.dev / Lighthouse 11.x',
    thresholds: { goodMax: 0.8, needsImprovementMax: 1.8 },
    goodRangeLabel: '≤ 0.8 s',
    needsImprovementRangeLabel: '0.8 s – 1.8 s',
    poorRangeLabel: '> 1.8 s',
    description: 'Measures the time it takes for the network and server to return the first byte of response data.'
  }
};

export interface MetricClassification {
  metric: MetricType;
  name: string;
  category: MetricCategory;
  isCoreVital: boolean;
  rawValue: number | null;
  rawUnit?: string;
  normalizedValueMs?: number | null;
  displayValue: string;
  displayUnit?: string;
  unit: string;
  rating: MetricRating;
  classification: MetricRating;
  score: number | null;
  thresholdSource: string;
  goodRange: string;
  needsImprovementRange: string;
  poorRange: string;
  isAvailable: boolean;
  unavailableReason?: string;
}

export const PERFORMANCE_THRESHOLDS = METRIC_DEFINITIONS;

/**
 * Classifies a raw metric measurement against authoritative web.dev thresholds.
 * Strictly handles zero (0 is a valid optimal measurement for CLS and TBT),
 * null, undefined, and NaN inputs.
 * Supports string inputs with units (e.g. "7.2s", "7.2ms") and explicit unit parameters.
 */
export const classifyMetric = (
  metric: MetricType,
  value: number | string | null | undefined,
  inputUnitOrReason?: string,
  explicitReason?: string
): MetricClassification => {
  const def = METRIC_DEFINITIONS[metric];
  if (!def) {
    throw new Error(`Unknown metric type: ${metric}`);
  }

  // Parse explicit unit vs reason
  let inputUnit: string | undefined;
  let unavailableReason: string | undefined;
  if (inputUnitOrReason === 's' || inputUnitOrReason === 'ms' || inputUnitOrReason === '') {
    inputUnit = inputUnitOrReason;
    unavailableReason = explicitReason;
  } else {
    unavailableReason = inputUnitOrReason || explicitReason;
  }

  // Handle unavailable, null, undefined, empty string or 'N/A'
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return {
      metric,
      name: def.name,
      category: def.category,
      isCoreVital: def.isCoreVital,
      rawValue: null,
      rawUnit: inputUnit || def.unit,
      normalizedValueMs: null,
      displayValue: 'N/A',
      displayUnit: def.unit,
      unit: def.unit,
      rating: 'unrated',
      classification: 'unrated',
      score: null,
      thresholdSource: def.thresholdSource,
      goodRange: def.goodRangeLabel,
      needsImprovementRange: def.needsImprovementRangeLabel,
      poorRange: def.poorRangeLabel,
      isAvailable: false,
      unavailableReason: unavailableReason || 'Metric measurement not available in current execution context.'
    };
  }

  let numericValue: number;
  let detectedUnit = inputUnit;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'n/a') {
      return classifyMetric(metric, null, unavailableReason);
    }
    const match = trimmed.match(/^([+-]?[\d.]+)\s*(s|ms)?$/i);
    if (!match) {
      return classifyMetric(metric, null, unavailableReason || `Invalid numeric metric string: "${value}"`);
    }
    numericValue = parseFloat(match[1]);
    if (match[2]) {
      detectedUnit = match[2].toLowerCase();
    }
  } else {
    numericValue = value;
  }

  if (isNaN(numericValue)) {
    return classifyMetric(metric, null, unavailableReason);
  }

  // Handle negative invalid values
  const sanitizedValue = Math.max(0, numericValue);
  const rawUnit = detectedUnit || def.unit;
  const { goodMax, needsImprovementMax } = def.thresholds;

  // Special handling for TTFB = 0: network latency to origin cannot be 0ms
  // A 0ms TTFB signifies cached response or unmeasured network delta
  if (metric === 'ttfb' && (numericValue === 0 || sanitizedValue === 0)) {
    return {
      metric,
      name: def.name,
      category: def.category,
      isCoreVital: def.isCoreVital,
      rawValue: 0,
      rawUnit: rawUnit || 'ms',
      normalizedValueMs: 0,
      displayValue: 'N/A',
      displayUnit: 'ms',
      unit: def.unit,
      rating: 'unrated',
      classification: 'unrated',
      score: null,
      thresholdSource: def.thresholdSource,
      goodRange: def.goodRangeLabel,
      needsImprovementRange: def.needsImprovementRangeLabel,
      poorRange: def.poorRangeLabel,
      isAvailable: false,
      unavailableReason: 'Root document TTFB was 0ms, indicating instantaneous local cache or unmeasured network delta. Physical origin latency cannot be 0ms.'
    };
  }

  // Precise unit normalization:
  let normalizedValue = sanitizedValue;
  let normalizedValueMs: number | null = null;

  if (def.unit === 's') {
    // Canonical unit is seconds (LCP, FCP, TTFB)
    if (rawUnit === 'ms' || sanitizedValue >= 100 || (sanitizedValue > 10 && !detectedUnit)) {
      normalizedValue = parseFloat((sanitizedValue / 1000).toFixed(3));
      normalizedValueMs = sanitizedValue;
    } else {
      normalizedValue = sanitizedValue;
      normalizedValueMs = sanitizedValue * 1000;
    }
  } else if (def.unit === 'ms') {
    // Canonical unit is milliseconds (TBT, INP)
    if (rawUnit === 's') {
      normalizedValue = Math.round(sanitizedValue * 1000);
      normalizedValueMs = normalizedValue;
    } else {
      // Input is in milliseconds (e.g. 1ms, 7.2ms, 200ms, 7200ms)
      normalizedValue = sanitizedValue;
      normalizedValueMs = sanitizedValue;
    }
  } else {
    // Unitless (CLS)
    normalizedValue = sanitizedValue;
    normalizedValueMs = null;
  }

  let rating: MetricRating;
  let score: number;

  // IMPORTANT: 0 is explicitly in the GOOD range for all metrics (CLS=0, TBT=0ms, etc.)
  if (normalizedValue <= goodMax) {
    rating = 'good';
    // Normalized score curve in good range: 90 to 100
    if (goodMax === 0) {
      score = 100;
    } else {
      // Closer to 0 gives higher score up to 100
      score = Math.round(100 - (normalizedValue / goodMax) * 10);
    }
  } else if (normalizedValue <= needsImprovementMax) {
    rating = 'needs-improvement';
    // Normalized score curve in needs-improvement range: 50 to 89
    const rangeSpan = needsImprovementMax - goodMax;
    const progress = (normalizedValue - goodMax) / rangeSpan;
    score = Math.round(89 - progress * 39);
  } else {
    rating = 'poor';
    // Normalized score curve in poor range: 0 to 49
    const excess = normalizedValue - needsImprovementMax;
    const drop = Math.min(49, Math.round((excess / needsImprovementMax) * 40));
    score = Math.max(0, 49 - drop);
  }

  // Format display value with appropriate units and precision
  let displayValue: string;
  let displayUnit = def.unit;
  if (metric === 'cls') {
    displayValue = normalizedValue.toFixed(3);
    displayUnit = '';
  } else if (metric === 'ttfb') {
    if (rawUnit === 'ms') {
      displayValue = `${Math.round(normalizedValueMs ?? (normalizedValue * 1000))}ms`;
      displayUnit = 'ms';
    } else {
      displayValue = `${normalizedValue.toFixed(2)}s`;
      displayUnit = 's';
    }
  } else if (metric === 'lcp' || metric === 'fcp') {
    displayValue = `${normalizedValue.toFixed(2)}s`;
    displayUnit = 's';
  } else {
    // tbt, inp (milliseconds)
    // Preserve 1 decimal place if fractional milliseconds exist (e.g. 7.2ms)
    displayValue = Number.isInteger(normalizedValue) ? `${normalizedValue}ms` : `${normalizedValue.toFixed(1)}ms`;
    displayUnit = 'ms';
  }

  return {
    metric,
    name: def.name,
    category: def.category,
    isCoreVital: def.isCoreVital,
    rawValue: sanitizedValue,
    rawUnit,
    normalizedValueMs,
    displayValue,
    displayUnit,
    unit: def.unit,
    rating,
    classification: rating,
    score,
    thresholdSource: def.thresholdSource,
    goodRange: def.goodRangeLabel,
    needsImprovementRange: def.needsImprovementRangeLabel,
    poorRange: def.poorRangeLabel,
    isAvailable: true
  };
};
