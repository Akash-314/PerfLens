/**
 * Checks if a JavaScript file is minified by analyzing its URL path, query parameters, or code text.
 * @param url Script URL
 * @param codeText Optional actual script source text
 * @returns boolean
 */
export const isScriptMinified = (url: string, codeText?: string): boolean => {
  // If actual source code is available from coverage/CDP, inspect line characteristics
  if (codeText && codeText.length > 100) {
    let lineCount = 1;
    for (let i = 0; i < codeText.length; i++) {
      if (codeText.charCodeAt(i) === 10) lineCount++;
    }
    const avgLineLength = codeText.length / lineCount;
    // Minified scripts typically have very long lines (> 200 chars on average) or <= 3 total lines
    if (avgLineLength > 200 || lineCount <= 3) {
      return true;
    }
    // Formatted, unminified scripts have multiple lines and short average length (< 80 chars)
    if (lineCount > 10 && avgLineLength < 80) {
      return false;
    }
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    
    // Explicit minification extensions
    if (pathname.includes('.min.js') || pathname.includes('-min.js') || pathname.includes('.min.')) return true;
    
    // Production CDN and known minified vendors
    if (hostname.includes('gstatic.com') || hostname.includes('googleapis.com') ||
        hostname.includes('google-analytics.com') || hostname.includes('googletagmanager.com') ||
        hostname.includes('cdnjs.cloudflare.com') || hostname.includes('cdn.jsdelivr.net') ||
        hostname.includes('unpkg.com')) {
      return true;
    }

    // Google production compiled xjs scripts
    if (hostname.includes('google.') && (pathname.includes('/xjs/') || pathname.includes('/rs='))) {
      return true;
    }

    // Modern production bundler chunk patterns (Vite, Next.js, Webpack, Rollup)
    // e.g. /_next/static/chunks/234-8a7d6f.js, /assets/index-a7b8c9d0.js, /chunk.a7b8c9d0.js
    if (/\/(?:_next\/static|assets|chunks|dist|static\/js)\/.*[.-][a-f0-9]{8,}\.js$/i.test(pathname)) {
      return true;
    }

    const minVal = parsed.searchParams.get('min') || parsed.searchParams.get('minify');
    if (minVal === '1' || minVal === 'true') return true;
  } catch {
    if (url.toLowerCase().includes('.min.js')) return true;
  }
  return false;
};

/**
 * Detects common libraries (React, Angular, Vue, jQuery, Lodash, Moment.js, etc.)
 * Uses strict filename and word-boundary matching to prevent false positives from URL hashes.
 * @param url Script URL
 * @returns String name of the library or null
 */
export const detectCommonLibrary = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const filename = pathname.split('/').pop() || '';

    // Match specifically on filename or package segments in path
    if (/(?:^|[.-])react(?:-dom)?(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/react(?:-dom)?@/i.test(pathname)) return 'React';
    if (/(?:^|[.-])angular(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/angular@/i.test(pathname)) return 'Angular';
    if (/(?:^|[.-])vue(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/vue@/i.test(pathname)) return 'Vue';
    if (/(?:^|[.-])jquery(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/jquery@/i.test(pathname)) return 'jQuery';
    if (/(?:^|[.-])lodash(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/lodash@/i.test(pathname)) return 'Lodash';
    if (/(?:^|[.-])moment(?:-timezone)?(?:\.[a-z0-9_-]+)*\.js$/.test(filename) || /\/npm\/moment@/i.test(pathname)) return 'Moment.js';
    if (/(?:^|[.-])chart(?:\.[a-z0-9_-]+)*\.js$/.test(filename)) return 'Chart.js';
    if (/(?:^|[.-])three(?:\.[a-z0-9_-]+)*\.js$/.test(filename)) return 'Three.js';
    if (/(?:^|[.-])gsap(?:\.[a-z0-9_-]+)*\.js$/.test(filename)) return 'GSAP';
    if (/(?:^|[.-])bootstrap(?:\.[a-z0-9_-]+)*\.js$/.test(filename)) return 'Bootstrap JS';
  } catch {
    if (/(?:^|[\\/.-])vue(?:\.[a-z0-9_-]+)*\.js(?:[?#]|$)/i.test(url)) return 'Vue';
    if (/(?:^|[\\/.-])react(?:-dom)?(?:\.[a-z0-9_-]+)*\.js(?:[?#]|$)/i.test(url)) return 'React';
    if (/(?:^|[\\/.-])jquery(?:\.[a-z0-9_-]+)*\.js(?:[?#]|$)/i.test(url)) return 'jQuery';
  }
  return null;
};

/**
 * Returns estimated unused JavaScript.
 * If code coverage was not measured via CDP, returns 0 rather than inventing a percentage.
 * @param sizeKb File size in KB
 * @param measuredCoverageKb Optional measured unused bytes from CDP coverage
 * @returns Unused size in KB
 */
export const estimateUnusedJS = (sizeKb: number, measuredCoverageKb?: number): number => {
  if (typeof measuredCoverageKb === 'number' && measuredCoverageKb >= 0) {
    return parseFloat(measuredCoverageKb.toFixed(1));
  }
  return 0;
};

/**
 * Estimates parse and execution costs.
 * Note: Actual execution time requires longtask PerformanceObserver; these represent
 * baseline hardware throughput estimates for unprofiled scripts.
 * @param sizeKb File size in KB
 * @param measuredExecutionMs Optional measured execution time from observer
 * @returns Object with parseCostMs, executionCostMs, and mainThreadBlockingMs
 */
export const estimateJSCosts = (
  sizeKb: number,
  measuredExecutionMs?: number
): { parseCostMs: number; executionCostMs: number; mainThreadBlockingMs: number } => {
  const executionCostMs = typeof measuredExecutionMs === 'number'
    ? parseFloat(measuredExecutionMs.toFixed(1))
    : parseFloat((sizeKb * 0.5).toFixed(1));

  const parseCostMs = parseFloat((sizeKb * 0.2).toFixed(1));
  const mainThreadBlockingMs = executionCostMs > 50 ? parseFloat((executionCostMs - 50).toFixed(1)) : 0;
  
  return { parseCostMs, executionCostMs, mainThreadBlockingMs };
};

/**
 * Checks if a script is loaded from a third-party domain.
 * @param scriptUrl Script URL
 * @param siteUrl Main website URL
 * @returns boolean
 */
export const isThirdPartyScript = (scriptUrl: string, siteUrl: string): boolean => {
  try {
    const scriptHost = new URL(scriptUrl).hostname.replace(/^www\./i, '').toLowerCase();
    const siteHost = new URL(siteUrl).hostname.replace(/^www\./i, '').toLowerCase();
    return scriptHost !== siteHost && !scriptHost.endsWith('.' + siteHost);
  } catch {
    return false;
  }
};

/**
 * Detects a human-readable package or chunk name from a script URL.
 * Recognizes common libraries, bundler chunk patterns, third-party services, or falls back to filename.
 * @param url Script URL
 * @returns Human-readable package or chunk name
 */
export const detectChunkOrPackageName = (url: string): string => {
  const library = detectCommonLibrary(url);
  if (library) return library;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.split('/').pop()?.split('?')[0] || '';

    // Check for Next.js / Webpack / Vite chunk patterns
    // e.g. /_next/static/chunks/framework-8a7d6f.js -> framework (chunk)
    // e.g. /assets/index-a7b8c9d0.js -> index (chunk)
    // e.g. /static/js/main.a7b8c9d0.chunk.js -> main (chunk)
    const chunkMatch = filename.match(/^(?:chunk-)?([a-zA-Z0-9_-]+?)(?:[.-][a-f0-9]{6,}|[.-]chunk)?\.js$/i);
    if (chunkMatch && chunkMatch[1]) {
      const baseName = chunkMatch[1].replace(/[-_]min$/i, '');
      if (['main', 'framework', 'vendor', 'app', 'index', 'runtime', 'polyfills'].includes(baseName.toLowerCase())) {
        return `${baseName} (bundle)`;
      }
      return `${baseName} (chunk)`;
    }

    // Check for known third-party script providers
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('googletagmanager.com') || host.includes('google-analytics.com')) {
      return 'Google Tag Manager / Analytics';
    }
    if (host.includes('connect.facebook.net')) {
      return 'Facebook SDK';
    }
    if (host.includes('cloudflareinsights.com')) {
      return 'Cloudflare Insights';
    }

    return filename || 'script.js';
  } catch {
    return url.split('/').pop()?.split('?')[0] || 'script.js';
  }
};

