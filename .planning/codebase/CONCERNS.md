# Codebase Concerns

**Analysis Date:** 2026-09-12

## Tech Debt

**Hardcoded Localhost API Endpoints:**
- Issue: The frontend code directly hardcodes `http://localhost:5001/api/v1` instead of using relative paths or environment variables.
- Files:
  - `src/services/auth/auth.service.ts`: Line 3 (`const API_BASE = 'http://localhost:5001/api/v1';`)
  - `src/context/AppContext.tsx`: Line 514 (`const API_BASE = 'http://localhost:5001/api/v1';`)
  - `src/pages/ResultsPage.tsx`: Lines 119 & 138 (`http://localhost:5001/api/v1/...`)
- Impact: Deploying the application to any non-localhost environment (staging, production, preview) immediately breaks API calls unless modified.
- Fix approach: Replace with relative URLs (`/api/v1`) leveraging Vite's dev server proxy or use `import.meta.env.VITE_API_BASE_URL`.

**Legacy MongoDB Dependency:**
- Issue: The root `package.json` still includes `"mongodb": "^7.4.0"` despite the complete migration to Supabase PostgreSQL.
- Files: `package.json`
- Impact: Unnecessary package installation, increased dependency tree size, and potential confusion regarding the active persistence engine.
- Fix approach: Remove `"mongodb"` from `package.json` via `npm uninstall mongodb`.

**Missing `"test"` NPM Scripts:**
- Issue: Neither `package.json` nor `server/package.json` declares a `"test"` script, even though Vitest is installed and 75 tests exist.
- Files: `package.json`, `server/package.json`
- Impact: Developers running `npm test` or CI runners will encounter errors or missing test definitions.
- Fix approach: Add `"test": "vitest run"` and `"test:watch": "vitest"` to `server/package.json`, and `"test": "npm --prefix server test"` to root `package.json`.

**Mixed Legacy Report Schema Properties:**
- Issue: The `IReport` model and controllers support both legacy fields (`_id`, `created_at`, `createdAt`, `pageSpeed`, `page_speed`, `bundleAnalysis`, `bundle_analysis`).
- Files: `server/models/Report.ts`, `server/controllers/analysisController.ts`, `server/services/analysis/index.ts`
- Impact: Clutters payload transformation logic, complicates typing, and invites property mismatch bugs.
- Fix approach: Standardize on clean TypeScript model contracts reflecting Supabase column names with a single serializer function.

**Linter Warnings in Test Utility:**
- Issue: `server/test_supabase.ts` declares unused variables (`users`, `projects`, `reports`, `comparisons`), producing 4 warnings on `npm run lint`.
- Files: `server/test_supabase.ts`
- Impact: Triggers Oxlint warnings during build/lint steps.
- Fix approach: Remove unused destructured variables or prefix with `_`.

## Known Bugs

**Ephemeral Scan PDF Export Inconsistency:**
- Symptoms: When the user scans as a guest (ephemeral report not persisted in Supabase), attempting to download via `/reports/:id/pdf` results in a 404 error.
- Files: `src/pages/ResultsPage.tsx`, `server/controllers/analysisController.ts`
- Trigger: Exporting PDF when database is unconfigured or scan is ephemeral.
- Workaround: The frontend implements a fallback calling `POST /api/v1/analysis/export-pdf` sending the in-memory report object.
- Permanent fix: Standardize on client-side blob generation or a single uniform export endpoint that accepts an optional payload or ID.

## Security Considerations

**Disabled Content Security Policy (CSP):**
- Risk: Helmet is configured with `contentSecurityPolicy: false` in `server/app.ts`.
- Files: `server/app.ts`
- Current mitigation: Allows Swagger UI and external asset previews to function without CSP header conflicts.
- Recommendations: Define a tailored CSP policy with explicit directives for Swagger UI (`/api/docs`) rather than disabling CSP globally.

**SSRF Attack Surface:**
- Risk: Scanners allow arbitrary user-supplied URLs to be crawled by Puppeteer.
- Files: `server/services/puppeteer/browser.ts`, `server/validators/analysisValidator.ts`
- Current mitigation: `validateUrlForSsrf` inspects target URLs and rejects localhost, 127.0.0.1, 0.0.0.0, and 169.254.169.254.
- Recommendations: Add DNS resolution check before connecting to prevent DNS rebinding attacks where an external domain resolves to a private IP (e.g. `10.0.0.0/8`, `192.168.0.0/16`).

**Guest Scan Denial of Service (DoS):**
- Risk: Any unauthenticated user can invoke `POST /api/v1/analysis/scan`, which launches heavy headless Chrome processes.
- Files: `server/routes/analysisRoutes.ts`, `server/middlewares/rateLimiter.ts`
- Current mitigation: Global rate limiter allows 100 requests per 15 minutes per IP.
- Recommendations: Implement a dedicated stricter rate limit for the scan endpoint (e.g. 5 scans per minute per IP) and add CAPTCHA for unauthenticated guests.

## Performance Bottlenecks

**Cold Browser Process Spawning:**
- Problem: `launchBrowser()` creates a new headless Chromium process on every single scan request.
- Files: `server/services/puppeteer/browser.ts`, `server/services/puppeteer/index.ts`
- Cause: Chromium process startup takes 1.5–3.0 seconds before navigation begins.
- Improvement path: Implement a browser pool or keep a single long-running browser instance open, spawning new incognito browser contexts (`browser.createBrowserContext()`) per scan.

**Unmanaged Temporary Screenshot Accumulation:**
- Problem: Puppeteer captures full-page and viewport PNG screenshots and saves them to `server/temp/`.
- Files: `server/services/puppeteer/screenshots.ts`, `server/temp/`
- Cause: No retention policy or deletion routine is scheduled. Over time, hundreds of high-resolution images accumulate on disk.
- Improvement path: Add an automatic garbage collection cleanup routine (e.g., delete files older than 1 hour) or store images in ephemeral memory buffers / object storage.

**External API Latency:**
- Problem: Google PageSpeed Insights API queries take 5–15 seconds to return audits.
- Files: `server/services/pagespeed.service.ts`
- Cause: Google's backend runs full mobile Lighthouse emulation remotely.
- Improvement path: The 15-minute sliding DB cache mitigates repeated lookups, but initial scans remain bound by Google API response times.

## Fragile Areas

**Puppeteer Page Navigation Timeout:**
- Files: `server/services/puppeteer/index.ts`
- Why fragile: Uses `waitUntil: 'networkidle2'` with a 30-second timeout. Heavily loaded websites with continuous polling, analytics scripts, or video ads may never reach network idle, causing timeout exceptions.
- Safe modification: Fall back gracefully to DOM content loaded or capture metrics even if network idle times out.
- Test coverage: Partially tested in `regression.test.ts`.

**Supabase Schema Drift:**
- Files: `server/supabase_schema.sql`, `server/controllers/`
- Why fragile: Schema changes in Supabase must be manually kept in sync with controller insert payloads (`analysisController.ts:57-83`). Missing columns fail inserts.
- Safe modification: Use a database migration tool (such as Supabase CLI or Prisma/Drizzle) rather than raw manual SQL scripts.

## Scaling Limits

**Concurrent Headless Browser Instances:**
- Current capacity: ~3–5 concurrent Puppeteer crawls on a standard 2GB RAM host.
- Limit: Each Chrome instance consumes 150–350 MB RAM; exceeding host memory causes process termination (OOM kill).
- Scaling path: Introduce an asynchronous job queue (e.g. BullMQ / Redis) to serialize crawl jobs with concurrency throttling, or offload crawling to a headless browser service (e.g. Browserless / Playwright fleet).

**Database Connection Pool:**
- Current capacity: Direct connection using `@supabase/supabase-js`.
- Limit: Supabase free tier enforces connection limits.
- Scaling path: Ensure Supabase Transaction Pooler (PgBouncer/Supavisor on port 6543) is used in production.

## Dependencies at Risk

**`mongodb: ^7.4.0` in root `package.json`:**
- Risk: Deprecated in this codebase following Supabase migration; adds dead dependencies and installation overhead.
- Impact: Slows down `npm install` and bloats `node_modules`.
- Migration plan: Run `npm uninstall mongodb`.

## Missing Critical Features

**Asynchronous Scan Job Queue:**
- Problem: Scans are executed synchronously within the HTTP request lifecycle. If a scan takes 25 seconds, the HTTP connection remains open.
- Blocks: Resilient background scanning, webhook notifications, and user notification when audits complete.

**CI/CD Automated Testing Pipeline:**
- Problem: No GitHub Actions or CI pipeline runs `npm test` or `oxlint` on pull requests.
- Blocks: Automated regression prevention before merging code.

## Test Coverage Gaps

**Frontend React Components:**
- What's not tested: Entire `src/` directory (pages, state management, components, routing).
- Files: `src/pages/*.tsx`, `src/context/AppContext.tsx`, `src/components/*.tsx`
- Risk: UI regressions, broken tab navigation, or state update bugs can go unnoticed.
- Priority: High

**PDF Generator Service:**
- What's not tested: `server/services/report/index.ts` PDF generation pipeline.
- Files: `server/services/report/index.ts`, `server/services/report/report.service.ts`
- Risk: Malformed or missing report metrics could cause unhandled exceptions during PDFKit rendering.
- Priority: Medium

**End-to-End Scan Pipeline:**
- What's not tested: Full `/api/v1/analysis/scan` controller execution with integrated services.
- Files: `server/controllers/analysisController.ts`
- Risk: Inter-service interface mismatches breaking the live endpoint.
- Priority: High

---

*Concerns audit: 2026-09-12*
