import { IRecommendation } from '../../models/Report.js';

class RecommendationEngine {
  /**
   * Run rules engine to extract optimization tasks
   * @param {any} vitals - Web vitals timings
   * @param {any} breakdown - Size payloads breakdown
   * @param {any[]} images - Scraped page images
   * @param {any} dom - Scraped DOM tag stats
   * @returns {IRecommendation[]} - Array of recommendation objects
   */
  generate(vitals: any, breakdown: any, images: any[], dom: any): IRecommendation[] {
    const list: IRecommendation[] = [];

    // Rule 1: PNG / JPEG Next-Gen format compression
    const heavyImages = images.filter(img => img.sizeKb > 100 && (img.format === 'PNG' || img.format === 'JPEG'));
    if (heavyImages.length > 0) {
      const savings = heavyImages.reduce((sum, img) => sum + img.savingsKb, 0);
      list.push({
        category: 'images',
        issue: 'Serve page images in next-generation formats',
        whyItMatters: 'WebP and AVIF image codecs provide superior compression performance compared to legacy PNG/JPEG, reducing download latency.',
        suggestedFix: `Optimize raw image sources (e.g., dynamically convert heavy banners: ${heavyImages.slice(0, 2).map(i => i.src).join(', ')}) using library converters like 'sharp' or CDN compilers like Cloudinary to output WebP/AVIF.`,
        estimatedImprovement: `Saving ~${savings.toFixed(1)} KB (approx ${(savings / 150).toFixed(1)}s speedup on mobile 3G)`,
        difficulty: 'easy',
        priority: 'high',
        refUrl: 'https://web.dev/uses-webp-images/'
      });
    }

    // Rule 2: Image Lazy Loading
    const nonLazyImages = images.filter(img => !img.lazyLoaded && img.sizeKb > 50);
    if (nonLazyImages.length > 0) {
      list.push({
        category: 'images',
        issue: 'Implement lazy loading for below-the-fold images',
        whyItMatters: 'Deferring offscreen assets reduces initial page payload weight, speeding up First Contentful Paint (FCP).',
        suggestedFix: `Add the HTML loading attribute \`loading="lazy"\` to image elements that are not visible in the initial viewport.`,
        estimatedImprovement: 'Accelerate LCP load by up to 250ms',
        difficulty: 'easy',
        priority: 'medium',
        refUrl: 'https://web.dev/browser-level-image-lazy-loading/'
      });
    }

    // Rule 3: JS Bundle code-splitting
    if (breakdown.js.sizeKb > 350) {
      const unusedJs = breakdown.js.unusedKb || Math.round(breakdown.js.sizeKb * 0.3);
      list.push({
        category: 'js',
        issue: 'Introduce code splitting for large JavaScript bundles',
        whyItMatters: 'Giant monolithic script files block main-thread compilation and increase Total Blocking Time (TBT).',
        suggestedFix: `Implement route-level dynamic imports. In React, use React.lazy() and Suspense wrappers. Set up tree-shaking rules in webpack/vite bundlers.`,
        estimatedImprovement: `Shave up to ${unusedJs} KB off main load payload (~200ms TBT reduction)`,
        difficulty: 'medium',
        priority: 'high',
        refUrl: 'https://web.dev/reduce-javascript-payloads-with-code-splitting/'
      });
    }

    // Rule 4: Critical CSS
    if (breakdown.css.sizeKb > 60) {
      const unusedCss = breakdown.css.unusedKb || Math.round(breakdown.css.sizeKb * 0.4);
      list.push({
        category: 'css',
        issue: 'Extract Critical CSS rules and defer global styles',
        whyItMatters: 'CSS files are render-blocking by default. Large global styling bundles delay First Contentful Paint.',
        suggestedFix: `Identify critical styles required for rendering above-the-fold content and inline them directly in the <head> element. Load remaining rulesets asynchronously using rel="preload" links.`,
        estimatedImprovement: `Saves ~${unusedCss} KB of render-blocking overhead`,
        difficulty: 'hard',
        priority: 'medium',
        refUrl: 'https://web.dev/defer-non-critical-css/'
      });
    }

    // Rule 5: Accessibility missing alt tags
    const missingAltImages = images.filter(img => !img.hasAlt);
    if (missingAltImages.length > 0) {
      list.push({
        category: 'accessibility',
        issue: 'Add missing descriptive alt attributes to image tags',
        whyItMatters: 'Screen readers require descriptive alt text to convey visual content to users with vision impairments.',
        suggestedFix: `Locate images lacking descriptions (like: ${missingAltImages.slice(0, 2).map(i => i.src).join(', ')}) and add meaningful alt attributes or set them to empty alt="" strings for purely decorative items.`,
        estimatedImprovement: 'Improves Accessibility audit score to 95+',
        difficulty: 'easy',
        priority: 'medium',
        refUrl: 'https://web.dev/image-alt/'
      });
    }

    // Rule 6: SEO Meta checks
    if (dom && (!dom.hasTitle || !dom.hasMetaDesc)) {
      list.push({
        category: 'seo',
        issue: 'Configure document title and meta description descriptors',
        whyItMatters: 'Search engines use meta tags to format search snippet layouts. Missing or short titles harm index rankings.',
        suggestedFix: `Configure a unique <title> containing 50-60 characters and a <meta name="description"> tag containing 120-160 characters on all index documents.`,
        estimatedImprovement: 'Enhance Organic Search crawl indexing',
        difficulty: 'easy',
        priority: 'high',
        refUrl: 'https://web.dev/meta-description/'
      });
    }

    return list;
  }
}

export default new RecommendationEngine();
