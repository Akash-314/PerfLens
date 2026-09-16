import { MetricRating } from '../../config/performanceThresholds.js';

export interface MetricInput {
  name?: string;
  score?: number | null;
  value?: string | number | null;
  rawValue?: number | null;
  rating?: MetricRating;
  classification?: MetricRating;
  available?: boolean;
  isAvailable?: boolean;
  unit?: string;
  reason?: string;
  unavailableReason?: string;
  [key: string]: any;
}

export interface VitalsInput {
  lcp?: MetricInput | null;
  inp?: MetricInput | null;
  cls?: MetricInput | null;
  fcp?: MetricInput | null;
  tbt?: MetricInput | null;
  ttfb?: MetricInput | null;
  [key: string]: MetricInput | null | undefined;
}

export interface ScoreMetricContribution {
  name: string;
  metric: string;
  raw: string;
  classification: MetricRating;
  score: number | null;
  weight: number;
  weightFormatted: string;
  normalizedWeight: number;
  contribution: number | null;
  available: boolean;
  isCoreVital: boolean;
  category: 'core-web-vital' | 'other-performance-metric';
  reason?: string;
  note?: string;
}

export interface ScoreAnalysisResult {
  overallScore: number;
  finalScore: number;
  overallPerformanceScore: number;
  method: string;
  source: string;
  formula: string;
  formulaDescription: string;
  totalActiveWeight: number;
  includedMetricsCount: number;
  excludedMetricsCount: number;
  breakdown: ScoreMetricContribution[];
  metrics: Record<string, ScoreMetricContribution>;
}

export type ScoreWeights = Record<string, number>;

export const DEFAULT_LAB_WEIGHTS: ScoreWeights = {
  lcp: 0.30,
  tbt: 0.30,
  cls: 0.25,
  fcp: 0.15,
  inp: 0.00,
  ttfb: 0.00
};

export const METRIC_METADATA: Record<
  string,
  { name: string; isCoreVital: boolean; category: 'core-web-vital' | 'other-performance-metric'; defaultNote?: string }
> = {
  lcp: { name: 'Largest Contentful Paint', isCoreVital: true, category: 'core-web-vital' },
  inp: {
    name: 'Interaction to Next Paint',
    isCoreVital: true,
    category: 'core-web-vital',
    defaultNote: 'CrUX Field Core Web Vital; not included in lab performance formula'
  },
  cls: { name: 'Cumulative Layout Shift', isCoreVital: true, category: 'core-web-vital' },
  fcp: { name: 'First Contentful Paint', isCoreVital: false, category: 'other-performance-metric' },
  tbt: { name: 'Total Blocking Time', isCoreVital: false, category: 'other-performance-metric' },
  ttfb: {
    name: 'Time to First Byte',
    isCoreVital: false,
    category: 'other-performance-metric',
    defaultNote: 'Diagnostic metric; not included in lab performance formula'
  }
};

export class ScoreAnalyzer {
  /**
   * Calculates the authoritative PerfLens weighted performance score
   * from canonical classification scores in vitals.
   *
   * @param vitals - Vitals object containing classified metric objects
   * @param customWeights - Optional custom weights overriding DEFAULT_LAB_WEIGHTS
   * @returns ScoreAnalysisResult with overall score, contributions, and explainability breakdown
   */
  static calculateScore(
    vitals: VitalsInput | null | undefined,
    customWeights: ScoreWeights = DEFAULT_LAB_WEIGHTS,
    options: { method?: string; source?: string } = {}
  ): ScoreAnalysisResult {
    const method = options.method || 'PerfLens Score (Lab Measurement)';
    const source = options.source || 'puppeteer';

    if (!vitals || typeof vitals !== 'object') {
      return this.emptyResult(method, source);
    }

    // Metric ordering: Core Web Vitals first (LCP, INP, CLS), then Other Performance Metrics (TBT, FCP, TTFB)
    const metricKeys: Array<'lcp' | 'inp' | 'cls' | 'tbt' | 'fcp' | 'ttfb'> = [
      'lcp',
      'inp',
      'cls',
      'tbt',
      'fcp',
      'ttfb'
    ];

    const weights: ScoreWeights = { ...DEFAULT_LAB_WEIGHTS, ...customWeights };
    const contributions: Record<string, ScoreMetricContribution> = {};
    const breakdown: ScoreMetricContribution[] = [];

    // First pass: inspect availability and identify active metrics
    interface CandidateMetric {
      key: string;
      meta: { name: string; isCoreVital: boolean; category: 'core-web-vital' | 'other-performance-metric'; defaultNote?: string };
      score: number | null;
      raw: string;
      classification: MetricRating;
      weight: number;
      isAvailable: boolean;
      reason?: string;
      note?: string;
    }

    const candidates: CandidateMetric[] = [];
    let totalActiveWeight = 0;
    let weightedSum = 0;

    for (const key of metricKeys) {
      const meta = METRIC_METADATA[key];
      const data: MetricInput | null | undefined = vitals[key];
      const weight = typeof weights[key] === 'number' && !isNaN(weights[key]) ? Math.max(0, weights[key]) : 0;

      // Determine availability: metric must be explicitly available and have a non-null numeric score
      const isAvailable = Boolean(
        data &&
        (data.available === true || data.isAvailable === true) &&
        data.score !== null &&
        data.score !== undefined &&
        typeof data.score === 'number' &&
        !isNaN(data.score)
      );

      let score: number | null = null;
      let raw = 'N/A';
      let classification: MetricRating = 'unrated';
      let reason: string | undefined = data?.reason || data?.unavailableReason;
      let note: string | undefined = meta.defaultNote;

      if (isAvailable && data && typeof data.score === 'number') {
        score = Math.max(0, Math.min(100, Math.round(data.score)));
        raw = data.value != null && data.value !== '' ? String(data.value) : (data.rawValue != null ? String(data.rawValue) : 'N/A');
        classification = data.rating || data.classification || (score >= 90 ? 'good' : score >= 50 ? 'needs-improvement' : 'poor');

        // Only include in score arithmetic if configured weight > 0
        if (weight > 0) {
          totalActiveWeight += weight;
          weightedSum += score * weight;
        }
      } else {
        score = null;
        raw = 'N/A';
        classification = 'unrated';
        if (key === 'inp' && !reason) {
          reason = 'Not available in non-interactive lab measurement';
        }
      }

      candidates.push({
        key,
        meta,
        score,
        raw,
        classification,
        weight,
        isAvailable,
        reason,
        note
      });
    }

    // Calculate overall score (renormalizing weights over totalActiveWeight)
    const overallScore = totalActiveWeight > 0
      ? Math.max(0, Math.min(100, Math.round(weightedSum / totalActiveWeight)))
      : 0;

    // Second pass: compute normalized weights and precise contributions
    let includedCount = 0;
    let excludedCount = 0;

    for (const item of candidates) {
      let normalizedWeight = 0;
      let contribution: number | null = null;

      if (item.isAvailable && item.score !== null) {
        if (item.weight > 0 && totalActiveWeight > 0) {
          normalizedWeight = parseFloat((item.weight / totalActiveWeight).toFixed(4));
          contribution = parseFloat(((item.score * item.weight) / totalActiveWeight).toFixed(2));
          includedCount++;
        } else {
          normalizedWeight = 0;
          contribution = 0;
        }
      } else {
        // Unavailable metrics must never calculate arithmetic (contribution is null)
        normalizedWeight = 0;
        contribution = null;
        excludedCount++;
      }

      const weightPct = `${Math.round(item.weight * 100)}%`;

      const contribObj: ScoreMetricContribution = {
        name: item.meta.name,
        metric: item.meta.name,
        raw: item.raw,
        classification: item.classification,
        score: item.score,
        weight: item.weight,
        weightFormatted: weightPct,
        normalizedWeight,
        contribution,
        available: item.isAvailable,
        isCoreVital: item.meta.isCoreVital,
        category: item.meta.category,
        reason: item.reason,
        note: item.note
      };

      contributions[item.key] = contribObj;
      breakdown.push(contribObj);
    }

    return {
      overallScore,
      finalScore: overallScore,
      overallPerformanceScore: overallScore,
      method,
      source,
      formula: 'Performance Score = Σ(Normalized Metric Score × weight) / Σ(includedWeights)',
      formulaDescription:
        'Calculated from normalized metric scores (0–100) using the configured metric weights.',
      totalActiveWeight: parseFloat(totalActiveWeight.toFixed(4)),
      includedMetricsCount: includedCount,
      excludedMetricsCount: excludedCount,
      breakdown,
      metrics: contributions
    };
  }

  /**
   * Convenience helper specifically for PerfLens standard lab crawl audits
   */
  static calculateLabScore(vitals: VitalsInput | null | undefined): ScoreAnalysisResult {
    return this.calculateScore(vitals, DEFAULT_LAB_WEIGHTS, {
      method: 'PerfLens Score (Lab Measurement)',
      source: 'puppeteer'
    });
  }

  /**
   * Empty/fallback result when vitals are not available
   */
  private static emptyResult(method: string, source: string): ScoreAnalysisResult {
    return {
      overallScore: 0,
      finalScore: 0,
      overallPerformanceScore: 0,
      method,
      source,
      formula: 'Performance Score = Σ(Normalized Metric Score × weight) / Σ(includedWeights)',
      formulaDescription: 'Calculated from normalized metric scores (0–100) using the configured metric weights.',
      totalActiveWeight: 0,
      includedMetricsCount: 0,
      excludedMetricsCount: 0,
      breakdown: [],
      metrics: {}
    };
  }
}

export default ScoreAnalyzer;
