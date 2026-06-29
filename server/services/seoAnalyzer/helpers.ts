/**
 * Calculates a deterministic SEO score estimate (0-100) based on meta tags and config files.
 * @param metadata Page metadata from Puppeteer
 * @returns SEO score out of 100
 */
export const calculateSeoScore = (metadata: {
  title?: string | null;
  metaDescription?: string | null;
  language?: string | null;
  viewport?: any | null;
  hasRobotsTxt?: boolean;
  hasSitemapXml?: boolean;
}): number => {
  let score = 0;

  if (metadata.title && metadata.title.trim().length > 0) {
    score += 20;
  }
  if (metadata.metaDescription && metadata.metaDescription.trim().length > 0) {
    score += 20;
  }
  if (metadata.language && metadata.language.trim().length > 0) {
    score += 15;
  }
  if (metadata.viewport) {
    score += 15;
  }
  if (metadata.hasRobotsTxt) {
    score += 15;
  }
  if (metadata.hasSitemapXml) {
    score += 15;
  }

  return score;
};
