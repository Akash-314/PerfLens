import axios from 'axios';
import dotenv from 'dotenv';
import { PageSpeedScanResult } from './types.js';

dotenv.config();

/**
 * Normalizes URL formats
 */
export const normalizeUrl = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

/**
 * Extract timing details from audits
 */
export const getVitals = (audits: any) => {
  const formatVital = (audit: any) => {
    if (!audit) return { score: 50, value: 'N/A', rating: 'needs-improvement' as const };
    const score = Math.round((audit.score || 0) * 100);
    const value = audit.displayValue || `${(audit.numericValue || 0).toFixed(1)}ms`;
    const rating = score >= 90 ? 'good' as const : score >= 50 ? 'needs-improvement' as const : 'poor' as const;
    return { score, value, rating };
  };

  const maxFid = audits['max-potential-fid']?.numericValue || 50;

  return {
    fcp: formatVital(audits['first-contentful-paint']),
    lcp: formatVital(audits['largest-contentful-paint']),
    cls: formatVital(audits['cumulative-layout-shift']),
    ttfb: formatVital(audits['server-response-time']),
    tbt: formatVital(audits['total-blocking-time']),
    fid: {
      score: maxFid < 100 ? 98 : 70,
      value: `${Math.round(maxFid * 0.4)}ms`,
      rating: maxFid < 100 ? 'good' as const : 'needs-improvement' as const
    }
  };
};

/**
 * Parse opportunities that reduce load block times
 */
export const extractOpportunities = (audits: any) => {
  const opps: any[] = [];
  for (const [key, audit] of Object.entries(audits) as any) {
    if (audit.details && audit.details.type === 'opportunity' && audit.score < 0.9) {
      opps.push({
        id: key,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        numericValue: audit.numericValue,
        displayValue: audit.displayValue,
        savingsBytes: audit.details.overallSavingsBytes || 0,
        savingsMs: audit.details.overallSavingsMs || 0
      });
    }
  }
  return opps;
};

/**
 * Parse system diagnostic details
 */
export const extractDiagnostics = (audits: any) => {
  const diags: any[] = [];
  for (const [key, audit] of Object.entries(audits) as any) {
    if (audit.details && audit.details.type === 'diagnostic' && audit.score < 0.9) {
      diags.push({
        id: key,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        numericValue: audit.numericValue,
        displayValue: audit.displayValue
      });
    }
  }
  return diags;
};

/**
 * Run official PageSpeed Insights checks
 */
export const runPageSpeedAudit = async (url: string, strategy: string = 'mobile'): Promise<PageSpeedScanResult> => {
  const cleanUrl = normalizeUrl(url);
  const apiKey = process.env.PAGESPEED_API_KEY;
  const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;

  console.log(`[PageSpeed Service]: Querying PageSpeed Insights API for host: ${cleanUrl} (${strategy})`);

  try {
    const params: any = {
      url: cleanUrl,
      category: ['performance', 'accessibility', 'seo', 'best-practices'],
      strategy
    };

    if (apiKey) {
      params.key = apiKey;
    }

    const response = await axios.get(apiEndpoint, { params, timeout: 25000 });
    const data = response.data;

    const categories = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;

    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      overall: 0
    };

    scores.overall = Math.round(
      (scores.performance + scores.accessibility + scores.seo + scores.bestPractices) / 4
    );

    const vitals = getVitals(audits);
    const opportunities = extractOpportunities(audits);
    const diagnostics = extractDiagnostics(audits);

    return {
      success: true,
      url: cleanUrl,
      strategy,
      scores,
      vitals,
      opportunities,
      diagnostics,
      timestamp: new Date()
    };

  } catch (error: any) {
    console.error(`[PageSpeed Service Error]: API Request Failed - ${error.message}`);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const timeoutErr = new Error('PageSpeed audit request timed out. Google API took too long to analyze this host.');
      (timeoutErr as any).statusCode = 408;
      throw timeoutErr;
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data || {};
      const errorMsg = data.error?.message || 'PageSpeed API error';

      if (status === 400) {
        const invalidUrlErr = new Error(`Invalid URL structure. Google PageSpeed API could not resolve this target: ${errorMsg}`);
        (invalidUrlErr as any).statusCode = 400;
        throw invalidUrlErr;
      }
      if (status === 429) {
        const quotaErr = new Error('Google PageSpeed API quota limit exceeded. Please try again in a few minutes.');
        (quotaErr as any).statusCode = 429;
        throw quotaErr;
      }
      if (status >= 500) {
        const unavailableErr = new Error('Google PageSpeed Insights API is temporarily offline or returned an internal server error.');
        (unavailableErr as any).statusCode = 503;
        throw unavailableErr;
      }
    }

    const connectionErr = new Error(`Google PageSpeed API connection failed: ${error.message}`);
    (connectionErr as any).statusCode = 500;
    throw connectionErr;
  }
};
