export interface ImageItem {
  url: string;
  filename: string;
  extension: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  fileSizeKb: number;
  transferSizeKb: number;
  statusCode: number;
  lazyLoading: boolean | null;
  altText: string | null;
  srcset: string[] | null;
  sizesAttribute: string | null;
  fetchPriority: 'high' | 'low' | 'auto' | null;
  heroImageCandidate: boolean;
  isDuplicate: boolean;
  isBroken: boolean;
}

export interface ImageSummary {
  totalImages: number;
  largestImage: { url: string; sizeKb: number } | null;
  averageImageSize: number; // in KB
  totalImageWeight: number; // in KB
  imagesMissingLazyLoading: number;
  imagesMissingAltText: number;
  brokenImages: number;
  duplicateImages: number;
  heroImage: { url: string; sizeKb: number } | null;
}

export interface ImageStatistics {
  countByExtension: Record<string, number>;
  sizeByExtensionKb: Record<string, number>;
  averageSizeByExtensionKb: Record<string, number>;
}

export interface OptimizationCandidate {
  url: string;
  currentType: string;
  sizeKb: number;
  potentialWebpSizeKb: number;
  potentialAvifSizeKb: number;
  estimatedWebpSavingsKb: number;
  estimatedAvifSavingsKb: number;
  isOversized: boolean; // fileSizeKb > 100KB
  isLargeImage: boolean; // fileSizeKb > 500KB
  missingLazyLoading: boolean;
  missingAltText: boolean;
  responsiveImageUsage: boolean;
  estimatedSizeReductionKb: number; // Max potential savings between WebP and AVIF (usually AVIF)
}

export interface ImageAnalysisResult {
  summary: ImageSummary;
  images: ImageItem[];
  statistics: ImageStatistics;
  optimizationCandidates: OptimizationCandidate[];
  errors: string[];
}
