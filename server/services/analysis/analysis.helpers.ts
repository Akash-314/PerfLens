import { AnalysisMetadata } from './analysis.types.js';
import { PuppeteerScanResult } from '../puppeteer/types.js';

/**
 * Normalizes URL formats to ensure a scheme is present
 * @param url Target website URL
 * @returns Normalized URL string
 */
export const normalizeUrl = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

/**
 * Normalizes and extracts metadata from a Puppeteer scan result
 * @param url Validated URL
 * @param puppeteerResult Result from Puppeteer service
 * @returns AnalysisMetadata object
 */
export const extractMetadata = (
  url: string,
  puppeteerResult: PuppeteerScanResult | null
): AnalysisMetadata => {
  if (puppeteerResult && puppeteerResult.success && puppeteerResult.metadata) {
    const meta = puppeteerResult.metadata;
    return {
      url: meta.url || url,
      title: meta.title || null,
      metaDescription: meta.metaDescription || null
    };
  }

  return {
    url,
    title: null,
    metaDescription: null
  };
};
