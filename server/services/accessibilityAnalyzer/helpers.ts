/**
 * Calculates a best-effort Accessibility score estimate (0-100) based on page title and language presence.
 * @param metadata Page metadata from Puppeteer
 * @returns Accessibility score out of 100
 */
export const calculateAccessibilityScore = (metadata: {
  title?: string | null;
  language?: string | null;
}): number => {
  let score = 0;

  if (metadata.title && metadata.title.trim().length > 0) {
    score += 50;
  }
  if (metadata.language && metadata.language.trim().length > 0) {
    score += 50;
  }

  return score;
};
