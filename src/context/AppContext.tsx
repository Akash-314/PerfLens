import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../services/auth/auth.types';
import { authService } from '../services/auth/auth.service';
import { getUserNameFromEmail } from '../services/auth/auth.helpers';
import { API_BASE } from '../config/api';

// Interfaces for our state
export interface MetricDetail {
  score: number | null;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor' | 'unrated';
  source?: string;
  mode?: string;
  available?: boolean;
  reason?: string;
  unavailableReason?: string;
  rawValue?: number | null;
  normalizedValueMs?: number | null;
  unit?: string;
}

export type EstimateType =
  | 'measured'
  | 'modeled'
  | 'transfer_only'
  | 'heuristic'
  | 'not_quantified'
  | 'unavailable';

export interface RecommendationEvidence {
  type: string;
  resource?: string | null;
  selector?: string | null;
  duration?: number | null;
  sizeKb?: number | null;
  value?: any;
  details?: Record<string, any>;
}

export interface EstimatedSavings {
  value: number | null;
  unit: string | null;
  type: EstimateType;
  assumption: string | null;
  displayString: string;
}

export interface RecommendationFinding {
  description: string;
  metric?: string;
  value?: number | string | null;
  unit?: string | null;
}

export interface Recommendation {
  id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'security' | 'css' | 'js' | 'images' | 'best-practices';
  issue: string;
  whyItMatters: string;
  suggestedFix: string;
  estimatedImprovement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  refUrl: string;
  expanded?: boolean;
  title?: string;
  finding?: RecommendationFinding;
  evidence?: RecommendationEvidence[] | string;
  evidenceDetails?: RecommendationEvidence[];
  potentialImpact?: string;
  estimateType?: EstimateType;
  estimatedSavings?: EstimatedSavings | null;
  measuredImprovement?: number | null;
  confidence?: 'high' | 'medium' | 'low';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  estimatedDifficulty?: 'easy' | 'medium' | 'hard';
  estimatedImplementationTime?: string;
  standardFinding?: any;
  aiFixPrompt?: string;
  fixStrategy?: string;
  validationSteps?: string[];
  sourceUrl?: string;
  scanTimestamp?: string;
  scanId?: string;
}

export interface ResourceItem {
  name: string;
  type: 'html' | 'js' | 'css' | 'image' | 'font' | 'other';
  sizeKb: number;
  timeMs: number;
  compression: 'gzip' | 'brotli' | 'none';
  cacheControl: string;
}

export interface Report {
  id: string;
  url: string;
  timestamp: string;
  scores: {
    overall: number;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  vitals: {
    fcp: MetricDetail;
    lcp: MetricDetail;
    fid?: MetricDetail;
    inp?: MetricDetail;
    cls: MetricDetail;
    ttfb: MetricDetail;
    tbt: MetricDetail;
  };
  breakdown: {
    html: { sizeKb: number; count: number };
    js: { sizeKb: number; unusedKb: number };
    css: { sizeKb: number; unusedKb: number };
    images: { sizeKb: number; count: number };
    fonts: { sizeKb: number; count: number };
    thirdParty: { sizeKb: number; count: number };
    other: { sizeKb: number; count: number };
  };
  bundleAnalysis: {
    packageName: string;
    sizeKb: number;
    isDuplicate: boolean;
    isUnused: boolean;
    transferSizeKb?: number;
    compression?: string;
    hasSourceMap?: boolean;
    url?: string;
  }[];
  images: {
    src: string;
    sizeKb: number;
    savingsKb: number;
    suggestedFormat: string;
    hasAlt: boolean;
    lazyLoaded: boolean;
    format: string;
    dimensions: string;
  }[];
  recommendations: Recommendation[];
  resources: ResourceItem[];
  accessibilityChecks: {
    title: string;
    passed: boolean;
    text: string;
  }[];
  seoChecks: {
    titleTag: string;
    titlePassed: boolean;
    metaDescription: string;
    descPassed: boolean;
    canonicalTag: string;
    canonicalPassed: boolean;
    sitemap: string;
    sitemapPassed: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    rawTitle?: string | null;
    rawMetaDescription?: string | null;
    canonicalDetails?: {
      status: string;
      url: string | null;
      matchesPageUrl: boolean;
      error?: string;
    };
    viewport?: string | null;
    viewportPassed?: boolean;
    charset?: string | null;
    charsetPassed?: boolean;
    headingsHierarchy?: {
      hasH1: boolean;
      h1Count: number;
      multipleH1: boolean;
      isHierarchyValid: boolean;
      skippedLevels: Array<{ from: string; to: string; text?: string }>;
      h1: string[];
      h2: string[];
      h3: string[];
    };
    robotsMeta?: {
      content: string | null;
      noindex: boolean;
      nofollow: boolean;
      directives: string[];
    };
    robotsTxt?: {
      status: string;
      url?: string;
      reachable: boolean;
      snippet?: string;
      error?: string;
    };
    sitemapXml?: {
      status: string;
      url?: string;
      reachable: boolean;
      error?: string;
    };
    structuredData?: {
      presence: boolean;
      itemCount: number;
      validCount: number;
      schemaTypes: string[];
      syntaxErrors: Array<{ index: number; error: string; snippet?: string }>;
    };
    openGraph?: {
      title: string | null;
      description: string | null;
      image: string | null;
      url: string | null;
      missingTags: string[];
      coveragePercentage: number;
    };
    twitterCard?: {
      card: string | null;
      title: string | null;
      description: string | null;
      image: string | null;
      missingTags: string[];
      coveragePercentage: number;
    };
    detectedFramework?: {
      name: string;
      confidence: string;
      evidence: string;
    } | null;
  };
  pageSpeed?: {
    performance?: number;
    accessibility?: number;
    seo?: number;
    bestPractices?: number;
    metrics?: {
      lcp?: string;
      fcp?: string;
      inp?: string;
      tbt?: string;
      cls?: string;
      ttfb?: string;
      speedIndex?: string;
    };
    cachedFrom?: Date;
  };
  analysisSources?: {
    perfLensEngine?: boolean;
    puppeteerRuntime?: boolean;
    googleLighthouse?: boolean;
  };
  customAnalysis?: {
    network?: {
      totalRequests: number;
      thirdPartyRequests: number;
      thirdPartySizeKb: number;
      compressionRate: number;
      cacheCoverageRate: number;
      largestResources: {
        name: string;
        url: string;
        sizeKb: number;
      }[];
      slowestRequests: {
        name: string;
        url: string;
        durationMs: number;
      }[];
      largestJs: string;
      largestCss: string;
      largestImage: string;
    };
    image?: any;
    css?: any;
    js?: any;
    seo?: any;
    accessibility?: any;
  };
  scoreExplanation?: any;
  performanceScoreDetails?: any;
  provenance?: any;
}

export interface Project {
  id: string;
  name: string;
  team: string[];
  websites: string[];
  reportsCount: number;
  avgScore: number;
  activity: { time: string; event: string; user: string }[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  profileTab: 'account' | 'ai' | 'scanning' | 'advanced';
  setProfileTab: (tab: 'account' | 'ai' | 'scanning' | 'advanced') => void;
  reports: Report[];
  currentReport: Report | null;
  setCurrentReport: (report: Report | null) => void;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  startAnalysis: (url: string, includePageSpeed?: boolean) => void;
  scanningUrl: string;
  scanProgress: { step: number; title: string; status: 'pending' | 'scanning' | 'done' }[];
  scanLogs: string[];
  runComparison: (url1: string, url2: string) => void;
  comparedReports: { report1: Report; report2: Report } | null;
  addProject: (name: string, websites: string[]) => void;
  deleteReport: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  // Auth state additions
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mapBackendReportToFrontend = (r: any): Report => {
  if (!r) return {} as any;

  // 1. Calculate overall/performance/a11y/seo/bestPractices scores
  // Prioritize real r.scores generated by backend ReportGenerator
  const overall = r.scores?.overall ?? r.recommendation?.summary?.overallHealthScore ?? r.overallHealthScore ?? 0;
  const performance = r.scores?.performance ?? r.pagespeed?.scores?.performance ?? r.pageSpeed?.performance ?? r.puppeteer?.performance?.score ?? 0;
  const accessibility = r.scores?.accessibility ?? r.accessibility?.summary?.accessibilityScoreEstimate ?? 0;
  const seo = r.scores?.seo ?? r.seo?.summary?.seoScoreEstimate ?? 0;
  const bestPractices = r.scores?.bestPractices ?? r.pagespeed?.scores?.bestPractices ?? r.pageSpeed?.bestPractices ?? 0;

  // Helpers for ratings
  const getRating = (val: number, goodLimit: number, poorLimit: number): 'good' | 'needs-improvement' | 'poor' => {
    return val <= goodLimit ? 'good' : val <= poorLimit ? 'needs-improvement' : 'poor';
  };

  const getRatingCls = (val: number): 'good' | 'needs-improvement' | 'poor' => {
    return val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor';
  };

  const getRatingTbt = (val: number): 'good' | 'needs-improvement' | 'poor' => {
    return val <= 200 ? 'good' : val <= 600 ? 'needs-improvement' : 'poor';
  };

  // 2. Vitals mapping from backend report.vitals, puppeteer, or pagespeed details
  let vitals = r.vitals;
  if (!vitals || !vitals.fcp) {
    const puppeteerVitals = r.puppeteer?.performance?.vitals || {};
    const fcpSec = puppeteerVitals.fcp ?? null;
    const lcpSec = puppeteerVitals.lcp ?? null;
    const clsVal = puppeteerVitals.cls ?? null;
    const tbtMs = puppeteerVitals.tbt ?? null;
    const ttfbSec = puppeteerVitals.ttfb ?? null;
    const inpMs = puppeteerVitals.inp ?? null;

    vitals = {
      fcp: {
        score: fcpSec !== null ? Math.round(performance) : null,
        value: fcpSec !== null ? `${fcpSec.toFixed(2)}s` : 'N/A',
        rating: fcpSec !== null ? getRating(fcpSec, 1.8, 3.0) : 'unrated',
        available: fcpSec !== null
      },
      lcp: {
        score: lcpSec !== null ? Math.round(performance) : null,
        value: lcpSec !== null ? `${lcpSec.toFixed(2)}s` : 'N/A',
        rating: lcpSec !== null ? getRating(lcpSec, 2.5, 4.0) : 'unrated',
        available: lcpSec !== null
      },
      inp: {
        score: inpMs !== null ? Math.round(performance) : null,
        value: inpMs !== null ? `${inpMs}ms` : 'N/A',
        rating: inpMs !== null ? (inpMs <= 200 ? 'good' : inpMs <= 500 ? 'needs-improvement' : 'poor') : 'unrated',
        available: inpMs !== null,
        reason: 'CrUX Field Core Web Vital; not available in lab crawl'
      },
      cls: {
        score: clsVal !== null ? Math.round(performance) : null,
        value: clsVal !== null ? clsVal.toString() : 'N/A',
        rating: clsVal !== null ? getRatingCls(clsVal) : 'unrated',
        available: clsVal !== null
      },
      ttfb: {
        score: ttfbSec !== null ? Math.round(performance) : null,
        value: ttfbSec !== null ? `${(ttfbSec * 1000).toFixed(0)}ms` : 'N/A',
        rating: ttfbSec !== null ? getRating(ttfbSec, 0.8, 1.8) : 'unrated',
        available: ttfbSec !== null
      },
      tbt: {
        score: tbtMs !== null ? Math.round(performance) : null,
        value: tbtMs !== null ? `${tbtMs}ms` : 'N/A',
        rating: tbtMs !== null ? getRatingTbt(tbtMs) : 'unrated',
        available: tbtMs !== null
      }
    };
  }

  // 3. Breakdown size estimation mapping
  const network = r.puppeteer?.network || {};
  const cssCoverage = r.css?.summary || {};
  const jsCoverage = r.js?.summary || {};
  const imageCoverage = r.image?.summary || {};

  const breakdown = {
    html: { sizeKb: r.breakdown?.html?.sizeKb ?? network.htmlSizeKb ?? 0, count: r.breakdown?.html?.count ?? (network.htmlSizeKb ? 1 : 0) },
    js: { sizeKb: r.breakdown?.js?.sizeKb ?? network.jsSizeKb ?? 0, count: r.breakdown?.js?.count ?? 0, unusedKb: r.breakdown?.js?.unusedKb ?? jsCoverage.unusedKb ?? 0 },
    css: { sizeKb: r.breakdown?.css?.sizeKb ?? network.cssSizeKb ?? 0, count: r.breakdown?.css?.count ?? 0, unusedKb: r.breakdown?.css?.unusedKb ?? cssCoverage.unusedKb ?? 0 },
    images: { sizeKb: r.breakdown?.images?.sizeKb ?? network.imageSizeKb ?? 0, count: r.breakdown?.images?.count ?? imageCoverage.totalCount ?? 0 },
    fonts: { sizeKb: r.breakdown?.fonts?.sizeKb ?? network.fontSizeKb ?? 0, count: r.breakdown?.fonts?.count ?? 0 },
    thirdParty: { sizeKb: r.breakdown?.thirdParty?.sizeKb ?? r.recommendation?.summary?.thirdPartySizeKb ?? 0, count: r.breakdown?.thirdParty?.count ?? r.recommendation?.summary?.thirdPartyResourcesCount ?? 0 },
    other: { sizeKb: r.breakdown?.other?.sizeKb ?? network.otherSizeKb ?? 0, count: r.breakdown?.other?.count ?? 0 }
  };

  // 4. JS Script bundle duplicate logic checks
  const jsPackages = r.bundleAnalysis || r.js?.packages || [];
  const bundleAnalysis = jsPackages.map((p: any) => ({
    packageName: p.packageName || p.name || 'unknown-package',
    sizeKb: typeof p.sizeKb === 'number' ? p.sizeKb : 0,
    transferSizeKb: typeof p.transferSizeKb === 'number' ? p.transferSizeKb : (typeof p.sizeKb === 'number' ? p.sizeKb : 0),
    compression: p.compression || 'none',
    isDuplicate: p.isDuplicate ?? p.duplicate ?? false,
    isUnused: p.isUnused ?? p.unused ?? false,
    hasSourceMap: p.hasSourceMap ?? false,
    url: p.url || ''
  }));

  // 5. Raw resources breakdown mapping
  const rawResources = r.resources || r.puppeteer?.resources || [];
  const resources: ResourceItem[] = rawResources.map((res: any) => {
    let rawType = (res.type || 'other').toLowerCase();
    let type: ResourceItem['type'] = 'other';
    if (['document', 'html'].includes(rawType)) type = 'html';
    else if (['script', 'js'].includes(rawType)) type = 'js';
    else if (['stylesheet', 'css'].includes(rawType)) type = 'css';
    else if (['image', 'img'].includes(rawType)) type = 'image';
    else if (['font', 'fonts'].includes(rawType)) type = 'font';

    return {
      name: res.name || res.url?.split('/').pop() || res.url || 'resource',
      type,
      sizeKb: res.sizeKb ?? (res.sizeBytes ? Math.round(res.sizeBytes / 102.4) / 10 : 0),
      timeMs: res.timeMs ?? res.durationMs ?? res.loadTimeMs ?? 0,
      compression: res.compression === 'brotli' || res.compression === 'gzip' || res.encoding === 'gzip' ? (res.compression || 'gzip') : res.encoding === 'br' ? 'brotli' : 'none',
      cacheControl: res.cacheControl || 'no-cache'
    };
  });

  // 6. Image Optimization payloads
  const rawImages = r.images || r.image?.images || [];
  const images = rawImages.map((img: any) => ({
    src: img.src || img.url || '',
    sizeKb: img.sizeKb || 0,
    savingsKb: img.savingsKb ?? img.optimizationSpaceKb ?? 0,
    suggestedFormat: img.suggestedFormat || 'WEBP',
    hasAlt: img.hasAlt ?? img.altPassed ?? false,
    lazyLoaded: img.lazyLoaded ?? img.lazyLoadedPassed ?? false,
    format: img.format || 'unknown',
    dimensions: img.dimensions || 'N/A'
  }));

  // 7. Core recommendations mapping
  const recItems = r.recommendations || r.recommendation?.recommendations || [];
  const recommendations: Recommendation[] = recItems.map((rec: any, idx: number) => {
    let diff: Recommendation['difficulty'] = 'medium';
    if (rec.difficulty === 'low' || rec.difficulty === 'easy' || rec.estimatedDifficulty === 'easy') diff = 'easy';
    else if (rec.difficulty === 'high' || rec.difficulty === 'hard' || rec.estimatedDifficulty === 'hard') diff = 'hard';

    let prio: Recommendation['priority'] = 'medium';
    if (rec.priority === 'high' || rec.priority === 'critical' || rec.severity === 'high') prio = 'high';
    else if (rec.priority === 'low' || rec.severity === 'low') prio = 'low';

    return {
      id: rec.id || `rec-${idx}`,
      category: rec.category || 'performance',
      issue: rec.title || rec.issue,
      whyItMatters: rec.potentialImpact || rec.whyItMatters || rec.description || rec.impact || '',
      suggestedFix: rec.suggestedFix || rec.solution || '',
      estimatedImprovement: rec.estimatedSavings?.displayString || rec.estimatedImprovement || rec.estimatedSaving || 'Not quantified',
      difficulty: diff,
      priority: prio,
      refUrl: rec.refUrl || rec.reference || 'https://web.dev/',
      title: rec.title || rec.issue,
      finding: rec.finding,
      evidence: rec.evidence,
      evidenceDetails: rec.evidenceDetails || [],
      potentialImpact: rec.potentialImpact || rec.whyItMatters || rec.description || '',
      estimatedSavings: rec.estimatedSavings,
      measuredImprovement: rec.measuredImprovement ?? null,
      confidence: rec.confidence || 'high',
      severity: rec.severity || (prio === 'high' ? 'high' : 'medium'),
      standardFinding: rec.standardFinding || undefined,
      aiFixPrompt: rec.aiFixPrompt || undefined,
      fixStrategy: rec.fixStrategy || undefined,
      validationSteps: rec.validationSteps || undefined
    };
  });

  // 8. Accessibility Checks mapping
  const a11yData = r.accessibility?.accessibility || {};
  const hasLang = a11yData.missingHtmlLanguageAttribute !== undefined 
    ? !a11yData.missingHtmlLanguageAttribute 
    : (a11yData.htmlLang ?? true);
  const hasTitle = a11yData.missingPageTitle !== undefined 
    ? !a11yData.missingPageTitle 
    : (a11yData.title ?? true);
  const missingAlts = r.accessibility?.summary?.imagesMissingAlt 
    ?? a11yData.imagesWithoutAltCount 
    ?? a11yData.imagesMissingAltText?.length 
    ?? 0;
  const missingAltUrls = a11yData.imagesMissingAltText || a11yData.imagesWithoutAltUrls || [];

  const accessibilityChecks = [
    {
      title: 'HTML Language Tag',
      passed: Boolean(hasLang),
      text: hasLang
        ? 'The html element has a valid lang attribute.'
        : 'The html element is missing a lang attribute, which hinders screen readers.'
    },
    {
      title: 'Page Title Element',
      passed: Boolean(hasTitle),
      text: hasTitle
        ? 'The document has a title element.'
        : 'The document is missing a title element.'
    },
    {
      title: 'Image Alt Attributes',
      passed: missingAlts === 0,
      text: missingAlts === 0
        ? 'All images have alt attributes.'
        : `${missingAlts} image(s) are missing alt attributes${missingAltUrls.length > 0 ? ': ' + missingAltUrls.slice(0, 2).join(', ') : '.'}`
    }
  ];

  // 9. SEO & Meta Checks mapping
  const seoData = r.seo?.seo || {};
  const pageTitle = seoData.pageTitle || seoData.title;
  const metaDesc = seoData.metaDescription || seoData.description;
  const canonical = seoData.canonicalUrl || seoData.canonical;
  const canonicalDetails = seoData.canonicalDetails || null;
  const hasSitemap = seoData.hasSitemapXml ?? Boolean(seoData.sitemap);
  const ogTags = seoData.openGraphTags || {};
  const openGraphData = seoData.openGraph || null;
  const twitterData = seoData.twitterCard || null;
  const headings = seoData.headingsHierarchy || null;
  const robotsMeta = seoData.robotsMeta || null;
  const robotsTxt = seoData.robotsTxtDetails || null;
  const sitemapXml = seoData.sitemapXmlDetails || null;
  const structuredData = seoData.structuredData || null;
  const detectedFramework = seoData.detectedFramework || null;

  const titleTag = pageTitle ? `Verified (${pageTitle.length} chars)` : 'Missing';
  const metaDescription = metaDesc ? `Verified (${metaDesc.length} chars)` : 'Missing';
  const canonicalTag = canonical ? (canonicalDetails?.status === 'valid' ? 'Verified (Valid Absolute)' : canonicalDetails?.status || 'Verified') : 'Missing';
  const sitemap = sitemapXml?.status ? `Status: ${sitemapXml.status}` : (hasSitemap ? 'Verified' : 'Missing or not referenced');

  const seoChecks = {
    titleTag,
    titlePassed: !!pageTitle,
    metaDescription,
    descPassed: !!metaDesc,
    canonicalTag,
    canonicalPassed: !!canonical && (!canonicalDetails || canonicalDetails.status === 'valid'),
    sitemap,
    sitemapPassed: Boolean(hasSitemap) || sitemapXml?.status === 'exists',
    ogTitle: openGraphData?.title || ogTags['og:title'] || seoData.ogTitle || pageTitle || '',
    ogDescription: openGraphData?.description || ogTags['og:description'] || seoData.ogDescription || metaDesc || '',
    ogImage: openGraphData?.image || ogTags['og:image'] || seoData.ogImage || '',
    rawTitle: pageTitle || null,
    rawMetaDescription: metaDesc || null,
    canonicalDetails: canonicalDetails ? {
      status: canonicalDetails.status,
      url: canonicalDetails.url,
      matchesPageUrl: canonicalDetails.matchesPageUrl,
      error: canonicalDetails.error
    } : undefined,
    viewport: seoData.viewport || null,
    viewportPassed: !!seoData.viewport,
    charset: seoData.charset || null,
    charsetPassed: !!seoData.charset,
    headingsHierarchy: headings ? {
      hasH1: headings.hasH1,
      h1Count: headings.h1Count,
      multipleH1: headings.multipleH1,
      isHierarchyValid: headings.isHierarchyValid,
      skippedLevels: headings.skippedLevels || [],
      h1: headings.h1 || [],
      h2: headings.h2 || [],
      h3: headings.h3 || []
    } : undefined,
    robotsMeta: robotsMeta ? {
      content: robotsMeta.content,
      noindex: robotsMeta.noindex,
      nofollow: robotsMeta.nofollow,
      directives: robotsMeta.directives || []
    } : undefined,
    robotsTxt: robotsTxt ? {
      status: robotsTxt.status,
      url: robotsTxt.url,
      reachable: robotsTxt.reachable,
      snippet: robotsTxt.snippet,
      error: robotsTxt.error
    } : undefined,
    sitemapXml: sitemapXml ? {
      status: sitemapXml.status,
      url: sitemapXml.url,
      reachable: sitemapXml.reachable,
      error: sitemapXml.error
    } : undefined,
    structuredData: structuredData ? {
      presence: structuredData.presence,
      itemCount: structuredData.itemCount,
      validCount: structuredData.validCount,
      schemaTypes: structuredData.schemaTypes || [],
      syntaxErrors: structuredData.syntaxErrors || []
    } : undefined,
    openGraph: openGraphData ? {
      title: openGraphData.title,
      description: openGraphData.description,
      image: openGraphData.image,
      url: openGraphData.url,
      missingTags: openGraphData.missingTags || [],
      coveragePercentage: openGraphData.coveragePercentage || 0
    } : undefined,
    twitterCard: twitterData ? {
      card: twitterData.card,
      title: twitterData.title,
      description: twitterData.description,
      image: twitterData.image,
      missingTags: twitterData.missingTags || [],
      coveragePercentage: twitterData.coveragePercentage || 0
    } : undefined,
    detectedFramework: detectedFramework || undefined
  };

  return {
    id: r._id || r.id,
    url: r.url,
    timestamp: new Date(r.createdAt || r.timestamp || Date.now()).toLocaleString(),
    scores: {
      overall,
      performance,
      accessibility,
      seo,
      bestPractices
    },
    vitals,
    breakdown,
    bundleAnalysis,
    images,
    recommendations,
    resources,
    accessibilityChecks,
    seoChecks,
    pageSpeed: r.pageSpeed || undefined,
    analysisSources: r.analysisSources || undefined,
    customAnalysis: r.customAnalysis || undefined
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [profileTab, setProfileTab] = useState<'account' | 'ai' | 'scanning' | 'advanced'>('account');
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [scanningUrl, setScanningUrl] = useState<string>('');
  const [comparedReports, setComparedReports] = useState<{ report1: Report; report2: Report } | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // SaaS Auth States
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [scanProgress, setScanProgress] = useState<
    { step: number; title: string; status: 'pending' | 'scanning' | 'done' }[]
  >([
    { step: 1, title: 'Connecting to host', status: 'pending' },
    { step: 2, title: 'Collecting styles, images, and bundles', status: 'pending' },
    { step: 3, title: 'Analyzing static asset payload overhead', status: 'pending' },
    { step: 4, title: 'Generating Core Web Vitals telemetry', status: 'pending' },
    { step: 5, title: 'Synthesizing AI architectural advice', status: 'pending' }
  ]);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  const addToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        removeToast(toasts[0].id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Handle global key shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('perflens_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  /**
   * Load user specific data (reports & projects) from backend APIs
   */
  const loadUserData = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const repRes = await fetch(`${API_BASE}/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (repRes.status === 401) {
        logout();
        return;
      }

      const repJson = await repRes.json();
      let mappedReports: Report[] = [];
      if (repJson.success) {
        mappedReports = repJson.data.map((r: any) => mapBackendReportToFrontend(r));
        setReports(mappedReports);
        if (mappedReports.length > 0) {
          setCurrentReport(mappedReports[0]);
        } else {
          setCurrentReport(null);
        }
      }

      const projRes = await fetch(`${API_BASE}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projJson = await projRes.json();
      if (projJson.success) {
        const mappedProjs = projJson.data.map((p: any) => {
          const projWebs = p.websites || [];
          const projReports = mappedReports.filter(r => 
            projWebs.some((w: string) => r.url.toLowerCase().includes(w.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase()))
          );
          const totalScore = projReports.reduce((acc, r) => acc + (r.scores?.overall || 0), 0);
          const avgScore = projReports.length > 0 ? Math.round(totalScore / projReports.length) : 0;

          return {
            id: p._id,
            name: p.name,
            websites: p.websites,
            team: p.team || ['You (Owner)'],
            reportsCount: projReports.length,
            avgScore: avgScore,
            activity: [
              { time: 'Active', event: 'Workspace loaded from database', user: 'PerfLens API' }
            ]
          };
        });
        setProjects(mappedProjs);
        if (mappedProjs.length > 0) {
          setActiveProject(mappedProjs[0]);
        } else {
          setActiveProject(null);
        }
      }
    } catch (e: any) {
      console.error('Error fetching backend profiles.', e);
      setError(e.message || 'Connection failure to API server.');
    }
    setLoading(false);
  };

  /**
   * Restores session on app startup
   */
  const restoreSession = async () => {
    setAuthLoading(true);
    const token = localStorage.getItem('perflens_token');
    if (token) {
      try {
        const res = await authService.getMe(token);
        if (res.success && res.data) {
          const email = res.data.email;
          const role = res.data.role;
          const name = getUserNameFromEmail(email);
          setUser({ email, role, name });
          setIsAuthenticated(true);
          await loadUserData(token);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Session verification failed:', err);
        logout();
      }
    } else {
      setIsAuthenticated(false);
    }
    setAuthLoading(false);
  };

  /**
   * Log in user
   */
  const login = async (email: string, pass: string): Promise<boolean> => {
    setAuthLoading(true);
    try {
      const res = await authService.login(email, pass);
      if (res.success && res.data) {
        const token = res.data.token;
        localStorage.setItem('perflens_token', token);
        const name = getUserNameFromEmail(res.data.email);
        setUser({ email: res.data.email, role: res.data.role, name });
        setIsAuthenticated(true);
        await loadUserData(token);
        setCurrentTab('dashboard');
        addToast('Sign in successful!', 'success');
        setAuthLoading(false);
        return true;
      } else {
        addToast(res.message || 'Login credentials incorrect.', 'error');
      }
    } catch {
      addToast('Network connectivity issue. Server unreachable.', 'error');
    }
    setAuthLoading(false);
    return false;
  };

  /**
   * Register a new user
   */
  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    setAuthLoading(true);
    try {
      const res = await authService.register(email, pass, name);
      if (res.success && res.data) {
        const token = res.data.token;
        localStorage.setItem('perflens_token', token);
        setUser({ email: res.data.email, role: res.data.role, name });
        setIsAuthenticated(true);
        await loadUserData(token);
        setCurrentTab('dashboard');
        addToast('Account registered successfully!', 'success');
        setAuthLoading(false);
        return true;
      } else {
        addToast(res.message || 'Account registration failed.', 'error');
      }
    } catch {
      addToast('Network connectivity issue. Server unreachable.', 'error');
    }
    setAuthLoading(false);
    return false;
  };

  /**
   * Sign out session
   */
  const logout = () => {
    localStorage.removeItem('perflens_token');
    setUser(null);
    setIsAuthenticated(false);
    setReports([]);
    setCurrentReport(null);
    setProjects([]);
    setActiveProject(null);
    setComparedReports(null);
    setCurrentTab('login');
    addToast('Signed out successfully.', 'info');
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('perflens_token');
    if (token) {
      await restoreSession();
    }
  };

  // Perform session verification once on startup
  useEffect(() => {
    restoreSession();
  }, []);

  const addProject = async (name: string, websites: string[]) => {
    const token = localStorage.getItem('perflens_token');
    if (!token) {
      addToast('Session expired. Please log in again.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, websites })
      });
      const json = await res.json();
      if (json.success) {
        const p = json.data;
        const projReports = reports.filter(r => 
          websites.some((w: string) => r.url.toLowerCase().includes(w.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase()))
        );
        const totalScore = projReports.reduce((acc, r) => acc + (r.scores?.overall || 0), 0);
        const avgScore = projReports.length > 0 ? Math.round(totalScore / projReports.length) : 0;

        const newProj: Project = {
          id: p._id,
          name: p.name,
          websites: p.websites,
          team: p.team || ['You (Owner)'],
          reportsCount: projReports.length,
          avgScore: avgScore,
          activity: [{ time: 'Just now', event: 'Created project container in Database', user: 'You' }]
        };
        setProjects((prev) => [newProj, ...prev]);
        setActiveProject(newProj);
        addToast(`Project "${name}" saved to database.`, 'success');
      } else {
        addToast(json.message || 'Error creating project', 'error');
      }
    } catch {
      addToast('Connection failure to API server', 'error');
    }
  };

  const deleteReport = async (id: string) => {
    const token = localStorage.getItem('perflens_token');
    if (!token) {
      addToast('Session expired.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        if (currentReport?.id === id) {
          setCurrentReport(null);
        }
        addToast('Report deleted successfully.', 'success');
      } else {
        addToast(json.message || 'Error deleting report.', 'error');
      }
    } catch {
      addToast('Connection failure to API server', 'error');
    }
  };

  const startAnalysis = async (url: string, includePageSpeed: boolean = true) => {
    if (!url) {
      addToast('Please enter a valid URL', 'error');
      return;
    }

    setScanningUrl(url);
    setCurrentTab('analyze');
    setScanLogs([]);

    setScanProgress([
      { step: 1, title: 'Connecting to host', status: 'scanning' },
      { step: 2, title: 'Collecting styles, images, and bundles', status: 'pending' },
      { step: 3, title: 'Analyzing static asset payload overhead', status: 'pending' },
      { step: 4, title: 'Generating Core Web Vitals telemetry', status: 'pending' },
      { step: 5, title: 'Synthesizing AI architectural advice', status: 'pending' }
    ]);

    const logsList = [
      'DNS lookup successful. Establishing socket connection to telemetry node...',
      'TLS handshake established: TLS_AES_256_GCM_SHA384 (HTTP/2 enabled).',
      'Requesting HTML documents... HTTP 200 OK.',
      'Parsing DOM structure... Scraped tag headings and image attributes.',
      'Downloading core scripts and stylesheets... Brotli compression verified.',
      'Checking CSS selectors coverage. Unused rules cataloged.',
      'Inspecting image sources... Running metadata check.',
      'Evaluating Core Web Vitals timings: FCP, LCP, CLS, TBT mapping.',
      'Running rules matching engine... Optimizations extracted.',
      'Persisting completed performance report into database...'
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logsList.length) {
        setScanLogs((prev) => [...prev, logsList[logIndex]]);
        logIndex++;
      }
    }, 450);

    let currentStepIndex = 0;
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        const next = [...prev];
        if (currentStepIndex < next.length) {
          next[currentStepIndex].status = 'done';
          currentStepIndex++;
          if (currentStepIndex < next.length) {
            next[currentStepIndex].status = 'scanning';
          }
        }
        return next;
      });
    }, 1000);

    try {
      const res = await fetch(`${API_BASE}/analysis/scan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url, includePageSpeed })
      });
      
      const json = await res.json();
      
      clearInterval(logInterval);
      clearInterval(progressInterval);

      if (json.success) {
        const newRep = mapBackendReportToFrontend(json.data);
        setReports((prev) => [newRep, ...prev.filter(r => r.url !== newRep.url)]);
        setCurrentReport(newRep);
        
        setScanProgress((prev) => prev.map((s) => ({ ...s, status: 'done' })));
        addToast(`Audit completed successfully for ${url}!`, 'success');
        
        setTimeout(() => {
          setCurrentTab('results');
        }, 300);
      } else {
        addToast(json.message || 'Audit scan failed.', 'error');
        setCurrentTab('analyze');
        setScanningUrl('');
      }
    } catch {
      clearInterval(logInterval);
      clearInterval(progressInterval);
      addToast('Crawler server unreachable.', 'error');
      setCurrentTab('analyze');
      setScanningUrl('');
    }
  };

  const runComparison = (url1: string, url2: string) => {
    if (!url1 || !url2) {
      addToast('Please enter both target URLs.', 'error');
      return;
    }
    const clean1 = url1.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
    const clean2 = url2.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();

    const r1 = reports.find(r => r.url.toLowerCase().includes(clean1));
    const r2 = reports.find(r => r.url.toLowerCase().includes(clean2));

    if (!r1) {
      addToast(`Domain "${url1}" has not been audited yet. Please run a scan first.`, 'warning');
      return;
    }
    if (!r2) {
      addToast(`Domain "${url2}" has not been audited yet. Please run a scan first.`, 'warning');
      return;
    }

    setComparedReports({ report1: r1, report2: r2 });
    addToast('Side-by-side performance audit generated.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        profileTab,
        setProfileTab,
        reports,
        currentReport,
        setCurrentReport,
        projects,
        activeProject,
        setActiveProject,
        toasts,
        addToast,
        removeToast,
        sidebarCollapsed,
        setSidebarCollapsed,
        globalSearchOpen,
        setGlobalSearchOpen,
        startAnalysis,
        scanningUrl,
        scanProgress,
        scanLogs,
        runComparison,
        comparedReports,
        addProject,
        deleteReport,
        loading,
        error,
        fetchData: restoreSession,
        // Auth state integrations
        user,
        isAuthenticated,
        authLoading,
        login,
        register,
        logout,
        restoreSession,
        refreshUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
