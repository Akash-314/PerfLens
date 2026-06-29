import { generateRecommendations } from './recommendation.service.js';

// Backwards compatibility wrapper for legacy ReportGenerator
class LegacyRecommendationEngine {
  generate(vitals: any, breakdown: any, images: any[], dom: any): any[] {
    const mappedImages = images || [];
    const mappedBreakdown = breakdown || { js: { sizeKb: 0 }, css: { sizeKb: 0 } };
    const mappedDom = dom || { hasTitle: true, hasMetaDesc: true };

    const imageResult: any = {
      summary: {
        totalImages: mappedImages.length,
        imagesMissingLazyLoading: mappedImages.filter(img => !img.lazyLoaded && img.sizeKb > 50).length,
        imagesMissingAltText: mappedImages.filter(img => !img.hasAlt).length,
        brokenImages: 0,
        duplicateImages: 0
      },
      optimizationCandidates: mappedImages.map(img => ({
        url: img.src || '',
        estimatedSizeReductionKb: img.savingsKb || 0
      }))
    };
    
    const cssResult: any = {
      summary: {
        totalCSSFiles: 1,
        renderBlockingCSS: (mappedBreakdown.css?.sizeKb || 0) > 60 ? 1 : 0
      },
      stylesheets: [],
      optimizationCandidates: []
    };

    const jsResult: any = {
      summary: {
        totalJSFiles: 1,
        renderBlockingScripts: (mappedBreakdown.js?.sizeKb || 0) > 350 ? 1 : 0
      },
      scripts: [],
      warnings: [],
      optimizationCandidates: []
    };

    const seoResult: any = {
      summary: {
        missingTitle: !mappedDom.hasTitle,
        missingMetaDescription: !mappedDom.hasMetaDesc,
        missingCanonical: false,
        missingViewport: false
      }
    };

    const a11yResult: any = {
      summary: {
        missingSkipNavigation: false
      },
      accessibility: {
        missingHtmlLanguageAttribute: false
      }
    };

    const result = generateRecommendations({
      pagespeed: { success: true, vitals } as any,
      image: imageResult,
      css: cssResult,
      js: jsResult,
      seo: seoResult,
      accessibility: a11yResult
    });

    // Map new Recommendation format back to legacy IRecommendation fields
    return result.recommendations.map(rec => ({
      category: rec.category === 'performance' ? 'js' : rec.category,
      issue: rec.title,
      whyItMatters: rec.description,
      suggestedFix: rec.suggestedFix,
      estimatedImprovement: rec.estimatedPerformanceGain,
      difficulty: rec.estimatedDifficulty,
      priority: rec.priority === 'critical' ? 'high' : rec.priority,
      refUrl: 'https://web.dev/'
    }));
  }
}

export { generateRecommendations };
export default new LegacyRecommendationEngine();
