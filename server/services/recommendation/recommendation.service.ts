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
import { rules, createTransferSavings, createTransferGainString } from './rules.js';
import { calculateHealthScore, getPerformanceGrade, formatTimeEstimate } from './helpers.js';

import { detectFramework } from './frameworkDetector.js';

export interface SubAnalyzerOutputs {
  pagespeed: PageSpeedScanResult | null;
  image: ImageAnalysisResult | null;
  css: CSSAnalysisResult | null;
  js: JSAnalysisResult | null;
  seo: SEOAnalysisResult | null;
  accessibility: AccessibilityAnalysisResult | null;
  vitals?: any;
  targetUrl?: string;
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
  const rawRecommendations: Recommendation[] = [];

  // Detect project framework from verified signals across all analyzers
  const frameworkInfo = detectFramework({
    seo: inputs.seo,
    js: inputs.js,
    resources: (inputs.pagespeed as any)?.resources
  });

  const targetUrl = inputs.targetUrl || inputs.seo?.seo?.canonicalUrl || inputs.pagespeed?.url || inputs.seo?.validationEvidence?.url || 'target page';

  // 1. Evaluate all rules
  rules.forEach(rule => {
    try {
      const recommendation = rule.evaluate({
        pagespeed: inputs.pagespeed,
        image: inputs.image,
        css: inputs.css,
        js: inputs.js,
        seo: inputs.seo,
        accessibility: inputs.accessibility,
        vitals: inputs.vitals || inputs.pagespeed?.vitals,
        frameworkInfo,
        targetUrl
      });
      if (recommendation) {
        rawRecommendations.push(recommendation);
      }
    } catch (err) {
      console.error(`[Recommendation Engine Error]: Failed evaluating rule ${rule.id}:`, err);
    }
  });

  // 2. Deduplicate and consolidate recommendations
  const recommendations: Recommendation[] = [];
  const seenIds = new Map<string, Recommendation>();
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };

  rawRecommendations.forEach(rec => {
    if (seenIds.has(rec.id)) {
      const existing = seenIds.get(rec.id)!;
      // Preserve standardFinding and aiFixPrompt
      if (rec.standardFinding && !existing.standardFinding) {
        existing.standardFinding = rec.standardFinding;
      }
      if (rec.aiFixPrompt && !existing.aiFixPrompt) {
        existing.aiFixPrompt = rec.aiFixPrompt;
      }
      if (rec.fixStrategy && !existing.fixStrategy) {
        existing.fixStrategy = rec.fixStrategy;
      }
      if (rec.validationSteps && (!existing.validationSteps || existing.validationSteps.length === 0)) {
        existing.validationSteps = rec.validationSteps;
      }

      // Merge structured evidenceDetails
      if (Array.isArray(rec.evidenceDetails)) {
        existing.evidenceDetails = [...(existing.evidenceDetails || []), ...rec.evidenceDetails];
      }
      // Merge evidence string/array
      if (Array.isArray(rec.evidence) && Array.isArray(existing.evidence)) {
        existing.evidence = [...existing.evidence, ...rec.evidence];
      } else if (typeof rec.evidence === 'string' && typeof existing.evidence === 'string') {
        if (!existing.evidence.includes(rec.evidence)) {
          existing.evidence = `${existing.evidence}; ${rec.evidence}`;
        }
      } else if (rec.evidence && !existing.evidence) {
        existing.evidence = rec.evidence;
      }
      // Upgrade priority and severity if incoming is higher
      if (priorityWeight[rec.priority] > priorityWeight[existing.priority]) {
        existing.priority = rec.priority;
        existing.severity = rec.severity;
      }
      // Recalculate bandwidth savings and update estimatedSavings contract
      if (existing.estimatedSavings?.type === 'transfer_only' || rec.estimatedSavings?.type === 'transfer_only') {
        const totalSavings = (existing.estimatedBandwidthSaving || 0) + (rec.estimatedBandwidthSaving || 0);
        if (totalSavings > 0) {
          existing.estimatedBandwidthSaving = totalSavings;
          existing.estimatedSavings = createTransferSavings(totalSavings);
          existing.estimateType = 'transfer_only';
          existing.estimatedImprovement = existing.estimatedSavings?.displayString || 'Not quantified';
          existing.estimatedPerformanceGain = createTransferGainString(totalSavings);
          if (existing.finding) {
            existing.finding.value = totalSavings;
          }
        }
      }
    } else {
      seenIds.set(rec.id, rec);
      recommendations.push(rec);
    }
  });

  // 3. Rank recommendations
  // Order priority: critical > high > medium > low, then by bandwidth savings
  recommendations.sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return (b.estimatedBandwidthSaving || 0) - (a.estimatedBandwidthSaving || 0);
  });

  // 4. Categorize recommendations
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

  // 5. Generate Developer Roadmap
  const roadmap = recommendations.map((rec, index) => {
    const stepNum = index + 1;
    const timeLabel = rec.estimatedImplementationTime;
    const difficultyLabel = (rec.estimatedDifficulty || (rec as any).difficulty || 'medium').toUpperCase();
    return `Step ${stepNum} [${rec.category.toUpperCase()}]: ${rec.title} (${difficultyLabel} | Est Time: ${timeLabel}) - ${rec.suggestedFix}`;
  });

  // 6. Generate Summary
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

    potentialBandwidthReduction += (rec.estimatedBandwidthSaving || 0);

    const originalRule = rules.find(r => r.id === rec.id);
    if (originalRule) {
      totalHours += originalRule.hoursToImplement;
    }
  });

  // Project overall wire transfer savings (clearly labeled as network transfer, not rendering speed)
  const potentialPerformanceImprovement = potentialBandwidthReduction > 0
    ? `Save up to ${(potentialBandwidthReduction / 200).toFixed(1)}s transfer on Fast 3G`
    : 'No major transfer savings estimated';

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
