<!-- refreshed: 2026-09-12 -->
# Architecture

**Analysis Date:** 2026-09-12

## System Overview

```text
+-----------------------------------------------------------------------------------+
|                           Frontend Single Page Application                        |
|                                     `src/`                                        |
+-------------------+-------------------------------+-------------------------------+
|  React Pages      |     Global State              |       UI Components           |
|  `src/pages/`     |  `src/context/AppContext.tsx` |    `src/components/`          |
+-------------------+---------------+---------------+-------------------------------+
                                    |
                            HTTP / REST API
                       (Vite proxy `/api` -> :5001)
                                    v
+-----------------------------------------------------------------------------------+
|                             Express Backend API Gateway                           |
|                                    `server/`                                      |
+-------------------+-------------------------------+-------------------------------+
| Middleware & Auth |      Controllers              |       Routing Layer           |
| `middlewares/`    | `controllers/`                | `routes/`                     |
+-------------------+---------------+---------------+-------------------------------+
                                    |
                    Analysis Orchestrator & Services
                                    v
+-----------------------------------------------------------------------------------+
|                        Domain Engines & Analyzer Pipeline                         |
|                               `server/services/`                                  |
+-------------------+-------------------------------+-------------------------------+
| Puppeteer Crawler | Google PageSpeed Insights     | Specialized Sub-Analyzers     |
| `puppeteer/`      | `pagespeed.service.ts`        | image, css, js, seo, a11y     |
+-------------------+---------------+---------------+-------------------------------+
                                    |
                     Reconciliation, Scoring & Rules
                                    v
+-------------------+-------------------------------+-------------------------------+
| Recommendation    | Performance Thresholds        | PDF Export Engine             |
| `recommendation/` | `performanceThresholds.ts`   | `report/index.ts`             |
+-------------------+---------------+---------------+-------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                           Persistence & External Services                         |
| `server/config/supabase.ts` | Google Cloud API | Local Disk (`server/temp/`)      |
+-----------------------------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AppContext` | React global state: auth, active report, history list, toast notifications, comparisons | `src/context/AppContext.tsx` |
| `ResultsPage` | Primary visualization dashboard displaying Vitals, breakdowns, recommendations, and audit details | `src/pages/ResultsPage.tsx` |
| `analysisController` | Validates scan requests, triggers orchestrator, handles Supabase persistence or fallback, exports PDF | `server/controllers/analysisController.ts` |
| `authController` | Handles user registration, bcrypt authentication, and JWT issuance | `server/controllers/authController.ts` |
| `projectController` | CRUD operations for user monitoring projects and web properties | `server/controllers/projectController.ts` |
| `report.controller` | Retrieves saved historical reports and streams PDF exports | `server/controllers/report.controller.ts` |
| `ReportGenerator` | Central analysis orchestrator coordinating parallel browser crawls, PageSpeed audits, and sub-analyzers | `server/services/analysis/index.ts` |
| `analyzeWebsiteWithPuppeteer` | Spawns headless Chrome, navigates target, measures CDP timings, tracks network waterfall, and captures coverage | `server/services/puppeteer/index.ts` |
| `getPageSpeedTelemetry` | Queries Google PageSpeed API with 15-minute sliding Supabase cache | `server/services/pagespeed.service.ts` |
| `performanceThresholds` | Authoritative Web.dev thresholds for CLS, LCP, FCP, INP, TTFB, TBT with boundary classifications | `server/config/performanceThresholds.ts` |
| `RecommendationEngine` | Evaluates audit results against rule registry to generate prioritized, actionable remediation advice | `server/services/recommendation/index.ts` |
| `PDFService` | Compiles comprehensive multi-page executive PDF performance audits using PDFKit | `server/services/report/index.ts` |
| `supabase` | Database connection client with graceful fallback to ephemeral guest mode | `server/config/supabase.ts` |

## Pattern Overview

**Overall:** Decoupled Client-Server Architecture with Concurrent Pipeline Orchestration and Fail-Open Degradation.

**Key Characteristics:**
- **SPA Client / RESTful API Separation**: The frontend React app is fully decoupled from the backend and communicates exclusively via JSON REST endpoints (`/api/v1/`).
- **Concurrent Inspection Pipelines**: Scans execute Puppeteer CDP crawl and Google PageSpeed Insights in parallel (`Promise.all`), cutting turnaround time roughly in half.
- **Single-Pass Shared Browser Context**: Puppeteer opens the page once, extracts DOM metadata, records network resources, captures coverage, runs in-page scrapers, and distributes the data to modular sub-analyzers (`imageAnalyzer`, `cssAnalyzer`, `jsAnalyzer`, `seoAnalyzer`, `accessibilityAnalyzer`).
- **Fail-Open Graceful Degradation**: If Supabase credentials are missing or the database is down, the application logs warnings and continues operating in ephemeral guest mode with generated UUIDs rather than crashing.

## Layers

**Presentation Layer (`src/`):**
- Purpose: Render dashboards, charts, reports, and interactive audit tools
- Location: `src/pages/`, `src/components/`, `src/context/`
- Contains: React components, Recharts visualizations, CSS styling, Lucide icons
- Depends on: Backend REST API (`/api/v1`)

**API Gateway & Routing Layer (`server/routes/`, `server/middlewares/`):**
- Purpose: Route dispatching, input validation, rate limiting, and JWT authentication
- Location: `server/routes/`, `server/middlewares/`, `server/validators/`
- Contains: Express routers, `auth.ts`, `rateLimiter.ts`, `errorHandler.ts`, validation chains
- Depends on: Controllers

**Application & Orchestration Layer (`server/controllers/`, `server/services/analysis/`):**
- Purpose: Coordinate scan workflows, aggregate multi-source telemetry, compute health scores, format reports
- Location: `server/controllers/analysisController.ts`, `server/services/analysis/index.ts`
- Contains: `ReportGenerator`, `NetworkAnalyzer`, `ValidationGenerator`
- Depends on: Domain Analyzers, Telemetry Services, Supabase Client

**Domain & Analyzer Layer (`server/services/`):**
- Purpose: Crawl web targets and evaluate specific web performance and quality vectors
- Location: `server/services/puppeteer/`, `server/services/imageAnalyzer/`, `server/services/cssAnalyzer/`, `server/services/jsAnalyzer/`, `server/services/seoAnalyzer/`, `server/services/accessibilityAnalyzer/`, `server/services/recommendation/`, `server/services/report/`
- Contains: Modular analyzer engines, rules registry, heuristic calculators, PDF builder
- Depends on: Headless Chrome, Google PageSpeed API, PDFKit

**Data & Infrastructure Layer (`server/config/`, `server/models/`):**
- Purpose: Configuration validation, database connectivity, and data transfer types
- Location: `server/config/supabase.ts`, `server/config/database.ts`, `server/config/envValidator.ts`, `server/models/`
- Contains: Supabase client instance, TypeScript row/document interfaces, environment validator

## Data Flow

### Primary Request Path (Website Scan)

1. Client triggers scan (`POST /api/v1/analysis/scan`) with `{ url, includePageSpeed }` (`src/context/AppContext.tsx:828`)
2. `analysisValidator` validates URL structure and protocol (`server/validators/analysisValidator.ts:5`)
3. `analysisController.scanWebsite` invokes `ReportGenerator.generate()` (`server/controllers/analysisController.ts:36`)
4. `ReportGenerator` triggers concurrent execution:
   - `analyzeWebsiteWithPuppeteer(url)` launches headless browser, visits page, tracks network resources, coverage, and DOM (`server/services/puppeteer/index.ts:20`)
   - `getPageSpeedTelemetry(url)` checks 15-minute DB cache or calls Google PageSpeed API (`server/services/pagespeed.service.ts:50`)
5. Puppeteer DOM context feeds sub-analyzers (`analyzeImages`, `analyzeCSS`, `analyzeJavaScript`, `analyzeSEO`, `analyzeAccessibility`)
6. `NetworkAnalyzer` calculates byte weight breakdowns, cache hit rates, and compression stats (`server/services/analysis/helpers.ts:18`)
7. `performanceThresholds.classifyMetric` normalizes and categorizes CWV vitals against Web.dev standards (`server/config/performanceThresholds.ts:167`)
8. `RecommendationEngine.generate()` evaluates rules across vitals, bundle size, unused code, accessibility, and SEO (`server/services/recommendation/index.ts:28`)
9. Report object is compiled, health scores calculated, and persisted to Supabase `reports` table (or ephemeral UUID assigned) (`server/controllers/analysisController.ts:85`)
10. Controller returns `{ success: true, duration, data: report }` JSON to frontend (`server/controllers/analysisController.ts:136`)

### Secondary Flow: PDF Export

1. User clicks "Export PDF" in Results page (`src/pages/ResultsPage.tsx:119`)
2. If report is persisted in DB, calls `GET /api/v1/reports/:id/pdf`; if ephemeral, calls `POST /api/v1/analysis/export-pdf`
3. Controller passes report model to `pdfService.generateReportPdf(report)` (`server/services/report/index.ts:40`)
4. PDFKit streams rendered document buffer with attachment headers back to the browser

**State Management:**
- Frontend: Managed globally via React Context in `src/context/AppContext.tsx`, with session tokens and recent reports backed by browser `localStorage`.
- Backend: Stateless HTTP endpoints; persistent data stored in Supabase PostgreSQL; ephemeral guest scans supported without session locks.

## Key Abstractions

**`ReportGenerator`:**
- Purpose: Central façade and workflow orchestrator for all audit subsystems
- Examples: `server/services/analysis/index.ts`
- Pattern: Orchestrator / Façade Pattern

**`classifyMetric`:**
- Purpose: Canonical metric normalization and threshold classifier against authoritative Google/Web.dev Core Web Vitals standards
- Examples: `server/config/performanceThresholds.ts`
- Pattern: Strategy / Rule Engine

**`NetworkTracker`:**
- Purpose: Hooks into Puppeteer CDP network events (`request`, `response`, `requestfailed`) to build structured resource waterfall telemetry
- Examples: `server/services/puppeteer/resources.ts`
- Pattern: Observer / Event Listener

**`RecommendationEngine` & `Rule`:**
- Purpose: Declarative rule-based audit definitions producing prioritized, evidence-backed actionable fixes
- Examples: `server/services/recommendation/rules.ts`, `server/services/recommendation/index.ts`
- Pattern: Rules Engine / Specification Pattern

## Entry Points

**Backend Server:**
- Location: `server/server.ts`
- Triggers: `npm run dev:server` or `tsx server.ts`
- Responsibilities: Validates environment variables, checks Supabase connection, binds Express HTTP listener on PORT 5001, sets global process exception handlers

**Frontend Application:**
- Location: `src/main.tsx`
- Triggers: Vite bundler dev server / browser page load (`index.html`)
- Responsibilities: Mounts React root component wrapped with `AppProvider` into `#root` DOM node

## Architectural Constraints

- **Single-Threaded Node.js Event Loop:** Heavy CPU work (such as large DOM parsing or PDFKit rendering) must avoid blocking the main event loop.
- **Puppeteer Headless Process Spawning:** Each scan launches a separate browser instance (`launchBrowser()`), which requires significant RAM and CPU. Concurrent scans must be guarded by rate limits.
- **SSRF Protection:** `validateUrlForSsrf` strictly rejects private subnets, loopbacks (`127.0.0.1`, `localhost`), and link-local addresses (`169.254.169.254`) to prevent internal network scanning.
- **Stateless Authorization:** Backend uses stateless JWT tokens; no session state is maintained in server memory.

## Anti-Patterns

### Hardcoded Localhost API Base in Frontend

**What happens:** Several frontend files hardcode `http://localhost:5001/api/v1` (`src/services/auth/auth.service.ts`, `src/context/AppContext.tsx`, `src/pages/ResultsPage.tsx`) instead of relative `/api/v1` or an environment variable.
**Why it's wrong:** Breaks deployment in production environments where frontend and backend are hosted on separate domains or behind a reverse proxy.
**Do this instead:** Use relative paths (benefiting from Vite's proxy in dev) or `import.meta.env.VITE_API_BASE_URL`.

### Mixed Legacy Data Models in Report Schema

**What happens:** The `IReport` model and controllers support both legacy MongoDB-style fields (`_id`, `created_at`, `createdAt`, `pageSpeed` vs `page_speed`).
**Why it's wrong:** Creates duplicate field handling, conditional checks, and type ambiguity across the codebase.
**Do this instead:** Standardize completely on Supabase schema naming conventions with clean adapter functions.

## Error Handling

**Strategy:** Fail-safe isolation with centralized error transformation.

**Patterns:**
- Sub-analyzers catch internal exceptions, append diagnostics to an `errors` array, and return fallback default structures rather than aborting the scan.
- Database write errors trigger automatic fallback to ephemeral guest responses with random UUIDs.
- Centralized `errorHandler` in `server/middlewares/errorHandler.ts` ensures standard JSON response envelopes on unexpected server errors.

## Cross-Cutting Concerns

**Logging:** HTTP request logging via `morgan('dev')` in `server/app.ts`; structured console log prefixes across services.
**Validation:** Request payload validation using `express-validator` middleware before controller logic executes.
**Authentication:** Header-based JWT token verification via `server/middlewares/auth.ts`.
**Security:** Helmet HTTP header hardening, CORS configuration, and IP rate limiting on `/api`.

---

*Architecture analysis: 2026-09-12*
