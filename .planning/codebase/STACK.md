# Technology Stack

**Analysis Date:** 2026-09-12

## Languages

**Primary:**
- TypeScript 5.3.3 / 6.0.2 - Full-stack typing across backend Express services (`server/`) and frontend React application (`src/`)

**Secondary:**
- JavaScript (ES Modules) - Node.js ES module runtime execution (`"type": "module"`)
- HTML5 & CSS3 - Custom styling system without CSS frameworks (`src/index.css`, `src/App.css`)
- SQL (PostgreSQL dialect) - Database schema definitions for Supabase (`server/supabase_schema.sql`)

## Runtime

**Environment:**
- Node.js (v20+ / v22.16.0 detected)
- Execution Engine: `tsx` (v4.7.0) for TypeScript execution in Node without compilation step (`server/package.json`)

**Package Manager:**
- npm (v10+)
- Lockfile: Present (`package-lock.json` in root and `server/package-lock.json` in server)

## Frameworks

**Core:**
- React 19.2.7 - Single-page frontend user interface (`src/App.tsx`, `src/main.tsx`)
- Express 4.21.2 - REST API gateway and HTTP route handling (`server/app.ts`, `server/server.ts`)

**Testing:**
- Vitest 5.0.0 - Fast unit and regression testing framework for server services (`server/tests/`)

**Build/Dev:**
- Vite 8.1.0 - Client application bundler and dev server with HMR (`vite.config.ts`)
- TypeScript Compiler (`tsc`) - Type checking (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `server/tsconfig.json`)
- Oxlint 1.69.0 - High-performance JavaScript/TypeScript linter (`.oxlintrc.json`)
- Concurrently 10.0.3 - Simultaneous execution of Vite client and Express server (`package.json`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` (^2.116.0) - Supabase PostgreSQL client for user accounts, projects, reports, and comparisons (`server/config/supabase.ts`)
- `puppeteer` (^24.0.0) - Headless Chrome automation for DOM inspection, CSS/JS coverage tracking, resource monitoring, and screenshots (`server/services/puppeteer/index.ts`)
- `pdfkit` (^0.16.0) - Programmatic PDF report generation engine (`server/services/report/index.ts`)
- `axios` (^1.7.9) - HTTP client for external telemetry fetching from Google PageSpeed Insights API (`server/services/pagespeed.service.ts`)
- `recharts` (^3.9.0) - Interactive charts for Core Web Vitals, resource breakdowns, and performance trends (`src/pages/ResultsPage.tsx`, `src/pages/Dashboard.tsx`)
- `lucide-react` (^1.21.0) - Icon system throughout the frontend UI (`src/components/`, `src/pages/`)
- `bcryptjs` (^2.4.3) - Salted password hashing for user authentication (`server/models/User.ts`, `server/controllers/authController.ts`)
- `jsonwebtoken` (^9.0.2) - Signed JWT token generation and verification (`server/middlewares/auth.ts`, `server/controllers/authController.ts`)

**Infrastructure:**
- `helmet` (^8.0.0) - Security HTTP headers middleware (`server/app.ts`)
- `cors` (^2.8.5) - Cross-Origin Resource Sharing middleware (`server/app.ts`)
- `morgan` (^1.10.0) - HTTP request logger middleware (`server/app.ts`)
- `express-rate-limit` (^7.5.0) - IP-based rate limiting on API endpoints (`server/middlewares/rateLimiter.ts`)
- `express-validator` (^7.2.1) - Schema validation for incoming request payloads (`server/validators/`)
- `dotenv` (^16.4.7) - Environment configuration loader (`server/config/envValidator.ts`)
- `swagger-ui-express` (^5.0.1) & `swagger-jsdoc` (^6.2.8) - Interactive OpenAPI documentation at `/api/docs` (`server/app.ts`)

## Configuration

**Environment:**
- Configured via `.env` in `server/.env` (validated by `server/config/envValidator.ts` at startup)
- Key configs required:
  - `PORT`: Server listen port (default 5001)
  - `NODE_ENV`: Runtime environment (`development`, `production`, `test`)
  - `JWT_SECRET`: Secret key for JWT authentication
  - `SUPABASE_URL`: Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`: Supabase API access credentials
  - `PAGESPEED_API_KEY`: Google Cloud API key for PageSpeed Insights (optional with rate limits)

**Build:**
- Client build: `vite.config.ts` (proxies `/api` to `http://localhost:5001`)
- Client TypeScript: `tsconfig.app.json` (targets ES2022, bundler module resolution, strict mode)
- Node TypeScript: `tsconfig.node.json` (targets ES2022 for Vite tooling)
- Server TypeScript: `server/tsconfig.json` (targets ES2022, NodeNext module resolution)
- Linting: `.oxlintrc.json` (react, typescript, oxc plugins)

## Platform Requirements

**Development:**
- Node.js >= 20.0.0
- npm >= 10.0.0
- Local Chromium installation (bundled automatically by Puppeteer)
- Modern web browser (Chrome, Edge, Firefox, Safari)

**Production:**
- Node.js LTS runtime container / Linux VM
- Chromium/Chrome dependencies (libnss3, libatk, etc.) for Puppeteer headless crawling
- Supabase PostgreSQL cloud instance or self-hosted Supabase
- Google Cloud Console access with PageSpeed Insights API enabled

---

*Stack analysis: 2026-09-12*
