export interface SEOHeadings {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface SEOAnalysisDetails {
  pageTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[] | null;
  charset: string | null;
  viewport: string | null;
  canonicalUrl: string | null;
  metaRobots: string | null;
  openGraphTags: Record<string, string> | null;
  twitterCardTags: Record<string, string> | null;
  languageAttribute: string | null;
  headingStructure: SEOHeadings | null;
  internalLinks: string[] | null;
  externalLinks: string[] | null;
  brokenLinks: string[] | null;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  structuredData: any[] | null;
  favicon: string | null;
}

export interface SEOAnalysisSummary {
  seoScoreEstimate: number; // 0-100
  missingMetaDescription: boolean;
  missingTitle: boolean;
  missingCanonical: boolean;
  missingViewport: boolean;
  missingH1: boolean;
  multipleH1: boolean;
  openGraphCoverage: number; // percentage (0-100)
  twitterCardCoverage: number; // percentage (0-100)
  structuredDataPresence: boolean;
}

export interface SEOAnalysisStatistics {
  titleLength: number;
  descriptionLength: number;
  headingsCount: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number } | null;
  linksCount: { internal: number; external: number; total: number } | null;
}

export interface SEOAnalysisWarning {
  code: 'SEO_NO_TITLE' | 'SEO_NO_DESCRIPTION' | 'SEO_MULTIPLE_H1' | 'SEO_NO_CANONICAL' | 'SEO_NO_VIEWPORT' | 'SEO_NO_OG_TAGS' | 'SEO_NO_STRUCTURED_DATA';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SEOOptimizationCandidate {
  url: string;
  type: 'seo';
  estimatedSizeReductionKb: number;
  suggestion: string;
  isIssue: boolean;
}

export interface SEOAnalysisResult {
  summary: SEOAnalysisSummary;
  seo: SEOAnalysisDetails;
  statistics: SEOAnalysisStatistics;
  optimizationCandidates: SEOOptimizationCandidate[];
  warnings: SEOAnalysisWarning[];
  errors: string[];
}
