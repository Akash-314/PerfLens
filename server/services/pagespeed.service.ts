import axios from 'axios';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export interface IPageSpeedMetrics {
  lcp: string;
  fcp: string;
  inp: string;
  tbt: string;
  cls: string;
  ttfb: string;
  speedIndex: string;
  inpSource?: 'crux' | 'lighthouse' | 'unknown';
  inpMode?: 'field' | 'lab';
}

export interface ITbtTask {
  scriptUrl: string;
  duration: number;
  startTime: number;
  blockingDuration: number;
}

export interface ITbtMainThreadWork {
  group: string;
  durationMs: number;
}

export interface ITbtTopScript {
  url: string;
  totalCpuMs: number;
  scriptEvalMs: number;
}

export interface ITbtDetails {
  totalBlockingTimeMs: number;
  longTaskCount: number;
  maxTaskDurationMs: number;
  tasks: ITbtTask[];
  mainThreadWork: ITbtMainThreadWork[];
  topScriptsByExecution: ITbtTopScript[];
}

export interface IPageSpeedData {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  metrics: IPageSpeedMetrics;
  cachedFrom?: Date | string;
  lighthouseScoreBreakdown?: any;
  tbtDetails?: ITbtDetails | any;
}

/**
 * Normalizes a URL for comparison and external API consumption.
 */
const normalizeUrlForApi = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

/**
 * Normalizes a URL to a simple domain format for database cache lookups.
 */
const getNormalizedDomain = (url: string): string => {
  return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
};

/**
 * Fetches PageSpeed telemetry data.
 * Checks the database cache first (15-minute threshold) before querying the Google API.
 * Handles API errors/quotas gracefully by returning null instead of throwing.
 *
 * @param url The target website URL
 * @param forceSkipApi If true, skip calling the Google API and only use cache or return null
 */
export const getPageSpeedTelemetry = async (
  url: string,
  forceSkipApi: boolean = false
): Promise<IPageSpeedData | null> => {
  const cleanUrl = normalizeUrlForApi(url);
  const domain = getNormalizedDomain(url);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  console.log(`[PageSpeed Service]: Checking DB cache for domain: ${domain}`);

  try {
    // 1. Check database cache in Supabase
    let cachedReport: any = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('url', domain)
        .not('page_speed', 'is', null)
        .gte('created_at', fifteenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      cachedReport = data;
    }

    const cachedTelemetry = cachedReport ? (cachedReport.page_speed || cachedReport.pageSpeed) : null;

    if (cachedTelemetry && cachedTelemetry.metrics) {
      console.log(`[PageSpeed Service]: Cache HIT. Reusing telemetry from report created at: ${cachedReport.created_at || cachedReport.createdAt}`);
      return {
        performance: cachedTelemetry.performance ?? 0,
        accessibility: cachedTelemetry.accessibility ?? 0,
        seo: cachedTelemetry.seo ?? 0,
        bestPractices: cachedTelemetry.bestPractices ?? 0,
        metrics: {
          lcp: cachedTelemetry.metrics?.lcp ?? 'N/A',
          fcp: cachedTelemetry.metrics?.fcp ?? 'N/A',
          inp: cachedTelemetry.metrics?.inp ?? 'N/A',
          tbt: cachedTelemetry.metrics?.tbt ?? 'N/A',
          cls: cachedTelemetry.metrics?.cls ?? 'N/A',
          ttfb: cachedTelemetry.metrics?.ttfb ?? 'N/A',
          speedIndex: cachedTelemetry.metrics?.speedIndex ?? 'N/A'
        },
        lighthouseScoreBreakdown: cachedTelemetry.lighthouseScoreBreakdown,
        tbtDetails: cachedTelemetry.tbtDetails,
        cachedFrom: cachedReport.created_at || cachedReport.createdAt
      };
    }

    // If requested to skip API (e.g. from check box) and cache missed, return null immediately
    if (forceSkipApi) {
      console.log(`[PageSpeed Service]: Cache MISS. Skip API flag is set. Returning null.`);
      return null;
    }

    // 2. Query Google PageSpeed Insights API
    const apiKey = process.env.PAGESPEED_API_KEY;
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;

    console.log(`[PageSpeed Service]: Cache MISS. Querying Google PageSpeed Insights API for host: ${cleanUrl}`);

    const searchParams = new URLSearchParams();
    searchParams.append('url', cleanUrl);
    ['performance', 'accessibility', 'seo', 'best-practices'].forEach(c => searchParams.append('category', c));
    searchParams.append('strategy', 'mobile');
    if (apiKey) {
      searchParams.append('key', apiKey);
    }

    // Set a timeout of 20 seconds to prevent hanging the orchestrator pipeline
    const response = await axios.get(`${apiEndpoint}?${searchParams.toString()}`, { timeout: 20000 });
    const data = response.data;

    if (!data?.lighthouseResult?.categories || !data?.lighthouseResult?.audits) {
      console.warn(`[PageSpeed Service Warning]: Response structure missing expected Lighthouse results.`);
      return null;
    }

    const categories = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;

    const performance = Math.round((categories.performance?.score || 0) * 100);
    const accessibility = Math.round((categories.accessibility?.score || 0) * 100);
    const seo = Math.round((categories.seo?.score || 0) * 100);
    const bestPractices = Math.round((categories['best-practices']?.score || 0) * 100);

    const cruxInp = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT_PERCENTILE?.percentile;
    const rawTtfbMs = audits['server-response-time']?.numericValue;

    const hasCruxInp = typeof cruxInp === 'number' && cruxInp > 0;
    const metrics: IPageSpeedMetrics = {
      lcp: audits['largest-contentful-paint']?.displayValue || 
           (audits['largest-contentful-paint']?.numericValue ? `${(audits['largest-contentful-paint'].numericValue / 1000).toFixed(2)}s` : 'N/A'),
      fcp: audits['first-contentful-paint']?.displayValue || 
           (audits['first-contentful-paint']?.numericValue ? `${(audits['first-contentful-paint'].numericValue / 1000).toFixed(2)}s` : 'N/A'),
      inp: hasCruxInp
           ? `${cruxInp}ms`
           : (audits['interaction-to-next-paint']?.displayValue || 
             (audits['interaction-to-next-paint']?.numericValue ? `${Math.round(audits['interaction-to-next-paint'].numericValue)}ms` : 'N/A')),
      inpSource: hasCruxInp ? 'crux' : (audits['interaction-to-next-paint']?.numericValue ? 'lighthouse' : 'unknown'),
      inpMode: hasCruxInp ? 'field' : 'lab',
      tbt: audits['total-blocking-time']?.displayValue || 
           (audits['total-blocking-time']?.numericValue ? `${Math.round(audits['total-blocking-time'].numericValue)}ms` : 'N/A'),
      cls: audits['cumulative-layout-shift']?.displayValue || 
           audits['cumulative-layout-shift']?.numericValue?.toFixed(3) || 'N/A',
      ttfb: (typeof rawTtfbMs === 'number' && rawTtfbMs > 0) 
            ? `${Math.round(rawTtfbMs)}ms` 
            : 'N/A',
      speedIndex: audits['speed-index']?.displayValue || 
                  (audits['speed-index']?.numericValue ? `${(audits['speed-index'].numericValue / 1000).toFixed(2)}s` : 'N/A')
    };

    // Extract exact audit weights and scores for explainability
    const auditRefs = categories.performance?.auditRefs || [];
    const lighthouseScoreBreakdown: Record<string, any> = {};
    auditRefs.forEach((ref: any) => {
      if (ref.weight > 0 && audits[ref.id]) {
        lighthouseScoreBreakdown[ref.id] = {
          id: ref.id,
          weight: ref.weight,
          score: Math.round((audits[ref.id].score || 0) * 100),
          numericValue: audits[ref.id].numericValue,
          displayValue: audits[ref.id].displayValue
        };
      }
    });

    // Extract long tasks and main-thread breakdown for TBT diagnostic trace
    const longTasksAudit = audits['long-tasks'];
    const mainThreadAudit = audits['mainthread-work-breakdown'];
    const bootupAudit = audits['bootup-time'];

    const longTaskItems = Array.isArray(longTasksAudit?.details?.items) ? longTasksAudit.details.items : [];
    const mainThreadItems = Array.isArray(mainThreadAudit?.details?.items) ? mainThreadAudit.details.items : [];
    const bootupItems = Array.isArray(bootupAudit?.details?.items) ? bootupAudit.details.items : [];

    const tbtDetails = {
      totalBlockingTimeMs: typeof audits['total-blocking-time']?.numericValue === 'number' ? Math.round(audits['total-blocking-time'].numericValue) : 0,
      longTaskCount: longTaskItems.length,
      maxTaskDurationMs: longTaskItems.length > 0 ? Math.round(Math.max(...longTaskItems.map((t: any) => t.duration || 0))) : 0,
      tasks: longTaskItems.map((t: any) => ({
        scriptUrl: t.url || 'Main thread execution',
        duration: Math.round(t.duration || 0),
        startTime: Math.round(t.startTime || 0),
        blockingDuration: Math.round(Math.max(0, (t.duration || 0) - 50))
      })),
      mainThreadWork: mainThreadItems.slice(0, 5).map((m: any) => ({
        group: m.groupLabel || m.group,
        durationMs: Math.round(m.duration || 0)
      })),
      topScriptsByExecution: bootupItems.slice(0, 5).map((b: any) => ({
        url: b.url,
        totalCpuMs: Math.round(b.total || 0),
        scriptEvalMs: Math.round(b.scripting || 0)
      }))
    };

    return {
      performance,
      accessibility,
      seo,
      bestPractices,
      metrics,
      lighthouseScoreBreakdown,
      tbtDetails
    };

  } catch (error: any) {
    // 3. Graceful error handling (quota exceeded 429, timeout, network failure, etc.)
    console.error(`[PageSpeed Service Safe Error]: API call or DB lookup failed - ${error.message}`);
    return null;
  }
};
