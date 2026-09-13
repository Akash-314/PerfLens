# PerfLens — Master Production Readiness PRD

## Mission

Turn PerfLens into a trustworthy, production-grade website performance and engineering audit platform.

The product must answer not only **what is wrong**, but also:

- What was actually measured?
- Where did the measurement come from?
- What evidence proves the finding?
- Is it lab or field data?
- Is the value measured, modeled, heuristic, or unavailable?
- How confident is the finding?
- What should the developer do?
- Can the improvement actually be quantified?

## Non-negotiable rules

1. Evidence before recommendation.
2. One source of truth for metric definitions and thresholds.
3. One canonical internal unit per metric.
4. `unavailable != 0 != poor`.
5. Measured != modeled.
6. Transfer savings != FCP/LCP savings.
7. Lab != field.
8. Frontend/PDF render backend truth; they do not invent or silently recalculate it.
9. No hardcoded domain-specific results.
10. N/A is better than fabricated data.
11. Root causes must be fixed before downstream symptoms.
12. A task is not complete merely because tests compile/pass; runtime evidence is required where applicable.

## Current known baseline

The latest Google report shows:

- LCP: 1.6s — GOOD
- CLS: 0.023 — GOOD
- INP: N/A — UNRATED
- FCP: 1.5s — GOOD
- TBT: 720ms — POOR
- TTFB: 1ms — GOOD
- JavaScript: 779 KB / 9 files
- CSS: 3.4 KB / 2 files
- Images: 0 KB / 0 files
- Fonts: 38.6 KB / 1 file

The latest report is materially better than the historical report because the previous LCP/INP/FCP classification problems have been addressed. However, the recommendation layer still requires evidence-level validation. fileciteturn9file0

## Core Web Vitals

Only:

- LCP — Largest Contentful Paint
- INP — Interaction to Next Paint
- CLS — Cumulative Layout Shift

are Core Web Vitals.

FCP, TBT and TTFB are additional performance metrics.

Thresholds:

| Metric | Good | Needs Improvement | Poor |
|---|---:|---:|---:|
| LCP | <= 2500ms | 2501–4000ms | >4000ms |
| INP | <= 200ms | 201–500ms | >500ms |
| CLS | <= 0.10 | 0.101–0.25 | >0.25 |

INP must never be substituted with TTI, Interactive, TBT, FCP, FID, or a fallback. If valid interaction/field data is unavailable, return N/A.

## Recommendation standard

Every recommendation must follow:

**Finding → Evidence → Potential Impact → Recommendation → Estimate (if defensible) → Confidence**

A recommendation must never be created solely because a score is below 100 or a resource is large.

For example:

`779 KB JS` does not prove:

- unminified JS
- unused JS
- tree shaking required
- code splitting required

A numeric estimate such as `89 KB / 200 KB/s = 0.45s` may be shown only as a **TRANSFER_ONLY MODEL** if the 89 KB is actually measured. It must not be presented as a 0.45s FCP/LCP improvement.

## Score standard

Metric scores come from the canonical metric classification layer.

An unavailable metric must not receive semantic score `0`, because `0` may mean genuinely poor measured performance.

Use:

- available + score 0 = measured poor result
- unavailable + score null = not measured

Weighted scores must exclude unavailable metrics from the denominator or explicitly report the overall score as unavailable, according to the documented scoring policy.

## Required analyzer order

1. Performance Analyzer
2. Core Web Vitals Analyzer
3. SEO & Meta Analyzer
4. Accessibility Analyzer
5. Image Optimization Analyzer
6. JavaScript Analyzer
7. CSS Analyzer
8. Network / Waterfall Analyzer
9. Bundle Analyzer
10. Score Analyzer
11. Recommendation Analyzer
12. Cross-analyzer validation
13. Security / production readiness
14. Clean-room final validation

## Regression domains

- google.com
- react.dev
- github.com
- developer.mozilla.org
- news.ycombinator.com
- vercel.com

Do not hardcode expected production values for these domains. Use them to expose false positives, unit bugs, source confusion, instability, and stale data.

## Ralph Loop

Ralph must:

1. Read the PRD.
2. Select the highest-priority incomplete task whose prerequisites are satisfied.
3. Inspect before editing.
4. Fix the root cause.
5. Run targeted tests.
6. Run full test/lint/build gates.
7. Run fresh runtime validation for analyzer changes.
8. Set `passes=true` only after objective acceptance criteria pass.
9. Never hide failures with `any`, `@ts-ignore`, arbitrary defaults, or fake fallbacks.
10. Continue to the next task only after the current task genuinely passes.
11. Continue until the Definition of Done is satisfied.

If a later task exposes a defect in an earlier task, reopen the earlier task and fix it.

## GSD

GSD is responsible for turning each task into a focused implementation plan, identifying dependencies, minimizing unnecessary rewrites, and validating that implementation matches the acceptance criteria.

For analyzer tasks, GSD must require runtime evidence rather than relying only on unit tests.

## Definition of Done

The project is finished only when:

- all required P0/P1 tasks pass;
- fresh regression scans pass;
- no known critical measurement or scoring bugs remain;
- recommendations are evidence-backed;
- PDF/JSON/API/frontend/database agree;
- security checks pass;
- production configuration works without localhost dependencies;
- tests, lint, and build pass;
- `FINAL_PRODUCTION_READINESS_REPORT.md` is generated;
- remaining limitations are explicitly documented.
