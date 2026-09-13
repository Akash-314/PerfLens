import { describe, it, expect } from 'vitest';
import { classifyMetric } from '../config/performanceThresholds.js';

describe('Performance Thresholds & Authoritative Web.dev Standards', () => {

  describe('1. CLS = 0 and Boundaries', () => {
    it('CLS = 0 must be classified as "good"', () => {
      const res = classifyMetric('cls', 0);
      expect(res.rating).toBe('good');
      expect(res.classification).toBe('good');
      expect(res.score).toBe(100);
      expect(res.displayValue).toBe('0.000');
    });

    it('CLS = 0.10 boundary must be "good"', () => {
      const res = classifyMetric('cls', 0.10);
      expect(res.rating).toBe('good');
    });

    it('CLS = 0.101 must be "needs-improvement"', () => {
      const res = classifyMetric('cls', 0.101);
      expect(res.rating).toBe('needs-improvement');
    });

    it('CLS = 0.25 boundary must be "needs-improvement"', () => {
      const res = classifyMetric('cls', 0.25);
      expect(res.rating).toBe('needs-improvement');
    });

    it('CLS = 0.251 must be "poor"', () => {
      const res = classifyMetric('cls', 0.251);
      expect(res.rating).toBe('poor');
    });

    it('CLS = 1.5 must be "poor"', () => {
      const res = classifyMetric('cls', 1.5);
      expect(res.rating).toBe('poor');
    });
  });

  describe('2. TBT = 0 and Boundaries', () => {
    it('TBT = 0 must be classified as "good"', () => {
      const res = classifyMetric('tbt', 0);
      expect(res.rating).toBe('good');
      expect(res.classification).toBe('good');
      expect(res.score).toBe(100);
      expect(res.displayValue).toBe('0ms');
    });

    it('TBT = 200ms boundary must be "good"', () => {
      const res = classifyMetric('tbt', 200);
      expect(res.rating).toBe('good');
    });

    it('TBT = 201ms must be "needs-improvement"', () => {
      const res = classifyMetric('tbt', 201);
      expect(res.rating).toBe('needs-improvement');
    });

    it('TBT = 600ms boundary must be "needs-improvement"', () => {
      const res = classifyMetric('tbt', 600);
      expect(res.rating).toBe('needs-improvement');
    });

    it('TBT = 601ms must be "poor"', () => {
      const res = classifyMetric('tbt', 601);
      expect(res.rating).toBe('poor');
    });
  });

  describe('3. LCP Boundaries', () => {
    it('LCP = 0 must be "good"', () => {
      const res = classifyMetric('lcp', 0);
      expect(res.rating).toBe('good');
    });

    it('LCP = 2.5s must be "good"', () => {
      const res = classifyMetric('lcp', 2.5);
      expect(res.rating).toBe('good');
    });

    it('LCP = 2.51s must be "needs-improvement"', () => {
      const res = classifyMetric('lcp', 2.51);
      expect(res.rating).toBe('needs-improvement');
    });

    it('LCP = 4.01s must be "poor"', () => {
      const res = classifyMetric('lcp', 4.01);
      expect(res.rating).toBe('poor');
    });
  });

  describe('4. FCP Boundaries & Classification', () => {
    it('FCP = 1.8s must be "good" and NOT marked as Core Web Vital', () => {
      const res = classifyMetric('fcp', 1.8);
      expect(res.rating).toBe('good');
      expect(res.isCoreVital).toBe(false);
      expect(res.category).toBe('other-performance-metric');
    });

    it('FCP = 1.81s must be "needs-improvement"', () => {
      const res = classifyMetric('fcp', 1.81);
      expect(res.rating).toBe('needs-improvement');
    });

    it('FCP = 3.01s must be "poor"', () => {
      const res = classifyMetric('fcp', 3.01);
      expect(res.rating).toBe('poor');
    });
  });

  describe('5. Null, Undefined, NaN & Unavailable Handling', () => {
    it('null value is marked unavailable and unrated with N/A display and null score', () => {
      const res = classifyMetric('cls', null, 'Not measured in lab test');
      expect(res.isAvailable).toBe(false);
      expect(res.displayValue).toBe('N/A');
      expect(res.rating).toBe('unrated');
      expect(res.classification).toBe('unrated');
      expect(res.score).toBeNull();
    });

    it('undefined value is marked unavailable with null score', () => {
      const res = classifyMetric('tbt', undefined);
      expect(res.isAvailable).toBe(false);
      expect(res.rating).toBe('unrated');
      expect(res.score).toBeNull();
    });

    it('NaN value is marked unavailable with null score', () => {
      const res = classifyMetric('lcp', NaN);
      expect(res.isAvailable).toBe(false);
      expect(res.rating).toBe('unrated');
      expect(res.score).toBeNull();
    });
  });

  describe('6. Honest INP Handling', () => {
    it('INP is marked as a Core Web Vital but honest about lab availability', () => {
      const res = classifyMetric('inp', null, 'INP requires real user input events and is not available in non-interactive lab crawl');
      expect(res.isCoreVital).toBe(true);
      expect(res.isAvailable).toBe(false);
      expect(res.displayValue).toBe('N/A');
      expect(res.score).toBeNull();
    });
  });

});
