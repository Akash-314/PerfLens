/**
 * Checks if a JavaScript file is minified by analyzing its URL path and query parameters.
 * @param url Script URL
 * @returns boolean
 */
export const isScriptMinified = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    if (pathname.includes('.min.js')) return true;
    
    const minVal = parsed.searchParams.get('min') || parsed.searchParams.get('minify');
    if (minVal === '1' || minVal === 'true') return true;
  } catch (_) {
    if (url.toLowerCase().includes('.min.js')) return true;
  }
  return false;
};

/**
 * Detects common libraries (React, Angular, Vue, jQuery, Lodash, Moment.js, etc.) from script URLs.
 * @param url Script URL
 * @returns String name of the library or null
 */
export const detectCommonLibrary = (url: string): string | null => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('react')) return 'React';
  if (urlLower.includes('angular')) return 'Angular';
  if (urlLower.includes('vue')) return 'Vue';
  if (urlLower.includes('jquery')) return 'jQuery';
  if (urlLower.includes('lodash')) return 'Lodash';
  if (urlLower.includes('moment')) return 'Moment.js';
  if (urlLower.includes('chart.js') || urlLower.includes('chartjs')) return 'Chart.js';
  if (urlLower.includes('three.js') || urlLower.includes('threejs')) return 'Three.js';
  if (urlLower.includes('gsap')) return 'GSAP';
  if (urlLower.includes('bootstrap')) return 'Bootstrap JS';
  
  return null;
};

/**
 * Estimates the size of unused JavaScript code.
 * Follows the existing architecture's heuristic: ~35% of JS rules are estimated as unused.
 * @param sizeKb File size in KB
 * @returns Estimated unused size in KB
 */
export const estimateUnusedJS = (sizeKb: number): number => {
  return parseFloat((sizeKb * 0.35).toFixed(1));
};

/**
 * Estimates parse, execution, and main-thread blocking costs for a given script size.
 * Parse cost is estimated at ~0.4ms/KB.
 * Execution cost is estimated at ~0.8ms/KB.
 * Blocking cost calculates the execution time exceeding 50ms (the threshold for Long Tasks).
 * @param sizeKb File size in KB
 * @returns Object with parseCostMs, executionCostMs, and mainThreadBlockingMs
 */
export const estimateJSCosts = (
  sizeKb: number
): { parseCostMs: number; executionCostMs: number; mainThreadBlockingMs: number } => {
  const parseCostMs = parseFloat((sizeKb * 0.4).toFixed(1));
  const executionCostMs = parseFloat((sizeKb * 0.8).toFixed(1));
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
    const scriptHost = new URL(scriptUrl).hostname;
    const siteHost = new URL(siteUrl).hostname;
    const normalize = (host: string) => host.replace(/^www\./i, '');
    return normalize(scriptHost) !== normalize(siteHost);
  } catch (_) {
    return false;
  }
};
