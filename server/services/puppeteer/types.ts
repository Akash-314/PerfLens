export interface ResourceItem {
  url: string;
  type: 'html' | 'js' | 'css' | 'image' | 'font' | 'xhr' | 'fetch' | 'document' | 'media' | 'other';
  sizeKb: number;
  statusCode: number;
  contentType: string;
  transferSizeKb: number;
  cacheControl: string;
  durationMs: number;
  compression: 'gzip' | 'brotli' | 'none';
  httpVersion: string;
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
  errors: string[];
}
