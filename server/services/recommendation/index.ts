import { generateRecommendations } from './recommendation.service.js';
import { RecommendationEngineResult } from './types.js';

// Compatibility wrapper for ReportGenerator
class LegacyRecommendationEngine {
  generateResult(vitals: any, breakdown: any, images: any[], dom: any, pageSpeed: any = null, actualAnalyzers: any = {}): RecommendationEngineResult {
    const mappedImages = images || [];
    const mappedBreakdown = breakdown || { js: { sizeKb: 0 }, css: { sizeKb: 0 } };
    const mappedDom = dom || { hasTitle: true, hasMetaDesc: true };

    const imageResult: any = actualAnalyzers.image || {
      summary: {
        totalImages: mappedImages.length,
        imagesMissingLazyLoading: mappedImages.filter((img: any) => !img.lazyLoaded && img.sizeKb > 50).length,
        imagesMissingAltText: mappedImages.filter((img: any) => !img.hasAlt).length,
        brokenImages: 0,
        duplicateImages: 0
      },
      optimizationCandidates: mappedImages.map((img: any) => ({
        url: img.src || '',
        estimatedSizeReductionKb: img.savingsKb || 0
      }))
    };
    
    const cssResult: any = actualAnalyzers.css || {
      summary: {
        totalCSSFiles: mappedBreakdown.css?.count || 0,
        renderBlockingCSS: 0
      },
      stylesheets: [],
      optimizationCandidates: []
    };

    const jsResult: any = actualAnalyzers.js || {
      summary: {
        totalJSFiles: mappedBreakdown.js?.count || 0,
        renderBlockingScripts: 0
      },
      scripts: [],
      warnings: [],
      optimizationCandidates: []
    };

    const seoResult: any = actualAnalyzers.seo || {
      summary: {
        missingTitle: !mappedDom.hasTitle,
        missingMetaDescription: !mappedDom.hasMetaDesc,
        missingCanonical: false,
        missingViewport: false
      }
    };

    const a11yResult: any = actualAnalyzers.accessibility || {
      summary: {
        missingSkipNavigation: false
      },
      accessibility: {
        missingHtmlLanguageAttribute: false
      }
    };

    const result = generateRecommendations({
      pagespeed: pageSpeed || ({ success: true, vitals } as any),
      image: imageResult,
      css: cssResult,
      js: jsResult,
      seo: seoResult,
      accessibility: a11yResult,
      vitals: vitals || pageSpeed?.vitals
    });

    // Return complete evidence-based recommendation objects with backward-compatible aliases
    const mappedRecs = result.recommendations.map(rec => ({
      ...rec,
      id: rec.id,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      severity: rec.severity,
      confidence: rec.confidence,
      finding: rec.finding,
      evidence: rec.evidence,
      evidenceDetails: rec.evidenceDetails || [],
      potentialImpact: rec.potentialImpact,
      estimateType: rec.estimateType,
      estimatedSavings: rec.estimatedSavings ?? null,
      measuredImprovement: rec.measuredImprovement ?? null,
      suggestedFix: rec.suggestedFix,
      estimatedDifficulty: rec.estimatedDifficulty,
      estimatedImplementationTime: rec.estimatedImplementationTime,
      refUrl: rec.refUrl || 'https://web.dev/',
      // Backward-compatibility aliases for legacy UI/consumers
      issue: rec.title || rec.issue,
      whyItMatters: rec.potentialImpact || rec.description || rec.whyItMatters,
      suggestedFixSummary: rec.suggestedFix,
      estimatedImprovement: rec.estimatedSavings?.displayString || rec.estimatedImprovement || 'Not quantified',
      difficulty: rec.estimatedDifficulty,
      priority: rec.priority
    }));

    return {
      ...result,
      recommendations: mappedRecs
    };
  }

  generate(vitals: any, breakdown: any, images: any[], dom: any, pageSpeed: any = null, actualAnalyzers: any = {}): any[] {
    return this.generateResult(vitals, breakdown, images, dom, pageSpeed, actualAnalyzers).recommendations;
  }
}

export { generateRecommendations };
export default new LegacyRecommendationEngine();
