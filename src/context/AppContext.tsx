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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generate Mock Reports
const generateMockReport = (url: string, seedScore?: number): Report => {
  const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  const baseScore = seedScore || Math.floor(Math.random() * 20) + 75; // 75 - 95
  const perfScore = Math.min(100, Math.max(20, baseScore + Math.floor(Math.random() * 10) - 5));
  const accScore = Math.min(100, Math.max(30, baseScore + Math.floor(Math.random() * 8) - 2));
  const seoScore = Math.min(100, Math.max(40, baseScore + Math.floor(Math.random() * 5) + 3));
  const bpScore = Math.min(100, Math.max(30, baseScore + Math.floor(Math.random() * 6) - 3));
  const overall = Math.round((perfScore + accScore + seoScore + bpScore) / 4);

  // Core Web Vitals generator based on score
  const getRating = (score: number, type: 'fcp' | 'lcp' | 'fid' | 'cls') => {
    if (type === 'cls') {
      return score > 85 ? 'good' : score > 60 ? 'needs-improvement' : 'poor';
    }
    return score > 85 ? 'good' : score > 60 ? 'needs-improvement' : 'poor';
  };

  const lcpVal = perfScore > 85 ? (1.2 + Math.random() * 0.8) : perfScore > 65 ? (2.6 + Math.random() * 1.2) : (4.2 + Math.random() * 2);
  const fcpVal = perfScore > 85 ? (0.6 + Math.random() * 0.4) : perfScore > 65 ? (1.5 + Math.random() * 0.6) : (2.8 + Math.random() * 1.5);
  const clsVal = perfScore > 85 ? (0.01 + Math.random() * 0.04) : perfScore > 65 ? (0.12 + Math.random() * 0.08) : (0.28 + Math.random() * 0.2);
  const fidVal = perfScore > 85 ? Math.floor(20 + Math.random() * 40) : perfScore > 65 ? Math.floor(80 + Math.random() * 60) : Math.floor(180 + Math.random() * 150);
  const ttfbVal = perfScore > 85 ? Math.floor(80 + Math.random() * 120) : Math.floor(250 + Math.random() * 300);
  const tbtVal = perfScore > 85 ? Math.floor(50 + Math.random() * 100) : Math.floor(250 + Math.random() * 400);

  const imagesSize = Math.round(300 + Math.random() * 1200);
  const jsSize = Math.round(400 + Math.random() * 800);
  const cssSize = Math.round(80 + Math.random() * 180);
  const fontSize = Math.round(60 + Math.random() * 140);
  const thirdPartySize = Math.round(100 + Math.random() * 500);

  return {
    id: Math.random().toString(36).substring(2, 9),
    url: cleanUrl,
    timestamp: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toLocaleString(),
    scores: {
      overall,
      performance: perfScore,
      accessibility: accScore,
      seo: seoScore,
      bestPractices: bpScore
    },
    vitals: {
      fcp: { score: perfScore, value: `${fcpVal.toFixed(2)}s`, rating: getRating(perfScore, 'fcp') },
      lcp: { score: Math.round(perfScore * 0.9), value: `${lcpVal.toFixed(2)}s`, rating: getRating(perfScore, 'lcp') },
      fid: { score: Math.round(perfScore * 1.05), value: `${fidVal}ms`, rating: getRating(perfScore, 'fid') },
      cls: { score: Math.round(perfScore * 0.85), value: clsVal.toFixed(3), rating: getRating(perfScore, 'cls') },
      ttfb: { score: perfScore > 80 ? 92 : 65, value: `${ttfbVal}ms`, rating: perfScore > 80 ? 'good' : 'needs-improvement' },
      tbt: { score: perfScore > 80 ? 90 : 58, value: `${tbtVal}ms`, rating: perfScore > 80 ? 'good' : 'needs-improvement' }
    },
    breakdown: {
      images: { sizeKb: imagesSize, count: Math.floor(5 + Math.random() * 15) },
      js: { sizeKb: jsSize, count: Math.floor(8 + Math.random() * 12), unusedKb: Math.round(jsSize * (0.2 + Math.random() * 0.3)) },
      css: { sizeKb: cssSize, count: Math.floor(2 + Math.random() * 6), unusedKb: Math.round(cssSize * (0.4 + Math.random() * 0.4)) },
      fonts: { sizeKb: fontSize, count: Math.floor(2 + Math.random() * 4) },
      thirdParty: { sizeKb: thirdPartySize, count: Math.floor(3 + Math.random() * 8) }
    },
    bundleAnalysis: [
      { packageName: 'lodash', sizeKb: 71.2, isUnused: true, isDuplicate: false },
      { packageName: 'react-dom.production.min.js', sizeKb: 124.5, isUnused: false, isDuplicate: false },
      { packageName: 'moment.js', sizeKb: 280.1, isUnused: false, isDuplicate: true },
      { packageName: 'moment-timezone', sizeKb: 180.4, isUnused: true, isDuplicate: false },
      { packageName: 'framer-motion', sizeKb: 142.3, isUnused: false, isDuplicate: false },
      { packageName: 'uuid', sizeKb: 12.4, isUnused: true, isDuplicate: true },
      { packageName: 'core-js', sizeKb: 154.2, isUnused: true, isDuplicate: false }
    ],
    images: [
      { src: '/images/hero-banner.png', sizeKb: 540.2, format: 'PNG', suggestedFormat: 'WebP/AVIF', savingsKb: 432.1, hasAlt: false, lazyLoaded: false },
      { src: '/images/product-grid-1.jpg', sizeKb: 280.4, format: 'JPEG', suggestedFormat: 'WebP', savingsKb: 210.3, hasAlt: true, lazyLoaded: true },
      { src: '/images/avatar-group.png', sizeKb: 124.5, format: 'PNG', suggestedFormat: 'WebP', savingsKb: 99.6, hasAlt: false, lazyLoaded: true },
      { src: '/images/background-glow.png', sizeKb: 890.1, format: 'PNG', suggestedFormat: 'WebP/AVIF', savingsKb: 801.1, hasAlt: true, lazyLoaded: false },
      { src: '/images/logo-footer.jpg', sizeKb: 34.8, format: 'JPEG', suggestedFormat: 'WebP', savingsKb: 24.2, hasAlt: true, lazyLoaded: true }
    ],
    recommendations: [
      {
        id: 'rec-1',
        category: 'images',
        issue: 'Serve images in next-generation formats',
        whyItMatters: 'WebP and AVIF image formats provide far better compression than PNG or JPEG, resulting in faster downloads and reduced data consumption.',
        suggestedFix: 'Use dynamic image pipelines (like next/image, Cloudinary, or sharp library on compile-time) to transform `/images/hero-banner.png` and `/images/background-glow.png` to WebP/AVIF. Deliver AVIF to browsers supporting it, with WebP fallback.',
        estimatedImprovement: 'Saving 1.2 MB (approx 0.8s on 3G)',
        difficulty: 'easy',
        priority: 'high',
        refUrl: 'https://web.dev/uses-webp-images/'
      },
      {
        id: 'rec-2',
        category: 'js',
        issue: 'Eliminate duplicate and unused npm packages',
        whyItMatters: 'Your javascript bundle contains two separate versions of `moment` and `uuid`, causing unnecessary parser execution cost on the main thread and slowing down FCP.',
        suggestedFix: 'Add package resolution block in package.json or yarn resolutions. Dedup packages using `npm dedupe`. Switch `moment.js` to `dayjs` or `date-fns` which are tree-shakeable and 90% smaller.',
        estimatedImprovement: 'Saving 310 KB (approx 0.3s LCP improvement)',
        difficulty: 'medium',
        priority: 'high',
        refUrl: 'https://web.dev/bundles/'
      },
      {
        id: 'rec-3',
        category: 'css',
        issue: 'Remove unused CSS bytes from stylesheets',
        whyItMatters: 'Large global stylesheets block rendering. Over 60% of the rules compiled in main index bundle are unused on the landing page initial load.',
        suggestedFix: 'Implement Critical CSS generation. Defer non-critical stylesheets. Use plugins like PurgeCSS or PostCSS to tree-shake inactive selectors during production bundle process.',
        estimatedImprovement: 'Saving 82 KB (approx 150ms TTFB/FCP)',
        difficulty: 'hard',
        priority: 'medium',
        refUrl: 'https://web.dev/unused-css-rules/'
      },
      {
        id: 'rec-4',
        category: 'accessibility',
        issue: 'Ensure sufficient color contrast on active text elements',
        whyItMatters: 'Low-contrast text makes reading content difficult or impossible for visually impaired developers.',
        suggestedFix: 'Change secondary text colors from `#71717A` to `#A1A1AA` on the code cards, ensuring a contrast ratio of at least 4.5:1 to meet WCAG AA specifications.',
        estimatedImprovement: 'Improved Accessibility Audit score from 84 to 98',
        difficulty: 'easy',
        priority: 'medium',
        refUrl: 'https://web.dev/color-contrast/'
      },
      {
        id: 'rec-5',
        category: 'security',
        issue: 'Disable unused permissions in iframe elements',
        whyItMatters: 'Iframes without specific permission policy headers open up cross-site scripting vulnerabilities and permissions leaks.',
        suggestedFix: 'Add `allow="accelerometer; gyroscope; magnetometer"` controls explicitly on third-party embed frames, or completely block access with strict CSP policies.',
        estimatedImprovement: 'Pass Best Practices Audits',
        difficulty: 'easy',
        priority: 'low',
        refUrl: 'https://web.dev/csp/'
      }
    ],
    resources: [
      { name: cleanUrl + '/index.html', type: 'html', sizeKb: 12.4, timeMs: 120, compression: 'brotli', cacheControl: 'no-cache, no-store' },
      { name: 'main.bundle.js', type: 'js', sizeKb: jsSize * 0.6, timeMs: 380, compression: 'brotli', cacheControl: 'public, max-age=31536000' },
      { name: 'framework.js', type: 'js', sizeKb: jsSize * 0.4, timeMs: 250, compression: 'gzip', cacheControl: 'public, max-age=31536000' },
      { name: 'index.css', type: 'css', sizeKb: cssSize, timeMs: 180, compression: 'brotli', cacheControl: 'public, max-age=31536000' },
      { name: 'hero-banner.png', type: 'image', sizeKb: 540.2, timeMs: 650, compression: 'none', cacheControl: 'public, max-age=86400' },
      { name: 'Inter-Variable.woff2', type: 'font', sizeKb: fontSize, timeMs: 90, compression: 'none', cacheControl: 'public, max-age=31536000' },
      { name: 'analytics.js (Google)', type: 'other', sizeKb: thirdPartySize, timeMs: 450, compression: 'gzip', cacheControl: 'private, max-age=7200' }
    ]
  };
};

const defaultReports = [
  generateMockReport('vercel.com', 96),
  generateMockReport('github.com', 88),
  generateMockReport('stripe.com', 92),
  generateMockReport('linear.app', 94)
];

const defaultProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Marketing Frontend',
    team: ['Alex (Lead)', 'Sarah (Frontend)', 'Misha (DevOps)'],
    websites: ['vercel.com', 'linear.app'],
    reportsCount: 8,
    avgScore: 95,
    activity: [
      { time: '10:42 AM', event: 'Audit triggered automatically via CI/CD deployment', user: 'GitHub Action' },
      { time: 'Yesterday', event: 'Added linear.app to comparison list', user: 'Alex' },
      { time: '3 days ago', event: 'Created project container', user: 'Sarah' }
    ]
  },
  {
    id: 'proj-2',
    name: 'Customer Dashboard',
    team: ['Alex (Lead)', 'David (Fullstack)'],
    websites: ['stripe.com', 'github.com'],
    reportsCount: 4,
    avgScore: 90,
    activity: [
      { time: '2 hours ago', event: 'Manually inspected package bundle weights', user: 'David' },
      { time: 'Last week', event: 'Added github.com to workspace', user: 'Alex' }
    ]
  }
];

const mapBackendReportToFrontend = (r: any): Report => {
  return {
    id: r._id || r.id,
    url: r.url,
    timestamp: new Date(r.createdAt || r.timestamp).toLocaleString(),
    scores: r.scores,
    vitals: r.vitals,
    breakdown: r.breakdown,
    bundleAnalysis: r.bundleAnalysis,
    images: r.images,
    recommendations: r.recommendations,
    resources: r.resources
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [reports, setReports] = useState<Report[]>(defaultReports);
  const [currentReport, setCurrentReport] = useState<Report | null>(defaultReports[0]);
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [activeProject, setActiveProject] = useState<Project | null>(defaultProjects[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [scanningUrl, setScanningUrl] = useState<string>('');
  const [comparedReports, setComparedReports] = useState<{ report1: Report; report2: Report } | null>(null);

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

  useEffect(() => {
    const initializeData = async () => {
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
            console.log('Seed developer account registered and token saved.');
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
              console.log('Seed developer logged in and token saved.');
            }
          }
        } catch (err) {
          console.warn('API server unreachable. Performance data will run offline in simulated fallback mode.');
          return;
        }
      }

      if (token) {
        try {
          const repRes = await fetch(`${API_BASE}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const repJson = await repRes.json();
          if (repJson.success && repJson.data.length > 0) {
            const mapped = repJson.data.map((r: any) => mapBackendReportToFrontend(r));
            setReports(mapped);
            setCurrentReport(mapped[0]);
          }

          const projRes = await fetch(`${API_BASE}/projects`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const projJson = await projRes.json();
          if (projJson.success && projJson.data.length > 0) {
            const mappedProjs = projJson.data.map((p: any) => ({
              id: p._id,
              name: p.name,
              websites: p.websites,
              team: p.team || ['You (Owner)'],
              reportsCount: p.websites.length,
              avgScore: 92,
              activity: [
                { time: 'Active', event: 'Workspace loaded from database', user: 'PerfLens API' }
              ]
            }));
            setProjects(mappedProjs);
            setActiveProject(mappedProjs[0]);
          }
        } catch (e) {
          console.error('Error fetching backend assets profiles.', e);
        }
      }
    };

    initializeData();
  }, []);

  const addProject = async (name: string, websites: string[]) => {
    const token = localStorage.getItem('perflens_token');
    if (!token) {
      const newProj: Project = {
        id: 'proj-' + (projects.length + 1),
        name,
        team: ['You (Owner)'],
        websites,
        reportsCount: websites.length,
        avgScore: 88,
        activity: [{ time: 'Just now', event: 'Created project container (Simulated)', user: 'You' }]
      };
      setProjects((prev) => [newProj, ...prev]);
      setActiveProject(newProj);
      addToast(`Project "${name}" created successfully (Offline).`, 'success');
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
        const newProj: Project = {
          id: p._id,
          name: p.name,
          websites: p.websites,
          team: p.team || ['You (Owner)'],
          reportsCount: p.websites.length,
          avgScore: 88,
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
      addToast('Crawler server unreachable. Reverting to local simulated scan.', 'warning');
      
      setTimeout(() => {
        const newRep = generateMockReport(url);
        setReports((prev) => [newRep, ...prev]);
        setCurrentReport(newRep);
        setScanProgress((prev) => prev.map((s) => ({ ...s, status: 'done' })));
        setCurrentTab('results');
      }, 1000);
    }
  };

  const runComparison = (url1: string, url2: string) => {
    if (!url1 || !url2) {
      addToast('Please enter both target URLs.', 'error');
      return;
    }
    const r1 = reports.find(r => r.url.includes(url1.replace(/^(https?:\/\/)?(www\.)?/, ''))) || generateMockReport(url1, 91);
    const r2 = reports.find(r => r.url.includes(url2.replace(/^(https?:\/\/)?(www\.)?/, ''))) || generateMockReport(url2, 82);
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
        addProject
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
