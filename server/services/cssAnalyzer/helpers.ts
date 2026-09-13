/**
 * Checks if a stylesheet is minified by analyzing its URL path and query parameters.
 * @param url Stylesheet URL
 * @returns boolean indicating if the stylesheet is likely minified
 */
export const isStylesheetMinified = (url: string, codeText?: string): boolean => {
  // If actual source code is available from coverage/CDP, inspect line characteristics
  if (codeText && codeText.length > 100) {
    const lines = codeText.split('\n');
    const avgLineLength = codeText.length / Math.max(1, lines.length);
    if (avgLineLength > 200 || lines.length <= 3) {
      return true;
    }
    if (lines.length > 10 && avgLineLength < 80) {
      return false;
    }
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    
    // Check if filename contains .min.css
    if (pathname.includes('.min.css') || pathname.includes('-min.css') || pathname.includes('.min.')) return true;
    
    // Production CDNs and fonts/vendor stylesheets
    if (hostname.includes('gstatic.com') || hostname.includes('googleapis.com') ||
        hostname.includes('cdnjs.cloudflare.com') || hostname.includes('cdn.jsdelivr.net') ||
        hostname.includes('unpkg.com')) {
      return true;
    }

    // Modern production bundler chunk patterns (e.g. /assets/index-D1jfd3Ic.css)
    if (/\/(?:_next\/static|assets|chunks|dist|static\/css)\/.*[.-][a-f0-9]{8,}\.css$/i.test(pathname)) {
      return true;
    }

    // Check query params for minification flags
    const minVal = parsed.searchParams.get('min') || parsed.searchParams.get('minify');
    if (minVal === '1' || minVal === 'true') return true;
  } catch {
    if (url.toLowerCase().includes('.min.css')) return true;
  }
  return false;
};

/**
 * Determines if a stylesheet is render-blocking.
 * By web specification, stylesheets in the document head without an asynchronous, disabled, or print media attribute block initial render.
 * @param media Media attribute string (e.g. 'all', 'print', 'screen')
 * @param isAsync Whether the link has an asynchronous loading strategy (e.g. rel="preload" with onload)
 * @param disabled Whether the link element is disabled
 * @param inHead Whether the link is inside the document <head>
 * @returns boolean
 */
export const isRenderBlockingCSS = (
  media?: string | null,
  isAsync?: boolean,
  disabled?: boolean,
  inHead?: boolean
): boolean => {
  if (isAsync) return false;
  if (disabled === true) return false;
  if (inHead === false) return false;
  const cleanMedia = (media || 'all').toLowerCase().trim();
  if (cleanMedia === 'print') return false;
  return true;
};

/**
 * Returns estimated unused CSS.
 * If coverage was not tracked via CDP, returns 0 rather than fabricating a static percentage.
 * @param sizeKb File size in KB
 * @param measuredUnusedKb Measured unused bytes from coverage
 * @returns Unused size in KB
 */
export const estimateUnusedCSS = (sizeKb: number, measuredUnusedKb?: number): number => {
  if (typeof measuredUnusedKb === 'number' && measuredUnusedKb >= 0) {
    return parseFloat(measuredUnusedKb.toFixed(1));
  }
  return 0;
};

/**
 * Checks if a stylesheet is a candidate to be split and inlined as Critical CSS.
 * A stylesheet is a candidate if it is render-blocking and small enough (< 15KB) that inlining eliminates a round trip.
 * @param sizeKb File size in KB
 * @param isRenderBlocking Render-blocking flag
 * @returns boolean
 */
export const checkCriticalCssCandidate = (sizeKb: number, isRenderBlocking: boolean): boolean => {
  return isRenderBlocking && sizeKb > 0 && sizeKb < 15.0;
};
