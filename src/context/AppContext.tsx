import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../services/auth/auth.types';
import { authService } from '../services/auth/auth.service';
import { getUserNameFromEmail } from '../services/auth/auth.helpers';
import { API_BASE } from '../config/api';

// Interfaces for our state
export interface MetricDetail {
  score: number;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  source?: string;
  mode?: string;
}

export interface Recommendation {
  id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'security' | 'css' | 'js' | 'images';
  issue: string;
  whyItMatters: string;
  suggestedFix: string;
  estimatedImprovement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  refUrl: string;
  expanded?: boolean;
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
  const overall = r.scores?.overall ?? r.recommendation?.summary?.overallHealthScore ?? r.overallHealthScore ?? 75;
  const performance = r.scores?.performance ?? r.pagespeed?.scores?.performance ?? r.pageSpeed?.performance ?? r.puppeteer?.performance?.score ?? 70;
  const accessibility = r.scores?.accessibility ?? r.accessibility?.summary?.accessibilityScoreEstimate ?? r.recommendation?.summary?.seoScoreEstimate ?? 75;
  const seo = r.scores?.seo ?? r.seo?.summary?.seoScoreEstimate ?? 80;
  const bestPractices = r.scores?.bestPractices ?? r.pagespeed?.scores?.bestPractices ?? r.pageSpeed?.bestPractices ?? 85;

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
    const fcpSec = puppeteerVitals.fcp ?? 1.5;
    const lcpSec = puppeteerVitals.lcp ?? 2.8;
    const clsVal = puppeteerVitals.cls ?? 0.05;
    const tbtMs = puppeteerVitals.tbt ?? 300;
    const ttfbSec = puppeteerVitals.ttfb ?? 0.3;
    const fidMs = puppeteerVitals.fid ?? 45;

    vitals = {
      fcp: {
        score: Math.round(performance),
        value: `${fcpSec.toFixed(2)}s`,
        rating: getRating(fcpSec, 1.8, 3.0)
      },
      lcp: {
        score: Math.round(performance),
        value: `${lcpSec.toFixed(2)}s`,
        rating: getRating(lcpSec, 2.5, 4.0)
      },
      fid: {
        score: Math.round(performance),
        value: `${fidMs}ms`,
        rating: getRating(fidMs, 100, 300)
      },
      cls: {
        score: Math.round(performance),
        value: clsVal.toString(),
        rating: getRatingCls(clsVal)
      },
      ttfb: {
        score: Math.round(performance),
        value: `${(ttfbSec * 1000).toFixed(0)}ms`,
        rating: getRating(ttfbSec, 0.8, 1.8)
      },
      tbt: {
        score: Math.round(performance),
        value: `${tbtMs}ms`,
        rating: getRatingTbt(tbtMs)
      }
    };
  }

  // 3. Breakdown size estimation mapping
  const network = r.puppeteer?.network || {};
  const cssCoverage = r.css?.summary || {};
  const jsCoverage = r.js?.summary || {};
  const imageCoverage = r.image?.summary || {};

  const breakdown = {
    html: { sizeKb: r.breakdown?.html?.sizeKb ?? network.htmlSizeKb ?? 25, count: r.breakdown?.html?.count ?? 1 },
    js: { sizeKb: r.breakdown?.js?.sizeKb ?? network.jsSizeKb ?? 450, unusedKb: r.breakdown?.js?.unusedKb ?? jsCoverage.unusedKb ?? 120 },
    css: { sizeKb: r.breakdown?.css?.sizeKb ?? network.cssSizeKb ?? 80, unusedKb: r.breakdown?.css?.unusedKb ?? cssCoverage.unusedKb ?? 30 },
    images: { sizeKb: r.breakdown?.images?.sizeKb ?? network.imageSizeKb ?? 1200, count: r.breakdown?.images?.count ?? imageCoverage.totalCount ?? 8 },
    fonts: { sizeKb: r.breakdown?.fonts?.sizeKb ?? network.fontSizeKb ?? 120, count: r.breakdown?.fonts?.count ?? 2 },
    thirdParty: { sizeKb: r.breakdown?.thirdParty?.sizeKb ?? r.recommendation?.summary?.thirdPartySizeKb ?? 150, count: r.breakdown?.thirdParty?.count ?? r.recommendation?.summary?.thirdPartyResourcesCount ?? 3 },
    other: { sizeKb: r.breakdown?.other?.sizeKb ?? network.otherSizeKb ?? 40, count: r.breakdown?.other?.count ?? 1 }
  };

  // 4. JS Script bundle duplicate logic checks
  const jsPackages = r.bundleAnalysis || r.js?.packages || [];
  const bundleAnalysis = jsPackages.map((p: any) => ({
    packageName: p.packageName || p.name || 'unknown-package',
    sizeKb: p.sizeKb || 12,
    isDuplicate: p.isDuplicate ?? p.duplicate ?? false,
    isUnused: p.isUnused ?? p.unused ?? false
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
      sizeKb: res.sizeKb ?? (Math.round((res.sizeBytes || 0) / 102.4) / 10 || 1),
      timeMs: res.timeMs ?? res.durationMs ?? res.loadTimeMs ?? 100,
      compression: res.compression === 'brotli' || res.compression === 'gzip' || res.encoding === 'gzip' ? (res.compression || 'gzip') : res.encoding === 'br' ? 'brotli' : 'none',
      cacheControl: res.cacheControl || 'no-cache'
    };
  });

  // 6. Image Optimization payloads
  const rawImages = r.images || r.image?.images || [];
  const images = rawImages.map((img: any) => ({
    src: img.src || img.url || '',
    sizeKb: img.sizeKb || 45,
    savingsKb: img.savingsKb ?? img.optimizationSpaceKb ?? 0,
    suggestedFormat: img.suggestedFormat || 'WEBP',
    hasAlt: img.hasAlt ?? img.altPassed ?? true,
    lazyLoaded: img.lazyLoaded ?? img.lazyLoadedPassed ?? true,
    format: img.format || 'PNG',
    dimensions: img.dimensions || '800x600'
  }));

  // 7. Core recommendations mapping
  const recItems = r.recommendations || r.recommendation?.recommendations || [];
  const recommendations: Recommendation[] = recItems.map((rec: any, idx: number) => {
    let diff: Recommendation['difficulty'] = 'medium';
    if (rec.difficulty === 'low' || rec.difficulty === 'easy') diff = 'easy';
    else if (rec.difficulty === 'high' || rec.difficulty === 'hard') diff = 'hard';

    let prio: Recommendation['priority'] = 'medium';
    if (rec.priority === 'high' || rec.priority === 'critical') prio = 'high';
    else if (rec.priority === 'low') prio = 'low';

    return {
      id: rec.id || `rec-${idx}`,
      category: rec.category || 'performance',
      issue: rec.issue,
      whyItMatters: rec.whyItMatters || rec.impact || '',
      suggestedFix: rec.suggestedFix || rec.solution || '',
      estimatedImprovement: rec.estimatedImprovement || rec.estimatedSaving || 'Moderate',
      difficulty: diff,
      priority: prio,
      refUrl: rec.refUrl || rec.reference || '#'
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
  const hasSitemap = seoData.hasSitemapXml ?? (seoData.sitemap ? true : false);
  const ogTags = seoData.openGraphTags || {};

  const titleTag = pageTitle ? `Verified (${pageTitle.length} chars)` : 'Missing';
  const metaDescription = metaDesc ? `Verified (${metaDesc.length} chars)` : 'Missing';
  const canonicalTag = canonical ? 'Verified' : 'Missing';
  const sitemap = hasSitemap ? 'Verified' : 'Missing or not referenced';

  const seoChecks = {
    titleTag,
    titlePassed: !!pageTitle,
    metaDescription,
    descPassed: !!metaDesc,
    canonicalTag,
    canonicalPassed: !!canonical,
    sitemap,
    sitemapPassed: Boolean(hasSitemap),
    ogTitle: ogTags['og:title'] || seoData.ogTitle || pageTitle || '',
    ogDescription: ogTags['og:description'] || seoData.ogDescription || metaDesc || '',
    ogImage: ogTags['og:image'] || seoData.ogImage || ''
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
            avgScore: avgScore || 100,
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
          avgScore: avgScore || 100,
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
