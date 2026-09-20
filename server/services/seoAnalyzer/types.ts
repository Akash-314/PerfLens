export interface SEOHeadings {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface HeadingsHierarchy extends SEOHeadings {
  hasH1: boolean;
  h1Count: number;
  multipleH1: boolean;
  isHierarchyValid: boolean;
  skippedLevels: Array<{ from: string; to: string; text: string }>;
}

export interface RobotsTxtDetails {
  status: 'verified_exists' | 'missing' | 'unreachable' | 'invalid' | 'access_blocked';
  statusCode: number | null;
  sitemaps: string[];
  disallowCount: number;
  allowCount: number;
  isMissing: boolean;
  isUnreachable: boolean;
  isInvalid: boolean;
  snippet?: string;
}

export interface SitemapXmlDetails {
  status: 'verified_exists' | 'missing' | 'unreachable' | 'invalid' | 'access_blocked' | 'unable_to_verify';
  sitemapStatus?: 'SITEMAP_VALID' | 'SITEMAP_NOT_FOUND' | 'SITEMAP_INVALID' | 'SITEMAP_ACCESS_BLOCKED' | 'SITEMAP_UNREACHABLE' | 'SITEMAP_UNABLE_TO_VERIFY' | 'SITEMAP_FOUND';
  statusCode: number | null;
  urlCount: number;
  isSitemapIndex: boolean;
  url: string | null;
  isMissing: boolean;
  isUnreachable: boolean;
  isInvalid: boolean;
  isAccessBlocked?: boolean;
  error?: string;
}

export interface CanonicalDetails {
  status: 'valid' | 'missing' | 'relative' | 'mismatch' | 'invalid' | 'duplicate';
  canonicalState?: 'MISSING' | 'PRESENT_VALID' | 'DUPLICATE' | 'MALFORMED' | 'UNRESOLVED' | 'UNABLE_TO_VERIFY';
  url: string | null;
  isAbsolute: boolean;
  matchesPageUrl: boolean;
  isMissing: boolean;
  count?: number;
  error?: string;
}

export interface StructuredDataDetails {
  status?: 'NOT_DETECTED' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID';
  presence: boolean;
  itemCount: number;
  validCount: number;
  schemas: any[];
  schemaTypes: string[];
  syntaxErrors: Array<{ index: number; error: string; rawSnippet: string }>;
  humanMessage?: string;
}

export interface RobotsMetaDetails {
  content: string | null;
  noindex: boolean;
  nofollow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  directives: string[];
}

export interface HreflangTag {
  lang: string;
  href: string;
  isValidLangCode: boolean;
}

export interface OpenGraphPropertyCheck {
  property: string;
  present: boolean;
  value: string | null;
}

export interface SocialCardDetails {
  openGraph: {
    title: string | null;
    description: string | null;
    image: string | null;
    url: string | null;
    type: string | null;
    siteName: string | null;
    missingTags: string[];
    properties?: OpenGraphPropertyCheck[];
    presentCount?: number;
    totalCount?: number;
    coveragePercentage: number;
  };
  twitter: {
    card: string | null;
    title: string | null;
    description: string | null;
    image: string | null;
    site: string | null;
    missingTags: string[];
    coveragePercentage: number;
  };
}

export interface FrameworkSignal {
  name: string;
  evidence: string;
  confidence: 'verified' | 'inferred';
}

export interface SeoScoreBreakdownItem {
  name: string;
  score: number;
  maxScore: number;
  status: 'PASS' | 'PARTIAL' | 'GUIDELINE_WARNING' | 'FAIL' | 'NEUTRAL' | 'ACCESS_BLOCKED' | 'UNABLE_TO_VERIFY';
  explanation: string;
}

export interface SeoScoreExplanation {
  score: number;
  maxScore: number;
  breakdown: SeoScoreBreakdownItem[];
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
  headingStructure: HeadingsHierarchy | null;
  headingsHierarchy?: HeadingsHierarchy | null;
  internalLinks: string[] | null;
  externalLinks: string[] | null;
  brokenLinks: string[] | null;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  robotsTxtDetails?: RobotsTxtDetails;
  sitemapXmlDetails?: SitemapXmlDetails;
  canonicalDetails?: CanonicalDetails;
  structuredDataDetails?: StructuredDataDetails;
  robotsMetaDetails?: RobotsMetaDetails;
  robotsMeta?: RobotsMetaDetails;
  hreflangs?: HreflangTag[];
  socialCards?: SocialCardDetails;
  openGraph?: SocialCardDetails['openGraph'];
  twitterCard?: SocialCardDetails['twitter'];
  detectedFramework?: FrameworkSignal | null;
  structuredData: any[] | null;
  favicon: string | null;
  seoScoreExplanation?: SeoScoreExplanation;
}

export interface SEOAnalysisSummary {
  seoScoreEstimate: number; // 0-100
  missingMetaDescription: boolean;
  missingTitle: boolean;
  missingCanonical: boolean;
  missingViewport: boolean;
  missingH1: boolean;
  multipleH1: boolean;
  headingHierarchyValid: boolean;
  openGraphCoverage: number; // percentage (0-100)
  twitterCardCoverage: number; // percentage (0-100)
  structuredDataPresence: boolean;
  structuredDataValid: boolean;
  robotsTxtStatus: 'verified_exists' | 'missing' | 'unreachable' | 'invalid' | 'access_blocked';
  sitemapXmlStatus: 'verified_exists' | 'missing' | 'unreachable' | 'invalid' | 'access_blocked' | 'unable_to_verify';
  sitemapStatus?: 'SITEMAP_VALID' | 'SITEMAP_NOT_FOUND' | 'SITEMAP_INVALID' | 'SITEMAP_ACCESS_BLOCKED' | 'SITEMAP_UNREACHABLE' | 'SITEMAP_UNABLE_TO_VERIFY' | 'SITEMAP_FOUND';
  structuredDataStatus?: 'NOT_DETECTED' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID';
  canonicalStatus?: 'MISSING' | 'PRESENT_VALID' | 'DUPLICATE' | 'MALFORMED' | 'UNRESOLVED' | 'UNABLE_TO_VERIFY';
  titleStatus?: 'MISSING' | 'VALID' | 'GUIDELINE_WARNING' | 'UNABLE_TO_VERIFY';
  metaDescriptionStatus?: 'MISSING' | 'VALID' | 'GUIDELINE_WARNING' | 'UNABLE_TO_VERIFY';
  noindexDetected: boolean;
  scoreExplanation?: SeoScoreExplanation;
}

export interface SEOAnalysisStatistics {
  titleLength: number;
  descriptionLength: number;
  headingsCount: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number } | null;
  linksCount: { internal: number; external: number; total: number } | null;
}

export interface SEOAnalysisWarning {
  code:
    | 'SEO_NO_TITLE'
    | 'SEO_TITLE_TOO_SHORT'
    | 'SEO_TITLE_TOO_LONG'
    | 'SEO_TITLE_GUIDELINE_WARNING'
    | 'SEO_DUPLICATE_TITLE'
    | 'SEO_NO_DESCRIPTION'
    | 'SEO_DESC_TOO_SHORT'
    | 'SEO_DESC_TOO_LONG'
    | 'SEO_DESC_GUIDELINE_WARNING'
    | 'SEO_DUPLICATE_DESCRIPTION'
    | 'SEO_NO_H1'
    | 'SEO_MULTIPLE_H1'
    | 'SEO_HEADING_HIERARCHY_SKIP'
    | 'SEO_NO_CANONICAL'
    | 'SEO_CANONICAL_RELATIVE'
    | 'SEO_CANONICAL_MISMATCH'
    | 'SEO_CANONICAL_DUPLICATE'
    | 'SEO_NO_VIEWPORT'
    | 'SEO_ROBOTS_NOINDEX'
    | 'SEO_NO_OG_TAGS'
    | 'SEO_NO_TWITTER_CARD'
    | 'SEO_NO_STRUCTURED_DATA'
    | 'SEO_STRUCTURED_DATA_SYNTAX_ERROR'
    | 'SEO_ROBOTS_TXT_UNREACHABLE'
    | 'SEO_ROBOTS_TXT_INVALID'
    | 'SEO_SITEMAP_MISSING'
    | 'SEO_SITEMAP_UNREACHABLE'
    | 'SEO_SITEMAP_ACCESS_BLOCKED'
    | 'SEO_SITEMAP_INVALID';
  message: string;
  severity: 'info' | 'warning' | 'error';
  element?: string;
  observed?: any;
  expected?: any;
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
  validationEvidence?: any;
}
