export interface IMetricDetail {
  score: number | null;
  value: string;
  rawValue?: number | null;
  normalizedValueMs?: number | null;
  unit?: string;
  rating: 'good' | 'needs-improvement' | 'poor' | 'unrated';
  source?: 'puppeteer' | 'lighthouse' | 'pagespeed' | 'crux' | 'custom';
  mode?: 'lab' | 'field';
  available?: boolean;
  reason?: string;
  unavailableReason?: string;
  elementTag?: string | null;
  selector?: string | null;
  elementUrl?: string | null;
  renderTimeMs?: number | null;
  loadTimeMs?: number | null;
  isFallback?: boolean;
  shiftCount?: number | null;
  largestShift?: number | null;
  shifts?: any[];
}

export interface IRecommendation {
  category: string;
  issue: string;
  whyItMatters: string;
  suggestedFix: string;
  estimatedImprovement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  refUrl: string;
}

export interface IReport {
  _id?: string;
  id?: string;
  url: string;
  owner?: string;
  owner_id?: string;
  
  // Legacy properties (retained for backward compatibility and PDF generator)
  scores: {
    overall: number;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  vitals: {
    fcp: IMetricDetail;
    lcp: IMetricDetail;
    fid?: IMetricDetail;
    inp?: IMetricDetail;
    cls: IMetricDetail;
    ttfb: IMetricDetail;
    tbt: IMetricDetail;
  };
  breakdown: {
    images: { sizeKb: number; count: number };
    js: { sizeKb: number; count: number; unusedKb: number };
    css: { sizeKb: number; count: number; unusedKb: number };
    fonts: { sizeKb: number; count: number };
    thirdParty: { sizeKb: number; count: number };
  };
  bundleAnalysis: Array<{
    packageName: string;
    sizeKb: number;
    isUnused: boolean;
    isDuplicate: boolean;
    transferSizeKb?: number;
    compression?: 'gzip' | 'brotli' | 'none' | string;
    hasSourceMap?: boolean;
    url?: string;
  }>;
  images: Array<{
    src: string;
    sizeKb: number;
    format: string;
    suggestedFormat: string;
    savingsKb: number;
    hasAlt: boolean;
    lazyLoaded: boolean;
  }>;
  recommendations: IRecommendation[];
  resources: Array<{
    name: string;
    url?: string;
    type: 'html' | 'js' | 'css' | 'image' | 'font' | 'xhr' | 'fetch' | 'document' | 'media' | 'other' | string;
    sizeKb: number;
    transferSizeKb?: number;
    statusCode?: number;
    timeMs: number | null;
    durationMs?: number | null;
    startTimeMs?: number | null;
    initiator?: string | null;
    fromCache?: boolean;
    timingBreakdown?: any;
    compression: string;
    cacheControl: string;
    isThirdParty?: boolean;
    isCompressed?: boolean;
  }>;

  // Modern unified analysis properties
  metadata?: any;
  pagespeed?: any;
  pageSpeed?: {
    performance?: number;
    accessibility?: number;
    seo?: number;
    bestPractices?: number;
    metrics?: {
      lcp?: string;
      fcp?: string;
      inp?: string;
      tbt?: string;
      cls?: string;
      ttfb?: string;
      speedIndex?: string;
    };
    cachedFrom?: Date | string;
  };
  puppeteer?: any;
  image?: any;
  css?: any;
  js?: any;
  seo?: any;
  accessibility?: any;
  recommendation?: any;
  customAnalysis?: any;
  analysisSources?: any;
  provenance?: any;
  scoreExplanation?: any;
  performanceScoreDetails?: any;
  summary?: any;
  overallHealthScore?: number;
  overallPerformanceGrade?: string;
  status: string;
  duration: number;
  
  createdAt: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

export default {
  // Model placeholder
};
