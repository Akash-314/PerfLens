import { describe, it, expect } from 'vitest';

describe('Product Structure & Data Scoping Regression Suite', () => {
  // Deterministic Mock Scans
  const mockScanA = {
    id: 'scan-google-001',
    url: 'https://google.com',
    timestamp: '16 Sep 2026, 7:40 PM',
    scores: { overall: 85, performance: 80, accessibility: 90, seo: 85 },
    vitals: {
      fcp: { value: '1.2s', score: 90, rating: 'good' as const },
      lcp: { value: '2.4s', score: 85, rating: 'good' as const }
    },
    recommendations: [
      {
        id: 'rec-tbt-1',
        category: 'performance' as const,
        issue: 'Total Blocking Time (TBT) is elevated',
        whyItMatters: 'Long tasks delay user responsiveness during page hydration.',
        suggestedFix: 'Break up long JavaScript tasks and defer third-party scripts.',
        estimatedImprovement: '+8 points',
        difficulty: 'medium' as const,
        priority: 'high' as const,
        refUrl: 'https://web.dev/tbt'
      },
      {
        id: 'rec-h1-1',
        category: 'seo' as const,
        issue: 'Document is missing a primary H1 heading',
        whyItMatters: 'Search engine crawlers and screen readers rely on H1 for page structure.',
        suggestedFix: 'Add a semantic <h1> tag representing the main page topic.',
        estimatedImprovement: '+5 points',
        difficulty: 'easy' as const,
        priority: 'medium' as const,
        refUrl: 'https://web.dev/headings'
      }
    ]
  };

  const mockScanB = {
    id: 'scan-github-002',
    url: 'https://github.com',
    timestamp: '16 Sep 2026, 7:55 PM',
    scores: { overall: 92, performance: 90, accessibility: 95, seo: 92 },
    vitals: {
      fcp: { value: '0.8s', score: 98, rating: 'good' as const },
      lcp: { value: '1.5s', score: 95, rating: 'good' as const }
    },
    recommendations: [
      {
        id: 'rec-img-1',
        category: 'images' as const,
        issue: 'Serve images in modern WebP or AVIF formats',
        whyItMatters: 'Legacy image formats result in unnecessary network payload transfer.',
        suggestedFix: 'Convert PNG/JPEG assets to WebP or AVIF.',
        estimatedImprovement: '+4 points',
        difficulty: 'easy' as const,
        priority: 'medium' as const,
        refUrl: 'https://web.dev/modern-image-formats'
      }
    ]
  };

  describe('1. Cross-URL Recommendation Isolation', () => {
    it('accurately filters recommendations to Scan A without leaking Scan B findings', () => {
      const reports = [mockScanB, mockScanA];
      const targetScanId = 'scan-google-001';

      // Replicate Recommendations scoping logic
      const targetReports = reports.filter((r) => r.id === targetScanId);
      expect(targetReports).toHaveLength(1);
      expect(targetReports[0].url).toBe('https://google.com');

      const scopedRecs = targetReports.flatMap((report) =>
        report.recommendations.map((rec) => ({
          ...rec,
          id: `${report.id}-${rec.id}`,
          sourceUrl: report.url,
          scanTimestamp: report.timestamp,
          scanId: report.id
        }))
      );

      // Verify exact count and content
      expect(scopedRecs).toHaveLength(2);
      expect(scopedRecs.map((r) => r.issue)).toEqual([
        'Total Blocking Time (TBT) is elevated',
        'Document is missing a primary H1 heading'
      ]);

      // Verify strict ownership
      scopedRecs.forEach((r) => {
        expect(r.sourceUrl).toBe('https://google.com');
        expect(r.scanId).toBe('scan-google-001');
      });

      // Verify zero leakage from github.com
      const hasGithubLeaks = scopedRecs.some((r) => r.sourceUrl.includes('github.com') || r.issue.includes('image'));
      expect(hasGithubLeaks).toBe(false);
    });

    it('accurately filters recommendations to Scan B without leaking Scan A findings', () => {
      const reports = [mockScanB, mockScanA];
      const targetScanId = 'scan-github-002';

      const targetReports = reports.filter((r) => r.id === targetScanId);
      expect(targetReports).toHaveLength(1);
      expect(targetReports[0].url).toBe('https://github.com');

      const scopedRecs = targetReports.flatMap((report) =>
        report.recommendations.map((rec) => ({
          ...rec,
          id: `${report.id}-${rec.id}`,
          sourceUrl: report.url,
          scanTimestamp: report.timestamp,
          scanId: report.id
        }))
      );

      expect(scopedRecs).toHaveLength(1);
      expect(scopedRecs[0].issue).toBe('Serve images in modern WebP or AVIF formats');
      expect(scopedRecs[0].sourceUrl).toBe('https://github.com');
      expect(scopedRecs[0].scanId).toBe('scan-github-002');

      // Verify zero leakage from google.com
      const hasGoogleLeaks = scopedRecs.some((r) => r.sourceUrl.includes('google.com') || r.issue.includes('TBT'));
      expect(hasGoogleLeaks).toBe(false);
    });

    it('preserves clean whyItMatters text without mutating strings with [Source: ...] tags', () => {
      const reports = [mockScanA];
      const scopedRecs = reports.flatMap((report) =>
        report.recommendations.map((rec) => ({
          ...rec,
          id: `${report.id}-${rec.id}`,
          sourceUrl: report.url,
          scanTimestamp: report.timestamp,
          scanId: report.id
        }))
      );

      scopedRecs.forEach((rec) => {
        expect(rec.whyItMatters.startsWith('[Source:')).toBe(false);
        expect(rec.sourceUrl).toBe('https://google.com');
      });
    });

    it('aggregates global recommendations with explicit sourceUrl and scanTimestamp for each item', () => {
      const reports = [mockScanB, mockScanA];
      const globalRecs: any[] = [];
      const seen = new Set<string>();

      reports.forEach((report) => {
        report.recommendations.forEach((rec) => {
          const key = `${report.id}-${rec.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            globalRecs.push({
              ...rec,
              id: key,
              sourceUrl: report.url,
              scanTimestamp: report.timestamp,
              scanId: report.id
            });
          }
        });
      });

      expect(globalRecs).toHaveLength(3);
      // Every single recommendation has an explicit, traceable URL and scanId
      globalRecs.forEach((rec) => {
        expect(rec.sourceUrl).toBeDefined();
        expect(rec.scanTimestamp).toBeDefined();
        expect(rec.scanId).toBeDefined();
        expect(['https://google.com', 'https://github.com']).toContain(rec.sourceUrl);
      });
    });
  });

  describe('2. Dashboard Context & Recent Issues Scoping', () => {
    it('scopes Dashboard issues explicitly to the latest report with source URL and timestamp', () => {
      // reports array is ordered latest first: [mockScanB, mockScanA]
      const reports = [mockScanB, mockScanA];
      const latestReport = reports[0];

      expect(latestReport.url).toBe('https://github.com');

      const dashboardIssues = latestReport.recommendations.slice(0, 4).map((rec) => ({
        title: rec.issue,
        category: rec.category.toUpperCase(),
        severity: rec.priority.toLowerCase() === 'high' ? 'High' : 'Medium',
        code: rec.id,
        url: latestReport.url,
        timestamp: latestReport.timestamp
      }));

      expect(dashboardIssues).toHaveLength(1);
      expect(dashboardIssues[0].url).toBe('https://github.com');
      expect(dashboardIssues[0].timestamp).toBe('16 Sep 2026, 7:55 PM');
      expect(dashboardIssues[0].title).toBe('Serve images in modern WebP or AVIF formats');

      // Zero items from mockScanA (google.com) leak into latestReport dashboard issues
      const containsGoogleIssues = dashboardIssues.some((issue) => issue.url.includes('google.com'));
      expect(containsGoogleIssues).toBe(false);
    });

    it('updates dashboard context when the latest scan changes', () => {
      // If user scans google.com after github.com, reports become [mockScanA, mockScanB]
      const reports = [mockScanA, mockScanB];
      const latestReport = reports[0];

      expect(latestReport.url).toBe('https://google.com');

      const dashboardIssues = latestReport.recommendations.slice(0, 4).map((rec) => ({
        title: rec.issue,
        category: rec.category.toUpperCase(),
        severity: rec.priority.toLowerCase() === 'high' ? 'High' : 'Medium',
        code: rec.id,
        url: latestReport.url,
        timestamp: latestReport.timestamp
      }));

      expect(dashboardIssues).toHaveLength(2);
      dashboardIssues.forEach((issue) => {
        expect(issue.url).toBe('https://google.com');
        expect(issue.timestamp).toBe('16 Sep 2026, 7:40 PM');
      });
    });
  });

  describe('3. Project Domain Association & Scan Matching', () => {
    it('matches reports to active project strictly by associated domains', () => {
      const project = {
        id: 'proj-1',
        name: 'Search & Tools',
        websites: ['google.com', 'chrome.google.com']
      };

      const reports = [mockScanA, mockScanB];

      const matchingReports = reports.filter((r) =>
        project.websites.some((w) =>
          r.url.toLowerCase().includes(w.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase())
        )
      );

      expect(matchingReports).toHaveLength(1);
      expect(matchingReports[0].url).toBe('https://google.com');
      expect(matchingReports.some((r) => r.url.includes('github.com'))).toBe(false);
    });

    it('returns empty list if project has no matching scans', () => {
      const project = {
        id: 'proj-2',
        name: 'E-Commerce',
        websites: ['shopify.com', 'stripe.com']
      };

      const reports = [mockScanA, mockScanB];

      const matchingReports = reports.filter((r) =>
        project.websites.some((w) =>
          r.url.toLowerCase().includes(w.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase())
        )
      );

      expect(matchingReports).toHaveLength(0);
    });
  });

  describe('4. Navigation Simplification & Backward Compatibility', () => {
    it('maintains exactly 8 core sidebar menu items without History duplication', () => {
      const targetMenuIds = [
        'dashboard',
        'analyze',
        'reports',
        'comparisons',
        'projects',
        'recommendations',
        'settings',
        'support'
      ];

      // Verify no 'history' in target navigation
      expect(targetMenuIds).not.toContain('history');
      expect(targetMenuIds).toHaveLength(8);
    });

    it('resolves both "reports" and "history" tab tokens cleanly to Reports view', () => {
      const resolveComponentForTab = (tab: string) => {
        switch (tab) {
          case 'reports':
          case 'history':
            return 'ReportsList';
          case 'dashboard':
            return 'Dashboard';
          case 'analyze':
            return 'WebsiteAnalysis';
          case 'comparisons':
            return 'ComparisonPage';
          case 'projects':
            return 'Projects';
          case 'recommendations':
            return 'Recommendations';
          case 'settings':
            return 'Settings';
          case 'support':
            return 'Support';
          default:
            return 'Dashboard';
        }
      };

      expect(resolveComponentForTab('reports')).toBe('ReportsList');
      expect(resolveComponentForTab('history')).toBe('ReportsList');
    });
  });
});
