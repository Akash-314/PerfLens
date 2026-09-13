/**
 * Bounded Concurrency Semaphore for heavy Puppeteer browser crawls.
 * Prevents system exhaustion by bounding active Chrome instances and queueing excess requests.
 */
export class ScanConcurrencyLimiter {
  private activeCount = 0;
  private maxConcurrency: number;
  private queue: Array<{
    resolve: (release: () => void) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private queueTimeoutMs: number;

  constructor(maxConcurrency = 3, queueTimeoutMs = 60000) {
    this.maxConcurrency = maxConcurrency;
    this.queueTimeoutMs = queueTimeoutMs;
  }

  /**
   * Acquire a slot for running a heavy browser scan.
   * Returns a release function that must be called in a finally block.
   */
  async acquire(): Promise<() => void> {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.activeCount--;
          this.processNext();
        }
      };
    }

    return new Promise<() => void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.queue.findIndex(item => item.timeout === timeout);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(
            new Error(
              `Scan concurrency limit reached (${this.maxConcurrency} active). Queue wait time exceeded (${this.queueTimeoutMs / 1000}s).`
            )
          );
        }
      }, this.queueTimeoutMs);

      this.queue.push({
        resolve: (releaseFn: () => void) => {
          clearTimeout(timeout);
          resolve(releaseFn);
        },
        reject,
        timeout
      });
    });
  }

  private processNext() {
    if (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.activeCount++;
        let released = false;
        const releaseFn = () => {
          if (!released) {
            released = true;
            this.activeCount--;
            this.processNext();
          }
        };
        next.resolve(releaseFn);
      }
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}

// Global shared concurrency limiter instance driven by environment or safe default (3)
const parsedLimit = parseInt(process.env.MAX_CONCURRENT_SCANS || '3', 10);
const maxScans = isNaN(parsedLimit) || parsedLimit < 1 ? 3 : parsedLimit;
export const globalScanLimiter = new ScanConcurrencyLimiter(maxScans, 60000);
