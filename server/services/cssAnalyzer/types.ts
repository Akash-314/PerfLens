export interface CSSStylesheetItem {
  url: string;
  filename: string;
  isInline: boolean;
  fileSizeKb: number;
  transferSizeKb: number;
  statusCode: number;
  mimeType: string;
  compression: 'gzip' | 'brotli' | 'none';
  cacheControl: string;
  isMinified: boolean;
  isDuplicate: boolean;
  isRenderBlocking: boolean;
  hasAtImport: boolean | null;
  hasMediaQueries: boolean | null;
  hasCssVariables: boolean | null;
  estimatedUnusedCssKb: number;
  isCriticalCssCandidate: boolean;
}

export interface CSSAnalysisSummary {
  totalCSSFiles: number;
  largestCSSFile: { url: string; sizeKb: number } | null;
  totalCSSWeight: number; // in KB
  estimatedUnusedCSS: number; // in KB
  duplicateStylesheets: number;
  renderBlockingCSS: number;
  inlineCSSCount: number;
  externalCSSCount: number;
}

export interface CSSAnalysisStatistics {
  countByMinified: { minified: number; unminified: number };
  sizeByMinifiedKb: { minified: number; unminified: number };
  countByCompression: { brotli: number; gzip: number; none: number };
  averageSizeKb: number;
}

export interface CSSAnalysisWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  url?: string;
}

export interface CSSOptimizationCandidate {
  url: string;
  type: 'css';
  sizeKb: number;
  estimatedUnusedCssKb: number;
  isRenderBlocking: boolean;
  isMinified: boolean;
  isDuplicate: boolean;
  estimatedSizeReductionKb: number;
  suggestion: string;
}

export interface CSSAnalysisResult {
  summary: CSSAnalysisSummary;
  stylesheets: CSSStylesheetItem[];
  statistics: CSSAnalysisStatistics;
  optimizationCandidates: CSSOptimizationCandidate[];
  warnings: CSSAnalysisWarning[];
  errors: string[];
}
