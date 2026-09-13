import { describe, it, expect } from 'vitest';
import { ScoreAnalyzer, DEFAULT_LAB_WEIGHTS, METRIC_METADATA } from '../services/analysis/scoreAnalyzer.js';
import { classifyMetric } from '../config/performanceThresholds.js';

describe('ScoreAnalyzer — Canonical Weighted Performance Scoring & Explainability', () => {

  it('MUST export authoritative default lab weights (LCP: 30%, TBT: 30%, CLS: 25%, FCP: 15%, INP: 0%, TTFB: 0%)', () => {
    expect(DEFAULT_LAB_WEIGHTS.lcp).toBe(0.30);
    expect(DEFAULT_LAB_WEIGHTS.tbt).toBe(0.30);
    expect(DEFAULT_LAB_WEIGHTS.cls).toBe(0.25);
    expect(DEFAULT_LAB_WEIGHTS.fcp).toBe(0.15);
    expect(DEFAULT_LAB_WEIGHTS.inp).toBe(0.00);
    expect(DEFAULT_LAB_WEIGHTS.ttfb).toBe(0.00);
  });

  // Test Case 1: All metrics available
  it('1. MUST correctly calculate overall score and contributions when all metrics are available', () => {
    // Available metrics: LCP=90, TBT=70, CLS=98, FCP=95
    // Weights: LCP=0.30, TBT=0.30, CLS=0.25, FCP=0.15 (Total: 1.0)
    // Expected weighted sum = 90*0.30 + 70*0.30 + 98*0.25 + 95*0.15 = 27 + 21 + 24.5 + 14.25 = 86.75 -> 87
    const vitals = {
      lcp: { score: 90, value: '1.80s', rating: 'good' as const, available: true },
      tbt: { score: 70, value: '250ms', rating: 'needs-improvement' as const, available: true },
      cls: { score: 98, value: '0.020', rating: 'good' as const, available: true },
      fcp: { score: 95, value: '1.20s', rating: 'good' as const, available: true },
      inp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      ttfb: { score: 90, value: '300ms', rating: 'good' as const, available: true }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(87);
    expect(result.totalActiveWeight).toBe(1.0);
    expect(result.includedMetricsCount).toBe(4);

    // Verify contributions
    expect(result.metrics.lcp.contribution).toBe(27.0);
    expect(result.metrics.tbt.contribution).toBe(21.0);
    expect(result.metrics.cls.contribution).toBe(24.5);
    expect(result.metrics.fcp.contribution).toBe(14.25);

    // Verify properties of included metrics
    expect(result.metrics.lcp.available).toBe(true);
    expect(result.metrics.lcp.raw).toBe('1.80s');
    expect(result.metrics.lcp.classification).toBe('good');
    expect(result.metrics.lcp.weight).toBe(0.30);
    expect(result.metrics.lcp.score).toBe(90);
  });

  // Test Case 2: INP unavailable
  it('2. MUST exclude unavailable INP from lab score calculation without penalty', () => {
    const vitals = {
      lcp: { score: 90, value: '1.80s', rating: 'good' as const, available: true },
      tbt: { score: 90, value: '100ms', rating: 'good' as const, available: true },
      cls: { score: 90, value: '0.020', rating: 'good' as const, available: true },
      fcp: { score: 90, value: '1.20s', rating: 'good' as const, available: true },
      inp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(90);
    expect(result.metrics.inp.available).toBe(false);
    expect(result.metrics.inp.score).toBeNull();
    expect(result.metrics.inp.raw).toBe('N/A');
    expect(result.metrics.inp.classification).toBe('unrated');
    expect(result.metrics.inp.contribution).toBeNull();
    expect(result.metrics.inp.reason).toBe('Not available in non-interactive lab measurement');
  });

  // Test Case 3: LCP unavailable
  it('3. MUST handle unavailable LCP by renormalizing remaining active weights', () => {
    // LCP (0.30) unavailable -> remaining weight sum = 0.30 + 0.25 + 0.15 = 0.70
    // TBT=80 (0.30), CLS=90 (0.25), FCP=85 (0.15)
    // weightedSum = 80*0.30 + 90*0.25 + 85*0.15 = 24 + 22.5 + 12.75 = 59.25
    // overallScore = Math.round(59.25 / 0.70) = Math.round(84.64) = 85
    const vitals = {
      lcp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      tbt: { score: 80, value: '220ms', rating: 'needs-improvement' as const, available: true },
      cls: { score: 90, value: '0.050', rating: 'good' as const, available: true },
      fcp: { score: 85, value: '1.50s', rating: 'good' as const, available: true }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(85);
    expect(result.totalActiveWeight).toBe(0.70);
    expect(result.metrics.lcp.available).toBe(false);
    expect(result.metrics.lcp.score).toBeNull();
    expect(result.metrics.lcp.contribution).toBeNull();
  });

  // Test Case 4: CLS unavailable
  it('4. MUST handle unavailable CLS by renormalizing remaining active weights', () => {
    // CLS (0.25) unavailable -> remaining weight sum = 0.30 + 0.30 + 0.15 = 0.75
    // LCP=100 (0.30), TBT=100 (0.30), FCP=100 (0.15)
    // overallScore = Math.round(75 / 0.75) = 100
    const vitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: 100, value: '0ms', rating: 'good' as const, available: true },
      cls: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      fcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(100);
    expect(result.totalActiveWeight).toBe(0.75);
    expect(result.metrics.cls.available).toBe(false);
    expect(result.metrics.cls.score).toBeNull();
    expect(result.metrics.cls.contribution).toBeNull();
  });

  // Test Case 5: FCP unavailable
  it('5. MUST handle unavailable FCP by renormalizing remaining active weights', () => {
    // FCP (0.15) unavailable -> remaining weight sum = 0.30 + 0.30 + 0.25 = 0.85
    // LCP=100, TBT=100, CLS=100 -> overallScore = 100
    const vitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: 100, value: '0ms', rating: 'good' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(100);
    expect(result.totalActiveWeight).toBe(0.85);
    expect(result.metrics.fcp.available).toBe(false);
    expect(result.metrics.fcp.score).toBeNull();
    expect(result.metrics.fcp.contribution).toBeNull();
  });

  // Test Case 6: TBT unavailable
  it('6. MUST handle unavailable TBT by renormalizing remaining active weights', () => {
    // TBT (0.30) unavailable -> remaining weight sum = 0.30 + 0.25 + 0.15 = 0.70
    // LCP=100, CLS=100, FCP=100 -> overallScore = 100
    const vitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(100);
    expect(result.totalActiveWeight).toBe(0.70);
    expect(result.metrics.tbt.available).toBe(false);
    expect(result.metrics.tbt.score).toBeNull();
    expect(result.metrics.tbt.contribution).toBeNull();
  });

  // Test Case 7: Genuinely poor metric with score 0
  it('7. MUST include a genuinely poor metric (available=true, score=0) and penalize overall score', () => {
    // TBT has genuine poor measurement: score=0, available=true
    // LCP=100 (0.30), TBT=0 (0.30), CLS=100 (0.25), FCP=100 (0.15)
    // weightedSum = 100*0.30 + 0*0.30 + 100*0.25 + 100*0.15 = 30 + 0 + 25 + 15 = 70
    // weightSum = 1.0 -> overallScore = 70
    const vitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: 0, value: '2500ms', rating: 'poor' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBe(70);
    expect(result.metrics.tbt.available).toBe(true);
    expect(result.metrics.tbt.score).toBe(0);
    expect(result.metrics.tbt.contribution).toBe(0);
    expect(result.metrics.tbt.classification).toBe('poor');
  });

  // Test Case 8: An unavailable metric with score null
  it('8. MUST distinguish unavailable (score=null) from poor (score=0)', () => {
    // If TBT is unavailable (score: null, available: false), overall score is 100 (NOT penalized to 70)
    const unavailableVitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true }
    };

    const resultUnavailable = ScoreAnalyzer.calculateLabScore(unavailableVitals);
    expect(resultUnavailable.overallScore).toBe(100);
    expect(resultUnavailable.metrics.tbt.contribution).toBeNull();

    // If TBT is genuinely measured 0 (score: 0, available: true), overall score drops to 70
    const poorVitals = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      tbt: { score: 0, value: '5000ms', rating: 'poor' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true }
    };

    const resultPoor = ScoreAnalyzer.calculateLabScore(poorVitals);
    expect(resultPoor.overallScore).toBe(70);
    expect(resultPoor.metrics.tbt.contribution).toBe(0);

    // Verify they are never conflated
    expect(resultUnavailable.overallScore).not.toBe(resultPoor.overallScore);
    expect(resultUnavailable.metrics.tbt.score).toBeNull();
    expect(resultPoor.metrics.tbt.score).toBe(0);
  });

  // Test Case 9: No NaN
  it('9. MUST never produce NaN on corrupted, empty, or all-null inputs', () => {
    const corruptVitals = {
      lcp: { score: NaN as any, value: 'invalid', available: true },
      tbt: { score: null, value: 'N/A', available: false },
      cls: null,
      fcp: undefined
    };

    const resultCorrupt = ScoreAnalyzer.calculateLabScore(corruptVitals);
    expect(isNaN(resultCorrupt.overallScore)).toBe(false);
    expect(resultCorrupt.overallScore).toBe(0);

    const emptyResult = ScoreAnalyzer.calculateLabScore({});
    expect(isNaN(emptyResult.overallScore)).toBe(false);
    expect(emptyResult.overallScore).toBe(0);

    const nullResult = ScoreAnalyzer.calculateLabScore(null);
    expect(isNaN(nullResult.overallScore)).toBe(false);
    expect(nullResult.overallScore).toBe(0);
  });

  // Test Case 10: No undefined arithmetic
  it('10. MUST never perform arithmetic on null or undefined scores', () => {
    const vitals = {
      lcp: { score: 80, value: '2.0s', rating: 'good' as const, available: true },
      tbt: { score: undefined, value: undefined, available: false },
      cls: { score: null, value: null, available: false }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);
    expect(result.overallScore).toBe(80);
    expect(result.metrics.tbt.contribution).toBeNull();
    expect(result.metrics.cls.contribution).toBeNull();
  });

  // Test Case 11: Weight renormalization
  it('11. MUST renormalize active weights so contributions sum to overall score', () => {
    // Only LCP (0.30) and CLS (0.25) available -> total active weight = 0.55
    // LCP score = 80, CLS score = 90
    // normalized weights: LCP = 0.30/0.55 = 0.5455, CLS = 0.25/0.55 = 0.4545
    // expected overall score = Math.round(80 * (0.30/0.55) + 90 * (0.25/0.55)) = Math.round(43.636 + 40.909) = 85
    const vitals = {
      lcp: { score: 80, value: '2.1s', rating: 'good' as const, available: true },
      cls: { score: 90, value: '0.04', rating: 'good' as const, available: true },
      tbt: { score: null, value: 'N/A', rating: 'unrated' as const, available: false },
      fcp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.totalActiveWeight).toBe(0.55);
    expect(result.overallScore).toBe(85);

    const activeContributions = result.breakdown
      .filter(m => m.contribution !== null)
      .map(m => m.contribution as number);
    const sumContributions = Math.round(activeContributions.reduce((sum, c) => sum + c, 0));
    expect(sumContributions).toBe(result.overallScore);
  });

  // Test Case 12: Overall score remains strictly within 0–100
  it('12. MUST guarantee overall score is clamped strictly between 0 and 100', () => {
    const allZeroVitals = {
      lcp: { score: 0, value: '10s', rating: 'poor' as const, available: true },
      tbt: { score: 0, value: '5000ms', rating: 'poor' as const, available: true },
      cls: { score: 0, value: '1.5', rating: 'poor' as const, available: true },
      fcp: { score: 0, value: '8s', rating: 'poor' as const, available: true }
    };
    const resultZero = ScoreAnalyzer.calculateLabScore(allZeroVitals);
    expect(resultZero.overallScore).toBe(0);

    const allHundredVitals = {
      lcp: { score: 100, value: '0.8s', rating: 'good' as const, available: true },
      tbt: { score: 100, value: '0ms', rating: 'good' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      fcp: { score: 100, value: '0.5s', rating: 'good' as const, available: true }
    };
    const resultHundred = ScoreAnalyzer.calculateLabScore(allHundredVitals);
    expect(resultHundred.overallScore).toBe(100);
  });

  // Explicit Example from prompt:
  // INP: available = false, score = null must NOT reduce overall score.
  // INP: available = true, score = 0 must reduce overall score.
  it('MUST NOT reduce score when INP is unavailable, but MUST reduce score when INP is available with score 0 (when INP has weight)', () => {
    // Custom weights including INP: LCP=0.30, CLS=0.30, INP=0.40
    const customWeights = { lcp: 0.30, cls: 0.30, inp: 0.40 };

    // Case A: INP unavailable (score: null, available: false)
    const vitalsUnavailable = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      inp: { score: null, value: 'N/A', rating: 'unrated' as const, available: false }
    };
    const resultA = ScoreAnalyzer.calculateScore(vitalsUnavailable, customWeights);
    // Active weight = 0.30 + 0.30 = 0.60; score = (100*0.3 + 100*0.3) / 0.60 = 100
    expect(resultA.overallScore).toBe(100);
    expect(resultA.metrics.inp.contribution).toBeNull();

    // Case B: INP genuinely measured with poor score 0 (score: 0, available: true)
    const vitalsPoor = {
      lcp: { score: 100, value: '1.0s', rating: 'good' as const, available: true },
      cls: { score: 100, value: '0.000', rating: 'good' as const, available: true },
      inp: { score: 0, value: '7200ms', rating: 'poor' as const, available: true }
    };
    const resultB = ScoreAnalyzer.calculateScore(vitalsPoor, customWeights);
    // Active weight = 0.30 + 0.30 + 0.40 = 1.0; score = (100*0.3 + 100*0.3 + 0*0.4) / 1.0 = 60
    expect(resultB.overallScore).toBe(60);
    expect(resultB.metrics.inp.contribution).toBe(0);

    // Verify reduction
    expect(resultB.overallScore).toBeLessThan(resultA.overallScore);
  });

  // Verify Core Web Vitals vs Other Performance Metrics classification
  it('MUST strictly separate Core Web Vitals from Other Performance Metrics', () => {
    expect(METRIC_METADATA.lcp.isCoreVital).toBe(true);
    expect(METRIC_METADATA.inp.isCoreVital).toBe(true);
    expect(METRIC_METADATA.cls.isCoreVital).toBe(true);

    expect(METRIC_METADATA.fcp.isCoreVital).toBe(false);
    expect(METRIC_METADATA.tbt.isCoreVital).toBe(false);
    expect(METRIC_METADATA.ttfb.isCoreVital).toBe(false);
  });

  // End-to-end integration: classifyMetric -> vitals -> ScoreAnalyzer
  it('MUST integrate end-to-end with classifyMetric as canonical score source', () => {
    // Classify raw values using threshold engine
    const lcpClass = classifyMetric('lcp', 2.0, 's'); // Good: score ~92
    const tbtClass = classifyMetric('tbt', 150, 'ms'); // Good: score ~93
    const clsClass = classifyMetric('cls', 0.05); // Good: score ~95
    const fcpClass = classifyMetric('fcp', 1.5, 's'); // Good: score ~92
    const inpClass = classifyMetric('inp', null); // Unavailable

    // Populate vitals from classifications
    const vitals = {
      lcp: { score: lcpClass.score, value: lcpClass.displayValue, rating: lcpClass.rating, available: lcpClass.isAvailable },
      tbt: { score: tbtClass.score, value: tbtClass.displayValue, rating: tbtClass.rating, available: tbtClass.isAvailable },
      cls: { score: clsClass.score, value: clsClass.displayValue, rating: clsClass.rating, available: clsClass.isAvailable },
      fcp: { score: fcpClass.score, value: fcpClass.displayValue, rating: fcpClass.rating, available: fcpClass.isAvailable },
      inp: { score: inpClass.score, value: inpClass.displayValue, rating: inpClass.rating, available: inpClass.isAvailable }
    };

    const result = ScoreAnalyzer.calculateLabScore(vitals);

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.method).toBe('PerfLens Score (Lab Measurement)');
    expect(result.source).toBe('puppeteer');
    expect(result.metrics.inp.available).toBe(false);
    expect(result.metrics.inp.score).toBeNull();
  });
});
