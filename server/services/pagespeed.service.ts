import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { validateUrlForSsrf } from './security/ssrfValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded whether running from project root or server/ folder
dotenv.config();
if (!process.env.PAGESPEED_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

export type GoogleProviderStatus =
  | 'SUCCESS'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'AUTH_ERROR'
  | 'API_KEY_ERROR'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'UNAVAILABLE';

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
  status: GoogleProviderStatus;
  available?: boolean;
  error?: string | null;
  errorCode?: string | null;
  httpStatus?: number | null;
  performance?: number;
  accessibility?: number;
  seo?: number;
  bestPractices?: number;
  metrics?: IPageSpeedMetrics;
  cachedFrom?: Date | string;
  lighthouseScoreBreakdown?: any;
  tbtDetails?: ITbtDetails | any;
}

/**
 * Normalizes a URL for comparison and external API consumption.
 */
export const normalizeUrlForApi = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

/**
 * Normalizes a URL to a simple domain format for database cache lookups.
 */
export const getNormalizedDomain = (url: string): string => {
  return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
};

/**
 * Verifies if a target URL is publicly reachable on the web.
 * Filters out loopback, private subnets, cloud metadata, and intranet hostnames
 * so they are never sent to Google PageSpeed Insights.
 */
export const isPubliclyReachableUrl = (url: string): boolean => {
  try {
    const clean = normalizeUrlForApi(url);
    const parsed = new URL(clean);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    // 1. Verify against static SSRF attack patterns, private IPs, loopback, and cloud metadata
    if (!validateUrlForSsrf(clean)) {
      return false;
    }

    // 2. Intranet hostnames with no dot (e.g. "localhost", "dev-server")
    if (!hostname.includes('.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

interface IDiagnosticLogParams {
  targetUrl: string;
  durationMs: number;
  httpStatus: number | string;
  providerStatus: GoogleProviderStatus;
  retryCount: number;
  errorCategory?: string;
  errorMessage?: string;
}

/**
 * Server-only diagnostic logger.
 * Scrupulously ensures the actual PAGESPEED_API_KEY is never leaked or printed in logs.
 */
export const logServerDiagnostic = (params: IDiagnosticLogParams): void => {
  const apiKey = process.env.PAGESPEED_API_KEY;
  let sanitizedTarget = params.targetUrl;
  if (apiKey && sanitizedTarget.includes(apiKey)) {
    sanitizedTarget = sanitizedTarget.split(apiKey).join('[REDACTED_KEY]');
  }
  sanitizedTarget = sanitizedTarget.replace(/([?&]key=)[a-zA-Z0-9_-]+/gi, '$1[REDACTED_KEY]');
  sanitizedTarget = sanitizedTarget.replace(/AIza[0-9A-Za-z-_]{10,}/gi, '[REDACTED_KEY]');

  console.log(
    `[PageSpeed Provider Diagnostic]: target=${sanitizedTarget} | duration=${params.durationMs}ms | httpStatus=${params.httpStatus} | status=${params.providerStatus} | retries=${params.retryCount}${params.errorCategory ? ` | category=${params.errorCategory}` : ''}${params.errorMessage ? ` | message="${params.errorMessage}"` : ''}`
  );
};

/**
 * Categorizes upstream Google PageSpeed Insights API errors into explicit error classes.
 */
export const classifyGoogleError = (error: any): {
  providerStatus: GoogleProviderStatus;
  errorCategory: string;
  errorMessage: string;
  httpStatus: number | null;
} => {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const sanitizeMsg = (msg: string): string => {
    let s = msg || '';
    if (apiKey && s.includes(apiKey)) {
      s = s.split(apiKey).join('[REDACTED_KEY]');
    }
    s = s.replace(/([?&]key=)[a-zA-Z0-9_-]+/gi, '$1[REDACTED_KEY]');
    s = s.replace(/AIza[0-9A-Za-z-_]{10,}/gi, '[REDACTED_KEY]');
    return s;
  };

  const isTimeout =
    error.code === 'ECONNABORTED' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));

  if (isTimeout) {
    return {
      providerStatus: 'TIMEOUT',
      errorCategory: 'TIMEOUT',
      errorMessage: 'PageSpeed Insights request timed out (exceeded 60s limit).',
      httpStatus: 408
    };
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data || {};
    const apiErrorMsg = sanitizeMsg(data.error?.message || error.message || 'Upstream API error');
    const errorDetails = Array.isArray(data.error?.errors) ? data.error.errors : [];
    const reason = errorDetails[0]?.reason || '';

    if (status === 429) {
      return {
        providerStatus: 'RATE_LIMITED',
        errorCategory: 'RATE_LIMITED',
        errorMessage: `Google PageSpeed API rate limit reached (HTTP 429): ${apiErrorMsg}`,
        httpStatus: 429
      };
    }

    if (
      status === 401 ||
      reason === 'keyInvalid' ||
      (status === 400 && apiErrorMsg.toLowerCase().includes('api key'))
    ) {
      return {
        providerStatus: 'API_KEY_ERROR',
        errorCategory: 'AUTH_ERROR',
        errorMessage: `Google PageSpeed API key invalid or unauthorized: ${apiErrorMsg}`,
        httpStatus: status
      };
    }

    if (status === 403) {
      const isKeyRestricted = apiErrorMsg.toLowerCase().includes('api key') || reason.includes('key');
      return {
        providerStatus: isKeyRestricted ? 'AUTH_ERROR' : 'FORBIDDEN',
        errorCategory: isKeyRestricted ? 'AUTH_ERROR' : 'FORBIDDEN',
        errorMessage: `Google PageSpeed API request forbidden (HTTP 403): ${apiErrorMsg}`,
        httpStatus: 403
      };
    }

    if (status === 400) {
      return {
        providerStatus: 'INVALID_REQUEST',
        errorCategory: 'INVALID_REQUEST',
        errorMessage: `Invalid URL target or request parameters for Google PageSpeed API (HTTP 400): ${apiErrorMsg}`,
        httpStatus: 400
      };
    }

    if (status >= 500) {
      return {
        providerStatus: 'PROVIDER_ERROR',
        errorCategory: 'PROVIDER_ERROR',
        errorMessage: `Google PageSpeed API server error (HTTP ${status}): ${apiErrorMsg}`,
        httpStatus: status
      };
    }
  }

  return {
    providerStatus: 'UNAVAILABLE',
    errorCategory: 'NETWORK_ERROR',
    errorMessage: `Google PageSpeed API is unavailable: ${sanitizeMsg(error.message)}`,
    httpStatus: null
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches PageSpeed telemetry data.
 * Checks the database cache first (15-minute threshold) before querying the Google API.
 * Uses a 60-second timeout, exponential backoff retries for 429, single retry for timeout,
 * and skips private/local targets gracefully.
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

  // 1. Guard against non-public URLs (localhost, private subnets, cloud metadata)
  if (!isPubliclyReachableUrl(cleanUrl)) {
    console.log(`[PageSpeed Service]: Target is a local or private address. Skipping Google PageSpeed API for: ${cleanUrl}`);
    logServerDiagnostic({
      targetUrl: cleanUrl,
      durationMs: 0,
      httpStatus: 'N/A',
      providerStatus: 'UNAVAILABLE',
      retryCount: 0,
      errorCategory: 'PRIVATE_OR_LOCAL_URL',
      errorMessage: 'Target URL is private or local address unreachable by Google API.'
    });
    return {
      status: 'UNAVAILABLE',
      error: 'Target URL is a local or private address that cannot be reached by Google PageSpeed Insights.',
      errorCode: 'PRIVATE_OR_LOCAL_URL',
      httpStatus: null,
      available: false
    };
  }

  console.log(`[PageSpeed Service]: Checking DB cache for domain: ${domain}`);

  try {
    // 2. Check database cache in Supabase
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
        status: 'SUCCESS',
        available: true,
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

    // 3. If requested to skip API (e.g. from checkbox toggle) and cache missed
    if (forceSkipApi) {
      console.log(`[PageSpeed Service]: Cache MISS. Skip API flag is set. Returning UNAVAILABLE.`);
      return {
        status: 'UNAVAILABLE',
        error: 'PageSpeed API was skipped by user request or configuration flag.',
        errorCode: 'FORCE_SKIP',
        httpStatus: null,
        available: false
      };
    }

    // 4. Query Google PageSpeed Insights API with 60s timeout and bounded retries
    const apiKey = process.env.PAGESPEED_API_KEY;
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;

    console.log(`[PageSpeed Service]: Cache MISS. Querying Google PageSpeed Insights API for host: ${cleanUrl}`);

    const searchParams = new URLSearchParams();
    searchParams.append('url', cleanUrl);
    ['performance', 'accessibility', 'seo', 'best-practices'].forEach((c) => searchParams.append('category', c));
    searchParams.append('strategy', 'mobile');
    if (apiKey) {
      searchParams.append('key', apiKey);
    }

    let rateLimitRetries = 0;
    let timeoutRetries = 0;
    let attempt = 0;

    while (true) {
      attempt++;
      const requestStart = Date.now();

      try {
        // Set timeout to 60 seconds (60000ms)
        const response = await axios.get(`${apiEndpoint}?${searchParams.toString()}`, { timeout: 60000 });
        const durationMs = Date.now() - requestStart;
        const data = response.data;

        if (!data?.lighthouseResult?.categories || !data?.lighthouseResult?.audits) {
          console.warn(`[PageSpeed Service Warning]: Response structure missing expected Lighthouse results.`);
          logServerDiagnostic({
            targetUrl: cleanUrl,
            durationMs,
            httpStatus: response.status,
            providerStatus: 'PROVIDER_ERROR',
            retryCount: attempt - 1,
            errorCategory: 'MALFORMED_RESPONSE',
            errorMessage: 'Response structure missing expected Lighthouse results.'
          });
          return {
            status: 'PROVIDER_ERROR',
            error: 'Response structure missing expected Lighthouse results.',
            errorCode: 'MALFORMED_RESPONSE',
            httpStatus: response.status,
            available: false
          };
        }

        logServerDiagnostic({
          targetUrl: cleanUrl,
          durationMs,
          httpStatus: response.status,
          providerStatus: 'SUCCESS',
          retryCount: attempt - 1
        });

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
          lcp:
            audits['largest-contentful-paint']?.displayValue ||
            (audits['largest-contentful-paint']?.numericValue
              ? `${(audits['largest-contentful-paint'].numericValue / 1000).toFixed(2)}s`
              : 'N/A'),
          fcp:
            audits['first-contentful-paint']?.displayValue ||
            (audits['first-contentful-paint']?.numericValue
              ? `${(audits['first-contentful-paint'].numericValue / 1000).toFixed(2)}s`
              : 'N/A'),
          inp: hasCruxInp
            ? `${cruxInp}ms`
            : audits['interaction-to-next-paint']?.displayValue ||
              (audits['interaction-to-next-paint']?.numericValue
                ? `${Math.round(audits['interaction-to-next-paint'].numericValue)}ms`
                : 'N/A'),
          inpSource: hasCruxInp ? 'crux' : audits['interaction-to-next-paint']?.numericValue ? 'lighthouse' : 'unknown',
          inpMode: hasCruxInp ? 'field' : 'lab',
          tbt:
            audits['total-blocking-time']?.displayValue ||
            (audits['total-blocking-time']?.numericValue
              ? `${Math.round(audits['total-blocking-time'].numericValue)}ms`
              : 'N/A'),
          cls:
            audits['cumulative-layout-shift']?.displayValue ||
            audits['cumulative-layout-shift']?.numericValue?.toFixed(3) ||
            'N/A',
          ttfb:
            typeof rawTtfbMs === 'number' && rawTtfbMs > 0
              ? `${Math.round(rawTtfbMs)}ms`
              : 'N/A',
          speedIndex:
            audits['speed-index']?.displayValue ||
            (audits['speed-index']?.numericValue
              ? `${(audits['speed-index'].numericValue / 1000).toFixed(2)}s`
              : 'N/A')
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
          totalBlockingTimeMs:
            typeof audits['total-blocking-time']?.numericValue === 'number'
              ? Math.round(audits['total-blocking-time'].numericValue)
              : 0,
          longTaskCount: longTaskItems.length,
          maxTaskDurationMs:
            longTaskItems.length > 0
              ? Math.round(Math.max(...longTaskItems.map((t: any) => t.duration || 0)))
              : 0,
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
          status: 'SUCCESS',
          available: true,
          performance,
          accessibility,
          seo,
          bestPractices,
          metrics,
          lighthouseScoreBreakdown,
          tbtDetails
        };
      } catch (err: any) {
        const durationMs = Date.now() - requestStart;
        const classified = classifyGoogleError(err);

        // Bounded retry for HTTP 429: max 2 retries with exponential backoff + jitter
        if (classified.providerStatus === 'RATE_LIMITED' && rateLimitRetries < 2) {
          rateLimitRetries++;
          const baseDelay = 1000;
          const backoffMs = baseDelay * Math.pow(2, rateLimitRetries - 1) + Math.floor(Math.random() * 500);

          logServerDiagnostic({
            targetUrl: cleanUrl,
            durationMs,
            httpStatus: 429,
            providerStatus: 'RATE_LIMITED',
            retryCount: rateLimitRetries,
            errorCategory: classified.errorCategory,
            errorMessage: `Rate limit (HTTP 429). Retrying in ${backoffMs}ms (retry ${rateLimitRetries}/2)...`
          });

          await sleep(backoffMs);
          continue;
        }

        // Bounded retry for Timeout: at most 1 retry
        if (classified.providerStatus === 'TIMEOUT' && timeoutRetries < 1) {
          timeoutRetries++;
          const timeoutWaitMs = 1000;

          logServerDiagnostic({
            targetUrl: cleanUrl,
            durationMs,
            httpStatus: 408,
            providerStatus: 'TIMEOUT',
            retryCount: timeoutRetries,
            errorCategory: classified.errorCategory,
            errorMessage: `Request timed out (60s). Retrying once (retry ${timeoutRetries}/1)...`
          });

          await sleep(timeoutWaitMs);
          continue;
        }

        // Retries exhausted or non-retryable error (400, 401, 403, 500, network failure)
        logServerDiagnostic({
          targetUrl: cleanUrl,
          durationMs,
          httpStatus: classified.httpStatus || 'N/A',
          providerStatus: classified.providerStatus,
          retryCount: attempt - 1,
          errorCategory: classified.errorCategory,
          errorMessage: classified.errorMessage
        });

        return {
          status: classified.providerStatus,
          error: classified.errorMessage,
          errorCode: classified.errorCategory,
          httpStatus: classified.httpStatus,
          available: false
        };
      }
    }
  } catch (error: any) {
    console.error(`[PageSpeed Service Safe Error]: DB lookup or processing failed - ${error.message}`);
    return {
      status: 'PROVIDER_ERROR',
      error: error.message || 'Internal processing failure',
      errorCode: 'INTERNAL_ERROR',
      httpStatus: null,
      available: false
    };
  }
};
