# Codebase Structure

**Analysis Date:** 2026-09-12

## Directory Layout

```
Perflens/
├── .planning/                  # GSD planning, roadmap, and codebase intelligence documents
│   └── codebase/               # Codebase mapping documentation (7 core documents)
├── public/                     # Static client assets served directly by Vite
├── reports/                    # Auto-generated validation audit reports
├── server/                     # Express backend application & analysis engine
│   ├── config/                 # Environment validation, database setup, and metrics thresholds
│   ├── controllers/            # HTTP request controllers (scan, auth, projects, reports)
│   ├── middlewares/            # Express middlewares (auth, rate limiting, error handling)
│   ├── models/                 # TypeScript interfaces and data model definitions
│   ├── routes/                 # Express API router definitions (`/api/v1/*`)
│   ├── scratch/                # Temporary inspection and validation scratch scripts
│   ├── services/               # Core domain engines, crawlers, and sub-analyzers
│   │   ├── accessibilityAnalyzer/ # Web accessibility (WCAG) checks
│   │   ├── analysis/           # Central report orchestrator & QA validation generator
│   │   ├── cssAnalyzer/        # CSS file weight, minification, and unused rule analysis
│   │   ├── imageAnalyzer/      # Image formats, compression savings, and alt tags
│   │   ├── jsAnalyzer/         # JavaScript bundle analysis, unused code, script count
│   │   ├── pagespeed/          # Google PageSpeed Insights types and wrappers
│   │   ├── puppeteer/          # Headless Chrome automation, CDP timings, resources
│   │   ├── recommendation/     # Recommendation engine and rule catalog
│   │   ├── report/             # Multi-page PDF report generation with PDFKit
│   │   └── seoAnalyzer/        # Search engine optimization and metadata auditing
│   ├── temp/                   # Temporary file storage (Puppeteer screenshots)
│   ├── tests/                  # Vitest automated test suite (regression & boundary tests)
│   ├── validators/             # Express-validator input validation schemas
│   ├── app.ts                  # Express application setup, middlewares, and swagger mounting
│   ├── server.ts               # Server startup entry point and listener
│   ├── supabase_schema.sql     # Database table schema and indexes for Supabase
│   └── tsconfig.json           # Server TypeScript compiler configuration
├── src/                        # React SPA frontend application
│   ├── assets/                 # Client images and SVGs
│   ├── components/             # Reusable UI components (Sidebar, TopNav, CommandMenu)
│   ├── context/                # Global React application state (AppContext)
│   ├── pages/                  # Page views (Dashboard, ResultsPage, Analysis, Login, etc.)
│   ├── services/               # Client-side API services (auth)
│   ├── App.css                 # Base application styles
│   ├── App.tsx                 # Root application component and routing layout
│   ├── index.css               # Global design system tokens and styling rules
│   └── main.tsx                # Client application mounting entry point
├── .oxlintrc.json              # Oxlint linter configuration
├── index.html                  # Main HTML entry document for Vite
├── package.json                # Root npm package manifest
├── tsconfig.json               # Root TypeScript configuration references
├── tsconfig.app.json           # Frontend TypeScript compiler configuration
├── tsconfig.node.json          # Vite node tooling TypeScript configuration
└── vite.config.ts              # Vite bundler configuration and dev proxy
```

## Directory Purposes

**`src/pages/`:**
- Purpose: Top-level page views rendered based on `currentTab` in `AppContext`
- Contains: React components representing distinct application views
- Key files: `Dashboard.tsx`, `WebsiteAnalysis.tsx`, `ResultsPage.tsx`, `Recommendations.tsx`, `ComparisonPage.tsx`, `Projects.tsx`, `ReportsList.tsx`, `Login.tsx`, `Register.tsx`

**`src/components/`:**
- Purpose: Reusable UI layout elements and interactive navigation controls
- Contains: React functional components styled with custom CSS classes
- Key files: `Sidebar.tsx`, `TopNav.tsx`, `CommandMenu.tsx`, `ProtectedRoute.tsx`

**`src/context/`:**
- Purpose: Application-wide reactive state management
- Contains: React Context providers, state hooks, and data models
- Key files: `AppContext.tsx` (manages auth, active report, scan progress, toasts, and history)

**`server/controllers/`:**
- Purpose: HTTP request handling, input extraction, and response formatting
- Contains: Controller functions invoking domain services
- Key files: `analysisController.ts`, `authController.ts`, `projectController.ts`, `report.controller.ts`, `userController.ts`

**`server/services/puppeteer/`:**
- Purpose: Headless browser crawling and CDP telemetry extraction
- Contains: Browser launcher, network tracker, timing observers, DOM scrapers, and screenshot utilities
- Key files: `index.ts`, `browser.ts`, `resources.ts`, `timings.ts`, `metadata.ts`, `screenshots.ts`

**`server/services/analysis/`:**
- Purpose: Top-level analysis orchestration and data reconciliation
- Contains: `ReportGenerator` class coordinating parallel pipelines and `ValidationGenerator`
- Key files: `index.ts`, `helpers.ts`, `validationGenerator.ts`

**`server/services/recommendation/`:**
- Purpose: Heuristic rule evaluation and remediation advice generation
- Contains: Rules registry and recommendation engine
- Key files: `index.ts`, `rules.ts`, `types.ts`

**`server/services/report/`:**
- Purpose: PDF report document compilation
- Contains: PDFKit generation service and styling helpers
- Key files: `index.ts`, `report.service.ts`, `helpers.ts`

**`server/config/`:**
- Purpose: Runtime configuration, database connectivity, and authoritative metrics standards
- Contains: Environment validator, Supabase client initialization, and performance threshold tables
- Key files: `supabase.ts`, `database.ts`, `envValidator.ts`, `performanceThresholds.ts`

**`server/tests/`:**
- Purpose: Automated regression and boundary testing
- Contains: Vitest test suites verifying metric classifications and rules
- Key files: `performanceThresholds.test.ts`, `regression.test.ts`, `adversarialValidation.test.ts`

## Key File Locations

**Entry Points:**
- `server/server.ts`: Backend HTTP listener entry point
- `server/app.ts`: Express application initialization and middleware pipeline
- `src/main.tsx`: Frontend React root rendering
- `src/App.tsx`: Root component, tab-based routing, and layout structure

**Configuration:**
- `server/.env`: Backend environment variables (untracked)
- `server/config/envValidator.ts`: Startup environment variable validation
- `server/config/supabase.ts`: Supabase client configuration
- `server/config/performanceThresholds.ts`: Authoritative Core Web Vitals thresholds
- `vite.config.ts`: Client bundler configuration and `/api` proxying
- `.oxlintrc.json`: Linter rules

**Core Logic:**
- `server/services/analysis/index.ts`: Central scan pipeline orchestrator
- `server/services/puppeteer/index.ts`: Puppeteer browser crawl execution
- `server/services/pagespeed.service.ts`: PageSpeed Insights client & caching
- `server/services/recommendation/rules.ts`: Audit rule catalog
- `server/services/report/index.ts`: PDF generation engine
- `src/context/AppContext.tsx`: Client-side state manager and scan dispatch

**Testing:**
- `server/tests/performanceThresholds.test.ts`: Vitals boundary tests
- `server/tests/adversarialValidation.test.ts`: Real-world fixture audits (Google, HN)
- `server/tests/regression.test.ts`: Engine regression tests

## Naming Conventions

**Files:**
- React components and pages: PascalCase (`ResultsPage.tsx`, `Sidebar.tsx`)
- Server services and helpers: camelCase with role suffix (`pagespeed.service.ts`, `analysisValidator.ts`, `helpers.ts`)
- Server routes: camelCase with route suffix or dot notation (`analysisRoutes.ts`, `report.routes.ts`)
- Model interfaces: PascalCase (`Report.ts`, `User.ts`)
- Test files: `*.test.ts` (`regression.test.ts`)

**Directories:**
- Frontend: lowercase/camelCase (`components`, `context`, `pages`, `services`)
- Server: lowercase/camelCase (`config`, `controllers`, `middlewares`, `models`, `routes`, `services`)
- Analyzers: camelCase named after domain (`cssAnalyzer`, `imageAnalyzer`, `jsAnalyzer`, `seoAnalyzer`, `accessibilityAnalyzer`)

## Where to Add New Code

**New Audit Rule:**
- Primary code: `server/services/recommendation/rules.ts` (add new rule definition to `rules` array)
- Types: `server/services/recommendation/types.ts`
- Tests: `server/tests/adversarialValidation.test.ts`

**New Sub-Analyzer Module:**
- Directory: `server/services/<newAnalyzer>/`
- Entry point: `server/services/<newAnalyzer>/index.ts`
- Service logic: `server/services/<newAnalyzer>/<newAnalyzer>.service.ts`
- Types: `server/services/<newAnalyzer>/types.ts`
- Wiring: Integrate into `server/services/puppeteer/index.ts` and `server/services/analysis/index.ts`

**New API Endpoint:**
- Route: `server/routes/<feature>Routes.ts`
- Validator: `server/validators/<feature>Validator.ts`
- Controller: `server/controllers/<feature>Controller.ts`
- Mount in: `server/app.ts` under `/api/v1/<feature>`

**New Frontend View/Tab:**
- Component: `src/pages/<ViewName>.tsx`
- Navigation: Add tab identifier to `currentTab` union in `src/context/AppContext.tsx`
- Layout: Add tab to `src/App.tsx` router and `src/components/Sidebar.tsx` navigation items

**New Database Table / Migration:**
- SQL definition: `server/supabase_schema.sql`
- Model types: `server/models/<ModelName>.ts`

## Special Directories

**`server/temp/`:**
- Purpose: Temporary scratch directory for Puppeteer screenshots and test runs
- Generated: Yes (created during scans)
- Committed: No (contains runtime-generated PNGs)

**`reports/`:**
- Purpose: Output directory for validation audit markdown reports
- Generated: Yes (by `ValidationGenerator`)
- Committed: Tracked as project documentation

**`dist/`:**
- Purpose: Production Vite client build output
- Generated: Yes (`npm run build`)
- Committed: No (ignored by `.gitignore`)

---

*Structure analysis: 2026-09-12*
