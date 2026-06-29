import puppeteer, { Browser } from 'puppeteer';
import { URL } from 'url';

/**
 * Validates against potential SSRF attack patterns
 * @param {string} targetUrl - Target URL to scan
 * @returns {boolean} - True if target URL is safe to scrape
 */
export const validateUrlForSsrf = (targetUrl: string): boolean => {
  const urlLower = targetUrl.trim().toLowerCase();

  // Reject harmful schemes
  if (
    urlLower.startsWith('javascript:') ||
    urlLower.startsWith('file:') ||
    urlLower.startsWith('data:') ||
    !/^https?:\/\//i.test(urlLower)
  ) {
    return false;
  }

  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return false;
    }

    // Reject private IP ranges
    const ipPattern = /^(?:127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/;
    if (
      ipPattern.test(hostname) ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    ) {
      return false;
    }
  } catch (_) {
    return false;
  }

  return true;
};

/**
 * Launch standard optimized Chrome instances
 * @returns {Promise<Browser>} - Headless browser instance
 */
export const launchBrowser = async (): Promise<Browser> => {
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
};
