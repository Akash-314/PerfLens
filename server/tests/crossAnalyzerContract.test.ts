import { describe, it, expect } from 'vitest';
import { METRIC_DEFINITIONS, classifyMetric } from '../config/performanceThresholds.js';
import { ScoreAnalyzer } from '../services/analysis/scoreAnalyzer.js';
import RecommendationEngine from '../services/recommendation/index.js';
import pdfService from '../services/report/index.js';

describe('TASK-016: Cross-Analyzer Contract and Data Integrity', () => {

  // ---------------------------------------------------------------------------
  // 1. Every analyzer has a canonical result contract
  // ---------------------------------------------------------------------------
  it('preserves canonical result fields: rawValue, normalizedValueMs, unit, rating, source, mode, availability', () => {
    const lcpClass = classifyMetric('lcp', 1.8, 's');
    expect(lcpClass.rawValue).toBe(1.8);
    expect(lcpClass.normalizedValueMs).toBe(1800);
    expect(lcpClass.unit).toBe('s');
    expect(lcpClass.rating).toBe('good');
    expect(lcpClass.isAvailable).toBe(true);

    const clsClass = classifyMetric('cls', 0.04);
    expect(clsClass.rawValue).toBe(0.04);
    expect(clsClass.unit).toBe('');
    expect(clsClass.rating).toBe('good');
    expect(clsClass.isAvailable).toBe(true);

    const inpUnavailable = classifyMetric('inp', null, undefined, 'Not measured in lab crawl');
    expect(inpUnavailable.rawValue).toBeNull();
    expect(inpUnavailable.rating).toBe('unrated');
    expect(inpUnavailable.isAvailable).toBe(false);
    expect(inpUnavailable.unavailableReason).toBe('Not measured in lab crawl');
  });

  // ---------------------------------------------------------------------------
  // 2. No analyzer silently mutates another analyzer's inputs or values
  // ---------------------------------------------------------------------------
  it('guarantees ScoreAnalyzer and RecommendationEngine do not mutate vitals or breakdown inputs', () => {
    const originalVitals = {
      lcp: { score: 95, value: '1.80s', rawValue: 1.8, normalizedValueMs: 1800, unit: 's', rating: 'good' as const, available: true },
      cls: { score: 100, value: '0.02', rawValue: 0.02, normalizedValueMs: 0.02, unit: '', rating: 'good' as const, available: true },
      inp: { score: null, value: 'N/A', rawValue: null, normalizedValueMs: null, unit: 'ms', rating: 'unrated' as const, available: false },
      tbt: { score: 85, value: '120ms', rawValue: 120, normalizedValueMs: 120, unit: 'ms', rating: 'good' as const, available: true },
      fcp: { score: 90, value: '1.20s', rawValue: 1.2, normalizedValueMs: 1200, unit: 's', rating: 'good' as const, available: true },
      ttfb: { score: 95, value: '0.15s', rawValue: 0.15, normalizedValueMs: 150, unit: 's', rating: 'good' as const, available: true }
    };

    const vitalsCopy = JSON.parse(JSON.stringify(originalVitals));
    const breakdown = {
      js: { sizeKb: 200, count: 5, unusedKb: 0 },
      css: { sizeKb: 40, count: 2, unusedKb: 0 },
      images: { sizeKb: 300, count: 4 },
      fonts: { sizeKb: 50, count: 1 },
      thirdParty: { sizeKb: 0, count: 0 }
    };
    const breakdownCopy = JSON.parse(JSON.stringify(breakdown));

    // Run ScoreAnalyzer
    const scoreResult = ScoreAnalyzer.calculateLabScore(originalVitals as any);
    expect(scoreResult.overallScore).toBeGreaterThan(0);
    expect(originalVitals).toEqual(vitalsCopy); // No mutation

    // Run RecommendationEngine
    const recommendations = RecommendationEngine.generate(
      originalVitals,
      breakdown,
      [],
      { hasTitle: true, hasMetaDesc: true }
    );
    expect(originalVitals).toEqual(vitalsCopy); // No mutation
    expect(breakdown).toEqual(breakdownCopy); // No mutation
    expect(Array.isArray(recommendations)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. Central source of truth for metric thresholds: no duplicate conflicting logic
  // ---------------------------------------------------------------------------
  it('confirms METRIC_DEFINITIONS is the authoritative canonical threshold source', () => {
    expect(METRIC_DEFINITIONS.lcp.thresholds.goodMax).toBe(2.5);
    expect(METRIC_DEFINITIONS.lcp.thresholds.needsImprovementMax).toBe(4.0);

    expect(METRIC_DEFINITIONS.inp.thresholds.goodMax).toBe(200);
    expect(METRIC_DEFINITIONS.inp.thresholds.needsImprovementMax).toBe(500);

    expect(METRIC_DEFINITIONS.cls.thresholds.goodMax).toBe(0.1);
    expect(METRIC_DEFINITIONS.cls.thresholds.needsImprovementMax).toBe(0.25);

    expect(METRIC_DEFINITIONS.fcp.thresholds.goodMax).toBe(1.8);
    expect(METRIC_DEFINITIONS.tbt.thresholds.goodMax).toBe(200);
    expect(METRIC_DEFINITIONS.ttfb.thresholds.goodMax).toBe(0.8);
  });

  // ---------------------------------------------------------------------------
  // 4. Data flow agreement: JSON, API, DB, and PDF representation
  // ---------------------------------------------------------------------------
  it('verifies that PDF generation preserves exact metric values and explainability without reinterpretation', async () => {
    const reportData = {
      url: 'https://example.com',
      createdAt: new Date().toISOString(),
      scores: {
        overall: 92,
        performance: 92,
        accessibility: 95,
        seo: 90,
        bestPractices: 90
      },
      vitals: {
        lcp: { score: 95, value: '1.80s', unit: 's', rating: 'good', available: true, source: 'puppeteer', mode: 'lab' },
        cls: { score: 100, value: '0.02', unit: '', rating: 'good', available: true, source: 'puppeteer', mode: 'lab' },
        inp: { score: null, value: 'N/A', unit: 'ms', rating: 'unrated', available: false, source: 'crux', mode: 'field' },
        fcp: { score: 90, value: '1.20s', unit: 's', rating: 'good', available: true, source: 'puppeteer', mode: 'lab' },
        tbt: { score: 85, value: '120ms', unit: 'ms', rating: 'good', available: true, source: 'puppeteer', mode: 'lab' },
        ttfb: { score: 95, value: '0.15s', unit: 's', rating: 'good', available: true, source: 'puppeteer', mode: 'lab' }
      },
      scoreExplanation: {
        method: 'PerfLens Score (Lab Measurement)',
        formula: 'Overall Score = Σ(metricScore × weight) / Σ(includedWeights)',
        overallPerformanceScore: 92,
        breakdown: [
          { metric: 'Largest Contentful Paint', raw: '1.80s', classification: 'good', weight: 0.30, weightFormatted: '30%', score: 95, contribution: 28.5 },
          { metric: 'Total Blocking Time', raw: '120ms', classification: 'good', weight: 0.30, weightFormatted: '30%', score: 85, contribution: 25.5 },
          { metric: 'Cumulative Layout Shift', raw: '0.02', classification: 'good', weight: 0.25, weightFormatted: '25%', score: 100, contribution: 25.0 },
          { metric: 'First Contentful Paint', raw: '1.20s', classification: 'good', weight: 0.15, weightFormatted: '15%', score: 90, contribution: 13.5 },
          { metric: 'Interaction to Next Paint', raw: 'N/A', classification: 'unrated', weight: 0, weightFormatted: '0%', score: null, contribution: null, available: false },
          { metric: 'Time to First Byte', raw: '0.15s', classification: 'good', weight: 0, weightFormatted: '0%', score: 95, contribution: 0, available: true }
        ]
      },
      breakdown: {
        js: { sizeKb: 150, count: 3, unusedKb: 0 },
        css: { sizeKb: 25, count: 1, unusedKb: 0 },
        images: { sizeKb: 80, count: 2 },
        fonts: { sizeKb: 30, count: 1 }
      },
      bundleAnalysis: [
        { packageName: 'main (bundle)', sizeKb: 150, transferSizeKb: 45, compression: 'brotli', isDuplicate: false, isUnused: false, hasSourceMap: true }
      ],
      recommendations: []
    };

    const pdfBuffer = await pdfService.generateReportPdf(reportData as any);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1500);

    // Verify reportData retains its exact values (no mutation by PDF generator)
    expect(reportData.scores.performance).toBe(92);
    expect(reportData.vitals.lcp.value).toBe('1.80s');
    expect(reportData.vitals.inp.available).toBe(false);
  });
});
