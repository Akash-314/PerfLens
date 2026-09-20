import {
  HeadingsHierarchy,
  CanonicalDetails,
  StructuredDataDetails,
  RobotsMetaDetails,
  SocialCardDetails,
  SeoScoreExplanation
} from './types.js';

/**
 * Validates heading hierarchy order across document outline.
 * Detects skipped levels (e.g. H1 followed directly by H3 without an intervening H2).
 */
export const validateHeadingHierarchy = (
  headingsList: Array<{ tag: string; text: string }>
): HeadingsHierarchy => {
  const h1List: string[] = [];
  const h2List: string[] = [];
  const h3List: string[] = [];
  const h4List: string[] = [];
  const h5List: string[] = [];
  const h6List: string[] = [];

  const skippedLevels: Array<{ from: string; to: string; text: string }> = [];
  let prevLevel = 0;

  for (const heading of headingsList) {
    const text = heading.text;
    const tag = heading.tag.toLowerCase();
    if (tag === 'h1') h1List.push(text);
    else if (tag === 'h2') h2List.push(text);
    else if (tag === 'h3') h3List.push(text);
    else if (tag === 'h4') h4List.push(text);
    else if (tag === 'h5') h5List.push(text);
    else if (tag === 'h6') h6List.push(text);

    const currentLevel = parseInt(tag.replace('h', ''), 10);
    if (!isNaN(currentLevel)) {
      // If we jump more than 1 level down without an intervening heading (e.g. H1 -> H3)
      if (prevLevel > 0 && currentLevel > prevLevel + 1) {
        skippedLevels.push({
          from: `h${prevLevel}`,
          to: `h${currentLevel}`,
          text: text.slice(0, 50)
        });
      }
      prevLevel = currentLevel;
    }
  }

  return {
    h1: h1List,
    h2: h2List,
    h3: h3List,
    h4: h4List,
    h5: h5List,
    h6: h6List,
    hasH1: h1List.length > 0,
    h1Count: h1List.length,
    multipleH1: h1List.length > 1,
    isHierarchyValid: skippedLevels.length === 0,
    skippedLevels
  };
};

/**
 * Validates canonical URL attribute against page target.
 * Distinguishes missing vs relative vs malformed vs cross-domain mismatch.
 */
/**
 * Validates canonical URL attribute against page target.
 * Distinguishes missing vs relative vs malformed vs duplicate vs cross-domain mismatch.
 * Populates canonicalState: 'MISSING' | 'PRESENT_VALID' | 'DUPLICATE' | 'MALFORMED' | 'UNRESOLVED' | 'UNABLE_TO_VERIFY'.
 */
export const validateCanonicalUrl = (
  canonicalHref: string | null | undefined,
  pageUrl: string,
  canonicalCount: number = 1
): CanonicalDetails => {
  if (canonicalCount > 1) {
    return {
      status: 'duplicate',
      canonicalState: 'DUPLICATE',
      url: canonicalHref || null,
      isAbsolute: false,
      matchesPageUrl: false,
      isMissing: false,
      count: canonicalCount,
      error: `${canonicalCount} canonical elements were found in the document head.`
    };
  }

  if (!canonicalHref || canonicalHref.trim().length === 0) {
    return {
      status: 'missing',
      canonicalState: 'MISSING',
      url: null,
      isAbsolute: false,
      matchesPageUrl: false,
      isMissing: true,
      count: 0
    };
  }

  const trimmed = canonicalHref.trim();
  let parsedCanonical: URL | null = null;
  let parsedPage: URL | null = null;

  try {
    parsedPage = new URL(pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`);
  } catch {
    // Ignore invalid pageUrl
  }

  try {
    parsedCanonical = new URL(trimmed);
  } catch {
    // If it cannot parse as absolute URL, it's relative or invalid
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || !trimmed.includes('://')) {
      return {
        status: 'relative',
        canonicalState: 'MALFORMED',
        url: trimmed,
        isAbsolute: false,
        matchesPageUrl: false,
        isMissing: false,
        count: 1,
        error: 'Canonical URL is relative. Search engines require an absolute canonical URL.'
      };
    }
    return {
      status: 'invalid',
      canonicalState: 'MALFORMED',
      url: trimmed,
      isAbsolute: false,
      matchesPageUrl: false,
      isMissing: false,
      count: 1,
      error: 'Canonical URL format is malformed and could not be parsed.'
    };
  }

  // It's a valid absolute URL
  const isAbsolute = true;
  let matchesPageUrl = false;

  if (parsedPage && parsedCanonical) {
    // Compare origins and pathnames (ignoring trailing slash differences and tracking query params)
    const normPage = `${parsedPage.origin}${parsedPage.pathname.replace(/\/$/, '')}`;
    const normCanon = `${parsedCanonical.origin}${parsedCanonical.pathname.replace(/\/$/, '')}`;
    matchesPageUrl = normPage.toLowerCase() === normCanon.toLowerCase();

    // Check if origin differs
    if (parsedCanonical.origin.toLowerCase() !== parsedPage.origin.toLowerCase()) {
      return {
        status: 'mismatch',
        canonicalState: 'PRESENT_VALID',
        url: trimmed,
        isAbsolute,
        matchesPageUrl: false,
        isMissing: false,
        count: 1,
        error: `Canonical URL points to a different domain (${parsedCanonical.origin}) than the inspected page (${parsedPage.origin}).`
      };
    }
  }

  return {
    status: 'valid',
    canonicalState: 'PRESENT_VALID',
    url: trimmed,
    isAbsolute,
    matchesPageUrl,
    isMissing: false,
    count: 1
  };
};

/**
 * Validates JSON-LD structured data scripts.
 * Distinguishes NOT_DETECTED, VALID, INVALID, and PARTIALLY_VALID.
 */
export const validateJsonLdScripts = (rawScripts: string[]): StructuredDataDetails => {
  if (!rawScripts || rawScripts.length === 0) {
    return {
      status: 'NOT_DETECTED',
      presence: false,
      itemCount: 0,
      validCount: 0,
      schemas: [],
      schemaTypes: [],
      syntaxErrors: [],
      humanMessage: 'No JSON-LD structured data was detected on this rendered page.'
    };
  }

  const schemas: any[] = [];
  const schemaTypes: string[] = [];
  const syntaxErrors: Array<{ index: number; error: string; rawSnippet: string }> = [];

  rawScripts.forEach((scriptStr, idx) => {
    if (!scriptStr || scriptStr.trim().length === 0) return;
    try {
      const parsed = JSON.parse(scriptStr);
      schemas.push(parsed);

      // Extract @type
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          if (item && item['@type']) {
            const typeStr = Array.isArray(item['@type']) ? item['@type'].join(', ') : String(item['@type']);
            if (!schemaTypes.includes(typeStr)) schemaTypes.push(typeStr);
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          parsed['@graph'].forEach((item: any) => {
            if (item && item['@type']) {
              const typeStr = Array.isArray(item['@type']) ? item['@type'].join(', ') : String(item['@type']);
              if (!schemaTypes.includes(typeStr)) schemaTypes.push(typeStr);
            }
          });
        } else if (parsed['@type']) {
          const typeStr = Array.isArray(parsed['@type']) ? parsed['@type'].join(', ') : String(parsed['@type']);
          if (!schemaTypes.includes(typeStr)) schemaTypes.push(typeStr);
        }
      }
    } catch (err: any) {
      syntaxErrors.push({
        index: idx,
        error: err.message || 'Malformed JSON syntax',
        rawSnippet: scriptStr.slice(0, 100)
      });
    }
  });

  let status: 'NOT_DETECTED' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID' = 'VALID';
  let humanMessage = `JSON-LD structured data detected (${schemas.length} block${schemas.length === 1 ? '' : 's'}${schemaTypes.length > 0 ? ': ' + schemaTypes.join(', ') : ''}).`;

  if (schemas.length === 0 && syntaxErrors.length > 0) {
    status = 'INVALID';
    humanMessage = 'JSON-LD structured data was detected, but one or more blocks could not be parsed as valid JSON.';
  } else if (schemas.length > 0 && syntaxErrors.length > 0) {
    status = 'PARTIALLY_VALID';
    humanMessage = 'JSON-LD structured data was detected, but one or more blocks could not be parsed as valid JSON.';
  }

  return {
    status,
    presence: rawScripts.length > 0,
    itemCount: rawScripts.length,
    validCount: schemas.length,
    schemas,
    schemaTypes,
    syntaxErrors,
    humanMessage
  };
};

/**
 * Parses robots meta tag directives (noindex, nofollow, noarchive, nosnippet).
 */
export const parseRobotsDirectives = (robotsContent: string | null | undefined): RobotsMetaDetails => {
  if (!robotsContent || robotsContent.trim().length === 0) {
    return {
      content: null,
      noindex: false,
      nofollow: false,
      noarchive: false,
      nosnippet: false,
      directives: []
    };
  }

  const directives = robotsContent
    .toLowerCase()
    .split(/[,;\s]+/)
    .map(d => d.trim())
    .filter(Boolean);

  return {
    content: robotsContent.trim(),
    noindex: directives.includes('noindex') || directives.includes('none'),
    nofollow: directives.includes('nofollow') || directives.includes('none'),
    noarchive: directives.includes('noarchive'),
    nosnippet: directives.includes('nosnippet'),
    directives
  };
};

/**
 * Validates OpenGraph and Twitter card tags completeness and format.
 * Provides item-level breakdown for og:title, og:description, og:image, og:url, og:type.
 */
export const validateSocialCards = (
  og: Record<string, string>,
  twitter: Record<string, string>
): SocialCardDetails => {
  const ogKeys = Object.keys(og || {});
  const getOgVal = (tag: string): string | null => {
    if (!og) return null;
    if (og[tag] && og[tag].trim().length > 0) return og[tag].trim();
    const tagLower = tag.toLowerCase();
    const foundKey = ogKeys.find(k => k.toLowerCase() === tagLower);
    return foundKey && og[foundKey] && og[foundKey].trim().length > 0 ? og[foundKey].trim() : null;
  };

  const twitterKeys = Object.keys(twitter || {});
  const getTwitterVal = (tag: string): string | null => {
    if (!twitter) return null;
    if (twitter[tag] && twitter[tag].trim().length > 0) return twitter[tag].trim();
    const tagLower = tag.toLowerCase();
    const foundKey = twitterKeys.find(k => k.toLowerCase() === tagLower);
    return foundKey && twitter[foundKey] && twitter[foundKey].trim().length > 0 ? twitter[foundKey].trim() : null;
  };

  const expectedOg = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const missingOg: string[] = [];
  const ogProperties = expectedOg.map(tag => {
    const val = getOgVal(tag);
    const isPresent = val !== null;
    if (!isPresent) {
      missingOg.push(tag);
    }
    return {
      property: tag,
      present: isPresent,
      value: val
    };
  });

  const expectedTwitter = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  const missingTwitter: string[] = [];
  expectedTwitter.forEach(tag => {
    const val = getTwitterVal(tag);
    if (!val) {
      missingTwitter.push(tag);
    }
  });

  const presentCount = expectedOg.length - missingOg.length;
  const totalCount = expectedOg.length;
  const ogCoverage = Math.round((presentCount / totalCount) * 100);
  const twitterCoverage = Math.round(((expectedTwitter.length - missingTwitter.length) / expectedTwitter.length) * 100);

  return {
    openGraph: {
      title: getOgVal('og:title'),
      description: getOgVal('og:description'),
      image: getOgVal('og:image'),
      url: getOgVal('og:url'),
      type: getOgVal('og:type'),
      siteName: getOgVal('og:site_name'),
      missingTags: missingOg,
      properties: ogProperties,
      presentCount,
      totalCount,
      coveragePercentage: ogCoverage
    },
    twitter: {
      card: getTwitterVal('twitter:card'),
      title: getTwitterVal('twitter:title'),
      description: getTwitterVal('twitter:description'),
      image: getTwitterVal('twitter:image'),
      site: getTwitterVal('twitter:site'),
      missingTags: missingTwitter,
      coveragePercentage: twitterCoverage
    }
  };
};

/**
 * Generates an explainable mathematical breakdown of the SEO score.
 * Never penalizes unverified, neutral, or blocked external states (ACCESS_BLOCKED, UNABLE_TO_VERIFY).
 */
export const getSeoScoreExplanation = (params: {
  title?: string | null;
  metaDescription?: string | null;
  language?: string | null;
  viewport?: any | null;
  canonicalValid?: boolean;
  hasH1?: boolean;
  hasRobotsTxt?: boolean;
  hasSitemapXml?: boolean;
  sitemapStatus?: 'SITEMAP_VALID' | 'SITEMAP_NOT_FOUND' | 'SITEMAP_INVALID' | 'SITEMAP_ACCESS_BLOCKED' | 'SITEMAP_UNREACHABLE' | 'SITEMAP_UNABLE_TO_VERIFY' | 'SITEMAP_FOUND';
  sitemapAccessBlocked?: boolean;
  sitemapUnableToVerify?: boolean;
  noindex?: boolean;
}): SeoScoreExplanation => {
  const breakdown: SeoScoreExplanation['breakdown'] = [];

  let totalScore = 0;

  // 1. Title: 20 pts
  if (params.title && params.title.trim().length > 0) {
    const len = params.title.trim().length;
    if (len <= 70) {
      breakdown.push({
        name: 'Document Title',
        score: 20,
        maxScore: 20,
        status: 'PASS',
        explanation: `Title present (${len} chars, within guideline).`
      });
      totalScore += 20;
    } else {
      breakdown.push({
        name: 'Document Title',
        score: 14,
        maxScore: 20,
        status: 'GUIDELINE_WARNING',
        explanation: `Title is ${len} chars (slightly exceeds preferred 60-70 char guideline; may truncate).`
      });
      totalScore += 14;
    }
  } else {
    breakdown.push({
      name: 'Document Title',
      score: 0,
      maxScore: 20,
      status: 'FAIL',
      explanation: 'No <title> tag found in rendered document.'
    });
  }

  // 2. Meta Description: 20 pts
  if (params.metaDescription && params.metaDescription.trim().length > 0) {
    const len = params.metaDescription.trim().length;
    if (len >= 50 && len <= 160) {
      breakdown.push({
        name: 'Meta Description',
        score: 20,
        maxScore: 20,
        status: 'PASS',
        explanation: `Description present (${len} chars, within guideline).`
      });
      totalScore += 20;
    } else {
      breakdown.push({
        name: 'Meta Description',
        score: 14,
        maxScore: 20,
        status: 'GUIDELINE_WARNING',
        explanation: `Description present (${len} chars, outside preferred 120-160 char guideline).`
      });
      totalScore += 14;
    }
  } else {
    breakdown.push({
      name: 'Meta Description',
      score: 0,
      maxScore: 20,
      status: 'FAIL',
      explanation: 'No <meta name="description"> tag found in rendered document head.'
    });
  }

  // 3. Primary H1: 15 pts
  if (params.hasH1) {
    breakdown.push({
      name: 'Primary H1 Heading',
      score: 15,
      maxScore: 15,
      status: 'PASS',
      explanation: 'Primary <h1> element present in rendered DOM.'
    });
    totalScore += 15;
  } else {
    breakdown.push({
      name: 'Primary H1 Heading',
      score: 0,
      maxScore: 15,
      status: 'FAIL',
      explanation: 'No <h1> heading found in rendered document outline.'
    });
  }

  // 4. Viewport: 15 pts
  if (params.viewport) {
    breakdown.push({
      name: 'Mobile Viewport',
      score: 15,
      maxScore: 15,
      status: 'PASS',
      explanation: 'Mobile-responsive viewport meta tag declared.'
    });
    totalScore += 15;
  } else {
    breakdown.push({
      name: 'Mobile Viewport',
      score: 0,
      maxScore: 15,
      status: 'FAIL',
      explanation: 'Missing <meta name="viewport"> tag in document head.'
    });
  }

  // 5. Canonical: 10 pts
  if (params.canonicalValid) {
    breakdown.push({
      name: 'Canonical Link',
      score: 10,
      maxScore: 10,
      status: 'PASS',
      explanation: 'Valid absolute canonical URL declared in rendered <head>.'
    });
    totalScore += 10;
  } else {
    breakdown.push({
      name: 'Canonical Link',
      score: 0,
      maxScore: 10,
      status: 'FAIL',
      explanation: 'No valid absolute <link rel="canonical"> found in rendered <head>.'
    });
  }

  // 6. Language: 10 pts
  if (params.language && params.language.trim().length > 0) {
    breakdown.push({
      name: 'Language Declaration',
      score: 10,
      maxScore: 10,
      status: 'PASS',
      explanation: `HTML document lang attribute declared ("${params.language}").`
    });
    totalScore += 10;
  } else {
    breakdown.push({
      name: 'Language Declaration',
      score: 0,
      maxScore: 10,
      status: 'FAIL',
      explanation: 'HTML lang attribute missing on <html> element.'
    });
  }

  // 7. Robots.txt: 5 pts
  if (params.hasRobotsTxt) {
    breakdown.push({
      name: 'robots.txt Probe',
      score: 5,
      maxScore: 5,
      status: 'PASS',
      explanation: 'robots.txt file verified and accessible.'
    });
    totalScore += 5;
  } else {
    breakdown.push({
      name: 'robots.txt Probe',
      score: 0,
      maxScore: 5,
      status: 'FAIL',
      explanation: 'robots.txt file missing or unreachable.'
    });
  }

  // 8. Sitemap.xml: 5 pts (Neutral on ACCESS_BLOCKED or UNABLE_TO_VERIFY)
  const isBlocked = params.sitemapAccessBlocked || params.sitemapStatus === 'SITEMAP_ACCESS_BLOCKED';
  const isUnableToVerify = params.sitemapUnableToVerify || params.sitemapStatus === 'SITEMAP_UNABLE_TO_VERIFY';

  if (params.hasSitemapXml) {
    breakdown.push({
      name: 'sitemap.xml Probe',
      score: 5,
      maxScore: 5,
      status: 'PASS',
      explanation: 'sitemap.xml verified and contains valid XML markup.'
    });
    totalScore += 5;
  } else if (isBlocked) {
    // ACCESS_BLOCKED: do NOT penalize unverified external access blocks
    breakdown.push({
      name: 'sitemap.xml Probe',
      score: 5,
      maxScore: 5,
      status: 'ACCESS_BLOCKED',
      explanation: 'Access blocked (HTTP 403) - treated neutrally; verify crawler access rules.'
    });
    totalScore += 5;
  } else if (isUnableToVerify) {
    // UNABLE_TO_VERIFY: neutral
    breakdown.push({
      name: 'sitemap.xml Probe',
      score: 5,
      maxScore: 5,
      status: 'UNABLE_TO_VERIFY',
      explanation: 'Unable to verify sitemap externally - treated neutrally.'
    });
    totalScore += 5;
  } else {
    breakdown.push({
      name: 'sitemap.xml Probe',
      score: 0,
      maxScore: 5,
      status: 'FAIL',
      explanation: 'sitemap.xml not found or returned invalid non-XML content.'
    });
  }

  // Cap at 50 if noindex is detected
  let finalScore = Math.min(100, Math.max(0, totalScore));
  if (params.noindex) {
    finalScore = Math.min(finalScore, 50);
  }

  return {
    score: finalScore,
    maxScore: 100,
    breakdown
  };
};

/**
 * Calculates a deterministic, evidence-based SEO score estimate (0-100).
 * Preserves backward compatibility while leveraging the explainable model.
 */
export const calculateSeoScore = (params: {
  title?: string | null;
  metaDescription?: string | null;
  language?: string | null;
  viewport?: any | null;
  canonicalValid?: boolean;
  hasH1?: boolean;
  hasRobotsTxt?: boolean;
  hasSitemapXml?: boolean;
  sitemapStatus?: 'SITEMAP_VALID' | 'SITEMAP_NOT_FOUND' | 'SITEMAP_INVALID' | 'SITEMAP_ACCESS_BLOCKED' | 'SITEMAP_UNREACHABLE' | 'SITEMAP_UNABLE_TO_VERIFY' | 'SITEMAP_FOUND';
  sitemapAccessBlocked?: boolean;
  sitemapUnableToVerify?: boolean;
  noindex?: boolean;
}): number => {
  const explanation = getSeoScoreExplanation(params);
  return explanation.score;
};

