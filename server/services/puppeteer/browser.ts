import puppeteer, { Browser } from 'puppeteer';
import { validateUrlForSsrf, validateUrlSsrfAsync } from '../security/ssrfValidator.js';

export { validateUrlForSsrf, validateUrlSsrfAsync };

/**
 * Launch standard optimized Chrome instances with security isolation intact
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
      '--disable-gpu'
    ]
  });
};

