import { runPageSpeedAudit } from '../pagespeed/index.js';
import { analyzeWebsiteWithPuppeteer } from '../puppeteer/index.js';
import RecommendationEngine from '../recommendation/index.js';
import { ImageAnalyzer, CssAnalyzer, JsAnalyzer, NetworkAnalyzer } from './helpers.js';

class ReportGenerator {
  /**
   * Orchestrate all crawlers, PageSpeed audits and sub-analyzer modules
   * @param {string} url - Scanned target URL
   * @param {string | null} ownerId - Authenticated User ID (if logged in)
   * @returns {Promise<object>} - Fully populated Report object properties
   */
  async generate(url: string, ownerId: string | null = null) {
    console.log(`[Report Generator]: Initiating orchestrator pipelines for: ${url}`);
    
    // Concurrent execution of base crawlers
    const [pageSpeedData, crawlData] = await Promise.all([
      runPageSpeedAudit(url),
      analyzeWebsiteWithPuppeteer(url)
    ]);

    const imageAnalyzer = new ImageAnalyzer();
    const cssAnalyzer = new CssAnalyzer();
    const jsAnalyzer = new JsAnalyzer();
    const networkAnalyzer = new NetworkAnalyzer();

    // Execute sub-analyzer services
    const imageAnalysis = imageAnalyzer.analyze(crawlData.resources.filter(r => r.type === 'image'));
    const cssAnalysis = cssAnalyzer.analyze(crawlData.resources);
    const jsAnalysis = jsAnalyzer.analyze(crawlData.resources);
    const networkAnalysis = networkAnalyzer.analyze(crawlData.resources, url);

    const breakdown = {
      images: { sizeKb: imageAnalysis.stats.sizeKb, count: imageAnalysis.stats.count },
      js: { sizeKb: jsAnalysis.stats.sizeKb, count: jsAnalysis.stats.count, unusedKb: jsAnalysis.stats.unusedKb },
      css: { sizeKb: cssAnalysis.stats.sizeKb, count: cssAnalysis.stats.count, unusedKb: cssAnalysis.stats.unusedKb },
      fonts: {
        sizeKb: parseFloat(crawlData.resources.filter(r => r.type === 'font').reduce((sum, r) => sum + r.sizeKb, 0).toFixed(1)),
        count: crawlData.resources.filter(r => r.type === 'font').length
      },
      thirdParty: { sizeKb: networkAnalysis.stats.thirdPartySizeKb, count: networkAnalysis.stats.thirdPartyCount }
    };

    const domStats = {
      hasTitle: crawlData.metadata.title.length > 0,
      hasMetaDesc: crawlData.metadata.metaDescription.length > 0
    };

    // Synthesize code optimization checks
    const recommendations = RecommendationEngine.generate(
      pageSpeedData.vitals,
      breakdown,
      imageAnalysis.imagesList,
      domStats
    );

    return {
      url: url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0],
      scores: pageSpeedData.scores,
      vitals: pageSpeedData.vitals,
      breakdown,
      bundleAnalysis: jsAnalysis.bundleAnalysis,
      images: imageAnalysis.imagesList,
      recommendations,
      resources: networkAnalysis.resourcesList,
      owner: ownerId || undefined
    };
  }
}

export default new ReportGenerator();
