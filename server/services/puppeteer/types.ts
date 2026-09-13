export interface ResourceTimingBreakdown {
  dnsMs: number | null;
  tcpMs: number | null;
  tlsMs: number | null;
  ttfbMs: number | null;
  downloadMs: number | null;
  startTimeMs: number | null;
  durationMs: number | null;
}

export interface ResourceItem {
  url: string;
  type: 'html' | 'js' | 'css' | 'image' | 'font' | 'xhr' | 'fetch' | 'document' | 'media' | 'other';
  sizeKb: number;
  statusCode: number;
  contentType: string;
  transferSizeKb: number;
  cacheControl: string;
  durationMs: number | null;
  compression: 'gzip' | 'brotli' | 'none';
  httpVersion: string;
  fromCache?: boolean;
  initiator?: string | null;
  startTimeMs?: number | null;
  timingBreakdown?: ResourceTimingBreakdown | null;
}

export interface PuppeteerScanResult {
  success: boolean;
  metadata: {
    title: string;
    url: string;
    redirectUrl: string;
    metaDescription: string;
    language: string;
    viewport: { width: number; height: number };
    htmlSizeKb: number;
    domNodesCount: number;
    faviconUrl: string;
    manifestUrl: string | null;
    hasRobotsTxt: boolean;
    hasSitemapXml: boolean;
  };
  performance: {
    vitals: {
      fcp: number | null;
      lcp: number | null;
      cls: number | null;
      fid: number | null;
      tbt: number | null;
      ttfb: number | null;
    };
    navigationDiagnostics?: {
      hasNavEntry: boolean;
      navigationType: string;
      requestStart: number;
      responseStart: number;
      responseEnd: number;
      transferSize: number;
      encodedBodySize: number;
      fromCache: boolean;
      calculatedTtfbMs: number | null;
      unmeasurableReason?: string | null;
    };
  };
  resources: ResourceItem[];
  network: {
    totalRequests: number;
    failedRequests: number;
    redirectCount: number;
    largestResource: { url: string; sizeKb: number } | null;
    slowestResource: { url: string; durationMs: number } | null;
    compressionRate: number;
    cacheCoverageRate: number;
  };
  timings: {
    navigationStart: number;
    dnsLookupMs: number;
    tcpConnectionMs: number;
    tlsHandshakeMs: number;
    requestStartMs: number;
    responseStartMs: number;
    responseEndMs: number;
    domContentLoadedEventMs: number;
    loadEventMs: number;
  };
  screenshots: {
    fullPagePath: string;
    viewportPath: string;
  };
  cssCoverage?: any[];
  jsCoverage?: any[];
  domStylesheets?: any[];
  imageAnalysis?: any;
  cssAnalysis?: any;
  jsAnalysis?: any;
  seoAnalysis?: any;
  accessibilityAnalysis?: any;
  browserVersion?: string;
  debugLogs?: any;
  errors: string[];
}
