# PerfLens — Recommendation Engine & Estimated Improvement Validation Report

## Executive Summary
This report validates the comprehensive overhaul of the PerfLens Recommendation Engine and Estimated Improvement Calculation Layer. Prior to this overhaul, recommendations in PerfLens suffered from heuristic conflation (e.g. treating wire transfer savings as runtime FCP/LCP rendering savings, generating recommendations from score thresholds rather than concrete DOM/network evidence, and lacking structured differentiation between measured, modeled, transfer-only, and qualitative improvements).

All recommendation rules now strictly adhere to the evidence-first invariant:
$$\text{FINDING} \longrightarrow \text{EVIDENCE} \longrightarrow \text{IMPACT} \longrightarrow \text{RECOMMENDATION} \longrightarrow \text{ESTIMATE IF QUANTIFIABLE} \longrightarrow \text{CONFIDENCE}$$

---

## 1. Current Recommendation Architecture
The recommendation engine operates as a multi-stage deterministic pipeline:
1. **Raw Telemetry Ingestion:** Headless Chromium instrumentation via Puppeteer CDP (`vitals`, `tbtDetails`, `clsDetails`, `lcpDetails`, CDP CSS/JS coverage, request logs) and optional Lighthouse audits.
2. **Sub-Analyzer Diagnostics:** Domain-specific extraction of findings from `imageAnalyzer`, `jsAnalyzer`, `cssAnalyzer`, `seoAnalyzer`, and `accessibilityAnalyzer`.
3. **Evidence-Driven Rule Evaluation:** 21 canonical recommendation rules in `server/services/recommendation/rules.ts` consume structured `RecommendationInput` (including canonical `vitals`). A rule executes its evaluation function and returns `null` unless concrete DOM, network, or trace evidence exists.
4. **Deduplication & Consolidation:** `generateRecommendations` merges overlapping findings across analyzers (e.g. combining redundant script reports or multiple layout shifts into a single consolidated action card) while aggregating evidence collections and upgrading severity.
5. **Multi-Channel Serialization:** Consistent JSON schema emitted to frontend React components (`ResultsPage.tsx`, `Recommendations.tsx`), PDF export (`PdfService.generateReportPdf`), and persistent database records.

---

## 2. Bugs Discovered During Audit
1. **Transfer Time Conflated with Runtime Rendering:** `calculateTransferSavings(savingsKb)` claimed that saving network transfer bytes directly translated into "FCP reduction" or "LCP reduction".
2. **Fabricated Percentage Reductions:** Unused JavaScript was estimated via arbitrary percentage formulas (`totalJs * 0.15`) instead of requiring actual CDP code coverage.
3. **Heuristic Minification Flagging:** Large bundles were flagged for minification even when fully compressed and mangled (e.g., Google's `xjs` bundle).
4. **Missing Core Web Vitals Rules:** While ScoreAnalyzer and Puppeteer tracked TBT, LCP, CLS, and INP, there were no dedicated, evidence-driven rules linking poor TBT to specific long tasks (>50ms) or diagnosing whether poor LCP was caused by an image or text element.
5. **Score-Driven Recommendation Generation:** Rules previously triggered because overall score $< 100$, rather than originating from an identified DOM node, network transfer anomaly, or long task.

---

## 3. False Positives Removed
1. **Spurious LCP Recommendations on Good Sites:** On sites with fast LCP (e.g., Google at 0.56s, MDN at 0.62s, HN at 1.34s), no LCP recommendations are generated.
2. **Spurious CLS Recommendations on Stable Sites:** On sites with CLS $\le 0.10$ (e.g., Google at 0.000, GitHub at 0.051), no CLS recommendations are generated.
3. **Spurious TBT Recommendations on Low-CPU Sites:** On sites with TBT $\le 200\text{ms}$ (e.g., Google at 37ms, React at 24ms, HN at 0ms), no TBT recommendations are generated.
4. **Fabricated Lab INP Recommendations:** Lab crawls without real user interaction report INP as `N/A (unrated)` and never generate fake INP recommendations from TTI or TBT.
5. **Spurious Skip Navigation on Minimal Single-Action Pages:** Verified that minimal search pages without multi-link headers do not trigger skip link warnings.

---

## 4. Unsupported Estimates Removed
1. Removed `totalJs * 0.15` and `totalCss * 0.15` arbitrary unused code estimations.
2. Removed speculative "Up to 300ms reduction in LCP" claims on general image compression unless the asset is proven to be the active LCP candidate.
3. Removed "Improves First Contentful Paint by X seconds" on parser-blocking scripts where execution time was not measured. All unquantified runtime gains are explicitly classified as `not_quantified`.
4. Removed numerical performance claims on SEO (meta description, canonical, title) and accessibility (alt text, lang, skip navigation) rules.

---

## 5. Evidence Model
Every recommendation must produce an `evidence` summary and structured `evidenceDetails`:
```typescript
export interface RecommendationEvidence {
  type: string;             // e.g. "long-task", "lcp-element", "layout-shift", "cdp-coverage-unused-js"
  resource?: string | null; // e.g. script URL, stylesheet URL, element selector
  selector?: string | null; // DOM query selector
  duration?: number | null; // Long task or render duration in milliseconds
  sizeKb?: number | null;   // Resource payload size in kilobytes
  details?: Record<string, any>;
}
```

---

## 6. Estimate Model
All recommendations include an explicit `estimatedSavings` contract separating network transfer from runtime performance:
```typescript
export type EstimateType =
  | 'measured'        // A/B benchmarked or empirically verified
  | 'modeled'         // Derived from an explicit mathematical formula
  | 'transfer_only'   // Wire transfer reduction (Fast 3G @ 200 KB/s profile)
  | 'heuristic'       // Rule-based heuristic estimate
  | 'not_quantified'  // Qualitative architectural improvement (no false numbers)
  | 'unavailable';    // Metric unavailable or unmeasured

export interface EstimatedSavings {
  value: number | null;
  unit: string | null;
  type: EstimateType;
  assumption: string | null;
  displayString: string;
}
```

---

## 7. Severity Model
Severity is derived strictly from measurable user impact:
- **`high` / `critical`:** User-facing degradation on a Core Web Vital (LCP $> 4.0\text{s}$, TBT $> 600\text{ms}$, CLS $> 0.25$) or blocking document parse in `<head>`.
- **`medium`:** Meaningful performance or compliance opportunity (e.g., TBT $200\text{--}600\text{ms}$, CLS $0.10\text{--}0.25$, missing meta description, images without alt text).
- **`low` / `info`:** Minor asset compression under 50 KB or non-critical diagnostic optimizations.

---

## 8. Confidence Model
- **`high`:** Supported by direct CDP performance tracing, Chrome DevTools coverage, or rendered DOM elements.
- **`medium`:** Modeled from network response headers with stated assumptions.
- **`low`:** General heuristic estimation where detailed browser trace is unavailable.

---

## 9. Google Regression Results (`https://www.google.com`)
- **Measured Vitals:** FCP: `0.56s` (good), LCP: `0.56s` (good), CLS: `0.000` (good), TBT: `37ms` (good), INP: `N/A` (unrated).
- **Performance Score:** `98` (Grade A).
- **CWV Recommendations Generated:** `0` (Correct: all CWV metrics are within optimal thresholds; zero spurious LCP/CLS/TBT/INP recommendations).
- **Emitted Recommendations:**
  1. `REC_JS_RENDER_BLOCKING`: Defer or load render-blocking JavaScript asynchronously
     - **Finding:** 7 parser-blocking scripts located in `<head>` without async/defer attributes
     - **Evidence:** `https://www.google.com/xjs/...` (Attributes: async=false, defer=false, location=\<head\>)
     - **Potential Impact:** Unblocks the browser HTML parser to construct DOM and Render Tree earlier.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** Parser unblocking; render delay reduction not quantified without browser lab re-run
     - **Confidence:** `HIGH`
  2. `REC_SEO_META_DESC`: Provide a meta description for search engine result snippets
     - **Finding:** No `<meta name="description">` tag found in document `<head>`
     - **Evidence:** `meta[name="description"]` absent
     - **Potential Impact:** Search engine result snippet presentation and CTR.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** None (SEO / search presentation only)
     - **Confidence:** `HIGH`
  3. `REC_JS_UNUSED`: Code-split and tree-shake unused JavaScript scripts
     - **Finding:** 89 KB of unused JavaScript code measured via Chrome DevTools Protocol Coverage
     - **Evidence:** CDP coverage profile measured 89 KB of unused code across script bundles
     - **Potential Impact:** Reduces code transfer size and secondary parsing/compilation overhead on main thread.
     - **Estimate Type:** `TRANSFER_ONLY`
     - **Estimated Savings:** Potential transfer reduction: 89 KB (~0.45s on Fast 3G @ 200 KB/s)
     - **Assumption:** Fast 3G network profile (200 KB/s transfer rate)
     - **Confidence:** `HIGH`
  4. `REC_SEO_CANONICAL`: Provide a canonical URL link tag
     - **Finding:** No `<link rel="canonical">` element found in document `<head>`
     - **Evidence:** `link[rel="canonical"]` absent
     - **Potential Impact:** Consolidates duplicate URL indexing signals.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** None (SEO only)
     - **Confidence:** `HIGH`
  5. `REC_A11Y_SKIP_LINK`: Add a skip navigation link for keyboard users
     - **Finding:** Navigation landmark detected with 26 links before main content, but no bypass link mechanism exists
     - **Evidence:** Page features `<header>/<nav>` containing 26 links with no bypass anchor (WCAG 2.4.1)
     - **Potential Impact:** Allows keyboard and screen reader users to jump past repetitive navigation directly to main content.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** None (Accessibility only)
     - **Confidence:** `HIGH`

---

## 10. React Regression Results (`https://react.dev`)
- **Measured Vitals:** FCP: `0.76s` (good), LCP: `0.76s` (good), CLS: `0.000` (good), TBT: `24ms` (good), INP: `N/A` (unrated).
- **Performance Score:** `98` (Grade A).
- **CWV Recommendations Generated:** `0` (Zero false positives for LCP, CLS, or TBT).
- **Emitted Recommendations:**
  1. `REC_JS_COMPRESS`: Enable network compression for JavaScript assets
     - **Finding:** 1 uncompressed JS file served without Content-Encoding header (94 KB potential reduction)
     - **Evidence:** `https://www.googletagmanager.com/gtag/js?id=G-B1E83PJ3RT` (156.2 KB)
     - **Potential Impact:** Shrinks raw wire transfer sizes over HTTP by 60-70%.
     - **Estimate Type:** `TRANSFER_ONLY`
     - **Estimated Savings:** Potential transfer reduction: 94 KB (~0.47s on Fast 3G @ 200 KB/s)
     - **Confidence:** `HIGH`
  2. `REC_CSS_RENDER_BLOCKING`: Extract critical CSS rules and defer non-critical styles
     - **Finding:** 1 render-blocking external stylesheet >20KB in document `<head>`
     - **Evidence:** `https://react.dev/_next/static/css/f647474d5749a6d8.css` (106.1 KB)
     - **Potential Impact:** Unblocks Render Tree construction, allowing earlier paint.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** Render tree unblocking; paint delay reduction not quantified without browser lab re-run
     - **Confidence:** `HIGH`
  3. `REC_JS_UNUSED`: Code-split and tree-shake unused JavaScript scripts
     - **Finding:** 156 KB of unused JavaScript code measured via CDP Coverage
     - **Evidence:** CDP coverage profile measured 156 KB of unused code
     - **Potential Impact:** Reduces code transfer size and parse overhead.
     - **Estimate Type:** `TRANSFER_ONLY`
     - **Estimated Savings:** Potential transfer reduction: 156 KB (~0.78s on Fast 3G @ 200 KB/s)
     - **Confidence:** `HIGH`
  4. `REC_IMAGE_COMPRESSION`: Compress page images (2 images, 34 KB potential reduction) — `TRANSFER_ONLY`
  5. `REC_CSS_MINIFY`: Minify CSS stylesheets (1 unminified, 16 KB reduction) — `TRANSFER_ONLY`
  6. `REC_IMAGE_LAZY_LOAD`: Implement lazy loading for below-the-fold images (34 images) — `NOT_QUANTIFIED`
  7. `REC_IMAGE_ALT_TEXT`: Add descriptive alt attributes (7 images) — `NOT_QUANTIFIED`
  8. `REC_A11Y_SKIP_LINK`: Add skip navigation link (106 links) — `NOT_QUANTIFIED`

---

## 11. GitHub Regression Results (`https://github.com`)
- **Measured Vitals:** FCP: `1.81s` (needs-improvement), LCP: `4.86s` (poor), CLS: `0.051` (good), TBT: `23,662ms` (poor), INP: `N/A` (unrated).
- **Performance Score:** `39` (Grade F).
- **CWV Recommendations Generated:**
  1. `REC_PERF_TBT_LONG_TASKS`: Split long JavaScript tasks to minimize Total Blocking Time
     - **Finding:** Total Blocking Time of 23,662ms exceeds the 200ms recommended threshold across 10 long task(s)
     - **Evidence:** Total Blocking Time: 23,662ms (10 long tasks, longest: 4,161ms)
     - **Potential Impact:** Reduces main-thread execution stalls and prevents UI freeze during page load.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** Main thread contention relief; runtime timing not quantified without A/B benchmark
     - **Severity:** `HIGH`
     - **Confidence:** `HIGH`
  2. `REC_PERF_LCP_ELEMENT`: Reduce render delay for Largest Contentful Paint text/container block
     - **Finding:** Largest Contentful Paint is 4.86s, exceeding the 2.5s threshold for good user experience.
     - **Evidence:** Largest Contentful Paint: 4.86s (H1: `#hero-section-brand-heading`)
     - **Potential Impact:** Unblocks browser layout and font styling to render the main heading block earlier.
     - **Estimate Type:** `NOT_QUANTIFIED`
     - **Estimated Savings:** LCP delay reduction not quantified without browser lab re-run
     - **Severity:** `HIGH`
     - **Confidence:** `HIGH`
     - **Note:** Engine correctly detected that LCP is a text element (`H1`), deliberately refraining from spurious image optimization recommendations.
- **Other Emitted Recommendations:**
  3. `REC_IMAGE_COMPRESSION`: 9 legacy images, 258 KB potential savings — `TRANSFER_ONLY` (~1.29s on Fast 3G)
  4. `REC_CSS_RENDER_BLOCKING`: 6 render-blocking stylesheets >20KB in `<head>` — `NOT_QUANTIFIED`
  5. `REC_JS_UNUSED`: 1,649 KB of unused JS measured via CDP coverage — `TRANSFER_ONLY` (~8.24s on Fast 3G)
  6. `REC_CSS_MINIFY`: 11 unminified stylesheets, 39 KB reduction — `TRANSFER_ONLY` (~0.20s on Fast 3G)
  7. `REC_IMAGE_LAZY_LOAD`: 11 images without loading="lazy" — `NOT_QUANTIFIED`
  8. `REC_IMAGE_ALT_TEXT`: 11 images missing alt text — `NOT_QUANTIFIED`

---

## 12. MDN Regression Results (`https://developer.mozilla.org`)
- **Measured Vitals:** FCP: `0.62s` (good), LCP: `0.62s` (good), CLS: `0.000` (good), TBT: `125ms` (good), INP: `N/A` (unrated).
- **Performance Score:** `97` (Grade A).
- **CWV Recommendations Generated:** `0` (Zero false positives).
- **Emitted Recommendations:**
  1. `REC_JS_UNUSED`: 59 KB unused JS measured via CDP coverage — `TRANSFER_ONLY` (~0.29s on Fast 3G)
  2. `REC_JS_MINIFY`: 1 unminified script (14.0 KB), 3 KB reduction — `TRANSFER_ONLY` (~0.01s on Fast 3G)
  3. `REC_IMAGE_LAZY_LOAD`: 14 below-the-fold images missing lazy loading — `NOT_QUANTIFIED`
  4. `REC_IMAGE_ALT_TEXT`: 14 images missing alt attribute — `NOT_QUANTIFIED`

---

## 13. Hacker News Regression Results (`https://news.ycombinator.com`)
- **Measured Vitals:** FCP: `1.34s` (good), LCP: `1.34s` (good), CLS: `0.000` (good), TBT: `0ms` (good), INP: `N/A` (unrated).
- **Performance Score:** `97` (Grade A).
- **CWV Recommendations Generated:** `0` (Zero false positives).
- **Emitted Recommendations:**
  1. `REC_JS_RENDER_BLOCKING`: 1 parser-blocking script in `<head>` (`hn.js`) — `NOT_QUANTIFIED`
  2. `REC_SEO_META_DESC`: Missing meta description — `NOT_QUANTIFIED`
  3. `REC_CSS_MINIFY`: 1 unminified stylesheet (`news.css`, 7.2 KB), 1 KB reduction — `TRANSFER_ONLY`
  4. `REC_IMAGE_LAZY_LOAD`: 3 below-the-fold images loaded synchronously — `NOT_QUANTIFIED`
  5. `REC_SEO_CANONICAL`: Missing canonical link tag — `NOT_QUANTIFIED`
  6. `REC_IMAGE_ALT_TEXT`: 3 images missing alt text — `NOT_QUANTIFIED`

---

## 14. Test Suite Execution Results
The test suite validates all 18 requirements from Section 30 of the prompt plus 7 additional bugfix regression tests:
- **`tests/recommendationEngine.test.ts`**: 25 tests passing
  - Requirement 1: Large JS does NOT automatically imply minification issue (PASS)
  - Requirement 2: Large JS does NOT automatically imply unused JS (PASS)
  - Requirement 3: Large JS does NOT automatically imply code splitting (PASS)
  - Requirement 4: Transfer savings are not labeled FCP savings (PASS)
  - Requirement 5: Meta description has no performance savings (PASS)
  - Requirement 6: Canonical has no performance savings (PASS)
  - Requirement 7: Skip navigation has no performance savings (PASS)
  - Requirement 8: Good LCP produces no LCP recommendation (PASS)
  - Requirement 9: Good CLS produces no CLS recommendation (PASS)
  - Requirement 10: Unavailable INP produces no INP recommendation (PASS)
  - Requirement 11: TTI never produces INP recommendation (PASS)
  - Requirement 12: TBT recommendations use long-task evidence (PASS)
  - Requirement 13: LCP recommendations use actual LCP element evidence (PASS)
  - Requirement 14: No numerical savings are produced without a valid method (PASS)
  - Requirement 15: Every numerical estimate has an estimate type (PASS)
  - Requirement 16: Confidence is present on all recommendations (PASS)
  - Requirement 17: JSON and PDF values remain identical (PASS)
  - Requirement 18: No duplicate recommendations produced in report output (PASS)
  - Requirement 19: Direct numeric vitals support without .value wrapping (PASS)
  - Requirement 20: Milliseconds LCP normalization (3500ms -> 3.50s) (PASS)
  - Requirement 21: LCP elementSelector fallback from vitals.lcpDetails in evidence (PASS)
  - Requirement 22: Deduplication merges evidenceDetails and updates estimatedSavings (PASS)
  - Requirement 23: Render-blocking JS deduplicates duplicate script URLs (PASS)
  - Requirement 24: Unminified JS deduplicates duplicate script URLs (PASS)
  - Requirement 25: Non-performance recommendations do not claim performance gain (PASS)
- **All Test Suites Total:** 5 files, 122 tests passing:
  - `performanceThresholds.test.ts`: 22 tests passing
  - `scoreAnalyzer.test.ts`: 16 tests passing
  - `regression.test.ts`: 25 tests passing
  - `adversarialValidation.test.ts`: 34 tests passing
  - `recommendationEngine.test.ts`: 25 tests passing

---

## 15. Quality Gates Status
- **`npm test`**: Passed (122 / 122 tests passed across 5 test suites).
- **`npm run lint`**: Passed (0 warnings, 0 errors across 104 files).
- **`npm run build`**: Passed (production bundle built successfully with Vite).


---

## 15. Remaining Limitations & Future Work
1. **Interactive Field INP Simulation in Lab:** In non-interactive headless browser crawls, INP cannot be measured empirically. It correctly returns `N/A` and produces no recommendation unless CrUX real-user data is configured.
2. **Automated A/B Optimization Benchmarking (Section 27):** True `MEASURED` runtime improvements (e.g. before: FCP 1.50s, after: FCP 1.21s) require an automated headless sandbox capable of applying code fixes in real-time and executing comparative re-audits.
3. **CSS Critical Path AST Slicing:** Stylesheet critical path extraction currently flags stylesheets $>20\text{KB}$ blocking `<head>`. Full AST tree-shaking of CSS selectors will enhance specificity for inline suggestions.
