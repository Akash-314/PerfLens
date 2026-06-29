import { Page } from 'puppeteer';
import axios from 'axios';
import { URL } from 'url';

/**
 * Scrapes metadata components from active DOM context
 * @param {Page} page - Target puppeteer page instance
 * @param {string} initialUrl - Initial scanner destination URL
 * @returns {Promise<object>} - Normalized metadata attributes
 */
export const extractMetadata = async (page: Page, initialUrl: string) => {
  const title = await page.title();
  const redirectUrl = page.url();

  const metaDescription = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="description"]');
    return meta ? meta.getAttribute('content') || '' : '';
  });

  const language = await page.evaluate(() => {
    return document.documentElement.lang || 'en';
  });

  const domNodesCount = await page.evaluate(() => {
    return document.getElementsByTagName('*').length;
  });

  const faviconUrl = await page.evaluate(() => {
    const link = document.querySelector('link[rel*="icon"]');
    if (link) {
      const href = link.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) return href;
      return href.startsWith('/') ? href : '/' + href;
    }
    return '/favicon.ico';
  });

  const manifestUrl = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') || null : null;
  });

  // Calculate DOM content size weight
  const htmlContent = await page.content();
  const htmlSizeKb = parseFloat((Buffer.byteLength(htmlContent, 'utf8') / 1024).toFixed(1));

  // Passive check robots.txt and sitemap.xml targets
  let hasRobotsTxt = false;
  let hasSitemapXml = false;

  try {
    const parsed = new URL(redirectUrl);
    const origin = parsed.origin;
    
    // Set low timeout to keep scans quick
    const robotsCheck = await axios.get(`${origin}/robots.txt`, { timeout: 3000, validateStatus: () => true });
    hasRobotsTxt = robotsCheck.status === 200;
  } catch (_) {
    // Suppress errors, default false
  }

  try {
    const parsed = new URL(redirectUrl);
    const origin = parsed.origin;
    const sitemapCheck = await axios.get(`${origin}/sitemap.xml`, { timeout: 3000, validateStatus: () => true });
    hasSitemapXml = sitemapCheck.status === 200;
  } catch (_) {
    // Suppress errors, default false
  }

  return {
    title,
    url: initialUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0],
    redirectUrl,
    metaDescription,
    language,
    viewport: { width: 1366, height: 768 },
    htmlSizeKb,
    domNodesCount,
    faviconUrl,
    manifestUrl,
    hasRobotsTxt,
    hasSitemapXml
  };
};
