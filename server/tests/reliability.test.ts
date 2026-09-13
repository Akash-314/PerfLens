import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScanConcurrencyLimiter } from '../services/puppeteer/concurrency.js';
import { cleanOldScreenshots } from '../services/puppeteer/screenshots.js';
import ReportGenerator from '../services/analysis/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.resolve(__dirname, '..', 'temp');

describe('TASK-020: Reliability and Concurrency Protection', () => {
  describe('ScanConcurrencyLimiter', () => {
    it('allows concurrent executions up to maxConcurrency', async () => {
      const limiter = new ScanConcurrencyLimiter(2, 5000);
      expect(limiter.getActiveCount()).toBe(0);

      const release1 = await limiter.acquire();
      expect(limiter.getActiveCount()).toBe(1);

      const release2 = await limiter.acquire();
      expect(limiter.getActiveCount()).toBe(2);

      release1();
      expect(limiter.getActiveCount()).toBe(1);

      release2();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it('queues excess requests when maxConcurrency is reached and executes on release', async () => {
      const limiter = new ScanConcurrencyLimiter(1, 5000);

      const release1 = await limiter.acquire();
      expect(limiter.getActiveCount()).toBe(1);

      let slot2Acquired = false;
      const job2 = limiter.acquire().then(release2 => {
        slot2Acquired = true;
        return release2;
      });

      expect(limiter.getQueueLength()).toBe(1);
      expect(slot2Acquired).toBe(false);

      // Release first slot
      release1();

      const release2 = await job2;
      expect(slot2Acquired).toBe(true);
      expect(limiter.getActiveCount()).toBe(1);

      release2();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it('times out requests if waiting longer than queueTimeoutMs', async () => {
      const limiter = new ScanConcurrencyLimiter(1, 50); // 50ms timeout

      const release1 = await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow(/queue wait time exceeded/i);

      release1();
    });
  });

  describe('Screenshot Retention Cleanup', () => {
    const testFileOld = path.join(tempDir, 'screenshot_full_oldtest.png');
    const testFileNew = path.join(tempDir, 'screenshot_full_newtest.png');

    beforeEach(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(testFileOld, 'old screenshot dummy content');
      fs.writeFileSync(testFileNew, 'new screenshot dummy content');

      // Artificially age the old file by setting mtime to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
      fs.utimesSync(testFileOld, twoHoursAgo, twoHoursAgo);
    });

    afterEach(() => {
      if (fs.existsSync(testFileOld)) fs.unlinkSync(testFileOld);
      if (fs.existsSync(testFileNew)) fs.unlinkSync(testFileNew);
    });

    it('removes screenshots older than threshold while preserving recent ones', async () => {
      const cleaned = await cleanOldScreenshots(3600 * 1000); // 1 hour threshold
      expect(cleaned).toBeGreaterThanOrEqual(1);

      expect(fs.existsSync(testFileOld)).toBe(false);
      expect(fs.existsSync(testFileNew)).toBe(true);
    });
  });

  describe('Analyzer Isolation and Fault Tolerance', () => {
    it('produces a valid consolidated report even if PageSpeed is disabled/offline', async () => {
      const report = await ReportGenerator.generate('https://example.com', 'test-user', false);

      expect(report).toBeDefined();
      expect(report.url).toBe('example.com');
      expect(typeof report.scores?.overall).toBe('number');
      expect(report.scores.overall).toBeGreaterThanOrEqual(0);
      expect(report.scores.overall).toBeLessThanOrEqual(100);

      // CWV metrics are present
      expect(report.vitals?.lcp).toBeDefined();
      expect(report.vitals?.fcp).toBeDefined();
      expect(report.vitals?.cls).toBeDefined();

      // Recommendations list is present
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Analysis sources reflect puppeteer runtime
      expect(report.analysisSources?.puppeteerRuntime).toBe(true);
    });
  });
});
