import { Browser, Page } from 'puppeteer';

/**
 * Configure target browser page viewport and user-agent properties safely
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} url - Target URL to load
 * @returns {Promise<Page>} - Configured loaded Page instance
 */
export const loadPageSafely = async (browser: Browser, url: string): Promise<Page> => {
  const page = await browser.newPage();

  // Set desktop viewport profile
  await page.setViewport({ width: 1366, height: 768 });

  // Set latest Chrome desktop agent to prevent bot detections
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Disable browser prompt alerts
  await page.evaluateOnNewDocument(() => {
    // Override permissions warnings
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Enable request interception if needed (for resource summaries)
  await page.setRequestInterception(false);

  // Navigate to target
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  return page;
};
