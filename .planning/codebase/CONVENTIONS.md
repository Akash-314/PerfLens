# Coding Conventions

**Analysis Date:** 2026-09-12

## Naming Patterns

**Files:**
- React components and pages: PascalCase with `.tsx` extension (`ResultsPage.tsx`, `Sidebar.tsx`, `CommandMenu.tsx`)
- Server services, controllers, routes, middlewares: camelCase with `.ts` extension (`pagespeed.service.ts`, `analysisController.ts`, `errorHandler.ts`)
- TypeScript models: PascalCase (`Report.ts`, `User.ts`, `Project.ts`)
- Test suites: camelCase ending in `.test.ts` (`regression.test.ts`, `performanceThresholds.test.ts`)
- Configuration files: lowercase or dot-prefixed (`vite.config.ts`, `.oxlintrc.json`)

**Functions:**
- camelCase for functions and methods (`scanWebsite`, `classifyMetric`, `extractTimings`, `normalizeUrl`)
- Verb-first naming: `get...`, `analyze...`, `extract...`, `calculate...`, `handle...` (`getPageSpeedTelemetry`, `analyzeImages`, `calculateOverallHealthScore`)
- React components: PascalCase (`ResultsPage`, `Sidebar`, `AppContent`)
- React custom hooks: `use` prefix (`useApp`)

**Variables:**
- camelCase for local variables and properties (`targetUrl`, `isPuppeteerSuccess`, `pageSpeedTelemetry`)
- UPPER_SNAKE_CASE for exported constants and threshold configurations (`PERFORMANCE_THRESHOLDS`, `METRIC_WEIGHTS`, `API_BASE`)
- Booleans prefixed with `is`, `has`, `should`, or `can` (`isScanning`, `hasAlt`, `isSupabaseConfigured`)

**Types:**
- Interfaces prefixed with `I` for data contracts (`IReport`, `IMetricDetail`, `IPageSpeedMetrics`, `IUser`)
- Type aliases: PascalCase without prefix (`PuppeteerScanResult`, `MetricClassification`, `AuthResponse`)
- Database row types suffixed with `Row` (`UserRow`, `ProjectRow`)

## Code Style

**Formatting:**
- Standard 2-space indentation
- Semicolons used consistently
- Single quotes preferred for strings in TypeScript/JavaScript; double quotes in JSON
- Trailing commas in multi-line objects and arrays

**Linting:**
- Tool: Oxlint 1.69.0 (`.oxlintrc.json`)
- Plugins enabled: `react`, `typescript`, `oxc`
- Key rules:
  - `react/rules-of-hooks`: `error`
  - `react/only-export-components`: `["warn", { "allowConstantExport": true }]`
  - `eslint(no-unused-vars)`: Flags unused variables (variables prefixed with `_` ignored)

## Import Organization

**Order:**
1. External npm packages and built-in Node modules (`import express from 'express';`, `import crypto from 'crypto';`, `import React from 'react';`)
2. Internal configuration and utilities (`import { supabase } from '../config/supabase.js';`)
3. Internal domain services and engines (`import ReportGenerator from '../services/analysis/index.js';`)
4. Internal middlewares and validators (`import { AuthenticatedRequest } from '../middlewares/auth.js';`)
5. Type-only imports (`import type { User } from '../services/auth/auth.types';`)

**Path Extensions:**
- ES Module requirement in server code: Relative imports in `server/` must specify the `.js` extension even when importing TypeScript files (`import app from './app.js';`, `import connectDatabase from './config/database.js';`), matching NodeNext resolution.

**Path Aliases:**
- None configured; all imports use relative paths (`../services/...`, `./components/...`).

## Error Handling

**Patterns:**
- Try/Catch with Graceful Fallback:
  - Critical services (e.g. database persistence, PageSpeed API, image scrapers) wrap execution in `try / catch` blocks and return fallback or ephemeral objects rather than crashing the orchestrator pipeline.
  ```typescript
  try {
    const isConnected = await checkSupabaseConnection();
    // ...
  } catch (error: any) {
    console.warn(`[Service Alert]: ${error.message}. Proceeding in fallback mode.`);
  }
  ```
- Error Arrays in Audit Results:
  - Analyzers collect errors into an `errors: string[]` array attached to the return object so diagnostics can be inspected without rejecting promises.
- Centralized HTTP Error Handling:
  - Controllers forward unhandled exceptions to `next(error)`, which is caught by `server/middlewares/errorHandler.ts` to return standard JSON:
  ```json
  {
    "success": false,
    "message": "Error description"
  }
  ```

## Logging

**Framework:**
- Built-in `console.log`, `console.warn`, and `console.error`
- HTTP requests logged using `morgan('dev')` in Express

**Patterns:**
- Tagged service prefixes to enable easy filtering in server stdout:
  - `[PerfLens Server]: ...`
  - `[Analysis Controller]: ...`
  - `[Report Generator]: ...`
  - `[PageSpeed Service]: ...`
  - `[Supabase Alert]: ...`
  - `[Validation Framework]: ...`
- Informational traces logged during scan pipeline progression (start, duration, cache hit/miss).

## Comments

**When to Comment:**
- Method headers documenting function purpose, parameters, and return types.
- Complex heuristic scoring logic or mathematical normalization formulas (e.g., metric classification algorithms in `performanceThresholds.ts`).
- Route documentation for controllers (`// @desc ... // @route ... // @access ...`).

**JSDoc/TSDoc:**
- Widely used across service methods:
  ```typescript
  /**
   * Orchestrate all crawlers, PageSpeed audits and sub-analyzer modules.
   *
   * @param {string} url - Scanned target URL
   * @param {string | null} ownerId - Authenticated User ID (if logged in)
   * @param {boolean} includePageSpeed - If true, fetch PageSpeed Insights telemetry
   * @returns {Promise<object>} - Fully populated Report object properties
   */
  ```

## Function Design

**Size:**
- Modular, single-responsibility helper functions (e.g., `normalizeUrl`, `classifyMetric`, `detectCommonLibrary`).
- Complex orchestration split into clear lifecycle phases (crawling, sub-analysis, reconciliation, recommendation, persistence).

**Parameters:**
- Explicit TypeScript type annotations on all parameters.
- Default parameter values used for optional configuration flags (`forceSkipApi: boolean = false`, `includePageSpeed: boolean = true`).

**Return Values:**
- Explicit return type annotations on public functions (`Promise<IPageSpeedData | null>`, `MetricClassification`).
- Consistent return shapes (avoiding returning mixed types without union types).

## Module Design

**Exports:**
- Named exports preferred for domain functions and service objects (`export const analyzeImages = ...`).
- Default exports used for main Express application (`export default app;`), routers, and service singletons (`export default ReportGenerator;`).

**Barrel Files:**
- Analyzer modules employ barrel files (`index.ts`) that export the primary analyzer function and re-export related helpers and types (`server/services/puppeteer/index.ts`, `server/services/recommendation/index.ts`).

---

*Convention analysis: 2026-09-12*
