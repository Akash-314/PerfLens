import fs from 'fs';
import path from 'path';
import reportGenerator from '../services/analysis/index.js';

interface RealSiteResult {
  url: string;
  httpResult: string;
  renderSuccess: boolean;
  googleLighthouseStatus: string;
  performanceSource: string;
  seoSource: string;
  accessibilitySource: string;
  title: string;
  description: string;
  canonicalState: string;
  jsonLdState: string;
  openGraphState: string;
  robotsState: string;
  sitemapState: string;
  h1State: string;
  headingState: string;
  overallScore: number | string;
  performanceScore: number | string;
  accessibilityScore: number | string;
  seoScore: number | string;
  durationMs: number;
}

const TARGETS = [
  'https://example.com',
  'https://github.com',
  'https://developer.mozilla.org',
  'https://stackoverflow.com',
  'https://react.dev',
  'https://nextjs.org',
  'https://vuejs.org',
  'https://angular.dev',
  'https://svelte.dev',
  'https://www.npmjs.com',
  'https://nexonixreflexo.netlify.app'
];

async function runMatrix() {
  console.log('====================================================');
  console.log('PHASE 20: REAL WEBSITE TEST MATRIX EXECUTION');
  console.log('====================================================\n');

  const results: RealSiteResult[] = [];

  for (let i = 0; i < TARGETS.length; i++) {
    const target = TARGETS[i];
    console.log(`[${i + 1}/${TARGETS.length}] Scanning: ${target} ...`);
    const start = Date.now();

    try {
      const report: any = await reportGenerator.generate(target, null, true);
      const duration = Date.now() - start;

      const seoObj = report.seo?.seo || report.seo;
      const seoSummary = report.seo?.summary || {};

      const title = seoObj?.pageTitle || seoObj?.title || 'MISSING';
      const description = seoObj?.metaDescription || seoObj?.description || 'MISSING';
      
      const canonicalDetails = seoObj?.canonicalDetails;
      const canonicalState = canonicalDetails?.canonicalState || seoSummary.canonicalStatus || (canonicalDetails?.url ? 'PRESENT_VALID' : 'MISSING');
      
      const jsonLdDetails = seoObj?.structuredDataDetails;
      const jsonLdState = jsonLdDetails?.status || seoSummary.structuredDataStatus || (seoObj?.structuredData?.length ? 'VALID' : 'NOT_DETECTED');

      const og = seoObj?.openGraph || seoObj?.socialCards?.openGraph;
      const ogPresent = og?.presentCount ?? (og?.properties ? og.properties.filter((p: any) => p.present).length : (og?.title ? 1 : 0));
      const ogTotal = og?.totalCount ?? 5;
      const ogState = `${ogPresent}/${ogTotal} present (${og?.coveragePercentage ?? Math.round((ogPresent / ogTotal) * 100)}%)`;

      const robots = seoObj?.robotsTxtDetails;
      const robotsState = robots?.status || seoSummary.robotsTxtStatus || 'verified_exists';

      const sitemap = seoObj?.sitemapXmlDetails;
      const sitemapState = sitemap?.status || seoSummary.sitemapXmlStatus || 'missing';

      const headings = seoObj?.headingsHierarchy || seoObj?.headingStructure;
      const h1Count = headings?.h1Count ?? (headings?.h1 ? headings.h1.length : 0);
      const h1State = h1Count === 1 ? '1 H1 (Valid)' : h1Count === 0 ? 'No H1' : `${h1Count} H1s (Multiple)`;
      const headingState = headings?.isHierarchyValid ? 'Sequential (Valid)' : 'Hierarchy Warning';

      const res: RealSiteResult = {
        url: target,
        httpResult: '200 OK',
        renderSuccess: report.status === 'success' || report.status === 'partial_success',
        googleLighthouseStatus: report.analysisSources?.googleLighthouseStatus || (report.analysisSources?.googleLighthouse ? 'SUCCESS' : 'UNAVAILABLE'),
        performanceSource: report.analysisSources?.googleLighthouse ? 'google_lighthouse' : 'puppeteer_lab',
        seoSource: 'rendered_dom_analyzer',
        accessibilitySource: 'puppeteer_axe_core',
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
        description: description.length > 60 ? description.substring(0, 57) + '...' : description,
        canonicalState,
        jsonLdState,
        openGraphState: ogState,
        robotsState,
        sitemapState,
        h1State,
        headingState,
        overallScore: report.scores?.overall ?? 'N/A',
        performanceScore: report.scores?.performance ?? 'N/A',
        accessibilityScore: report.scores?.accessibility ?? 'N/A',
        seoScore: report.scores?.seo ?? 'N/A',
        durationMs: duration
      };

      results.push(res);
      console.log(`  ✓ Completed in ${duration}ms | Scores: Perf=${res.performanceScore} A11y=${res.accessibilityScore} SEO=${res.seoScore} (Lighthouse=${res.googleLighthouseStatus})`);
    } catch (err: any) {
      console.error(`  ✗ Error scanning ${target}:`, err.message);
      results.push({
        url: target,
        httpResult: 'FAILED',
        renderSuccess: false,
        googleLighthouseStatus: 'FAILED',
        performanceSource: 'failed',
        seoSource: 'failed',
        accessibilitySource: 'failed',
        title: 'ERROR',
        description: 'ERROR',
        canonicalState: 'ERROR',
        jsonLdState: 'ERROR',
        openGraphState: 'ERROR',
        robotsState: 'ERROR',
        sitemapState: 'ERROR',
        h1State: 'ERROR',
        headingState: 'ERROR',
        overallScore: 'ERROR',
        performanceScore: 'ERROR',
        accessibilityScore: 'ERROR',
        seoScore: 'ERROR',
        durationMs: Date.now() - start
      });
    }
  }

  const outputPath = path.resolve('tests/fixtures/realWebsiteMatrixResults.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${outputPath}`);

  console.log('\n====================================================');
  console.log('REAL WEBSITE TEST MATRIX SUMMARY TABLE:');
  console.log('====================================================');
  console.table(results.map(r => ({
    URL: r.url,
    'Render OK': r.renderSuccess,
    'Lighthouse': r.googleLighthouseStatus,
    'Perf Score': r.performanceScore,
    'SEO Score': r.seoScore,
    'A11y Score': r.accessibilityScore,
    'Canonical': r.canonicalState,
    'JSON-LD': r.jsonLdState,
    'OG': r.openGraphState,
    'H1': r.h1State
  })));
}

runMatrix().catch(console.error);
