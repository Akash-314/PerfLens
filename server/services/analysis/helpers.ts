import { ResourceItem } from '../puppeteer/types.js';
import { detectChunkOrPackageName } from '../jsAnalyzer/helpers.js';

export class ImageAnalyzer {
  analyze(images: any[]) {
    const list = images.map((img) => {
      const src = img.src || img.url || '';
      const sizeKb = typeof img.sizeKb === 'number' ? img.sizeKb : (typeof img.fileSizeKb === 'number' ? img.fileSizeKb : 0);
      const format = (img.format || img.extension || 'unknown').toUpperCase();
      const isLegacy = format === 'PNG' || format === 'JPEG' || format === 'JPG';
      
      return {
        src,
        sizeKb,
        format,
        suggestedFormat: isLegacy ? 'WebP/AVIF' : format,
        savingsKb: isLegacy && sizeKb > 0 ? parseFloat((sizeKb * 0.30).toFixed(1)) : 0,
        hasAlt: img.hasAlt !== undefined ? img.hasAlt : (img.altText !== undefined ? Boolean(img.altText) : false),
        lazyLoaded: Boolean(img.lazyLoaded || img.lazyLoading)
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
    // Do not fabricate unused CSS if coverage was not captured; report 0 if unmeasured
    const unusedKb = 0;
    
    const renderBlockingCount = cssResources.filter((r: any) => Boolean(r.isRenderBlocking)).length;

    const criticalSuggestions: string[] = [];
    if (sizeKb > 100) {
      criticalSuggestions.push('Consider splitting CSS and inlining critical styles above the fold.');
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
    const sizeKb = parseFloat(jsResources.reduce((sum, r) => sum + (r.sizeKb || 0), 0).toFixed(1));
    const unusedKb = 0;

    const urlCountMap = new Map<string, number>();
    for (const r of jsResources) {
      if (r.url) {
        urlCountMap.set(r.url, (urlCountMap.get(r.url) || 0) + 1);
      }
    }

    const detectedPackages: Array<{
      packageName: string;
      name?: string;
      sizeKb: number;
      transferSizeKb?: number;
      compression?: string;
      isUnused: boolean;
      unused?: boolean;
      isDuplicate: boolean;
      duplicate?: boolean;
      hasSourceMap?: boolean;
      url?: string;
    }> = [];
    const seenPackages = new Set<string>();

    for (const r of jsResources) {
      const url = r.url || '';
      const pkgName = detectChunkOrPackageName(url);
      const isDuplicate = (urlCountMap.get(url) || 0) > 1 || seenPackages.has(pkgName.toLowerCase());
      seenPackages.add(pkgName.toLowerCase());

      const hasSourceMap = resources.some(res => res.url === url + '.map');

      detectedPackages.push({
        packageName: pkgName,
        name: pkgName,
        sizeKb: r.sizeKb || 0,
        transferSizeKb: typeof r.transferSizeKb === 'number' ? r.transferSizeKb : (r.sizeKb || 0),
        compression: r.compression || 'none',
        isUnused: false,
        unused: false,
        isDuplicate,
        duplicate: isDuplicate,
        hasSourceMap,
        url
      });
    }

    const duplicateCount = detectedPackages.filter(b => b.isDuplicate).length;
    const unusedModulesCount = detectedPackages.filter(b => b.isUnused).length;

    const suggestions: string[] = [];
    if (sizeKb > 500) {
      suggestions.push('Total JavaScript payload exceeds 500KB. Consider code-splitting with dynamic import().');
    }
    if (duplicateCount > 0) {
      suggestions.push('Duplicate JavaScript packages detected in page resources.');
    }

    return {
      stats: {
        count,
        sizeKb,
        unusedKb,
        duplicateCount,
        unusedModulesCount
      },
      bundleAnalysis: detectedPackages,
      suggestions
    };
  }
}

export class NetworkAnalyzer {
  analyze(resources: ResourceItem[], targetUrl: string) {
    const cleanHost = targetUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    
    let thirdPartyCount = 0;
    let thirdPartySizeKb = 0;
    let compressedCount = 0;
    let uncompressedSizeKb = 0;
    let totalTransferSizeKb = 0;

    const resourcesList = resources.map(r => {
      let isThirdParty = false;
      try {
        const host = new URL(r.url).hostname.replace(/^www\./i, '').toLowerCase();
        isThirdParty = host !== cleanHost && !host.endsWith('.' + cleanHost);
      } catch {
        isThirdParty = false;
      }

      if (isThirdParty) {
        thirdPartyCount++;
        thirdPartySizeKb += (r.sizeKb || 0);
      }

      const isCompressed = r.compression && r.compression !== 'none';
      if (isCompressed) {
        compressedCount++;
      } else {
        uncompressedSizeKb += (r.sizeKb || 0);
      }

      const transferSizeKb = r.transferSizeKb !== undefined ? r.transferSizeKb : r.sizeKb;
      totalTransferSizeKb += transferSizeKb;

      return {
        name: r.url.split('/').pop()?.split('?')[0] || r.url,
        url: r.url,
        type: r.type,
        sizeKb: r.sizeKb,
        transferSizeKb,
        statusCode: r.statusCode,
        timeMs: r.durationMs ?? null,
        durationMs: r.durationMs ?? null,
        startTimeMs: r.startTimeMs ?? null,
        initiator: r.initiator ?? null,
        fromCache: r.fromCache ?? false,
        timingBreakdown: r.timingBreakdown ?? null,
        compression: r.compression || 'none',
        cacheControl: r.cacheControl || 'none',
        isThirdParty,
        isCompressed
      };
    });

    // Sort waterfall order chronologically by startTimeMs where available
    resourcesList.sort((a, b) => {
      if (a.startTimeMs !== null && b.startTimeMs !== null) {
        return a.startTimeMs - b.startTimeMs;
      }
      return 0;
    });

    const totalRequests = resources.length;
    const totalSizeKb = parseFloat(resources.reduce((sum, r) => sum + (r.sizeKb || 0), 0).toFixed(1));
    const compressionRate = totalRequests > 0 ? Math.round((compressedCount / totalRequests) * 100) : 100;
    const cachedCount = resources.filter(r => r.fromCache || (r.cacheControl && !r.cacheControl.toLowerCase().includes('no-store'))).length;
    const cacheCoverageRate = totalRequests > 0 ? Math.round((cachedCount / totalRequests) * 100) : 0;

    return {
      resourcesList,
      stats: {
        totalRequests,
        totalSizeKb,
        totalTransferSizeKb: parseFloat(totalTransferSizeKb.toFixed(1)),
        thirdPartyCount,
        thirdPartySizeKb: parseFloat(thirdPartySizeKb.toFixed(1)),
        compressionRate,
        cacheCoverageRate,
        uncompressedSizeKb: parseFloat(uncompressedSizeKb.toFixed(1))
      }
    };
  }
}
