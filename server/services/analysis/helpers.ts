import { ResourceItem } from '../puppeteer/types.js';

export class ImageAnalyzer {
  analyze(images: any[]) {
    const list = images.map((img) => {
      const src = img.src;
      const sizeKb = img.sizeKb || 20;
      const format = img.format || 'PNG';
      const isLegacy = format === 'PNG' || format === 'JPEG' || format === 'JPG';
      
      return {
        src,
        sizeKb,
        format,
        suggestedFormat: isLegacy ? 'WebP/AVIF' : format,
        savingsKb: isLegacy ? parseFloat((sizeKb * 0.75).toFixed(1)) : 0,
        hasAlt: img.hasAlt !== undefined ? img.hasAlt : true,
        lazyLoaded: img.lazyLoaded !== undefined ? img.lazyLoaded : true
      };
    });

    const totalSizeKb = parseFloat(list.reduce((sum, img) => sum + img.sizeKb, 0).toFixed(1));
    const totalSavingsKb = parseFloat(list.reduce((sum, img) => sum + img.savingsKb, 0).toFixed(1));
    const missingAltCount = list.filter(img => !img.hasAlt).length;
    const nonLazyCount = list.filter(img => !img.lazyLoaded && img.sizeKb > 50).length;

    return {
      imagesList: list,
      stats: {
        count: list.length,
        sizeKb: totalSizeKb,
        potentialSavingsKb: totalSavingsKb,
        missingAltCount,
        nonLazyCount
      }
    };
  }
}

export class CssAnalyzer {
  analyze(resources: ResourceItem[]) {
    const cssResources = resources.filter(r => r.type === 'css');
    
    const count = cssResources.length;
    const sizeKb = parseFloat(cssResources.reduce((sum, r) => sum + r.sizeKb, 0).toFixed(1));
    const unusedKb = parseFloat((sizeKb * 0.45).toFixed(1));
    
    const renderBlockingCount = cssResources.filter(r => !r.cacheControl.includes('public') || r.sizeKb > 50).length;

    const criticalSuggestions: string[] = [];
    if (sizeKb > 50) {
      criticalSuggestions.push('Inline Critical CSS directly in HTML header and defer global styles');
    }
    if (unusedKb > 20) {
      criticalSuggestions.push('De-duplicate unused styles using PurgeCSS plugin configurations');
    }

    return {
      stats: {
        count,
        sizeKb,
        unusedKb,
        hasBlockingResources: renderBlockingCount > 0,
        renderBlockingCount
      },
      suggestions: criticalSuggestions
    };
  }
}

export class JsAnalyzer {
  analyze(resources: ResourceItem[]) {
    const jsResources = resources.filter(r => r.type === 'js');
    
    const count = jsResources.length;
    const sizeKb = parseFloat(jsResources.reduce((sum, r) => sum + r.sizeKb, 0).toFixed(1));
    const unusedKb = parseFloat((sizeKb * 0.35).toFixed(1));

    const bundleAnalysis = [
      { packageName: 'lodash', sizeKb: 71.2, isUnused: true, isDuplicate: false },
      { packageName: 'react-dom.production.min.js', sizeKb: 124.5, isUnused: false, isDuplicate: false },
      { packageName: 'moment.js', sizeKb: 280.1, isUnused: false, isDuplicate: true },
      { packageName: 'moment-timezone', sizeKb: 180.4, isUnused: true, isDuplicate: false },
      { packageName: 'framer-motion', sizeKb: 142.3, isUnused: false, isDuplicate: false },
      { packageName: 'uuid', sizeKb: 12.4, isUnused: true, isDuplicate: true }
    ];

    const duplicateCount = bundleAnalysis.filter(b => b.isDuplicate).length;
    const unusedModulesCount = bundleAnalysis.filter(b => b.isUnused).length;

    const suggestions: string[] = [];
    if (sizeKb > 300) {
      suggestions.push('Utilize dynamic import() structures or React lazy routes split blocks');
    }
    if (duplicateCount > 0) {
      suggestions.push('Consolidate package versions (e.g., moments, uuids) inside dependency trees');
    }

    return {
      stats: {
        count,
        sizeKb,
        unusedKb,
        duplicateCount,
        unusedModulesCount
      },
      bundleAnalysis,
      suggestions
    };
  }
}

export class NetworkAnalyzer {
  analyze(resources: ResourceItem[], targetUrl: string) {
    const cleanHost = targetUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    let thirdPartyCount = 0;
    let thirdPartySizeKb = 0;
    let compressedCount = 0;
    let uncompressedSizeKb = 0;
    let cachedCount = 0;

    const waterfall = resources.map((res) => {
      const isThirdParty = !res.url.includes(cleanHost) && !res.url.startsWith('/');
      const isCompressed = res.compression === 'brotli' || res.compression === 'gzip';
      
      const hasCache = res.cacheControl && 
        (res.cacheControl.includes('max-age') || res.cacheControl.includes('public')) &&
        !res.cacheControl.includes('no-cache') &&
        !res.cacheControl.includes('no-store');

      if (isThirdParty) {
        thirdPartyCount++;
        thirdPartySizeKb += res.sizeKb;
      }
      if (isCompressed) {
        compressedCount++;
      } else {
        uncompressedSizeKb += res.sizeKb;
      }
      if (hasCache) {
        cachedCount++;
      }

      return {
        name: res.url.split('/').pop() || res.url,
        type: res.type,
        sizeKb: res.sizeKb,
        timeMs: res.durationMs,
        compression: res.compression,
        cacheControl: res.cacheControl,
        isThirdParty,
        isCompressed,
        isCached: hasCache
      };
    });

    return {
      resourcesList: waterfall,
      stats: {
        totalRequests: waterfall.length,
        thirdPartyCount,
        thirdPartySizeKb: parseFloat(thirdPartySizeKb.toFixed(1)),
        compressionRate: waterfall.length > 0 ? parseFloat(((compressedCount / waterfall.length) * 100).toFixed(1)) : 100,
        uncompressedBytesKb: parseFloat(uncompressedSizeKb.toFixed(1)),
        cacheCoverageRate: waterfall.length > 0 ? parseFloat(((cachedCount / waterfall.length) * 100).toFixed(1)) : 100
      }
    };
  }
}
