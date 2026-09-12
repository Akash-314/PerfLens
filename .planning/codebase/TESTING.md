# Testing Patterns

**Analysis Date:** 2026-09-12

## Test Framework

**Runner:**
- Vitest 5.0.0 (`server/node_modules/vitest`)
- Config: Configured within `server/` running with tsx/ESM support

**Assertion Library:**
- Vitest built-in assertions (`expect` from `vitest`)

**Run Commands:**
```bash
npx --prefix server vitest run      # Run all server tests once
npx --prefix server vitest watch    # Run tests in watch mode
npx --prefix server vitest --coverage # Run tests with coverage reporting
```

> **Note on Scripts:** Currently, neither `package.json` nor `server/package.json` defines a `"test"` npm script. Tests are invoked directly via `npx --prefix server vitest run`.

## Test File Organization

**Location:**
- Located in dedicated directory: `server/tests/`

**Naming:**
- Named with `*.test.ts` pattern:
  - `performanceThresholds.test.ts`
  - `regression.test.ts`
  - `adversarialValidation.test.ts`

**Structure:**
```
server/tests/
├── performanceThresholds.test.ts   # Core Web Vitals boundary & threshold classifications
├── regression.test.ts              # Regression suites for known historical bugs (CLS=0, LCP=1.9s)
└── adversarialValidation.test.ts   # Real-world fixture audits & quality gate assertions
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';
import { classifyMetric } from '../config/performanceThresholds.js';
import { rules } from '../services/recommendation/rules.js';

describe('Performance Thresholds & Authoritative Web.dev Standards', () => {

  describe('1. CLS = 0 and Boundaries', () => {
    it('CLS = 0 must be classified as "good"', () => {
      const res = classifyMetric('cls', 0);
      expect(res.rating).toBe('good');
      expect(res.classification).toBe('good');
      expect(res.score).toBe(100);
      expect(res.displayValue).toBe('0.000');
    });

    it('CLS = 0.10 boundary must be "good"', () => {
      const res = classifyMetric('cls', 0.10);
      expect(res.rating).toBe('good');
    });

    it('CLS = 0.101 must be "needs-improvement"', () => {
      const res = classifyMetric('cls', 0.101);
      expect(res.rating).toBe('needs-improvement');
    });
  });

  describe('2. TBT = 0 and Boundaries', () => {
    it('TBT = 0 must be classified as "good"', () => {
      const res = classifyMetric('tbt', 0);
      expect(res.rating).toBe('good');
      expect(res.score).toBe(100);
      expect(res.displayValue).toBe('0ms');
    });
  });
});
```

**Patterns:**
- **Boundary Value Analysis**: Testing exact boundary values (e.g. `2.5s` vs `2.51s`, `0.10` vs `0.101`, `200ms` vs `201ms`) to guarantee classification fidelity against Web.dev standards.
- **Unit Normalization Verification**: Checking that string representations (`"1.9s"`, `"1900ms"`), explicit units (`('lcp', 1900, 'ms')`), and raw numbers all normalize consistently.
- **Negative & Edge Testing**: Zero values (`CLS = 0`, `TBT = 0`), empty inputs, and values far beyond poor thresholds (`CLS = 1.5`, `LCP = 12s`).

## Mocking

**Framework:**
- Vitest built-in mocking utilities (`vi.fn()`, `vi.spyOn()`, `vi.mock()`)

**Patterns:**
- Testing functions are primarily designed as pure functions (e.g., `classifyMetric`, `detectCommonLibrary`, rule evaluators in `rules.ts`), minimizing the need for heavy mocking in the current test suite.

**What to Mock:**
- External network requests to Google PageSpeed API (`axios.get`)
- Puppeteer browser instances and page navigations
- Supabase database client queries

**What NOT to Mock:**
- Metric threshold calculations and classification logic (`classifyMetric`)
- Recommendation rule conditions and heuristic predicates
- Text formatters, score calculators, and URL normalizers

## Fixtures and Factories

**Test Data:**
- Synthetic audit reports representing real-world targets (`google.com`, `news.ycombinator.com`, `react.dev`) with known telemetry snapshots to test recommendation triggers and scorecard calculations.
```typescript
const mockGoogleAudit = {
  url: 'https://www.google.com',
  vitals: {
    lcp: { rawValue: 1900, rating: 'good' },
    fcp: { rawValue: 1700, rating: 'good' },
    cls: { rawValue: 0, rating: 'good' },
    tbt: { rawValue: 0, rating: 'good' }
  },
  seo: { title: 'Google', description: '' }
};
```

**Location:**
- Inline inside test files (`server/tests/adversarialValidation.test.ts`) and scratch test runners (`server/temp/run_validation_test.ts`).

## Coverage

**Requirements:**
- No strict minimum coverage threshold enforced currently by CI.
- All 75 tests in the server test suite must pass (`0` failures).

**View Coverage:**
```bash
npx --prefix server vitest run --coverage
```

## Test Types

**Unit Tests:**
- Core Web Vitals classification rules (`performanceThresholds.test.ts`)
- Script minification detection and library fingerprinting (`adversarialValidation.test.ts`)
- Recommendation rule triggers and priority assignment

**Integration Tests:**
- Engine regression suite (`regression.test.ts`) verifying that orchestrator scoring calculations match expected scorecard values across known audit outputs.

**E2E Tests:**
- Not currently implemented. Full end-to-end browser crawls against live external sites are performed manually or via scratch scripts (`server/check_report.ts`, `server/temp/run_validation_test.ts`).

## Common Patterns

**Async Testing:**
```typescript
it('resolves database health check within timeout', async () => {
  const isConnected = await checkSupabaseConnection();
  expect(typeof isConnected).toBe('boolean');
});
```

**Error & Boundary Testing:**
```typescript
it('rejects invalid or loopback URLs for SSRF protection', () => {
  expect(validateUrlForSsrf('http://127.0.0.1:5001')).toBe(false);
  expect(validateUrlForSsrf('http://localhost:3000')).toBe(false);
  expect(validateUrlForSsrf('http://169.254.169.254/latest/meta-data/')).toBe(false);
  expect(validateUrlForSsrf('https://google.com')).toBe(true);
});
```

---

*Testing analysis: 2026-09-12*
