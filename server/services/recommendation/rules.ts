import { Recommendation } from './types.js';

export interface RecommendationInput {
  pagespeed: any;
  image: any;
  css: any;
  js: any;
  seo: any;
  accessibility: any;
}

export interface RecommendationRule {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices';
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  hoursToImplement: number;
  evaluate(input: RecommendationInput): Recommendation | null;
}

export const rules: RecommendationRule[] = [
  {
    id: 'REC_IMAGE_COMPRESSION',
    title: 'Compress page images and convert to next-gen formats (WebP/AVIF)',
    description: 'WebP and AVIF image formats provide superior compression performance compared to legacy PNG/JPEG, reducing download latency.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      let totalSavings = 0;
      
      // Accumulate savings from Image Analyzer candidates
      if (input.image && input.image.optimizationCandidates) {
        input.image.optimizationCandidates.forEach((cand: any) => {
          totalSavings += cand.estimatedSizeReductionKb || 0;
        });
      }

      // Check PageSpeed if available
      const hasPageSpeedImageWarn = input.pagespeed && 
        (input.pagespeed.warnings?.some((w: any) => w.code === 'uses-optimized-images' || w.code === 'uses-webp-images'));

      if (totalSavings > 0 || hasPageSpeedImageWarn) {
        const savingsKb = totalSavings || 150; // Fallback estimate if only pagespeed warns
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: input.image ? (input.pagespeed ? 'merged' : 'image') : 'pagespeed',
          priority: savingsKb > 500 ? 'critical' : savingsKb > 100 ? 'high' : 'medium',
          severity: savingsKb > 500 ? 'error' : 'warning',
          estimatedPerformanceGain: `Save ~${(savingsKb / 150).toFixed(1)}s on slow 3G networks`,
          estimatedBandwidthSaving: Math.round(savingsKb),
          estimatedLcpImprovement: savingsKb > 200 ? 'Up to 300ms reduction' : 'Minimal',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Optimize raw image assets using sharp, imagemin, or dynamic CDN image compilers (e.g. Cloudinary) to compress payloads and serve next-gen formats (WebP/AVIF)."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_IMAGE_LAZY_LOAD',
    title: 'Implement lazy loading for below-the-fold images',
    description: 'Deferring offscreen assets reduces initial page payload weight, speeding up First Contentful Paint (FCP).',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingCount = input.image?.summary?.imagesMissingLazyLoading || 0;
      if (missingCount > 0) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'image',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: 'Shaves weight off initial load time',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'Up to 150ms reduction',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: `Add loading="lazy" attribute to all ${missingCount} images not appearing in the top viewport.`
        };
      }
      return null;
    }
  },
  {
    id: 'REC_IMAGE_ALT_TEXT',
    title: 'Add descriptive alt attributes to image tags',
    description: 'Screen readers require descriptive alt text to convey visual content to users with vision impairments.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      const missingCountImg = input.image?.summary?.imagesMissingAltText || 0;
      const missingCountA11y = input.accessibility?.summary?.imagesMissingAlt || 0;
      const totalMissing = Math.max(missingCountImg, missingCountA11y);

      const hasA11yAltWarn = input.accessibility?.warnings?.some((w: any) => w.code === 'A11Y_MISSING_ALT' || w.code === 'A11Y_EMPTY_ALT');

      if (totalMissing > 0 || hasA11yAltWarn) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: input.image && input.accessibility ? 'merged' : (input.image ? 'image' : 'accessibility'),
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: 'None',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: `Provide meaningful alt="..." text descriptions for all image tags (affecting ~${totalMissing || 1} images) or empty alt="" for decorative elements.`
        };
      }
      return null;
    }
  },
  {
    id: 'REC_JS_MINIFY',
    title: 'Minify JavaScript assets to reduce payload size',
    description: 'Minifying JavaScript removes spacing, comments, and redundant declarations to compress code sizes.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.5,
    evaluate(input) {
      let reductionKb = 0;
      let hasWarning = false;

      if (input.js && input.js.warnings) {
        hasWarning = input.js.warnings.some((w: any) => w.code === 'JS_NOT_MINIFIED');
        input.js.optimizationCandidates?.forEach((cand: any) => {
          if (!cand.isMinified) {
            reductionKb += (cand.sizeKb * 0.2); // Project a ~20% minification saving
          }
        });
      }

      if (hasWarning || reductionKb > 0) {
        const savingsKb = reductionKb || 50;
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'js',
          priority: 'high',
          severity: 'warning',
          estimatedPerformanceGain: `Save ~${(savingsKb / 150).toFixed(1)}s on slow 3G networks`,
          estimatedBandwidthSaving: Math.round(savingsKb),
          estimatedLcpImprovement: 'Minimal',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Integrate a minification plugin (like Terser or Esbuild) in your production bundler settings."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_JS_COMPRESS',
    title: 'Enable network compression for JavaScript assets',
    description: 'Compressing files with Gzip or Brotli reduces network transit payloads dramatically.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      let reductionKb = 0;
      let hasWarning = false;

      if (input.js && input.js.warnings) {
        hasWarning = input.js.warnings.some((w: any) => w.code === 'JS_NO_COMPRESSION');
        input.js.scripts?.forEach((s: any) => {
          if (s.compression === 'none') {
            reductionKb += (s.fileSizeKb * 0.6); // Project a ~60% Gzip/Brotli compression savings
          }
        });
      }

      if (hasWarning || reductionKb > 0) {
        const savingsKb = reductionKb || 60;
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'js',
          priority: 'high',
          severity: 'warning',
          estimatedPerformanceGain: `Save ~${(savingsKb / 150).toFixed(1)}s on network load`,
          estimatedBandwidthSaving: Math.round(savingsKb),
          estimatedLcpImprovement: 'Minimal',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Configure your hosting server (Nginx, Apache, Vercel, Cloudflare) to compress JavaScript files using Brotli (preferred) or Gzip."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_JS_DUPLICATE',
    title: 'Remove duplicate JavaScript library loads',
    description: 'Loading identical scripts multiple times wastes bandwidth and blocks DOM rendering.',
    category: 'best-practices',
    estimatedDifficulty: 'medium',
    hoursToImplement: 1.0,
    evaluate(input) {
      const duplicateCount = input.js?.summary?.duplicateScripts || 0;
      if (duplicateCount > 0) {
        let sizeKb = 0;
        input.js.scripts?.forEach((s: any) => {
          if (s.isDuplicate) {
            sizeKb += s.fileSizeKb;
          }
        });
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'js',
          priority: 'critical',
          severity: 'error',
          estimatedPerformanceGain: `Save ~${(sizeKb / 150).toFixed(1)}s download and parse time`,
          estimatedBandwidthSaving: Math.round(sizeKb / 2), // saving half of the total weight
          estimatedLcpImprovement: 'Up to 200ms reduction',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement} hour`,
          suggestedFix: "Identify scripts executing twice and clean up multiple bundler entries or script tags loading the same dependency."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_JS_RENDER_BLOCKING',
    title: 'Defer or load render-blocking JavaScript asynchronously',
    description: 'JavaScript files block the browser parser by default. Deferring scripts accelerates page layout rendering.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const blockingCount = input.js?.summary?.renderBlockingScripts || 0;
      if (blockingCount > 0) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'js',
          priority: 'high',
          severity: 'warning',
          estimatedPerformanceGain: 'Improves First Contentful Paint (FCP)',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'Up to 250ms reduction',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Declare async or defer flags on non-critical script declarations, or load them dynamically."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_JS_UNUSED',
    title: 'Code-split and tree-shake unused JavaScript scripts',
    description: 'Loading unused JavaScript code increases download weight and CPU execution overhead.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 4.0,
    evaluate(input) {
      const unusedJsKb = input.js?.summary?.estimatedUnusedJS || 0;
      if (unusedJsKb > 50) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'js',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: `Saves ~${(unusedJsKb / 150).toFixed(1)}s loading weight`,
          estimatedBandwidthSaving: Math.round(unusedJsKb),
          estimatedLcpImprovement: 'Up to 200ms reduction',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement} hours`,
          suggestedFix: "Implement route-level dynamic code-splitting and tree-shaking rules in webpack, vite, or rollup configurations."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_CSS_MINIFY',
    title: 'Minify CSS stylesheets to reduce weight',
    description: 'Minified CSS reduces character counts, removing redundant blank space and comments.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      let reductionKb = 0;
      let hasWarning = false;

      if (input.css && input.css.optimizationCandidates) {
        input.css.optimizationCandidates.forEach((cand: any) => {
          if (!cand.isMinified) {
            reductionKb += (cand.sizeKb * 0.15); // Project a ~15% minification savings
            hasWarning = true;
          }
        });
      }

      if (hasWarning || reductionKb > 0) {
        const savingsKb = reductionKb || 15;
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'css',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: `Save ~${(savingsKb / 150).toFixed(1)}s on downloads`,
          estimatedBandwidthSaving: Math.round(savingsKb),
          estimatedLcpImprovement: 'Minimal',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Minify CSS rulesets during compilation using tools like clean-css or post-css plugin configurations."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_CSS_COMPRESS',
    title: 'Enable network compression for CSS assets',
    description: 'Enabling Brotli or Gzip compression for stylesheets shrinks network payload size.',
    category: 'performance',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      let reductionKb = 0;
      let hasUncompressed = false;

      if (input.css && input.css.stylesheets) {
        input.css.stylesheets.forEach((s: any) => {
          if (s.compression === 'none') {
            reductionKb += (s.fileSizeKb * 0.75); // Project a ~75% compression savings
            hasUncompressed = true;
          }
        });
      }

      if (hasUncompressed || reductionKb > 0) {
        const savingsKb = reductionKb || 20;
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'css',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: `Save ~${(savingsKb / 150).toFixed(1)}s loading stylesheet`,
          estimatedBandwidthSaving: Math.round(savingsKb),
          estimatedLcpImprovement: 'Minimal',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Configure server settings to encode and serve stylesheets using Gzip or Brotli compression algorithms."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_CSS_RENDER_BLOCKING',
    title: 'Extract Critical CSS rules and load non-critical CSS asynchronously',
    description: 'CSS stylesheets block the HTML parser. Inlining critical above-the-fold styles speeds up visual rendering.',
    category: 'performance',
    estimatedDifficulty: 'hard',
    hoursToImplement: 3.0,
    evaluate(input) {
      const blockingCount = input.css?.summary?.renderBlockingCSS || 0;
      if (blockingCount > 0) {
        const unusedCss = input.css.summary.estimatedUnusedCSS || 0;
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'css',
          priority: 'high',
          severity: 'warning',
          estimatedPerformanceGain: 'Drastically accelerates FCP',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'Up to 200ms reduction',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement} hours`,
          suggestedFix: "Isolate stylesheets required for rendering visual layouts above-the-fold and inline them. Defer larger global files using rel=\"preload\" linkages."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_SEO_META',
    title: 'Configure page title and meta description descriptors',
    description: 'HTML titles and meta descriptions summarize page content in search results snippets, affecting click rates.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingTitle = input.seo?.summary?.missingTitle || false;
      const missingDesc = input.seo?.summary?.missingMetaDescription || false;

      if (missingTitle || missingDesc) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'seo',
          priority: 'high',
          severity: 'warning',
          estimatedPerformanceGain: 'None',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: `Define a unique HTML <title> (50-60 chars) and meta description (120-160 chars) on all indexed html pages.`
        };
      }
      return null;
    }
  },
  {
    id: 'REC_SEO_CANONICAL',
    title: 'Provide a canonical URL link tag',
    description: 'Canonical link declarations notify search crawlers of preferred page targets, avoiding duplicate index penalties.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingCanonical = input.seo?.summary?.missingCanonical || false;
      if (missingCanonical) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'seo',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: 'None',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Declare link rel=\"canonical\" referencing the main url in the header markup of each page."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_SEO_VIEWPORT',
    title: 'Define a mobile-responsive viewport meta tag',
    description: 'Viewport declarations tell mobile browsers how to scale visual viewports properly.',
    category: 'seo',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingViewport = input.seo?.summary?.missingViewport || false;
      if (missingViewport) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'seo',
          priority: 'critical',
          severity: 'error',
          estimatedPerformanceGain: 'Improves mobile layout loading presentation',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Declare <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> in the page <head> section."
        };
      }
      return null;
    }
  },
  {
    id: 'REC_A11Y_LANG',
    title: 'Add HTML language attribute to root element',
    description: 'Specifying a lang attribute helps screen readers read out text with correct pronunciation settings.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.15,
    evaluate(input) {
      const missingLang = input.accessibility?.accessibility?.missingHtmlLanguageAttribute || false;
      if (missingLang) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'accessibility',
          priority: 'high',
          severity: 'error',
          estimatedPerformanceGain: 'None',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: '9 mins',
          suggestedFix: "Declare language key on root HTML element. e.g. <html lang=\"en\">"
        };
      }
      return null;
    }
  },
  {
    id: 'REC_A11Y_SKIP_LINK',
    title: 'Add a skip navigation link for keyboard users',
    description: 'Skip links permit screen reader and keyboard navigators to jump straight to core article content.',
    category: 'accessibility',
    estimatedDifficulty: 'easy',
    hoursToImplement: 0.25,
    evaluate(input) {
      const missingSkipLink = input.accessibility?.summary?.missingSkipNavigation || false;
      if (missingSkipLink) {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          category: this.category,
          sourceAnalyzer: 'accessibility',
          priority: 'medium',
          severity: 'warning',
          estimatedPerformanceGain: 'None',
          estimatedBandwidthSaving: 0,
          estimatedLcpImprovement: 'None',
          estimatedDifficulty: this.estimatedDifficulty,
          estimatedImplementationTime: `${this.hoursToImplement * 60} mins`,
          suggestedFix: "Add a visually hidden anchor tag as the first child of the body element linking to the main container id, e.g. <a href=\"#main-content\" class=\"skip-link\">Skip to main content</a>."
        };
      }
      return null;
    }
  }
];
