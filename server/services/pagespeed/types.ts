export interface PageSpeedMetricDetail {
  score: number;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PageSpeedScanResult {
  success: boolean;
  url: string;
  strategy: string;
  scores: {
    overall: number;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  vitals: {
    fcp: PageSpeedMetricDetail;
    lcp: PageSpeedMetricDetail;
    cls: PageSpeedMetricDetail;
    ttfb: PageSpeedMetricDetail;
    tbt: PageSpeedMetricDetail;
    fid: PageSpeedMetricDetail;
  };
  opportunities: any[];
  diagnostics: any[];
  timestamp: Date;
}
