# PerfLens System Audit Report
**Date:** July 3, 2026
**Author:** Lead Software Architect & Senior Staff Engineer

This report documents the architectural audit of the PerfLens codebase, detailing issues, hardcoded metrics, duplicate logic, and mocked/fallback services that prevent the platform from providing accurate diagnostics.

---

## Executive Summary
PerfLens claims to be a production-grade website auditing platform, performing custom analyses through a series of dedicated analyzers. However, a deep audit of the backend reveals that:
1. **No analyzer actually inspects the live page DOM** beyond basic title, language, and meta-description extraction in the Puppeteer wrapper. All advanced analyzers (SEO, Accessibility, CSS, JS, Image, Bundle) operate purely on network logs or metadata, using hardcoded static ratios, placeholder defaults, and mocked structures.
2. **Bundle Analysis is 100% hardcoded.** The backend returns a static list of packages (`lodash`, `moment.js`, etc.) with identical sizes and flags for *every single website scan*.
3. **Property Mismatches** between the backend analyzers and the React frontend mapping service (`mapBackendReportToFrontend`) cause actual crawled metadata to be discarded. This is why SEO tags and Accessibility checks are reported as "Missing" on the frontend even when they exist.
4. **Resilient Mocking on Failures.** If Puppeteer fails to navigate or crawl a target host, it catches the exception and returns a pre-fabricated mock report with faked performance vitals (FCP: 0.95s, LCP: 1.6s, CLS: 0.03, etc.) and metadata, pretending the scan succeeded.

---

## Detailed Service Audit

### 1. SEO Service (`server/services/seoAnalyzer/seoAnalyzer.service.ts`)
*   **Analyzing Live Page:** **NO**. It has no access to the Puppeteer page object and only processes a simplified metadata object.
*   **Uses Puppeteer:** Indirectly (consumes `PuppeteerScanResult`).
*   **Uses DOM Selectors / Parses HTML:** **NO**.
*   **Hardcoded/Placeholder Values:** 
    *   `charset`: Hardcoded to `'UTF-8'`.
    *   `canonicalUrl`, `metaRobots`, `openGraphTags`, `twitterCardTags`, `headingStructure`, `internalLinks`, `externalLinks`, `brokenLinks`, `structuredData`: Hardcoded to `null` (lines 103-113).
    *   `missingH1`: Hardcoded to `true` (line 141).
    *   `multipleH1`: Hardcoded to `false` (line 142).
*   **Identical Outputs Explanation:** Since it sets all advanced tags (OG tags, canonical, headings, links) to null or default placeholders, any two websites scanned will generate identical null values for these details. The frontend will show "Missing" for canonical, H1, etc., for all sites.

### 2. Accessibility Service (`server/services/accessibilityAnalyzer/accessibilityAnalyzer.service.ts`)
*   **Analyzing Live Page:** **NO**.
*   **Uses Puppeteer:** Indirectly.
*   **Uses DOM Selectors:** **NO**.
*   **Hardcoded/Placeholder Values:**
    *   All DOM-specific attributes (image missing alts, buttons missing labels, links missing text, contrast, focusable elements, keyboard navigation, skip navigation link, landmark elements, tables) are set to `null` or hardcoded boolean defaults (`missingSkipNavigation: true`) on lines 92-105.
    *   `accessibilityScoreEstimate` is calculated on lines 127-130 using a faked score: `50` points for having a title, and `50` points for having a language.
*   **Identical Outputs Explanation:** Any site containing an HTML title and a lang attribute automatically scores `100/100` on accessibility. No actual elements (inputs, buttons, contrast, ARIA) are scanned.

### 3. CSS Analyzer (`server/services/cssAnalyzer/cssAnalyzer.service.ts` / `analysis/helpers.ts`)
*   **Analyzing Live Page:** **NO**. It only filters network resources.
*   **Inspects CSS Content:** **NO**. It never downloads or parses the CSS source files.
*   **Hardcoded/Placeholder Values:**
    *   `unusedKb` is calculated as a static heuristic: `sizeKb * 0.45` (always 45% of total CSS size is reported as unused).
    *   `renderBlockingCount` uses a size-based metric (`sizeKb > 50` or lack of public caching) instead of inspecting resource attributes.
    *   `hasAtImport`, `hasMediaQueries`, `hasCssVariables` are hardcoded to `null` (lines 152-154).
*   **Identical Outputs Explanation:** If two websites load the same number and size of CSS resources, their calculated unused CSS, render-blocking count, and statistics will be mathematically identical.

### 4. JavaScript Analyzer (`server/services/jsAnalyzer/jsAnalyzer.service.ts` / `analysis/helpers.ts`)
*   **Analyzing Live Page:** **NO**. It only filters network resources.
*   **Inspects JavaScript Content:** **NO**.
*   **Hardcoded/Placeholder Values:**
    *   `unusedKb` is calculated as exactly `sizeKb * 0.35` (always 35% of total JS size).
    *   CPU Parse Cost is hardcoded to `sizeKb * 0.4` ms; Execution Cost is `sizeKb * 0.8` ms.
    *   `isAsync`, `isDefer`, `isModuleScript`, `hasDynamicImports` are hardcoded to `null` (lines 173-175).
*   **Identical Outputs Explanation:** CPU timings and unused code savings are linear transformations of raw JS request sizes, leading to identical ratios and cost metrics across all targets.

### 5. Bundle Analyzer (`analysis/helpers.ts`)
*   **Analyzing Live Page:** **NO**.
*   **Hardcoded/Placeholder Values:**
    *   **CRITICAL ISSUE:** The `bundleAnalysis` array returned by `JsAnalyzer` in `server/services/analysis/helpers.ts` (lines 79-86) is a completely hardcoded array of libraries (`lodash`, `react-dom.production.min.js`, `moment.js`, `moment-timezone`, `framer-motion`, `uuid`) with hardcoded sizes and flags.
*   **Identical Outputs Explanation:** Because this code path is used by the orchestrator (`ReportGenerator.generate`), **every single website scan on PerfLens reports that the website uses Lodash (71.2KB), React DOM, Moment.js, and Framer Motion, and that Moment/UUID are duplicate dependencies.**

### 6. Image Analyzer (`imageAnalyzer/imageAnalyzer.service.ts` / `analysis/helpers.ts`)
*   **Analyzing Live Page:** **NO**.
*   **Inspects Images:** **NO**. It never downloads or decodes images to determine dimensions, quality, or visual weights.
*   **Hardcoded/Placeholder Values:**
    *   `webpSavings` is hardcoded to 30% of image size (`sizeKb * 0.7`).
    *   `avifSavings` is hardcoded to 50% of image size (`sizeKb * 0.5`).
    *   `lazyLoading`, `altText`, `srcset`, `sizesAttribute`, `fetchPriority` are hardcoded to `null` (lines 111-115).
    *   As a result, `imagesMissingLazyLoading` and `imagesMissingAltText` count every image on every page as missing these elements.
*   **Identical Outputs Explanation:** Images are reported as having no dimensions (or only dimensions parsed from CDN URL patterns), and 100% of images are flagged as missing alt/lazy attributes.

### 7. Network Analyzer (`analysis/helpers.ts` / `puppeteer/resources.ts`)
*   **Analyzing Live Page:** YES (intercepts network requests).
*   **Hardcoded/Placeholder Values:**
    *   If `content-length` is missing from headers, size defaults to `15.0 KB` (line 42).
    *   Request duration defaults to `100ms` if timing is empty (line 55).
    *   `httpVersion` is hardcoded to `'HTTP/2'` for every resource (line 67).
*   **Identical Outputs Explanation:** Resources without content-lengths or timing data are homogenized to 15KB and 100ms.

### 8. Recommendation Engine (`recommendation/recommendation.service.ts`)
*   **Analyzing Live Page:** **NO** (processes rules over other analyzers' results).
*   **Hardcoded/Placeholder Values:**
    *   Warnings are triggered using static templates. The savings estimates (e.g. `150KB` fallback) and recommended fix steps are boilerplate templates.
*   **Identical Outputs Explanation:** Since sub-analyzers return similar outputs, the engine triggers the exact same recommendation list for every website.

### 9. PageSpeed Service (`pagespeed.service.ts`)
*   **Telemetry provider:** YES, queries the Google PageSpeed Insights API if an API key is configured.
*   **Fallback metrics:** If the API fails or is not enabled, the orchestrator fakes the performance metrics by assigning hardcoded scores: `overall: 78, performance: 70, accessibility: 75, seo: 80, bestPractices: 85`, along with faked Web Vitals (FCP: 1.5s, LCP: 2.8s, CLS: 0.02, TBT: 350ms).

### 10. Puppeteer Service / Crawler (`puppeteer/index.ts` / `pageLoader.ts`)
*   **Crawler:** YES, launches Puppeteer to load the URL and intercept responses.
*   **Duplicate logic:** `puppeteer/index.ts` duplicates browser launch and page setup logic instead of importing `loadPageSafely` from `pageLoader.ts`.
*   **Resilient Faking:** If page load crashes (due to timeout, connection refusal, DNS failure), it catches the exception and returns a pre-fabricated mock payload with faked performance vitals (FCP: 0.95s, LCP: 1.6s, CLS: 0.03, etc.) and metadata (title: 'Offline / Blocked Host'), faking a successful scan.

---

## Architectural Problems to Resolve
1.  **Multiple Browser Sessions:** The current orchestrator pipelines run PageSpeed and Puppeteer concurrently but do not share any DOM contexts between individual sub-analyzers.
2.  **Property Naming Mismatch (Critical Bug):**
    *   The backend SEO analyzer returns `pageTitle`, `metaDescription`, `canonicalUrl`, and `hasSitemapXml`.
    *   The React frontend `AppContext.tsx` (`mapBackendReportToFrontend`) reads `seoData.title`, `seoData.description`, `seoData.canonical`, and `seoData.sitemap`.
    *   Due to this mismatch, the frontend always evaluates these as `undefined` and displays "Missing" for every scanned website, despite what the backend found.
    *   Similarly, for Accessibility, `a11yData.htmlLang` and `a11yData.title` evaluate to `undefined` and fall back to `true`, faking a 100% pass rate.
3.  **Bypassed Advanced Services:** The orchestrator in `server/services/analysis/index.ts` imports from `./helpers.js` instead of the fully defined classes in `cssAnalyzer`, `jsAnalyzer`, and `imageAnalyzer` directories, rendering the directories dead code.

---

## Conclusion
PerfLens is currently behaving like a template generator rather than an auditing engine. To establish trust with professional developers, we must overhaul the orchestration pipeline to share a single Puppeteer `Page` instance, extract real DOM attributes, query raw code assets, compute real timings (using `PerformancePaintTiming` and observers), and align properties between the backend and frontend.
