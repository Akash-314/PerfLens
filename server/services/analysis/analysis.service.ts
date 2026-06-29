import { runPageSpeedAudit } from '../pagespeed/index.js';
import { analyzeWebsiteWithPuppeteer } from '../puppeteer/index.js';
import { AnalysisEngineResult, AnalysisStatus } from './analysis.types.js';
import { normalizeUrl, extractMetadata } from './analysis.helpers.js';
import { PageSpeedScanResult } from '../pagespeed/types.js';
import { PuppeteerScanResult } from '../puppeteer/types.js';

/**
 * Coordinate and run the PageSpeed and Puppeteer audit services concurrently.
 * Reconciles the results into a single normalized analysis object.
 *
 * @param url Validated target website URL
 * @returns Promise resolving to the merged AnalysisEngineResult
 */
export const analyzeWebsite = async (url: string): Promise<AnalysisEngineResult> => {
  const startTime = Date.now();
  const cleanUrl = normalizeUrl(url);

  console.log(`[Analysis Engine]: Starting website analysis for URL: ${cleanUrl}`);

  let pagespeedResult: PageSpeedScanResult | null = null;
  let puppeteerResult: PuppeteerScanResult | null = null;

  // Run PageSpeed and Puppeteer audits concurrently without blocking each other.
  // Using Promise.allSettled ensures that one service crashing doesn't fail the whole execution.
  const [pagespeedSettled, puppeteerSettled] = await Promise.allSettled([
    runPageSpeedAudit(cleanUrl),
    analyzeWebsiteWithPuppeteer(cleanUrl)
  ]);

  if (pagespeedSettled.status === 'fulfilled') {
    pagespeedResult = pagespeedSettled.value;
  } else {
    console.error(`[Analysis Engine]: PageSpeed service failed:`, pagespeedSettled.reason);
  }

  if (puppeteerSettled.status === 'fulfilled') {
    puppeteerResult = puppeteerSettled.value;
  } else {
    console.error(`[Analysis Engine]: Puppeteer service failed:`, puppeteerSettled.reason);
  }

  // Determine overall status based on service successes.
  // PageSpeed returns an object with a success boolean.
  // Puppeteer also catches internal errors and returns an object with a success boolean.
  const isPageSpeedSuccess = pagespeedResult ? pagespeedResult.success : false;
  const isPuppeteerSuccess = puppeteerResult ? puppeteerResult.success : false;

  let status: AnalysisStatus = 'failed';
  if (isPageSpeedSuccess && isPuppeteerSuccess) {
    status = 'success';
  } else if (isPageSpeedSuccess || isPuppeteerSuccess) {
    status = 'partial_success';
  } else {
    status = 'failed';
  }

  const duration = Date.now() - startTime;
  const metadata = extractMetadata(cleanUrl, puppeteerResult);

  return {
    metadata,
    pagespeed: pagespeedResult,
    puppeteer: puppeteerResult,
    timestamp: new Date(),
    duration,
    status
  };
};
