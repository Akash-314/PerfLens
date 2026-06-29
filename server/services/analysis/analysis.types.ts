import { PageSpeedScanResult } from '../pagespeed/types.js';
import { PuppeteerScanResult } from '../puppeteer/types.js';

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
  timestamp: Date;
  duration: number; // Duration of execution in milliseconds
  status: AnalysisStatus;
}
