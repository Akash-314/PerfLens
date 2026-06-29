import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  ImageItem,
  ImageSummary,
  ImageStatistics,
  OptimizationCandidate,
  ImageAnalysisResult
} from './types.js';
import {
  parseDimensionsFromUrl,
  extractExtension,
  estimateWebpSavings,
  estimateAvifSavings
} from './helpers.js';

/**
 * Consumes the Puppeteer scan result and analyzes every discovered image resource.
 * Operating solely on network resource records, it aggregates summary statistics,
 * format metrics, and optimization candidates.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns Normalized ImageAnalysisResult containing summaries, lists, stats, and optimizations
 */
export const analyzeImages = (
  puppeteerResult: PuppeteerScanResult | null
): ImageAnalysisResult => {
  const errors: string[] = [];
  const images: ImageItem[] = [];
  
  const emptyResult: ImageAnalysisResult = {
    summary: {
      totalImages: 0,
      largestImage: null,
      averageImageSize: 0,
      totalImageWeight: 0,
      imagesMissingLazyLoading: 0,
      imagesMissingAltText: 0,
      brokenImages: 0,
      duplicateImages: 0,
      heroImage: null
    },
    images: [],
    statistics: {
      countByExtension: {},
      sizeByExtensionKb: {},
      averageSizeByExtensionKb: {}
    },
    optimizationCandidates: [],
    errors: []
  };

  if (!puppeteerResult) {
    errors.push('No Puppeteer result provided.');
    return { ...emptyResult, errors };
  }

  if (puppeteerResult.errors && puppeteerResult.errors.length > 0) {
    errors.push(...puppeteerResult.errors);
  }

  const resources = puppeteerResult.resources || [];
  const imageResources = resources.filter((res) => res.type === 'image');

  if (imageResources.length === 0) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No image resources found.']
    };
  }

  // Count occurrences of each URL to identify duplicates
  const urlCountMap = new Map<string, number>();
  imageResources.forEach((res) => {
    urlCountMap.set(res.url, (urlCountMap.get(res.url) || 0) + 1);
  });

  // Identify the largest successful image to determine the hero image
  let largestImg: { url: string; sizeKb: number } | null = null;
  imageResources.forEach((res) => {
    const isBroken = res.statusCode >= 400 || res.statusCode === 0;
    if (!isBroken) {
      if (!largestImg || res.sizeKb > largestImg.sizeKb) {
        largestImg = { url: res.url, sizeKb: res.sizeKb };
      }
    }
  });

  // Map each resource to an ImageItem
  imageResources.forEach((res) => {
    const filename = res.url.split('/').pop()?.split('?')[0] || 'image';
    const extension = extractExtension(res.url, res.contentType);
    const { width, height, aspectRatio } = parseDimensionsFromUrl(res.url);
    const isBroken = res.statusCode >= 400 || res.statusCode === 0;
    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;

    // A hero image candidate is the largest image, or any non-broken image > 150KB
    const isHeroCandidate = !isBroken && (res.sizeKb > 150 || (largestImg !== null && res.url === largestImg.url));

    images.push({
      url: res.url,
      filename,
      extension,
      mimeType: res.contentType,
      width,
      height,
      aspectRatio,
      fileSizeKb: res.sizeKb,
      transferSizeKb: res.transferSizeKb,
      statusCode: res.statusCode,
      // DOM-level attributes default to null (unknown) since they are not in network logs
      lazyLoading: null,
      altText: null,
      srcset: null,
      sizesAttribute: null,
      fetchPriority: null,
      heroImageCandidate: isHeroCandidate,
      isDuplicate,
      isBroken
    });
  });

  // Calculate statistics
  const countByExtension: Record<string, number> = {};
  const sizeByExtensionKb: Record<string, number> = {};
  const averageSizeByExtensionKb: Record<string, number> = {};

  images.forEach((img) => {
    const ext = img.extension;
    countByExtension[ext] = (countByExtension[ext] || 0) + 1;
    sizeByExtensionKb[ext] = parseFloat(((sizeByExtensionKb[ext] || 0) + img.fileSizeKb).toFixed(1));
  });

  Object.keys(countByExtension).forEach((ext) => {
    const count = countByExtension[ext];
    const totalSize = sizeByExtensionKb[ext];
    averageSizeByExtensionKb[ext] = parseFloat((totalSize / count).toFixed(1));
  });

  const statistics: ImageStatistics = {
    countByExtension,
    sizeByExtensionKb,
    averageSizeByExtensionKb
  };

  // Compile Optimization Candidates
  const optimizationCandidates: OptimizationCandidate[] = [];
  let duplicateCount = 0;
  let brokenCount = 0;

  images.forEach((img) => {
    if (img.isDuplicate) duplicateCount++;
    if (img.isBroken) brokenCount++;

    const { potentialSizeKb: webpSize, savingsKb: webpSavings } = estimateWebpSavings(img.extension, img.fileSizeKb);
    const { potentialSizeKb: avifSize, savingsKb: avifSavings } = estimateAvifSavings(img.extension, img.fileSizeKb);

    // Max savings is the maximum reduction we can achieve (typically AVIF)
    const estimatedSizeReductionKb = Math.max(webpSavings, avifSavings);

    const isOversized = img.fileSizeKb > 100;
    const isLargeImage = img.fileSizeKb > 500;

    // DOM metrics are unknown, so we flag them as missing
    const missingLazyLoading = img.lazyLoading !== true;
    const missingAltText = img.altText === null || img.altText === '';

    optimizationCandidates.push({
      url: img.url,
      currentType: img.extension,
      sizeKb: img.fileSizeKb,
      potentialWebpSizeKb: webpSize,
      potentialAvifSizeKb: avifSize,
      estimatedWebpSavingsKb: webpSavings,
      estimatedAvifSavingsKb: avifSavings,
      isOversized,
      isLargeImage,
      missingLazyLoading,
      missingAltText,
      responsiveImageUsage: img.srcset !== null && img.srcset.length > 0,
      estimatedSizeReductionKb
    });
  });

  // Calculate summary metrics
  const totalImages = images.length;
  const totalImageWeight = parseFloat(images.reduce((sum, img) => sum + img.fileSizeKb, 0).toFixed(1));
  const averageImageSize = totalImages > 0 ? parseFloat((totalImageWeight / totalImages).toFixed(1)) : 0;

  // Count missing lazy/alt (since we set them to null/unknown, they are treated as missing)
  const imagesMissingLazyLoading = images.filter((img) => img.lazyLoading !== true).length;
  const imagesMissingAltText = images.filter((img) => img.altText === null || img.altText === '').length;

  const summary: ImageSummary = {
    totalImages,
    largestImage: largestImg,
    averageImageSize,
    totalImageWeight,
    imagesMissingLazyLoading,
    imagesMissingAltText,
    brokenImages: brokenCount,
    duplicateImages: duplicateCount,
    heroImage: largestImg
  };

  return {
    summary,
    images,
    statistics,
    optimizationCandidates,
    errors
  };
};
