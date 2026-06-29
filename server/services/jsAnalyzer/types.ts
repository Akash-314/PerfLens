export interface JSScriptItem {
  url: string;
  filename: string;
  fileSizeKb: number;
  transferSizeKb: number;
  mimeType: string;
  statusCode: number;
  compression: 'gzip' | 'brotli' | 'none';
  cacheControl: string;
  isDuplicate: boolean;
  isMinified: boolean;
  isAsync: boolean | null;
  isDefer: boolean | null;
  isModuleScript: boolean | null;
  isThirdParty: boolean;
  estimatedUnusedJsKb: number;
  estimatedParseCostMs: number;
  estimatedExecutionCostMs: number;
  estimatedMainThreadBlockingMs: number;
  detectedLibrary: string | null;
  hasDynamicImports: boolean | null;
  isRenderBlocking: boolean;
}

export interface JSAnalysisSummary {
  totalJSFiles: number;
  largestJSFile: { url: string; sizeKb: number } | null;
  totalJSWeight: number; // in KB
  thirdPartyScripts: number;
  duplicateScripts: number;
  renderBlockingScripts: number;
  estimatedUnusedJS: number; // in KB
  largestLibrary: { name: string; sizeKb: number } | null;
}

export interface JSAnalysisStatistics {
  countByMinified: { minified: number; unminified: number };
  sizeByMinifiedKb: { minified: number; unminified: number };
  countByCompression: { brotli: number; gzip: number; none: number };
  thirdPartyCount: number;
  thirdPartySizeKb: number;
  detectedLibraries: Record<string, { count: number; sizeKb: number }>;
  averageSizeKb: number;
}

export interface JSAnalysisWarning {
  code: 'JS_NOT_MINIFIED' | 'JS_NO_COMPRESSION' | 'JS_RENDER_BLOCKING' | 'JS_DUPLICATE' | 'JS_LARGE_LIBRARY' | 'JS_UNUSED_CODE';
  message: string;
  severity: 'info' | 'warning' | 'error';
  url?: string;
}

export interface JSOptimizationCandidate {
  url: string;
  type: 'js';
  sizeKb: number;
  estimatedUnusedJsKb: number;
  isRenderBlocking: boolean;
  isMinified: boolean;
  isDuplicate: boolean;
  estimatedSizeReductionKb: number;
  suggestion: string;
}

export interface JSAnalysisResult {
  summary: JSAnalysisSummary;
  scripts: JSScriptItem[];
  statistics: JSAnalysisStatistics;
  optimizationCandidates: JSOptimizationCandidate[];
  warnings: JSAnalysisWarning[];
  errors: string[];
}
