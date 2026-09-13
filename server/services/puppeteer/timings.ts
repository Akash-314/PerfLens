import { Page } from 'puppeteer';

/**
 * Register observers to capture LCP, CLS, TBT, FID on page start
 */
export const registerTimingsObserver = async (page: Page) => {
  await page.evaluateOnNewDocument(() => {
    (window as any).__perfLensVitals = {
      fcp: 0,
      lcp: 0,
      cls: 0,
      tbt: 0,
      fid: 0,
      lcpDetails: null,
      clsDetails: {
        shiftCount: 0,
        largestShift: 0,
        shifts: []
      },
      tbtDetails: {
        longTaskCount: 0,
        totalBlockingTimeMs: 0,
        maxTaskDurationMs: 0,
        tasks: []
      }
    };

    // FCP
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            (window as any).__perfLensVitals.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {}

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1] as any;
          (window as any).__perfLensVitals.lcp = lastEntry.startTime;

          let selector: string | null = null;
          if (lastEntry.element) {
            selector = lastEntry.element.id 
              ? `#${lastEntry.element.id}` 
              : lastEntry.element.className && typeof lastEntry.element.className === 'string'
              ? `.${lastEntry.element.className.trim().split(/\s+/).join('.')}`
              : lastEntry.element.tagName;
          }

          (window as any).__perfLensVitals.lcpDetails = {
            elementTag: lastEntry.element?.tagName || null,
            elementSelector: selector,
            elementUrl: lastEntry.url || null,
            renderTimeMs: lastEntry.renderTime || 0,
            loadTimeMs: lastEntry.loadTime || 0,
            size: lastEntry.size || 0
          };
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // CLS (Web.dev standard: maximum session window with <= 5000ms duration and <= 1000ms gap)
    try {
      let maxSessionValue = 0;
      let currentSessionValue = 0;
      let sessionEntries: any[] = [];

      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const prevSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (
              sessionEntries.length > 0 &&
              clsEntry.startTime - prevSessionEntry.startTime < 1000 &&
              clsEntry.startTime - firstSessionEntry.startTime < 5000
            ) {
              currentSessionValue += clsEntry.value;
              sessionEntries.push(clsEntry);
            } else {
              currentSessionValue = clsEntry.value;
              sessionEntries = [clsEntry];
            }

            if (currentSessionValue > maxSessionValue) {
              maxSessionValue = currentSessionValue;
              (window as any).__perfLensVitals.cls = parseFloat(maxSessionValue.toFixed(4));
            }

            const details = (window as any).__perfLensVitals.clsDetails;
            details.shiftCount++;
            if (clsEntry.value > details.largestShift) {
              details.largestShift = parseFloat(clsEntry.value.toFixed(4));
            }
            const affectedNodes: string[] = [];
            for (const s of (clsEntry.sources || [])) {
              if (s.node?.nodeName) {
                affectedNodes.push(s.node.nodeName);
              }
            }
            details.shifts.push({
              value: parseFloat(clsEntry.value.toFixed(4)),
              startTime: Math.round(clsEntry.startTime),
              affectedNodes
            });
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    // TBT
    try {
      const tbtObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            (window as any).__perfLensVitals.tbt += (entry.duration - 50);
            const details = (window as any).__perfLensVitals.tbtDetails;
            if (details) {
              details.longTaskCount++;
              details.totalBlockingTimeMs += Math.round(entry.duration - 50);
              if (entry.duration > details.maxTaskDurationMs) {
                details.maxTaskDurationMs = Math.round(entry.duration);
              }
              const attribution = (entry as any).attribution || [];
              const rawSrc = attribution[0]?.containerSrc;
              const scriptUrl = (rawSrc && typeof rawSrc === 'string' && rawSrc.trim().length > 0 && rawSrc !== 'unknown')
                ? rawSrc.trim()
                : null;
              details.tasks.push({
                startTime: Math.round(entry.startTime),
                duration: Math.round(entry.duration),
                blockingDuration: Math.round(entry.duration - 50),
                scriptUrl,
                attributionAvailable: scriptUrl !== null,
                containerType: attribution[0]?.containerType || null
              });
            }
          }
        }
      });
      tbtObserver.observe({ type: 'longtask', buffered: true });
    } catch {}

    // FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const entry = entries[0] as any;
          (window as any).__perfLensVitals.fid = entry.processingStart - entry.startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {}
  });
};

/**
 * Extract browser performance paint and timing telemetry records
 * @param {Page} page - Active Puppeteer tab page
 * @returns {Promise<object>} - Timing arrays and simulated Lighthouse telemetry
 */
export const extractTimings = async (page: Page) => {
  try {
    const perfData = await page.evaluate(() => {
      const t = window.performance.timing;
      const dns = t.domainLookupEnd - t.domainLookupStart;
      const connect = t.connectEnd - t.connectStart;
      const tls = t.secureConnectionStart > 0 ? (t.connectEnd - t.secureConnectionStart) : 0;
      
      return {
        navigationStart: t.navigationStart,
        dnsLookupMs: dns > 0 ? dns : 0,
        tcpConnectionMs: connect > 0 ? connect : 0,
        tlsHandshakeMs: tls > 0 ? tls : 0,
        requestStartMs: Math.max(0, t.requestStart - t.navigationStart),
        responseStartMs: Math.max(0, t.responseStart - t.navigationStart),
        responseEndMs: Math.max(0, t.responseEnd - t.navigationStart),
        domContentLoadedEventMs: Math.max(0, t.domContentLoadedEventEnd - t.navigationStart),
        loadEventMs: Math.max(0, t.loadEventEnd - t.navigationStart)
      };
    });

    const navDiagnostics = await page.evaluate(() => {
      try {
        const navEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries && navEntries.length > 0) {
          const entry = navEntries[0];
          const reqStart = entry.requestStart || 0;
          const resStart = entry.responseStart || 0;
          const resEnd = entry.responseEnd || 0;
          const transferSize = entry.transferSize || 0;
          const encodedBodySize = entry.encodedBodySize || 0;
          const navType = entry.type || 'navigate';
          const fromCache = transferSize === 0 || (encodedBodySize > 0 && transferSize === 0);
          
          let calculatedTtfbMs: number | null = null;
          let unmeasurableReason: string | null = null;
          if (resStart > 0 && reqStart > 0 && (resStart - reqStart) > 0) {
            calculatedTtfbMs = parseFloat((resStart - reqStart).toFixed(1));
          } else if (fromCache) {
            unmeasurableReason = 'Document served from local/disk cache; origin network TTFB is not measurable';
          } else if (reqStart === 0 || resStart === 0) {
            unmeasurableReason = 'Navigation Timing requestStart or responseStart was 0';
          } else {
            unmeasurableReason = 'responseStart <= requestStart (sub-millisecond or timing race)';
          }

          return {
            hasNavEntry: true,
            navigationType: navType,
            requestStart: reqStart,
            responseStart: resStart,
            responseEnd: resEnd,
            transferSize,
            encodedBodySize,
            fromCache,
            calculatedTtfbMs,
            unmeasurableReason
          };
        }
      } catch {}
      return {
        hasNavEntry: false,
        navigationType: 'unknown',
        requestStart: 0,
        responseStart: 0,
        responseEnd: 0,
        transferSize: 0,
        encodedBodySize: 0,
        fromCache: false,
        calculatedTtfbMs: null,
        unmeasurableReason: 'PerformanceNavigationTiming API not available'
      };
    });

    const observerData = await page.evaluate(() => {
      return (window as any).__perfLensVitals || null;
    });

    // Resolve FCP: use observer first, fallback to Paint Timing API, then navigation timings
    let fcp = observerData?.fcp || 0;
    if (fcp === 0) {
      const paintEntries = await page.evaluate(() => {
        return window.performance.getEntriesByType('paint').map(e => ({ name: e.name, startTime: e.startTime }));
      });
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
      fcp = fcpEntry ? fcpEntry.startTime : (perfData.domContentLoadedEventMs || 0);
    }

    // Resolve LCP
    let lcp = observerData?.lcp || 0;
    const lcpDetails = observerData?.lcpDetails || null;
    let isLcpFallback = false;
    if (lcp === 0 && perfData.loadEventMs > 0) {
      lcp = perfData.loadEventMs;
      isLcpFallback = true;
    }

    // Resolve CLS: 0 is valid and optimal
    const cls = observerData?.cls !== undefined ? parseFloat(Number(observerData.cls).toFixed(3)) : 0;
    const clsDetails = observerData?.clsDetails || { shiftCount: 0, largestShift: 0, shifts: [] };

    // Resolve TBT: 0 is valid and optimal
    const rawTbt = observerData?.tbt !== undefined ? Math.round(Number(observerData.tbt)) : 0;
    const tbtDetails = observerData?.tbtDetails || {
      longTaskCount: rawTbt > 0 ? 1 : 0,
      totalBlockingTimeMs: rawTbt,
      maxTaskDurationMs: rawTbt > 0 ? (rawTbt + 50) : 0,
      tasks: []
    };
    // Strictly verify: TBT = sum(max(0, longTaskDuration - 50ms)) when using Puppeteer long tasks
    const tbt = (tbtDetails.tasks && tbtDetails.tasks.length > 0)
      ? tbtDetails.tasks.reduce((sum: number, t: any) => sum + Math.max(0, Math.round(t.duration || 0) - 50), 0)
      : rawTbt;
    tbtDetails.totalBlockingTimeMs = tbt;
    if (tbtDetails.tasks && tbtDetails.tasks.length > 0) {
      tbtDetails.longTaskCount = tbtDetails.tasks.length;
      tbtDetails.maxTaskDurationMs = Math.max(...tbtDetails.tasks.map((t: any) => t.duration || 0));
    }

    // Resolve TTFB: strictly calculated as responseStart - requestStart (seconds)
    // If not measurable (cached, 0, or race), return null so it is represented as N/A (unrated)
    let ttfb: number | null = null;
    if (navDiagnostics.calculatedTtfbMs !== null && navDiagnostics.calculatedTtfbMs > 0) {
      ttfb = parseFloat((navDiagnostics.calculatedTtfbMs / 1000).toFixed(3));
    } else if (perfData.responseStartMs > 0 && perfData.requestStartMs > 0 && (perfData.responseStartMs - perfData.requestStartMs) > 0) {
      ttfb = parseFloat(((perfData.responseStartMs - perfData.requestStartMs) / 1000).toFixed(3));
    }

    return {
      timings: perfData,
      navigationDiagnostics: navDiagnostics,
      vitals: {
        fcp: fcp > 0 ? parseFloat((fcp / 1000).toFixed(2)) : 0,
        lcp: lcp > 0 ? parseFloat((lcp / 1000).toFixed(2)) : 0,
        lcpDetails: lcpDetails ? { ...lcpDetails, isFallback: false } : (isLcpFallback ? { elementTag: null, elementSelector: null, elementUrl: null, renderTimeMs: lcp, loadTimeMs: lcp, isFallback: true } : null),
        cls,
        clsDetails,
        fid: null, // Obsolete, replaced by INP (not measurable without interaction)
        tbt,
        tbtDetails,
        ttfb // null when unmeasured or 0ms from cache
      }
    };
  } catch {
    // Return explicit zeroed / null telemetry when DOM extraction fails
    return {
      timings: {
        navigationStart: 0,
        dnsLookupMs: 0,
        tcpConnectionMs: 0,
        tlsHandshakeMs: 0,
        requestStartMs: 0,
        responseStartMs: 0,
        responseEndMs: 0,
        domContentLoadedEventMs: 0,
        loadEventMs: 0
      },
      navigationDiagnostics: {
        hasNavEntry: false,
        navigationType: 'failed',
        requestStart: 0,
        responseStart: 0,
        responseEnd: 0,
        transferSize: 0,
        encodedBodySize: 0,
        fromCache: false,
        calculatedTtfbMs: null,
        unmeasurableReason: 'DOM extraction threw an error'
      },
      vitals: {
        fcp: null,
        lcp: null,
        cls: null,
        fid: null,
        tbt: null,
        ttfb: null
      }
    };
  }
};

