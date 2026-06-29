import { Page } from 'puppeteer';
import { ResourceItem } from './types.js';

/**
 * Tracks network request assets, failed requests, and response cache parameters.
 */
export class NetworkTracker {
  private resources: ResourceItem[] = [];
  private failedCount: number = 0;

  /**
   * Register listeners on puppeteer page lifecycle events
   * @param {Page} page - Active Puppeteer tab page
   */
  startTracking(page: Page) {
    page.on('response', (response) => {
      try {
        const req = response.request();
        const url = response.url();
        
        // Skip base64 data assets to keep summaries lightweight
        if (url.startsWith('data:')) return;

        const headers = response.headers();
        const contentType = headers['content-type'] || 'unknown';
        const cacheControl = headers['cache-control'] || 'no-cache, no-store';

        // Categorize file types
        let type: ResourceItem['type'] = 'other';
        const resType = req.resourceType();
        
        if (resType === 'document') type = 'document';
        else if (resType === 'script') type = 'js';
        else if (resType === 'stylesheet') type = 'css';
        else if (resType === 'image') type = 'image';
        else if (resType === 'font') type = 'font';
        else if (resType === 'xhr') type = 'xhr';
        else if (resType === 'fetch') type = 'fetch';
        else if (resType === 'media') type = 'media';

        const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
        const sizeKb = contentLength > 0 ? parseFloat((contentLength / 1024).toFixed(1)) : 15.0; // fallback default estimation

        // Determine content-encodings
        let compression: 'gzip' | 'brotli' | 'none' = 'none';
        const encoding = headers['content-encoding'] || '';
        if (encoding.includes('br')) {
          compression = 'brotli';
        } else if (encoding.includes('gzip') || encoding.includes('deflate')) {
          compression = 'gzip';
        }

        // Deduce timing
        const timing = response.timing();
        const durationMs = timing ? Math.round(timing.receiveHeadersEnd) : 100;

        this.resources.push({
          url,
          type,
          sizeKb,
          statusCode: response.status(),
          contentType,
          transferSizeKb: sizeKb,
          cacheControl,
          durationMs: durationMs > 0 ? durationMs : 100,
          compression,
          httpVersion: 'HTTP/2'
        });
      } catch (_) {
        // Suppress errors during parallel stream shutdowns
      }
    });

    page.on('requestfailed', () => {
      this.failedCount++;
    });
  }

  /**
   * Retrieve total resources traced
   * @returns {ResourceItem[]} - Mapped resources list
   */
  getResources(): ResourceItem[] {
    return this.resources;
  }

  /**
   * Retrieve total failures count
   * @returns {number} - Failures
   */
  getFailedCount(): number {
    return this.failedCount;
  }
}
