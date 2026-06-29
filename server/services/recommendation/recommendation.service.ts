import { PageSpeedScanResult } from '../pagespeed/types.js';
import { ImageAnalysisResult } from '../imageAnalyzer/types.js';
import { CSSAnalysisResult } from '../cssAnalyzer/types.js';
import { JSAnalysisResult } from '../jsAnalyzer/types.js';
import { SEOAnalysisResult } from '../seoAnalyzer/types.js';
import { AccessibilityAnalysisResult } from '../accessibilityAnalyzer/types.js';
import {
  Recommendation,
  RecommendationSummary,
  RecommendationEngineResult
} from './types.js';
import { rules } from './rules.js';
import { calculateHealthScore, getPerformanceGrade, formatTimeEstimate } from './helpers.js';

interface SubAnalyzerOutputs {
  pagespeed: PageSpeedScanResult | null;
  image: ImageAnalysisResult | null;
  css: CSSAnalysisResult | null;
  js: JSAnalysisResult | null;
  seo: SEOAnalysisResult | null;
  accessibility: AccessibilityAnalysisResult | null;
}

/**
 * Consumes the results of all sub-analyzers and generates a consolidated,
 * prioritized recommendation report and developer roadmap.
 * 
 * @param inputs Consolidated results object from all analyzers
 * @returns Consolidated RecommendationEngineResult
 */
export const generateRecommendations = (
  inputs: SubAnalyzerOutputs
): RecommendationEngineResult => {
  const recommendations: Recommendation[] = [];

  // 1. Evaluate all rules
  rules.forEach(rule => {
    try {
      const recommendation = rule.evaluate({
        pagespeed: inputs.pagespeed,
        image: inputs.image,
        css: inputs.css,
        js: inputs.js,
        seo: inputs.seo,
        accessibility: inputs.accessibility
      });
      if (recommendation) {
        recommendations.push(recommendation);
      }
    } catch (err) {
      console.error(`[Recommendation Engine Error]: Failed evaluating rule ${rule.id}:`, err);
    }
  });

  // 2. Rank recommendations
  // Order priority: critical > high > medium > low
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return b.estimatedBandwidthSaving - a.estimatedBandwidthSaving;
  });

  // 3. Categorize recommendations
  // - Quick Wins: Easy to implement and critical/high/medium priority
  const quickWins = recommendations.filter(
    rec => rec.estimatedDifficulty === 'easy' && (rec.priority === 'critical' || rec.priority === 'high' || rec.priority === 'medium')
  );

  // - High Impact: Critical or High priority, but NOT in quick wins (i.e. medium/hard difficulty)
  const highImpact = recommendations.filter(
    rec => (rec.priority === 'critical' || rec.priority === 'high') && !quickWins.includes(rec)
  );

  // - Medium Impact: Medium priority, but NOT in quick wins (i.e. medium/hard difficulty)
  const mediumImpact = recommendations.filter(
    rec => rec.priority === 'medium' && !quickWins.includes(rec)
  );

  // - Long Term: Hard difficulty or low priority
  const longTerm = recommendations.filter(
    rec => rec.estimatedDifficulty === 'hard' || rec.priority === 'low'
  );

  // 4. Generate Developer Roadmap
  // Map ordered recommendations to clear developer steps
  const roadmap = recommendations.map((rec, index) => {
    const stepNum = index + 1;
    const timeLabel = rec.estimatedImplementationTime;
    const difficultyLabel = rec.estimatedDifficulty.toUpperCase();
    return `Step ${stepNum} [${rec.category.toUpperCase()}]: ${rec.title} (${difficultyLabel} | Est Time: ${timeLabel}) - ${rec.suggestedFix}`;
  });

  // 5. Generate Summary
  const overallHealthScore = calculateHealthScore(recommendations);
  const overallPerformanceGrade = getPerformanceGrade(overallHealthScore);

  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;
  let potentialBandwidthReduction = 0;
  let totalHours = 0;

  recommendations.forEach(rec => {
    if (rec.priority === 'critical') criticalIssues++;
    else if (rec.priority === 'high') highIssues++;
    else if (rec.priority === 'medium') mediumIssues++;
    else if (rec.priority === 'low') lowIssues++;

    potentialBandwidthReduction += rec.estimatedBandwidthSaving;

    // Find the rule configuration to get original implementation hours
    const originalRule = rules.find(r => r.id === rec.id);
    if (originalRule) {
      totalHours += originalRule.hoursToImplement;
    }
  });

  // Project overall load speed savings
  const potentialPerformanceImprovement = potentialBandwidthReduction > 0
    ? `Save up to ${(potentialBandwidthReduction / 150).toFixed(1)}s on slow 3G loads`
    : 'No major latency savings estimated';

  const summary: RecommendationSummary = {
    overallHealthScore,
    overallPerformanceGrade,
    totalIssues: recommendations.length,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    potentialPerformanceImprovement,
    potentialBandwidthReduction,
    estimatedTimeToFixEverything: formatTimeEstimate(totalHours)
  };

  return {
    summary,
    recommendations,
    quickWins,
    highImpact,
    mediumImpact,
    longTerm,
    roadmap
  };
};
