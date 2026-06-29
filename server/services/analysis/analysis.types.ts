import { PageSpeedScanResult } from '../pagespeed/types.js';
import { PuppeteerScanResult } from '../puppeteer/types.js';
import { ImageAnalysisResult } from '../imageAnalyzer/types.js';
import { CSSAnalysisResult } from '../cssAnalyzer/types.js';
import { JSAnalysisResult } from '../jsAnalyzer/types.js';
import { SEOAnalysisResult } from '../seoAnalyzer/types.js';
import { AccessibilityAnalysisResult } from '../accessibilityAnalyzer/types.js';

export interface AnalysisMetadata {
  url: string;
  title: string | null;
  metaDescription: string | null;
}

export type AnalysisStatus = 'success' | 'partial_success' | 'failed';

export interface AnalysisEngineResult {
  metadata: AnalysisMetadata;
  pagespeed: PageSpeedScanResult | null;
  puppeteer: PuppeteerScanResult | null;
  image: ImageAnalysisResult | null;
  css: CSSAnalysisResult | null;
  js: JSAnalysisResult | null;
  seo: SEOAnalysisResult | null;
  accessibility: AccessibilityAnalysisResult | null;
  timestamp: Date;
  duration: number; // Duration of execution in milliseconds
  status: AnalysisStatus;
}
