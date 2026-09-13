import { Page } from 'puppeteer';
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
 * Consumes the Puppeteer page session and scan results, and analyzes every image asset.
 * Inspects real DOM layout sizes, natural dimensions, and lazy-loading tags.
 * Distinguishes NO_IMAGES_FOUND from RESOURCE_TIMING_UNAVAILABLE and ANALYZER_ERROR.
 * 
 * @param page Active Puppeteer page instance
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns Normalized ImageAnalysisResult containing summaries, lists, stats, and optimizations
 */
export const analyzeImages = async (
  page: Page | null,
  puppeteerResult: PuppeteerScanResult | null
): Promise<ImageAnalysisResult> => {
  const errors: string[] = [];
  const images: ImageItem[] = [];
  
  const emptyResult: ImageAnalysisResult = {
    status: 'NO_IMAGES_FOUND',
    summary: {
      measurementStatus: 'NO_IMAGES_FOUND',
      totalImages: 0,
      largestImage: null,
      averageImageSize: 0,
      totalImageWeight: 0,
      imagesMissingLazyLoading: 0,
      belowTheFoldImagesMissingLazyLoading: 0,
      imagesMissingAltText: 0,
      oversizedImagesCount: 0,
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
    return {
      ...emptyResult,
      status: 'ANALYZER_ERROR',
      summary: { ...emptyResult.summary, measurementStatus: 'ANALYZER_ERROR' },
      errors
    };
  }

  if (puppeteerResult.errors && puppeteerResult.errors.length > 0) {
    errors.push(...puppeteerResult.errors);
  }

  // 1. Scan DOM for image node attributes if page session is alive
  let domImages: any[] = [];
  if (page) {
    try {
      domImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(el => {
          const rect = el.getBoundingClientRect();
          const viewHeight = window.innerHeight || document.documentElement.clientHeight || 800;
          const isBelowTheFold = rect.top > viewHeight;
          const renderedWidth = el.clientWidth || (rect.width > 0 ? Math.round(rect.width) : null);
          const renderedHeight = el.clientHeight || (rect.height > 0 ? Math.round(rect.height) : null);
          const naturalWidth = el.naturalWidth || null;
          const naturalHeight = el.naturalHeight || null;

          let selector = '';
          if (el.id) {
            selector = `#${el.id}`;
          } else if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length > 0) {
              selector = `img.${classes.slice(0, 2).join('.')}`;
            }
          }
          if (!selector) {
            const srcPart = (el.src || '').split('/').pop()?.split('?')[0] || '';
            selector = srcPart ? `img[src*="${srcPart.slice(0, 30)}"]` : 'img';
          }

          return {
            src: el.src || '',
            currentSrc: (el as HTMLImageElement).currentSrc || el.src || '',
            alt: el.getAttribute('alt'),
            loading: el.getAttribute('loading'),
            srcset: el.getAttribute('srcset') ? el.getAttribute('srcset')!.split(',').map(s => s.trim()) : null,
            sizes: el.getAttribute('sizes'),
            fetchpriority: el.getAttribute('fetchpriority'),
            renderedWidth,
            renderedHeight,
            naturalWidth,
            naturalHeight,
            isBelowTheFold,
            selector,
            html: el.outerHTML ? el.outerHTML.slice(0, 300) : ''
          };
        });
      });
    } catch (err: any) {
      console.error(`[Image Service DOM extraction error]: ${err.message}`);
      errors.push(`DOM Image Scrape Failed: ${err.message}`);
    }
  }

  const resources = puppeteerResult.resources || [];
  const imageResources = resources.filter((res) => res.type === 'image');

  // Distinguish NO_IMAGES_FOUND from RESOURCE_TIMING_UNAVAILABLE
  if (imageResources.length === 0) {
    if (domImages.length === 0) {
      return {
        ...emptyResult,
        status: 'NO_IMAGES_FOUND',
        summary: { ...emptyResult.summary, measurementStatus: 'NO_IMAGES_FOUND' },
        errors: errors.length > 0 ? errors : ['No images found on page.']
      };
    }

    // Page has DOM images, but network timing / resource tracking was unavailable
    errors.push('Image elements detected in DOM but network resource timing was unavailable.');
    
    // Map DOM images even without network resources
    domImages.forEach((domImg: any) => {
      const extension = extractExtension(domImg.src, '');
      const filename = domImg.src.split('/').pop()?.split('?')[0] || 'image';
      const renderedWidth = domImg.renderedWidth;
      const renderedHeight = domImg.renderedHeight;
      const naturalWidth = domImg.naturalWidth;
      const naturalHeight = domImg.naturalHeight;

      let isOversized = false;
      let oversizedRatio: number | null = null;
      if (naturalWidth && naturalHeight && renderedWidth && renderedHeight && renderedWidth > 0 && renderedHeight > 0) {
        if ((naturalWidth > renderedWidth * 1.5 && (naturalWidth - renderedWidth) >= 80) ||
            (naturalHeight > renderedHeight * 1.5 && (naturalHeight - renderedHeight) >= 80)) {
          isOversized = true;
          oversizedRatio = parseFloat(((naturalWidth * naturalHeight) / (renderedWidth * renderedHeight)).toFixed(1));
        }
      }

      images.push({
        url: domImg.src,
        filename,
        extension,
        mimeType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        width: renderedWidth,
        height: renderedHeight,
        renderedWidth,
        renderedHeight,
        naturalWidth,
        naturalHeight,
        isOversized,
        oversizedRatio,
        isBelowTheFold: domImg.isBelowTheFold,
        selector: domImg.selector,
        aspectRatio: renderedWidth && renderedHeight ? parseFloat((renderedWidth / renderedHeight).toFixed(2)) : null,
        fileSizeKb: -1, // timing unavailable
        transferSizeKb: -1,
        fromCache: false,
        isTimingUnavailable: true,
        statusCode: 200,
        lazyLoading: domImg.loading === 'lazy',
        altText: domImg.alt,
        srcset: domImg.srcset,
        sizesAttribute: domImg.sizes,
        fetchPriority: domImg.fetchpriority,
        heroImageCandidate: false,
        isDuplicate: false,
        isBroken: false,
        src: domImg.src,
        savingsKb: 0,
        suggestedFormat: 'WebP/AVIF',
        hasAlt: domImg.alt !== null && domImg.alt !== undefined,
        lazyLoaded: domImg.loading === 'lazy',
        dimensions: renderedWidth && renderedHeight ? `${renderedWidth}x${renderedHeight}` : 'unknown'
      });
    });

    const summary: ImageSummary = {
      measurementStatus: 'RESOURCE_TIMING_UNAVAILABLE',
      totalImages: images.length,
      largestImage: null,
      averageImageSize: 0,
      totalImageWeight: 0,
      imagesMissingLazyLoading: images.filter(img => img.lazyLoading !== true).length,
      belowTheFoldImagesMissingLazyLoading: images.filter(img => img.isBelowTheFold && img.lazyLoading !== true).length,
      imagesMissingAltText: images.filter(img => img.altText === null || img.altText === undefined).length,
      oversizedImagesCount: images.filter(img => img.isOversized).length,
      brokenImages: 0,
      duplicateImages: 0,
      heroImage: null
    };

    return {
      status: 'RESOURCE_TIMING_UNAVAILABLE',
      summary,
      images,
      statistics: {
        countByExtension: {},
        sizeByExtensionKb: {},
        averageSizeByExtensionKb: {}
      },
      optimizationCandidates: [],
      errors
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

  // Map each resource to an ImageItem by combining DOM checks and network logs
  imageResources.forEach((res) => {
    const filename = res.url.split('/').pop()?.split('?')[0] || 'image';
    const extension = extractExtension(res.url, res.contentType);
    const isBroken = res.statusCode >= 400 || res.statusCode === 0;
    const isDuplicate = (urlCountMap.get(res.url) || 0) > 1;

    // A hero image candidate is the largest image, or any non-broken image > 150KB
    const isHeroCandidate = !isBroken && (res.sizeKb > 150 || (largestImg !== null && res.url === largestImg.url));

    // Reconcile with DOM images by checking URLs
    const matchedDomImg = domImages.find((img: any) => {
      if (!img.src) return false;
      const cleanImgSrc = img.src.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      const cleanResUrl = res.url.split('?')[0].replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return cleanImgSrc === cleanResUrl || cleanImgSrc.includes(cleanResUrl) || cleanResUrl.includes(cleanImgSrc);
    });

    const renderedWidth = matchedDomImg?.renderedWidth || matchedDomImg?.clientWidth || null;
    const renderedHeight = matchedDomImg?.renderedHeight || matchedDomImg?.clientHeight || null;
    const naturalWidth = matchedDomImg?.naturalWidth || null;
    const naturalHeight = matchedDomImg?.naturalHeight || null;

    let width = renderedWidth;
    let height = renderedHeight;

    if (!width || !height) {
      // Fallback to url segments
      const parsedDim = parseDimensionsFromUrl(res.url);
      width = parsedDim.width;
      height = parsedDim.height;
    }

    const aspectRatio = width && height && height > 0 ? parseFloat((width / height).toFixed(2)) : null;

    // Check if oversized: natural dimensions significantly exceed rendered display dimensions
    let isOversized = false;
    let oversizedRatio: number | null = null;
    if (naturalWidth && naturalHeight && renderedWidth && renderedHeight && renderedWidth > 0 && renderedHeight > 0) {
      if ((naturalWidth > renderedWidth * 1.5 && (naturalWidth - renderedWidth) >= 80) ||
          (naturalHeight > renderedHeight * 1.5 && (naturalHeight - renderedHeight) >= 80)) {
        isOversized = true;
        oversizedRatio = parseFloat(((naturalWidth * naturalHeight) / (renderedWidth * renderedHeight)).toFixed(1));
      }
    }

    // Attribute detections
    const isBelowTheFold = matchedDomImg ? matchedDomImg.isBelowTheFold === true : false;
    const lazyLoading = matchedDomImg ? matchedDomImg.loading === 'lazy' : null;
    const altText = matchedDomImg ? matchedDomImg.alt : null;
    const srcset = matchedDomImg ? matchedDomImg.srcset : null;
    const sizesAttribute = matchedDomImg ? matchedDomImg.sizes : null;
    const fetchPriority = matchedDomImg ? matchedDomImg.fetchpriority : null;
    const selector = matchedDomImg ? matchedDomImg.selector : null;

    const fromCache = (res as any).fromCache === true || res.statusCode === 304;
    const isTimingUnavailable = res.sizeKb <= 0 && res.transferSizeKb <= 0 && !fromCache;

    images.push({
      url: res.url,
      filename,
      extension,
      mimeType: res.contentType,
      width,
      height,
      renderedWidth,
      renderedHeight,
      naturalWidth,
      naturalHeight,
      isOversized,
      oversizedRatio,
      isBelowTheFold,
      selector,
      aspectRatio,
      fileSizeKb: res.sizeKb,
      transferSizeKb: res.transferSizeKb,
      fromCache,
      isTimingUnavailable,
      statusCode: res.statusCode,
      lazyLoading,
      altText,
      srcset,
      sizesAttribute,
      fetchPriority,
      heroImageCandidate: isHeroCandidate,
      isDuplicate,
      isBroken,
      // Supporting properties for backend-frontend alignment mapping
      src: res.url,
      savingsKb: 0,
      suggestedFormat: 'WebP/AVIF',
      hasAlt: altText !== null && altText !== undefined,
      lazyLoaded: lazyLoading === true,
      dimensions: width && height ? `${width}x${height}` : 'unknown'
    });
  });

  // Calculate statistics
  const countByExtension: Record<string, number> = {};
  const sizeByExtensionKb: Record<string, number> = {};
  const averageSizeByExtensionKb: Record<string, number> = {};

  images.forEach((img) => {
    const ext = img.extension;
    countByExtension[ext] = (countByExtension[ext] || 0) + 1;
    const validSize = img.fileSizeKb > 0 ? img.fileSizeKb : 0;
    sizeByExtensionKb[ext] = parseFloat(((sizeByExtensionKb[ext] || 0) + validSize).toFixed(1));
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

  // Compile Optimization Candidates and reconcile savings
  const optimizationCandidates: OptimizationCandidate[] = [];
  let duplicateCount = 0;
  let brokenCount = 0;

  images.forEach((img) => {
    if (img.isDuplicate) duplicateCount++;
    if (img.isBroken) brokenCount++;

    const baseSize = img.fileSizeKb > 0 ? img.fileSizeKb : 0;
    const { potentialSizeKb: webpSize, savingsKb: webpSavings } = estimateWebpSavings(img.extension, baseSize);
    const { potentialSizeKb: avifSize, savingsKb: avifSavings } = estimateAvifSavings(img.extension, baseSize);

    const estimatedSizeReductionKb = Math.max(webpSavings, avifSavings);

    const isLargeImage = img.fileSizeKb > 500;
    const missingLazyLoading = img.lazyLoading !== true;
    const missingAltText = img.altText === null || img.altText === undefined;

    // Re-assign computed values directly to target item for list results
    img.savingsKb = estimatedSizeReductionKb;
    img.suggestedFormat = avifSavings > webpSavings ? 'AVIF' : 'WebP';

    optimizationCandidates.push({
      url: img.url,
      currentType: img.extension,
      format: img.extension,
      sizeKb: img.fileSizeKb,
      potentialWebpSizeKb: webpSize,
      potentialAvifSizeKb: avifSize,
      estimatedWebpSavingsKb: webpSavings,
      estimatedAvifSavingsKb: avifSavings,
      isOversized: img.isOversized ?? false,
      renderedDimensions: img.renderedWidth && img.renderedHeight ? `${img.renderedWidth}x${img.renderedHeight}` : null,
      naturalDimensions: img.naturalWidth && img.naturalHeight ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      oversizedRatio: img.oversizedRatio || null,
      isLargeImage,
      missingLazyLoading,
      missingAltText,
      responsiveImageUsage: img.srcset !== null && img.srcset !== undefined && img.srcset.length > 0,
      estimatedSizeReductionKb
    });
  });

  // Calculate summary metrics
  const totalImages = images.length;
  const measuredImages = images.filter(img => img.fileSizeKb > 0);
  const totalImageWeight = parseFloat(measuredImages.reduce((sum, img) => sum + img.fileSizeKb, 0).toFixed(1));
  const averageImageSize = measuredImages.length > 0 ? parseFloat((totalImageWeight / measuredImages.length).toFixed(1)) : 0;

  const imagesMissingLazyLoading = images.filter((img) => img.lazyLoading !== true).length;
  const belowTheFoldImagesMissingLazyLoading = images.filter((img) => img.isBelowTheFold && !img.heroImageCandidate && img.lazyLoading !== true).length;
  const imagesMissingAltText = images.filter((img) => img.altText === null || img.altText === undefined).length;
  const oversizedImagesCount = images.filter((img) => img.isOversized).length;

  const summary: ImageSummary = {
    measurementStatus: 'SUCCESS',
    totalImages,
    largestImage: largestImg,
    averageImageSize,
    totalImageWeight,
    imagesMissingLazyLoading,
    belowTheFoldImagesMissingLazyLoading,
    imagesMissingAltText,
    oversizedImagesCount,
    brokenImages: brokenCount,
    duplicateImages: duplicateCount,
    heroImage: largestImg
  };

  return {
    status: 'SUCCESS',
    summary,
    images,
    statistics,
    optimizationCandidates,
    errors
  };
};

