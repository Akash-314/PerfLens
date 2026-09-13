export interface ImageItem {
  url: string;
  filename: string;
  extension: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  renderedWidth: number | null;
  renderedHeight: number | null;
  naturalWidth: number | null;
  naturalHeight: number | null;
  isOversized?: boolean;
  oversizedRatio?: number | null;
  isBelowTheFold?: boolean;
  selector?: string | null;
  aspectRatio: number | null;
  fileSizeKb: number;
  transferSizeKb: number;
  fromCache?: boolean;
  isTimingUnavailable?: boolean;
  statusCode: number;
  lazyLoading: boolean | null;
  altText: string | null;
  srcset: string[] | null;
  sizesAttribute: string | null;
  fetchPriority: 'high' | 'low' | 'auto' | null;
  heroImageCandidate: boolean;
  isDuplicate: boolean;
  isBroken: boolean;
  // Supporting properties for backend-frontend alignment mapping
  src?: string;
  savingsKb?: number;
  suggestedFormat?: string;
  hasAlt?: boolean;
  lazyLoaded?: boolean;
  dimensions?: string;
}

export interface ImageSummary {
  measurementStatus: 'SUCCESS' | 'NO_IMAGES_FOUND' | 'RESOURCE_TIMING_UNAVAILABLE' | 'ANALYZER_ERROR';
  totalImages: number;
  largestImage: { url: string; sizeKb: number } | null;
  averageImageSize: number; // in KB
  totalImageWeight: number; // in KB
  imagesMissingLazyLoading: number;
  belowTheFoldImagesMissingLazyLoading: number;
  imagesMissingAltText: number;
  oversizedImagesCount: number;
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
  format?: string;
  sizeKb: number;
  potentialWebpSizeKb: number;
  potentialAvifSizeKb: number;
  estimatedWebpSavingsKb: number;
  estimatedAvifSavingsKb: number;
  isOversized: boolean;
  renderedDimensions?: string | null;
  naturalDimensions?: string | null;
  oversizedRatio?: number | null;
  isLargeImage: boolean;
  missingLazyLoading: boolean;
  missingAltText: boolean;
  responsiveImageUsage: boolean;
  estimatedSizeReductionKb: number;
}

export interface ImageAnalysisResult {
  status: 'SUCCESS' | 'NO_IMAGES_FOUND' | 'RESOURCE_TIMING_UNAVAILABLE' | 'ANALYZER_ERROR';
  summary: ImageSummary;
  images: ImageItem[];
  statistics: ImageStatistics;
  optimizationCandidates: OptimizationCandidate[];
  errors: string[];
}

