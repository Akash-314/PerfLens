import { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store screenshots temporarily inside the server workspace temp folder
const tempDir = path.resolve(__dirname, '..', '..', 'temp');

/**
 * Capture full page and viewport screenshots and write to local temp directory
 * @param {Page} page - Active Puppeteer tab page
 * @returns {Promise<object>} - Paths containing local files
 */
export const captureScreenshots = async (page: Page) => {
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const fullPagePath = path.join(tempDir, `screenshot_full_${timestamp}.png`);
    const viewportPath = path.join(tempDir, `screenshot_viewport_${timestamp}.png`);

    // Capture Viewport screenshot
    await page.screenshot({ path: viewportPath, fullPage: false });

    // Capture Full page screenshot
    await page.screenshot({ path: fullPagePath, fullPage: true });

    return {
      fullPagePath: path.resolve(fullPagePath),
      viewportPath: path.resolve(viewportPath)
    };
  } catch (error) {
    console.error(`[Screenshots Service Error]: Capture failed - ${(error as Error).message}`);
    return {
      fullPagePath: '',
      viewportPath: ''
    };
  }
};
