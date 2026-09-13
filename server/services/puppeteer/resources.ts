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
    page.on('response', async (response) => {
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
        let sizeKb = contentLength > 0 ? parseFloat((contentLength / 1024).toFixed(1)) : 0;

        // Determine content-encodings
        let compression: 'gzip' | 'brotli' | 'none' = 'none';
        const encoding = headers['content-encoding'] || '';
        if (encoding.includes('br')) {
          compression = 'brotli';
        } else if (encoding.includes('gzip') || encoding.includes('deflate')) {
          compression = 'gzip';
        }

        // Deduce timing without fabricating numbers
        const timing = response.timing();
        let durationMs: number | null = null;
        let startTimeMs: number | null = null;
        let timingBreakdown: any = null;

        if (timing) {
          durationMs = timing.receiveHeadersEnd > 0 ? Math.round(timing.receiveHeadersEnd) : null;
          startTimeMs = timing.requestTime ? Math.round(timing.requestTime * 1000) : null;

          const dnsMs = (timing.dnsEnd >= 0 && timing.dnsStart >= 0) ? Math.max(0, Math.round(timing.dnsEnd - timing.dnsStart)) : null;
          const tcpMs = (timing.connectEnd >= 0 && timing.connectStart >= 0) ? Math.max(0, Math.round(timing.connectEnd - timing.connectStart)) : null;
          const tlsMs = (timing.sslEnd >= 0 && timing.sslStart >= 0) ? Math.max(0, Math.round(timing.sslEnd - timing.sslStart)) : null;
          const ttfbMs = (timing.receiveHeadersEnd >= 0 && timing.sendEnd >= 0) ? Math.max(0, Math.round(timing.receiveHeadersEnd - timing.sendEnd)) : null;
          const downloadMs = (timing.receiveHeadersEnd >= 0 && timing.receiveHeadersStart >= 0) ? Math.max(0, Math.round(timing.receiveHeadersEnd - timing.receiveHeadersStart)) : null;

          timingBreakdown = {
            dnsMs,
            tcpMs,
            tlsMs,
            ttfbMs,
            downloadMs,
            startTimeMs,
            durationMs
          };
        }

        const fromCache = typeof (response as any).fromCache === 'function' ? (response as any).fromCache() : response.status() === 304;
        const initiatorObj = typeof (req as any).initiator === 'function' ? (req as any).initiator() : null;
        const initiator = initiatorObj?.type || null;

        const httpVersion = typeof (response as any).protocol === 'function' ? (response as any).protocol().toUpperCase() : 'HTTP/1.1';

        const resourceItem: ResourceItem = {
          url,
          type,
          sizeKb: sizeKb > 0 ? sizeKb : 0.5, // placeholder until buffer resolves if chunked
          statusCode: response.status(),
          contentType,
          transferSizeKb: fromCache ? 0 : (sizeKb > 0 ? sizeKb : 0.5),
          cacheControl,
          durationMs,
          compression,
          httpVersion,
          fromCache,
          initiator,
          startTimeMs,
          timingBreakdown
        };

        this.resources.push(resourceItem);

        // If content-length was missing, try buffering response asynchronously to get real size
        if (sizeKb === 0) {
          const status = response.status();
          // Only attempt to buffer successful 2xx responses that are not redirects
          if (status >= 200 && status < 300) {
            response.buffer().then((buffer) => {
              const realSize = parseFloat((buffer.byteLength / 1024).toFixed(1));
              resourceItem.sizeKb = realSize;
              resourceItem.transferSizeKb = realSize;
            }).catch(() => {
              // Fail silently, leave at placeholder size
            });
          }
        }
      } catch {
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

