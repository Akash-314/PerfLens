# PerfLens Core Web Vitals Audit & Engineering Architecture

**Authoritative Standard:** Web.dev Core Web Vitals Specification  
**Version:** 2.0  
**Audit Date:** 2026-09-14  
**Status:** VERIFIED & DEFENDED  

---

## 1. Executive Summary

PerfLens implements a strict, trustworthy Core Web Vitals (CWV) measurement and auditing pipeline. Prior defects—including TTI-to-INP substitutions, CLS=0 treated as missing/poor, and unit confusion (seconds vs milliseconds)—have been completely eliminated at the root cause.

This document details the exact measurement sources, canonical units, session-window calculation logic, and lab vs field distinction enforced across the PerfLens engine.

---

## 2. Metric Classification & Provenance

In accordance with Web.dev standards, Core Web Vitals are strictly:
1. **Largest Contentful Paint (LCP)**
2. **Cumulative Layout Shift (CLS)**
3. **Interaction to Next Paint (INP)**

Other performance metrics (**First Contentful Paint (FCP)**, **Total Blocking Time (TBT)**, and **Time to First Byte (TTFB)**) are tracked and classified independently and are never substituted for CWV.

| Metric | Canonical Unit | Lab Source | Field Source | Good Threshold | Needs Improvement | Poor Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LCP** | Milliseconds (`ms`) | `PerformanceObserver('largest-contentful-paint')` / Lighthouse | CrUX `LARGEST_CONTENTFUL_PAINT_PERCENTILE` | $\le 2500\text{ ms}$ | $\le 4000\text{ ms}$ | $> 4000\text{ ms}$ |
| **CLS** | Unitless | Dynamic Session Window over `layout-shift` entries | CrUX `CUMULATIVE_LAYOUT_SHIFT_SCORE_PERCENTILE` | $\le 0.10$ | $\le 0.25$ | $> 0.25$ |
| **INP** | Milliseconds (`ms`) | Synthetic interaction (if active) or `N/A` | CrUX `INTERACTION_TO_NEXT_PAINT_PERCENTILE` | $\le 200\text{ ms}$ | $\le 500\text{ ms}$ | $> 500\text{ ms}$ |
| **FCP** | Milliseconds (`ms`) | `PerformanceObserver('paint')` / Lighthouse | CrUX `FIRST_CONTENTFUL_PAINT_PERCENTILE` | $\le 1800\text{ ms}$ | $\le 3000\text{ ms}$ | $> 3000\text{ ms}$ |
| **TBT** | Milliseconds (`ms`) | Long Tasks ($\sum (\text{duration} - 50\text{ms})$) | N/A (Lab diagnostic) | $\le 200\text{ ms}$ | $\le 600\text{ ms}$ | $> 600\text{ ms}$ |
| **TTFB** | Milliseconds (`ms`) | Navigation Timing (`responseStart - requestStart`) | CrUX `EXPERIMENTAL_TIME_TO_FIRST_BYTE` | $\le 800\text{ ms}$ | $\le 1800\text{ ms}$ | $> 1800\text{ ms}$ |

---

## 3. Root Cause Corrections

### 3.1 Elimination of TTI/TBT Substitution for INP
* **Historical Defect:** Older systems substituted Time to Interactive (TTI), Total Blocking Time (TBT), or page load timing as an estimated INP value (e.g., reporting $7.2\text{s}$ TTI as INP).
* **Engineering Fix:** INP is strictly interaction latency. In a synthetic single-page lab audit without user interaction, genuine interaction telemetry cannot be fabricated. If CrUX field data exists, INP is reported with `source: 'crux', mode: 'field'`. Otherwise, it is reported as `value: 'N/A', available: false, rating: 'unrated', score: null`. It is never converted to 0ms or assigned a failing score.

### 3.2 Canonical CLS Session Window Logic
* **Historical Defect:** Simple summation of all layout shifts or reporting $0$ as missing/unrated.
* **Engineering Fix:** Implemented the official session window algorithm in `server/services/puppeteer/timings.ts`. Layout shifts occurring within $1\text{s}$ of each other (up to a maximum window of $5\text{s}$) are grouped into session windows. The maximum session window score is returned as the page CLS. A score of $0$ is explicitly recognized as valid, measured `good` data with `available: true, rating: 'good'`.

### 3.3 Strict Unit Canonicalization
* **Historical Defect:** Units were inconsistently passed between analyzers as seconds and milliseconds (e.g., $1.9\text{s}$ classified against a $2500\text{ms}$ threshold without normalization, resulting in false `poor` classifications).
* **Engineering Fix:** `server/config/performanceThresholds.ts` serves as the single source of truth. Every metric calculation normalizes inputs to canonical units (`ms` for time, unitless for CLS). Raw values, normalized values, units, and source metadata are preserved across the API, database, frontend, and PDF export.

---

## 4. Cross-Pipeline Consistency

All metrics flow through the immutable contract:
$$\text{Collector} \longrightarrow \text{Analyzer} \longrightarrow \text{Classifier} \longrightarrow \text{Score Engine} \longrightarrow \text{Persistence} \longrightarrow \text{Frontend / PDF}$$

No intermediate layer recalculates thresholds, modifies units, or converts unavailable states into zeroes.
