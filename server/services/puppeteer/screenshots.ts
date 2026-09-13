import { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store screenshots temporarily inside the server workspace temp folder
const tempDir = path.resolve(__dirname, '..', '..', 'temp');

/**
 * Remove screenshot files older than maxAgeMs (default 1 hour = 3600000ms)
 * Runs asynchronously and silently handles file access/missing directory errors.
 */
export const cleanOldScreenshots = async (maxAgeMs: number = 3600000): Promise<number> => {
  let cleanedCount = 0;
  try {
    if (!fs.existsSync(tempDir)) return 0;

    const files = await fs.promises.readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      if (/^screenshot_.*\.(png|jpg|webp)$/i.test(file)) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        } catch {
          // Ignore individual file lock/access faults
        }
      }
    }
  } catch {
    // Suppress folder listing faults
  }
  return cleanedCount;
};

/**
 * Capture full page and viewport screenshots and write to local temp directory
 * @param {Page} page - Active Puppeteer tab page
 * @returns {Promise<object>} - Paths containing local files
 */
export const captureScreenshots = async (page: Page) => {
  // Trigger background cleanup of old screenshots asynchronously without blocking
  cleanOldScreenshots().catch(() => {});

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
