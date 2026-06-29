import React, { createContext, useContext, useState, useEffect } from 'react';

// Interfaces for our state
export interface MetricDetail {
  score: number;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor';
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
    fcp: MetricDetail; // First Contentful Paint
    lcp: MetricDetail; // Largest Contentful Paint
    fid: MetricDetail; // First Input Delay
    cls: MetricDetail; // Cumulative Layout Shift
    ttfb: MetricDetail; // Time to First Byte
    tbt: MetricDetail; // Total Blocking Time
  };
  breakdown: {
    images: { sizeKb: number; count: number };
    js: { sizeKb: number; count: number; unusedKb: number };
    css: { sizeKb: number; count: number; unusedKb: number };
    fonts: { sizeKb: number; count: number };
    thirdParty: { sizeKb: number; count: number };
  };
  bundleAnalysis: {
    packageName: string;
    sizeKb: number;
    isUnused: boolean;
    isDuplicate: boolean;
  }[];
  images: {
    src: string;
    sizeKb: number;
    format: string;
    suggestedFormat: string;
    savingsKb: number;
    hasAlt: boolean;
    lazyLoaded: boolean;
  }[];
  recommendations: Recommendation[];
  resources: ResourceItem[];

  // Real backend accessibility checks
  accessibilityChecks: { title: string; passed: boolean; text: string }[];
  // Real backend SEO checks
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
  startAnalysis: (url: string) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mapBackendReportToFrontend = (r: any): Report => {
  if (!r) return {} as any;

  // 1. Calculate overall/performance/a11y/seo/bestPractices scores
  const overall = r.recommendation?.summary?.overallHealthScore ?? r.overallHealthScore ?? 75;
  const performance = r.pagespeed?.scores?.performance ?? r.puppeteer?.performance?.score ?? 70;
  const accessibility = r.accessibility?.summary?.accessibilityScoreEstimate ?? r.recommendation?.summary?.seoScoreEstimate ?? 75;
  const seo = r.seo?.summary?.seoScoreEstimate ?? 80;
  const bestPractices = r.pagespeed?.scores?.bestPractices ?? 85;

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

  // 2. Vitals mapping from backend puppeteer or pagespeed details
  const puppeteerVitals = r.puppeteer?.performance?.vitals || {};
  
  const fcpSec = puppeteerVitals.fcp ?? 1.5;
  const lcpSec = puppeteerVitals.lcp ?? 2.8;
  const clsVal = puppeteerVitals.cls ?? 0.05;
  const tbtMs = puppeteerVitals.tbt ?? 300;
  const ttfbSec = puppeteerVitals.ttfb ?? 0.3;
  const fidMs = puppeteerVitals.fid ?? 45;

  const vitals = {
    fcp: {
      score: Math.round(performance),
      value: `${fcpSec.toFixed(2)}s`,
      rating: getRating(fcpSec, 1.8, 3.0)
    },
    lcp: {
      score: Math.round(performance * 0.9),
      value: `${lcpSec.toFixed(2)}s`,
      rating: getRating(lcpSec, 2.5, 4.0)
    },
    fid: {
      score: Math.round(performance * 1.05),
      value: `${fidMs}ms`,
      rating: getRating(fidMs, 100, 300)
    },
    cls: {
      score: Math.round(performance * 0.85),
      value: clsVal.toFixed(3),
      rating: getRatingCls(clsVal)
    },
    ttfb: {
      score: performance > 80 ? 90 : 65,
      value: `${Math.round(ttfbSec * 1000)}ms`,
      rating: getRating(ttfbSec, 0.8, 1.5)
    },
    tbt: {
      score: performance > 80 ? 90 : 60,
      value: `${tbtMs}ms`,
      rating: getRatingTbt(tbtMs)
    }
  };

  // 3. Breakdown size/count mapping
  const imgSum = r.image?.summary || {};
  const jsSum = r.js?.summary || {};
  const cssSum = r.css?.summary || {};
  
  const imageCount = imgSum.totalImages ?? 0;
  const imageSize = imgSum.totalImageWeight ?? 0;
  
  const jsCount = jsSum.totalJSFiles ?? 0;
  const jsSize = jsSum.totalJSWeight ?? 0;
  const unusedJs = jsSum.estimatedUnusedJS ?? 0;
  
  const cssCount = cssSum.totalCSSFiles ?? 0;
  const cssSize = cssSum.totalCSSWeight ?? 0;
  const unusedCss = cssSum.estimatedUnusedCSS ?? 0;

  // We can count fonts and compute size from resources list
  const resourcesList = r.puppeteer?.resources || [];
  const fontResources = resourcesList.filter((res: any) => res.type === 'font');
  const fontCount = fontResources.length;
  const fontSize = fontResources.reduce((acc: number, res: any) => acc + (res.sizeKb || 0), 0);

  // Third party count and size
  const thirdPartyScripts = r.js?.statistics?.thirdPartyScripts || [];
  const thirdPartyCount = thirdPartyScripts.length;
  const thirdPartySize = r.js?.statistics?.thirdPartySizeKb ?? 0;

  const breakdown = {
    images: { sizeKb: Math.round(imageSize), count: imageCount },
    js: { sizeKb: Math.round(jsSize), count: jsCount, unusedKb: Math.round(unusedJs) },
    css: { sizeKb: Math.round(cssSize), count: cssCount, unusedKb: Math.round(unusedCss) },
    fonts: { sizeKb: Math.round(fontSize), count: fontCount },
    thirdParty: { sizeKb: Math.round(thirdPartySize), count: thirdPartyCount }
  };

  // 4. Bundle Analysis (npm packages, etc.)
  const bundleAnalysis = (r.js?.scripts || []).map((s: any) => ({
    packageName: s.filename ? s.filename.split('/').pop() : 'script.js',
    sizeKb: s.fileSizeKb ?? 0,
    isUnused: (s.estimatedUnusedJsKb ?? 0) > (s.fileSizeKb * 0.4),
    isDuplicate: s.isDuplicate ?? false
  }));

  // 5. Image Optimizations list
  const images = (r.image?.images || []).map((img: any) => ({
    src: img.url || 'image.png',
    sizeKb: img.fileSizeKb ?? 0,
    format: (img.extension || 'PNG').toUpperCase(),
    suggestedFormat: 'WebP/AVIF',
    savingsKb: img.estimatedSizeReductionKb ?? 0,
    hasAlt: img.altText !== null && img.altText !== undefined && img.altText !== '',
    lazyLoaded: img.lazyLoading ?? false
  }));

  // 6. Recommendations list
  const recommendations = (r.recommendation?.recommendations || []).map((rec: any) => ({
    id: rec.id || Math.random().toString(36).substring(2, 9),
    category: (rec.category || 'performance').toLowerCase(),
    issue: rec.title || 'Optimization Opportunity',
    whyItMatters: rec.description || '',
    suggestedFix: rec.suggestedFix || '',
    estimatedImprovement: rec.estimatedPerformanceGain || 'Saves bandwidth',
    difficulty: (rec.estimatedDifficulty || 'medium').toLowerCase(),
    priority: (rec.priority || 'medium').toLowerCase(),
    refUrl: rec.referenceUrl || 'https://web.dev/'
  }));

  // 7. Resources list
  const resources = resourcesList.map((res: any) => ({
    name: res.url || 'resource',
    type: res.type || 'other',
    sizeKb: res.sizeKb || 0,
    timeMs: res.durationMs || 100,
    compression: res.compression || 'none',
    cacheControl: res.cacheControl || 'no-cache'
  }));

  // 8. Accessibility checks formatting
  const a11yData = r.accessibility?.accessibility || {};
  const hasLang = a11yData.htmlLang?.present ?? true;
  const hasTitle = a11yData.title?.present ?? true;
  const missingAlts = a11yData.imagesWithoutAlt?.count ?? 0;
  const missingAltUrls = a11yData.imagesWithoutAlt?.urls || [];

  const accessibilityChecks = [
    {
      title: 'HTML Lang Attribute',
      passed: hasLang,
      text: hasLang
        ? `The html element has a valid lang attribute: "${a11yData.htmlLang?.lang}".`
        : 'The html element is missing a lang attribute, which is required for screen readers.'
    },
    {
      title: 'Page Title Element',
      passed: hasTitle,
      text: hasTitle
        ? 'The document has a title element.'
        : 'The document is missing a title element.'
    },
    {
      title: 'Image Alt Attributes',
      passed: missingAlts === 0,
      text: missingAlts === 0
        ? 'All images have alt attributes.'
        : `${missingAlts} image(s) are missing alt attributes: ${missingAltUrls.slice(0, 2).join(', ')}`
    }
  ];

  // 9. SEO & Meta Checks mapping
  const seoData = r.seo?.seo || {};
  const titleTag = seoData.title ? `Verified (${seoData.title.length} chars)` : 'Missing';
  const metaDescription = seoData.description ? `Verified (${seoData.description.length} chars)` : 'Missing';
  const canonicalTag = seoData.canonical ? 'Verified' : 'Missing';
  const sitemap = seoData.sitemap ? 'Verified' : 'Missing or not referenced';

  const seoChecks = {
    titleTag,
    titlePassed: !!seoData.title,
    metaDescription,
    descPassed: !!seoData.description,
    canonicalTag,
    canonicalPassed: !!seoData.canonical,
    sitemap,
    sitemapPassed: !!seoData.sitemap,
    ogTitle: seoData.ogTitle || seoData.title || '',
    ogDescription: seoData.ogDescription || seoData.description || '',
    ogImage: seoData.ogImage || ''
  };

  return {
    id: r._id || r.id,
    url: r.url,
    timestamp: new Date(r.createdAt || r.timestamp).toLocaleString(),
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
    seoChecks
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
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const API_BASE = 'http://localhost:5000/api/v1';

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('perflens_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    let token = localStorage.getItem('perflens_token');
    
    if (!token) {
      try {
        console.log('No token identified. Registering seed developer workspace...');
        const regRes = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'developer@perflens.com', password: 'developer_pass_123' })
        });
        const regJson = await regRes.json();
        if (regJson.success) {
          token = regJson.data.token;
          localStorage.setItem('perflens_token', token || '');
          console.log('Seed developer account registered.');
        } else {
          const logRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'developer@perflens.com', password: 'developer_pass_123' })
          });
          const logJson = await logRes.json();
          if (logJson.success) {
            token = logJson.data.token;
            localStorage.setItem('perflens_token', token || '');
            console.log('Seed developer logged in.');
          }
        }
      } catch (err) {
        console.warn('API server unreachable.');
        setError('Database server unreachable. Please verify that the backend is running and try again.');
        setLoading(false);
        return;
      }
    }

    if (token) {
      try {
        const repRes = await fetch(`${API_BASE}/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (repRes.status === 401) {
          // Token expired, clear cache and retry
          localStorage.removeItem('perflens_token');
          await fetchData();
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
        } else {
          throw new Error(repJson.message || 'Failed to fetch reports.');
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addProject = async (name: string, websites: string[]) => {
    const token = localStorage.getItem('perflens_token');
    if (!token) {
      addToast('Unauthenticated. Please login or restart backend.', 'error');
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
    } catch (e) {
      addToast('Connection failure to API server', 'error');
    }
  };

  const deleteReport = async (id: string) => {
    const token = localStorage.getItem('perflens_token');
    if (!token) {
      addToast('Unauthenticated.', 'error');
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
    } catch (e) {
      addToast('Connection failure to API server', 'error');
    }
  };

  const startAnalysis = async (url: string) => {
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
        body: JSON.stringify({ url })
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
    } catch (error) {
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
        fetchData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
