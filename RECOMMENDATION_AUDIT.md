# PerfLens Recommendation Engine & Estimated Improvement Audit Report

**Date:** 2026-09-13  
**Auditor:** Antigravity AI Engineering Team  
**Scope:** Complete Recommendation Pipeline (`server/services/recommendation/`, `server/services/analysis/`, `server/services/report/`, `src/pages/Recommendations.tsx`, `src/pages/ResultsPage.tsx`, `src/context/AppContext.tsx`)  
**Status:** Baseline Complete — Pre-Implementation Architectural Audit

---

## 1. Executive Summary & Pipeline Trace

PerfLens is designed to offer actionable, defensible recommendations across Performance, Core Web Vitals, SEO, and Accessibility. Following recent architectural corrections to the Core Web Vitals layer (LCP unit normalization, CLS=0 handling, INP field data preservation, and weight normalization), the recommendation engine must now be aligned with the same rigorous, evidence-backed standard.

### End-to-End Pipeline Data Flow

```
1. Raw Browser Execution (Puppeteer / CDP / PageSpeed Insights)
   │
   ▼
2. Sub-Analyzer Extraction (Image, CSS, JS, SEO, Accessibility, Timings)
   │
   ▼
3. Canonical Metric Classification (classifyMetric() & ScoreAnalyzer)
   │
   ▼
4. RecommendationEngine.generate() [services/recommendation/index.ts & recommendation.service.ts]
   │  ├── Evaluates Rule Catalog (services/recommendation/rules.ts)
   │  ├── Computes Priority & Estimated Implementation Time
   │  └── Formats Developer Roadmap & Health Score
   │
   ▼
5. Report Normalization & Persistence [services/analysis/index.ts -> Report.ts]
   │  └── Exported in JSON report as `recommendations`
   │
   ├──▶ 6. Frontend UI Rendering [src/pages/ResultsPage.tsx & Recommendations.tsx]
   │       └── Displays recommendation cards, impact, code snippets, and estimated gains
   │
   └──▶ 7. PDF Export Generation [services/report/index.ts]
           └── Formats printable summary and actionable recommendations list
```

---

## 2. Comprehensive Audit of the Existing 17 Recommendation Rules

Below is the detailed evaluation of every rule in [server/services/recommendation/rules.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/recommendation/rules.ts):

| Rule ID | Current Trigger | Current Claimed Improvement | Defect / Vulnerability Identified |
| :--- | :--- | :--- | :--- |
| `REC_IMAGE_COMPRESSION` | `totalSavings > 10KB` from image analyzer | `Save ~Xs transfer on Fast 3G` & `Up to 300ms reduction in LCP` | **Unsupported LCP Claim**: Conflates raw image byte transfer with LCP timing. Unless the image is proven to be the **LCP element**, optimizing offscreen/minor images does not reduce LCP. |
| `REC_IMAGE_LAZY_LOAD` | `imagesMissingLazyLoading > 0` | `Shaves network contention off initial load time` | Good trigger, but lacks quantified transfer vs rendering distinction. |
| `REC_IMAGE_ALT_TEXT` | `missingAltText > 0` | `None` | **Correctly identifies no performance savings**, but lacks structured `finding` and `evidence` data contract. |
| `REC_JS_MINIFY` | `unminifiedScripts > 10KB` | `Save ~Xs transfer on Fast 3G` | Good quality gate (>10KB unminified required), but models transfer savings without explicit `transfer_only` labeling. |
| `REC_JS_COMPRESS` | `compression === 'none' && fileSize > 10KB` | `Save ~Xs transfer on Fast 3G` | Solid network rule; needs explicit `transfer_only` estimate type. |
| `REC_JS_DUPLICATE` | `duplicateScripts > 0` | `Up to 200ms reduction in LCP` | **Unsupported LCP Claim**: Eliminating duplicate packages reduces execution and transfer, but arbitrarily claiming "Up to 200ms LCP" is unproven. |
| `REC_JS_RENDER_BLOCKING` | `isRenderBlocking === true` in `<head>` | `Improves First Contentful Paint (FCP) by removing parser pause` | **Unsupported FCP Claim**: While render-blocking scripts do pause the parser, claiming an improvement without measuring the script execution duration or parser pause is unmodeled. |
| `REC_JS_UNUSED` | `estimatedUnusedJS > 50KB` | `Up to 200ms reduction in LCP` | **Unsupported LCP Claim**: Unused JS increases parse/transfer, but 200ms LCP claim is arbitrary. Requires CDP coverage evidence. |
| `REC_CSS_MINIFY` | `unminifiedCss > 5KB` | `Save ~Xs transfer on Fast 3G` | Solid transfer rule, needs explicit `transfer_only` type. |
| `REC_CSS_COMPRESS` | `compression === 'none' && size > 10KB` | `Save ~Xs transfer on Fast 3G` | Solid transfer rule, needs explicit `transfer_only` type. |
| `REC_CSS_RENDER_BLOCKING` | `isRenderBlocking && size > 20KB` | `Accelerates First Contentful Paint (FCP)` | Qualitative statement presented without explicit estimate type (`not_quantified`). |
| `REC_SEO_TITLE` | `missingTitle === true` | `None (Search indexing & user accessibility)` | Good. Correctly isolates SEO from performance. |
| `REC_SEO_META_DESC` | `missingMetaDescription === true` | `None (CTR & search snippet presentation)` | Good. Correctly isolates SEO from performance. |
| `REC_SEO_CANONICAL` | `missingCanonical === true` | `None` | Good. Correctly isolates SEO from performance. |
| `REC_SEO_VIEWPORT` | `missingViewport === true` | `Improves mobile layout loading presentation` | **Misleading Wording**: Viewport meta tag configures responsive scaling, not load speed or performance gains. |
| `REC_A11Y_LANG` | `missingHtmlLanguageAttribute === true` | `None` | Good. Correctly isolates Accessibility. |
| `REC_A11Y_SKIP_LINK` | `missingSkipLink && navLinksCount >= 4` | `None` | Good. Correctly applies WCAG 2.4.1 bypass block criteria. |

---

## 3. Catalog of Core Architectural Deficiencies

### Deficiency 1: Transfer Savings Conflated With Performance (FCP/LCP/TBT) Savings
The formula:
$$\text{Transfer Time} \approx \frac{\text{Bytes Saved}}{\text{Bandwidth (e.g. 200 KB/s Fast 3G)}}$$
calculates strictly **Network Transfer Latency Reduction**. It does **NOT** equal:
- First Contentful Paint (FCP) reduction
- Largest Contentful Paint (LCP) reduction
- Total Blocking Time (TBT) reduction
- Interaction to Next Paint (INP) reduction

When PerfLens previously reported:
```
Save ~0.45s transfer on Fast 3G (89 KB @ 200 KB/s)
Est. Improvement: Up to 200ms reduction in LCP
```
it presented an unmeasured runtime rendering improvement. In reality, savings must be labeled `TRANSFER_ONLY` with explicit network assumptions (`200 KB/s Fast 3G`).

### Deficiency 2: Complete Absence of Core Web Vitals-Specific Rules
Despite CWV being the central diagnostic metric of the application:
1. **No TBT / Long Task Rule**: In real scans (e.g. Google having 300ms TBT), the system produced no recommendation specifically addressing the long tasks, main-thread blocking, or execution duration.
2. **No LCP Element Bottleneck Rule**: If LCP was poor (e.g. 4.8s), the system did not inspect the LCP element (image vs text vs font vs server TTFB).
3. **No CLS Shift Element Rule**: If CLS was poor (e.g. 0.35), the system did not identify the shifting elements or largest shift.
4. **No Guard against CLS Recommendations on Optimal Pages**: If CLS is `0.023` (GOOD), no CLS recommendation should ever fire.

### Deficiency 3: Disconnected Legacy Mapping in `LegacyRecommendationEngine`
In [server/services/recommendation/index.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/recommendation/index.ts#L71-L80):
```typescript
return result.recommendations.map(rec => ({
  category: rec.category === 'performance' ? 'js' : rec.category,
  issue: rec.title,
  whyItMatters: rec.description,
  suggestedFix: rec.suggestedFix,
  estimatedImprovement: rec.estimatedPerformanceGain,
  difficulty: rec.estimatedDifficulty,
  priority: rec.priority === 'critical' ? 'high' : rec.priority,
  refUrl: 'https://web.dev/'
}));
```
This wrapper:
- Stripped out all evidence fields (`findingId`, `evidence`, `analyzer`, `actualValue`, `expectedValue`, `reason`).
- Hardcoded `refUrl: 'https://web.dev/'`.
- Converted `category: 'performance'` to `'js'`, obscuring whether an issue was image, network, or server related.

### Deficiency 4: Lack of Explicit "Estimate Type" & "Confidence" Model
Current reports use a single string `estimatedImprovement`. This makes it impossible for the user, API consumers, or PDF reports to know whether a number is:
- **MEASURED** (derived from concrete trace/coverage measurement)
- **MODELED** (derived from a stated mathematical formula and bandwidth assumption)
- **TRANSFER_ONLY** (network bytes reduced)
- **HEURISTIC** (rule-based estimation)
- **NOT_QUANTIFIED** (qualitative recommendation where byte/time measurement is not possible)

---

## 4. Proposed Target Data Contract

Every recommendation must adhere to a clean, transparent contract:

```typescript
export type EstimateType = 
  | 'measured' 
  | 'modeled' 
  | 'transfer_only' 
  | 'heuristic' 
  | 'not_quantified' 
  | 'unavailable';

export interface RecommendationFinding {
  description: string;
  metric?: string; // e.g. "TBT", "LCP", "CLS", "JS_TRANSFER"
  value?: number | string | null;
  unit?: string | null;
}

export interface RecommendationEvidence {
  type: string; // e.g. "long-task", "dom-element", "network-resource", "coverage"
  resource?: string | null;
  selector?: string | null;
  duration?: number | null;
  sizeKb?: number | null;
  details?: Record<string, any>;
}

export interface EstimatedSavings {
  value: number | null; // null if not quantified
  unit: string | null; // e.g. "KB", "ms", "s"
  type: EstimateType;
  assumption: string | null; // e.g. "Fast 3G (200 KB/s)"
  displayString: string; // e.g. "89 KB transfer reduction (~0.45s on Fast 3G)" or "Not quantified"
}

export interface CanonicalRecommendation {
  id: string;
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices';
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  
  finding: RecommendationFinding;
  evidence: RecommendationEvidence[];
  potentialImpact: string;
  estimatedSavings: EstimatedSavings;
  measuredImprovement: number | null; // null unless before/after verified
  
  suggestedFix: string;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  estimatedImplementationTime: string;
  refUrl: string;

  // Backward compatibility fields for legacy UI and PDF
  issue: string; // alias for title
  whyItMatters: string; // alias for potentialImpact
  estimatedImprovement: string; // alias for estimatedSavings.displayString
  priority: 'high' | 'medium' | 'low';
}
```

---

## 5. New Rules to Implement

1. **`REC_TBT_LONG_TASKS`**:
   - Triggers only when `TBT > 200ms` (NEEDS-IMPROVEMENT or POOR).
   - Cites actual long task durations, task counts, and responsible script URLs.
   - Estimate Type: `not_quantified` (avoids inventing FCP/TBT milliseconds).
2. **`REC_LCP_ELEMENT_OPTIMIZATION`**:
   - Triggers only when `LCP > 2.5s` and an LCP element was identified.
   - Distinguishes image LCP (preloading/compression) vs text/font LCP vs server render delay.
   - If LCP is GOOD ($\le 2.5\text{s}$), rule **NEVER** fires.
3. **`REC_CLS_LAYOUT_SHIFTS`**:
   - Triggers only when `CLS > 0.10` (NEEDS-IMPROVEMENT or POOR).
   - Identifies shifting elements, shift count, and largest shift.
   - If CLS is GOOD ($\le 0.10$, e.g. 0.023), rule **NEVER** fires.
4. **`REC_INP_FIELD_RESPONSIVENESS`**:
   - Triggers only when CrUX field data exists and `INP > 200ms`.
   - Never fires in non-interactive lab crawl (when INP is `N/A`).
   - Never substitutes TTI/TBT for INP.

---

## 6. Implementation Checklist & Quality Gates

- [ ] Add `tbtDetails` observer to Puppeteer telemetry to extract long task evidence.
- [ ] Refactor [rules.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/recommendation/rules.ts) to adhere strictly to the evidence-based data contract.
- [ ] Remove all unsupported FCP/LCP millisecond claims from transfer rules.
- [ ] Add Core Web Vitals recommendation rules (TBT, LCP, CLS, Field INP).
- [ ] Update [recommendation.service.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/recommendation/recommendation.service.ts) and [index.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/recommendation/index.ts) to pass full evidence objects.
- [ ] Update PDF generator ([server/services/report/index.ts](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/report/index.ts)) to render finding, evidence, estimate type, and impact.
- [ ] Update frontend UI cards in [src/pages/ResultsPage.tsx](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/pages/ResultsPage.tsx) and [src/pages/Recommendations.tsx](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/pages/Recommendations.tsx).
- [ ] Add unit tests covering all 18 specified scenarios in `server/tests/recommendationEngine.test.ts`.
- [ ] Run regression scans against target domains and compile `RECOMMENDATION_VALIDATION_REPORT.md`.
