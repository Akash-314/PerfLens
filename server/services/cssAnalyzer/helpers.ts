/**
 * Checks if a stylesheet is minified by analyzing its URL path and query parameters.
 * @param url Stylesheet URL
 * @returns boolean indicating if the stylesheet is likely minified
 */
export const isStylesheetMinified = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    // Check if filename contains .min.css
    if (pathname.includes('.min.css')) return true;
    
    // Check query params for minification flags
    const minVal = parsed.searchParams.get('min') || parsed.searchParams.get('minify');
    if (minVal === '1' || minVal === 'true') return true;
  } catch (_) {
    // Fallback search for relative URLs or malformed strings
    if (url.toLowerCase().includes('.min.css')) return true;
  }
  return false;
};

/**
 * Determines if a stylesheet is render-blocking.
 * Follows the existing architecture's heuristic: render-blocking if it isn't publicly cached OR if it's > 50KB.
 * @param sizeKb File size in KB
 * @param cacheControl Response Cache-Control header
 * @returns boolean
 */
export const isRenderBlockingCSS = (sizeKb: number, cacheControl: string): boolean => {
  const cc = cacheControl.toLowerCase();
  return !cc.includes('public') || sizeKb > 50;
};

/**
 * Estimates the size of unused CSS rules within the stylesheet.
 * Follows the existing architecture's heuristic: ~45% of CSS rules are estimated as unused.
 * @param sizeKb File size in KB
 * @returns Estimated unused size in KB
 */
export const estimateUnusedCSS = (sizeKb: number): number => {
  return parseFloat((sizeKb * 0.45).toFixed(1));
};

/**
 * Checks if a stylesheet is a good candidate to be split and inlined as Critical CSS.
 * A stylesheet is a candidate if it is render-blocking but small enough (< 15KB) that inlining is highly efficient.
 * @param sizeKb File size in KB
 * @param isRenderBlocking Render-blocking flag
 * @returns boolean
 */
export const checkCriticalCssCandidate = (sizeKb: number, isRenderBlocking: boolean): boolean => {
  return isRenderBlocking && sizeKb < 15.0;
};
