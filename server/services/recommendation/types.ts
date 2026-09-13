export type EstimateType =
  | 'measured'
  | 'modeled'
  | 'transfer_only'
  | 'heuristic'
  | 'not_quantified'
  | 'unavailable';

export interface RecommendationFinding {
  description: string;
  metric?: string; // e.g. "TBT", "LCP", "CLS", "FCP", "INP", "NETWORK"
  value?: number | string | null;
  unit?: string | null;
}

export interface RecommendationEvidence {
  type: string; // e.g. "long-task", "lcp-element", "layout-shift", "render-blocking", "unminified", "uncompressed", "dom-element"
  resource?: string | null;
  selector?: string | null;
  duration?: number | null;
  sizeKb?: number | null;
  details?: Record<string, any>;
  [key: string]: any;
}

export interface EstimatedSavings {
  value: number | null; // null if not quantified
  unit: string | null; // e.g. "KB", "ms", "s"
  type: EstimateType;
  assumption: string | null; // e.g. "Fast 3G (200 KB/s)"
  displayString: string; // e.g. "89 KB transfer reduction (~0.45s on Fast 3G)" or "Not quantified"
}

export interface Recommendation {
  id: string; // Unique rule identifier (e.g. REC_PERF_TBT_LONG_TASKS)
  title: string;
  description: string;
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices';
  severity: 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  estimateType: EstimateType;

  // Core Evidence-Based Architecture
  finding: RecommendationFinding;
  evidence: RecommendationEvidence[] | string;
  evidenceDetails?: RecommendationEvidence[];
  potentialImpact: string;
  estimatedSavings: EstimatedSavings | null;
  measuredImprovement: number | null; // null unless verified before/after

  suggestedFix: string;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  estimatedImplementationTime: string; // e.g. "30 mins", "2 hours"
  refUrl: string;

  // Backward-compatibility and UI/PDF presentation fields
  issue: string; // alias for title
  whyItMatters: string; // alias for potentialImpact or description
  estimatedImprovement: string; // alias for estimatedSavings.displayString
  priority: 'critical' | 'high' | 'medium' | 'low';
  sourceAnalyzer?: 'pagespeed' | 'image' | 'css' | 'js' | 'seo' | 'accessibility' | 'puppeteer' | 'crux' | 'merged';
  estimatedBandwidthSaving?: number; // in KB
  estimatedPerformanceGain?: string; // alias for estimatedImprovement
  estimatedLcpImprovement?: string;
  findingId?: string;
  analyzer?: string;
  actualValue?: string;
  expectedValue?: string;
  resource?: string;
  selector?: string;
  reason?: string;
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
