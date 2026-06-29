export interface Recommendation {
  id: string; // Unique rule identifier (e.g. REC_IMAGE_COMPRESSION)
  title: string;
  description: string;
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices';
  sourceAnalyzer: 'pagespeed' | 'image' | 'css' | 'js' | 'seo' | 'accessibility' | 'merged';
  priority: 'critical' | 'high' | 'medium' | 'low';
  severity: 'error' | 'warning' | 'info';
  estimatedPerformanceGain: string; // e.g. "Save ~1.5s on mobile"
  estimatedBandwidthSaving: number; // in KB
  estimatedLcpImprovement: string; // e.g. "Up to 300ms"
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  estimatedImplementationTime: string; // e.g. "30 mins", "2 hours"
  suggestedFix: string;
}

export interface RecommendationSummary {
  overallHealthScore: number; // 0-100 aggregate score
  overallPerformanceGrade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  potentialPerformanceImprovement: string; // e.g. "Up to 2.4s speedup"
  potentialBandwidthReduction: number; // in KB
  estimatedTimeToFixEverything: string; // e.g. "1.5 days", "4 hours"
}

export interface RecommendationEngineResult {
  summary: RecommendationSummary;
  recommendations: Recommendation[];
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  mediumImpact: Recommendation[];
  longTerm: Recommendation[];
  roadmap: string[];
}
