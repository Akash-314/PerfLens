# External Integrations

**Analysis Date:** 2026-09-12

## APIs & External Services

**Performance Telemetry:**
- Google PageSpeed Insights API v5 - Fetches authoritative Lighthouse audits, Core Web Vitals (LCP, FCP, INP, CLS, TTFB, TBT), and category scores (performance, accessibility, SEO, best practices)
  - SDK/Client: `axios` in `server/services/pagespeed.service.ts`
  - Auth: `PAGESPEED_API_KEY` environment variable (optional; API functions with IP quotas if key is omitted)
  - Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
  - Strategy: Mobile audit preset (`strategy=mobile`) with 20s network timeout

**Headless Browser Automation:**
- Chrome DevTools Protocol (CDP) / Puppeteer - Controls automated headless browser sessions for live page DOM extraction, CSS/JS coverage tracking, resource waterfall logging, and screenshot generation
  - SDK/Client: `puppeteer` (^24.0.0) in `server/services/puppeteer/index.ts`
  - Protocol: DevTools Protocol (CDP) via Chrome connection

## Data Storage

**Databases:**
- Supabase (PostgreSQL 15+)
  - Connection: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) in `server/config/supabase.ts`
  - Client: `@supabase/supabase-js`
  - Schema: Managed via `server/supabase_schema.sql`
  - Tables:
    - `users`: User profiles with email, bcrypt hashed password, and role (`user` | `admin`)
    - `projects`: Monitored web property groups and team assignments
    - `reports`: Full performance inspection records, JSON metric payloads, scores, and timestamps
    - `saved_comparisons`: Side-by-side URL benchmark history
  - Fallback / Guest Mode: If Supabase credentials are missing or unconfigured, the system automatically falls back to ephemeral in-memory operation (`crypto.randomUUID()` IDs) without throwing fatal errors.

**File Storage:**
- Local Filesystem Only:
  - Puppeteer screenshots: Temporarily written to `server/temp/screenshot_*.png` by `server/services/puppeteer/screenshots.ts`
  - Generated validation markdown reports: Written to `reports/` by `server/services/analysis/validationGenerator.ts`
  - Exported PDF binaries: Streamed directly in-memory via `pdfkit` buffers to HTTP responses in `server/controllers/analysisController.ts` and `server/controllers/report.controller.ts`

**Caching:**
- In-Database Telemetry Cache:
  - Implemented in `server/services/pagespeed.service.ts`
  - Strategy: 15-minute sliding TTL cache on the `reports` table matching the target normalized domain
  - Behavior: If a valid scan with PageSpeed data exists within the past 15 minutes, telemetry is reused to preserve API quotas and accelerate turnaround time.

## Authentication & Identity

**Auth Provider:**
- Custom JWT & bcrypt implementation
  - Implementation:
    - Registration: `POST /api/v1/auth/register` validates unique email, hashes password with `bcryptjs` salt rounds 10, stores record in Supabase `users` table, and issues a JWT token.
    - Login: `POST /api/v1/auth/login` verifies bcrypt hash and returns JWT token signed with `JWT_SECRET`.
    - Session Verification: `GET /api/v1/auth/me` validates `Authorization: Bearer <token>` header via `server/middlewares/auth.ts`.
    - Client Auth: `src/services/auth/auth.service.ts` stores token in browser `localStorage`.

## Monitoring & Observability

**Error Tracking:**
- Centralized Express Error Middleware: `server/middlewares/errorHandler.ts` catches unhandled controller errors and formats standard JSON error responses.
- Process-Level Error Handlers: `server/server.ts` registers `unhandledRejection` and `uncaughtException` listeners to prevent silent node process crashes.
- Sub-Analyzer Diagnostics: Each analyzer (image, CSS, JS, SEO, accessibility) captures errors into an `errors: string[]` array without failing the overall crawl pipeline.

**Logs:**
- HTTP Request Logging: `morgan('dev')` in `server/app.ts` logs method, route, status code, and response time.
- Diagnostic Console Traces: Service-tagged console logs with prefixes:
  - `[PerfLens Server]`
  - `[Analysis Controller]`
  - `[Report Generator]`
  - `[PageSpeed Service]`
  - `[Supabase Alert]`
  - `[Validation Framework]`

## CI/CD & Deployment

**Hosting:**
- Self-hosted Node.js / Docker container target for server
- Static hosting / CDN (e.g. Vercel, Netlify, Cloudflare Pages) or Express static serving for Vite client bundle (`dist/`)

**CI Pipeline:**
- None detected currently in repository (no `.github/workflows/` configured)

## Environment Configuration

**Required env vars:**
- `PORT` - Port for Express HTTP listener (default: `5001`)
- `NODE_ENV` - Environment identifier (`development` | `production`)
- `JWT_SECRET` - HMAC secret key for signing auth tokens (enforced in production)
- `SUPABASE_URL` - Supabase project URL (enforced in production)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin service role key for bypassing RLS or executing privileged operations
- `SUPABASE_ANON_KEY` - Alternative public anon key for Supabase access
- `PAGESPEED_API_KEY` - Google Cloud API key for PageSpeed Insights API v5

**Secrets location:**
- `server/.env` (excluded from git via `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-09-12*
