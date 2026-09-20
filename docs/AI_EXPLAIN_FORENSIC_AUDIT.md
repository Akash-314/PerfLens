# PERFLENS AI EXPLAINER — FORENSIC ARCHITECTURE AUDIT
**Generated:** 2026-09-19  
**Status:** Read-Only Forensic Analysis Complete  
**Document Target:** Canonical Architecture, Flow Tracing, and QA Test Strategy

---

## 1. Executive Summary & Objective

This document provides an exhaustive, read-only architectural breakdown of the **PerfLens AI Explanation Engine** (V1). The primary goal is to establish the ground truth for how "Explain with AI" is wired from user interaction to LLM execution and back, proving that the feature does not rely on static appearances, fake counters, or ungrounded generative guesses.

The deterministic analysis engines (Lighthouse, PageSpeed, Puppeteer, SEO, CSS, JS, Bundle, Scoring) remain the **authoritative source of truth**. The AI layer explains only evidence-backed findings.

---

## 2. Complete End-to-End Runtime Pipeline

```
[ USER INTERFACE ]
  Recommendation Card Header ("AI Explain") OR Card Body ("✦ Explain with AI")
      ↓
  onClick / handleExplain(e)
      ↓ (State: aiLoading = true, Button: [Spinner] "Explaining...", disabled)
  HTTP Client: fetch(`${API_BASE}/ai/explain`, { finding, context })
      ↓
[ NETWORK & ROUTING ]
  Vite Proxy (/api -> http://127.0.0.1:5001)
      ↓
  Express Gateway: server/app.ts (/api/v1/ai & /api/ai aliases)
      ↓
  Router: server/routes/aiRoutes.ts
      ↓
  Middleware: Authentication (protect / loadUserPassively)
      ↓
[ CONTROLLER & ADAPTER ]
  Controller: explainFindingController (server/controllers/aiController.ts)
      ↓
  Evidence Gate Adapter: adaptFindingToExplanationInput() (server/services/ai/ai.adapter.ts)
      - Validates non-empty finding & stable identifier
      - Enforces presence of verified evidence (throws EvidenceGateError if missing)
      - Redacts tokens, passwords, and sensitive credentials
      ↓
[ AI SERVICE ORCHESTRATION ]
  AIService.explainFinding() (server/services/ai/ai.service.ts)
      ↓
  Check Feature Flag: PERFLENS_AI_ENABLED !== false (throws AIDisabledError)
      ↓
  Mode Resolution: Managed AI vs BYOK (aiConfigService.getRawUserConfig)
      ├── BYOK Mode:
      │     - Validates and decrypts user API key (AES-256-GCM)
      │     - Resolves provider: GeminiProvider | OpenAIProvider | AnthropicProvider | OpenAICompatibleProvider
      │     - Managed quota is NOT consumed
      │
      └── Managed Mode:
            - Checks monthly quota (checkManagedQuota, default: 5/month)
            - Throws ManagedAiQuotaExceededError if quota exhausted
            - Resolves active provider: ManagedProvider (delegates to GeminiProvider)
      ↓
[ CACHE LOOKUP ]
  ExplanationCache (server/services/ai/ai.cache.ts)
      - Computes key: hash(findingId + evidence + model + promptVersion)
      - Returns cached ExplanationOutput if valid and TTL unexpired
      ↓ (Cache Miss)
[ MODEL EXECUTION ]
  Active Provider .explainFinding(input)
      - Formulates System Prompt: explainer.v1.ts (Strict anti-hallucination & untrusted data rules)
      - Formulates User Prompt: finding details + verified evidence bullets
      - Executes model API call (Google Generative Language API / OpenAI / Anthropic)
      ↓
[ VALIDATION & NORMALIZATION ]
  Validator: validateExplanationOutput() (server/services/ai/ai.validator.ts)
      - Parses raw JSON (strips markdown code fences)
      - Verifies required schema fields: title, whatIsHappening, whyItMatters, evidenceExplanation, knownFacts, unknowns, confidence
      - Runs Hallucination Guard:
          * Rejects unsupplied framework claims (React, Vue, Next.js, etc.)
          * Rejects fabricated file paths (src/App.tsx, etc.)
          * Rejects absolute penalty claims ("Google will penalize")
          * Rejects non-existent evidence IDs
      ↓
  Quota Increment (Managed Mode):
      - aiConfigService.incrementManagedUsage(userId) strictly upon validation success
      ↓ (On Provider Failure)
  Deterministic Fallback (DeterministicProvider):
      - Returns rule-based explanation with source: 'deterministic_fallback', isFallback: true
      - Quota is NEVER incremented on fallback
      ↓
[ RESPONSE DELIVERY & RENDERING ]
  JSON 200 OK -> Frontend
      ↓
  React State: setAiExplanation(data.data), aiLoading = false
      ↓
  UI Component: <AIExplanation data={aiExplanation} />
      - Renders exact validated AI content
      - If fallback: renders "AI explanation unavailable — showing original finding" with "Deterministic Engine" badge
```

---

## 3. Discovered Architectural Components

### 3.1 Frontend Subsystem
| Component / File | Purpose & Behavior |
| :--- | :--- |
| [`HumanizedRecommendationCard.tsx`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/components/HumanizedRecommendationCard.tsx) | Primary recommendation card. Contains header button ("AI Explain") and body trigger button ("✦ Explain with AI"). Manages `aiLoading`, `aiError`, `aiExplanation`, `showAi`. Disables buttons while in flight. |
| [`AIExplanation.tsx`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/components/ai/AIExplanation.tsx) | Renders grounded explanation sections: *What Is Happening*, *Why It Matters*, *What PerfLens Knows*, *What Is Not Known*, confidence pill, and provider attribution. Distinguishes AI vs deterministic fallback. Safe JSX text escaping (zero XSS). |
| [`AIExplanationError.tsx`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/components/ai/AIExplanationError.tsx) | Error boundary state. Handles `MANAGED_AI_QUOTA_EXCEEDED` (offers "Use My Own API" redirect), `BYOK_NOT_CONFIGURED`, and general provider unavailable states with retry callback. |
| [`AIExplanationSkeleton.tsx`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/components/ai/AIExplanationSkeleton.tsx) | Visual loading shimmer state with pulsing placeholder blocks during in-flight model inference. |
| [`AIConfigurationSection.tsx`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/components/ai/AIConfigurationSection.tsx) | User BYOK management in Profile -> AI. Supports mode toggle (PerfLens AI vs Own API), provider dropdown, model selector, masked key entry, and connection test. |
| [`api.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/src/config/api.ts) | Unified API base URL defaulting to `/api/v1` (relies on Vite dev proxy or reverse proxy). |

### 3.2 Backend Subsystem
| Module / File | Responsibility |
| :--- | :--- |
| [`server/routes/aiRoutes.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/routes/aiRoutes.ts) | Exposes `/explain`, `/status`, `/config` (GET/PUT/DELETE), and `/test-connection`. |
| [`server/controllers/aiController.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/controllers/aiController.ts) | Request payload validation, user extraction, error classification (`ManagedAiQuotaExceededError`, `ByokNotConfiguredError`, `EvidenceGateError`), and duration telemetry. |
| [`server/services/ai/ai.service.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/ai.service.ts) | Core orchestrator. Coordinates Evidence Gate, user config lookup, quota authorization, partitioned cache, active provider invocation, fallback on error, and quota accounting. |
| [`server/services/ai/providerRouter.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/providerRouter.ts) | Factory resolving active `AIProvider` instance (Managed, Gemini, OpenAI, Anthropic, OpenAICompatible) based on user config and decrypted secret. |
| [`server/services/ai/ai.adapter.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/ai.adapter.ts) | Evidence Gate enforcement. Normalizes findings into `ExplanationInput`. Rejects findings lacking verified evidence. Redacts credentials. |
| [`server/services/ai/ai.validator.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/ai.validator.ts) | Schema validation, JSON code fence stripping, and 4-tier Hallucination Guard. |
| [`server/services/ai/aiConfig.service.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/aiConfig.service.ts) | Encrypted persistence of user AI configurations and monthly quota tracking in Supabase with in-memory test fallback. |
| [`server/services/ai/ai.cache.ts`](file:///c:/Users/itsak/OneDrive/Desktop/Projects/Perflens/server/services/ai/ai.cache.ts) | LRU memory cache partitioned by finding ID, evidence hash, model, and prompt version. |

---

## 4. The Canonical AI Contract

### 4.1 Input Contract: `ExplanationInput`
```typescript
export interface VerifiedEvidenceItem {
  id: string; // e.g. "E001"
  source?: string; // e.g. "Google Lighthouse", "perflens-engine"
  metric?: string; // e.g. "TBT", "LCP"
  value?: number | string; // e.g. 750
  unit?: string; // e.g. "ms"
  selector?: string; // e.g. "head > link[rel='stylesheet']"
  resource?: string; // e.g. "https://example.com/styles.css"
  details?: Record<string, any>;
}

export interface ExplanationInput {
  findingId: string;
  category: FindingCategory; // "performance" | "accessibility" | "seo" | ...
  severity: FindingSeverity; // "critical" | "high" | "medium" | "low" | "info"
  title: string;
  url?: string;
  evidence: VerifiedEvidenceItem[];
  knownContext?: {
    framework?: string;
    server?: string;
    cms?: string;
  };
}
```

### 4.2 Output Contract: `ExplanationOutput`
```typescript
export interface ExplanationOutput {
  title: string;
  whatIsHappening: string;
  whyItMatters: string;
  evidenceExplanation: string;
  knownFacts: string[];
  unknowns: string[];
  confidence: 'high' | 'medium' | 'low';
  relatedFindingIds?: string[];
  source: 'ai' | 'deterministic' | 'deterministic_fallback';
  promptVersion: string;
  model: string;
  provider: string;
  findingId?: string;
  generatedAt?: string;
  isFallback?: boolean;
  fromCache?: boolean;
}
```

---

## 5. Security Architecture & Boundary Guarantees

1. **Zero Client-Side Keys**: The client never receives plaintext API keys. Keys saved in BYOK mode are encrypted at rest with AES-256-GCM via `aiEncryption.ts` using `JWT_SECRET`.
2. **Log Scrubbing**: All logging through `sanitizeLog()` scrubs authorization headers (`Bearer [REDACTED]`), query parameters (`api_key=[REDACTED]`), and passwords.
3. **SSRF Guard**: OpenAI-Compatible base URLs are validated against private/loopback IP spaces (RFC 1918, RFC 3927/APIPA, localhost, IPv6 loopback) asynchronously via DNS resolution prior to HTTP dispatch.
4. **No Code Execution**: Model output is treated strictly as structured text. React automatically escapes strings, preventing XSS injection.
5. **Prompt Injection Resilience**: System instructions designate all external webpage content, URLs, DOM text, and titles as untrusted diagnostic data.

---

## 6. Identified Gaps & QA Action Items

| Item | Current Behavior | QA Requirement / Validation Strategy |
| :--- | :--- | :--- |
| **Auth Enforcement** | `/api/v1/ai/explain` used `loadUserPassively` (allowed guest calls without token). | Unauthenticated requests to `/api/ai/explain` must return 401 when auth is enforced. Must be validated under Test Category G. |
| **Marker Proof** | Marker injection test exists in unit tests. | Must be executed through full end-to-end and mock integration test to verify `PERFLENS_AI_PROOF_847291` reaches rendered output. |
| **Deterministic Isolation** | Fallback and AI text are distinct. | Verify that when active provider succeeds, deterministic fallback text is NEVER displayed. |
| **Quota Increment** | Increments on success only. | Verify that failed provider requests (timeout, 429, 500, invalid JSON) never increment quota. |
| **Adversarial Input** | Evidence Gate rejects empty findings. | Verify hallucinated metrics, frameworks, and source files are caught and rejected by validator. |
