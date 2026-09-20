# PERFLENS — AI EXPLAINER ROUTING & PROFILE CONSOLIDATION AUDIT

**Audit Date:** September 17, 2026  
**Status:** READ-ONLY INVESTIGATION COMPLETE — FIX SPECIFIED  
**Scope:** AI Routing, Quota Accounting, Fallback Semantics, Profile & Settings Consolidation  

---

## 1. Complete AI Explanation Request Lifecycle Trace

```
UI: User opens verified finding card in Results/Recommendations
 ↓
[✦ Explain with AI] button clicked
 ↓
Frontend: handleExplain() in HumanizedRecommendationCard.tsx
   - Retrieves `perflens_token` from localStorage (if authenticated)
   - Attaches Authorization: Bearer <token>
   - Sends payload: { finding: rec, context: { url: rec.sourceUrl } }
 ↓
Backend: POST /api/v1/ai/explain (and alias /api/ai/explain)
   - Route middleware: `loadUserPassively` decodes JWT if provided
   - Express controller: `explainFindingController` in aiController.ts
 ↓
Evidence Gate: adaptFindingToExplanationInput()
   - Strictly validates finding existence, category, and non-empty verified evidence
   - Rejects ungrounded or speculative inputs (HTTP 422 EvidenceGateError)
 ↓
Provider Selection & Routing: ProviderRouter.resolveProvider()
   - User config fetched from Supabase / in-memory store (`aiConfigService`)
   - If mode === 'byok':
       * Decrypts AES-256-GCM key (`decryptSecret`)
       * Routes to GeminiProvider, OpenAIProvider, AnthropicProvider, or OpenAICompatibleProvider
       * Quota check bypassed (BYOK does NOT consume managed quota)
   - If mode === 'managed':
       * Checks monthly managed quota for authenticated user (5 limit)
       * Throws HTTP 403 `MANAGED_AI_QUOTA_EXCEEDED` if limit reached
       * Routes to ManagedProvider (backed by Gemini flash-lite)
 ↓
Cache Lookup: ExplanationCache.computeKey()
   - Partitioned by: `${findingId}:${serializedEvidence}:${provider}:${model}:${promptVersion}`
   - If cache hit: returns cached explanation immediately with `fromCache: true` (ZERO quota consumption)
 ↓
Provider Request: activeProvider.explainFinding(input)
   - Constructs strict system instructions & user prompt with verified facts
   - Dispatches HTTP POST to provider API (timeout: 8000ms)
 ↓
Schema Validation & Grounding Guard: validateExplanationOutput()
   - Validates JSON against ExplanationOutput schema
   - Validates confidence enum ('high' | 'medium' | 'low')
   - Executes Grounding Guard: rejects any hallucinated numeric metrics
 ↓
Quota Update: aiConfigService.incrementManagedUsage()
   - Executed strictly AFTER successful provider response AND schema validation
   - Executed ONLY for managed mode requests with authenticated user
   - ZERO increment on failures, timeouts, rate limits, BYOK, or fallbacks
 ↓
Fallback Logic (on any provider error):
   - Catches provider failure, logs sanitized error
   - Calls DeterministicProvider.explainFinding()
   - Tags output with `source: 'deterministic_fallback'`, `isFallback: true`
   - Bypasses quota increment (quota is NOT consumed)
 ↓
Response: HTTP 200 { success: true, data: explanation, durationMs }
 ↓
Frontend Rendering: HumanizedRecommendationCard.tsx & AIExplanation.tsx
   - Renders genuine AI explanation OR fallback notification
```

---

## 2. Answers to Critical AI Investigation Questions (A through J)

| Question | Finding | Evidence / Code Trace |
|---|---|---|
| **A. Does clicking "Explain with AI" actually call the AI provider?** | **YES** (when properly configured). | Direct execution returned live model text in 6117ms. However, if `GEMINI_API_KEY` was missing, it previously fell back to `PAGESPEED_API_KEY` which failed (HTTP 403), triggering fallback. |
| **B. Does the provider response reach the UI?** | **YES.** | Controller returns `data: explanation`. Frontend sets `setAiExplanation(data.data)` and renders `AIExplanation`. |
| **C. Is the provider response discarded and replaced by deterministic text?** | **NO** in successful cases. | `data.whatIsHappening` and `data.whyItMatters` from the AI response are rendered directly. |
| **D. Is the deterministic fallback being used unexpectedly?** | **YES** (in prior runs without `GEMINI_API_KEY`). | In `gemini.provider.ts`, `apiKey` checked `process.env.PAGESPEED_API_KEY` as fallback. PageSpeed keys are rejected by Google Generative AI (HTTP 403), causing silent fallback to deterministic engine! |
| **E. Is the managed quota incrementing before successful AI generation?** | **NO.** | In `ai.service.ts`, `incrementManagedUsage` is called at line 153, strictly *after* `await activeProvider.explainFinding(input)`. |
| **F. Is the quota incrementing when the provider fails?** | **NO.** | Any provider failure throws into the `catch` block (line 157), completely bypassing `incrementManagedUsage`. |
| **G. Is the UI displaying the deterministic recommendation instead of the AI explanation?** | **CONFUSING UI:** The card body *always* renders deterministic sections "1. What Is Wrong?", "2. Why Does It Matter?", and "3. What Did PerfLens Actually Find?" right above the AI block. Furthermore, when fallback occurred, it rendered inside the `✦ AI Explanation` box labeled "Engine Grounded", looking like an AI explanation. |
| **H. Is some cached deterministic explanation being returned instead of a newly generated AI explanation?** | **NO.** | `explanationCache.set()` is only called on successful AI output. Fallback output is never added to `explanationCache`. |
| **I. Is the AI prompt actually being constructed and sent?** | **YES.** | `buildSystemInstruction()` and `buildUserPrompt()` build the grounding prompt with verified evidence and JSON schema requirements. |
| **J. Is the model response being schema-validated and then rendered?** | **YES.** | `validateExplanationOutput()` validates the schema and checks for metric hallucinations before returning. |

---

## 3. Bugs Identified & Root Causes

### Bug 1: Dangerous Key Fallback in `gemini.provider.ts`
- **Location:** `server/services/ai/providers/gemini.provider.ts:13`
- **Code:** `this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.PAGESPEED_API_KEY;`
- **Root Cause:** When `GEMINI_API_KEY` was missing from `.env`, the provider picked up `PAGESPEED_API_KEY`. The Google Generative Language API rejected it with HTTP 403: `Requests to this API generativelanguage.googleapis.com method google.ai.generativelanguage.v1beta.GenerativeService.GenerateContent are blocked.`
- **Consequence:** `ai.service.ts` caught this 403, silently fell back to `DeterministicProvider`, and returned deterministic template text.
- **Surgical Fix:** Remove `process.env.PAGESPEED_API_KEY` fallback. `GeminiProvider` must only use `options.apiKey`, `process.env.GEMINI_API_KEY`, or `process.env.PERFLENS_AI_API_KEY`. If missing, it must fail fast with a clear diagnostic message.

### Bug 2: Fallback Text Misrepresented as AI in UI
- **Location:** `src/components/ai/AIExplanation.tsx`
- **Root Cause:** When `data.source === 'deterministic_fallback'`, the component still displayed the header `✦ AI Explanation` with `Engine Grounded`, leading users to believe the deterministic text was AI-generated.
- **Surgical Fix:** When `data.source === 'deterministic_fallback'` or `data.isFallback === true`:
  - Do NOT display `✦ AI Explanation`.
  - Display clear notice: *"AI explanation unavailable — showing original finding."*
  - Do NOT claim AI generated something that came from deterministic fallback.

### Bug 3: Missing Metadata Traceability Fields
- **Location:** `server/services/ai/ai.types.ts`
- **Requirement:** Section 6 mandates tracking:
  ```json
  {
    "source": "ai | deterministic_fallback",
    "provider": "...",
    "model": "...",
    "promptVersion": "...",
    "findingId": "...",
    "generatedAt": "..."
  }
  ```
- **Root Cause:** `ExplanationOutput` was missing `findingId` and `generatedAt`.
- **Surgical Fix:** Add `findingId?: string;` and `generatedAt?: string;` to `ExplanationOutput`, set them in `ai.service.ts` upon both AI generation and deterministic fallback.

---

## 4. Profile & Settings Consolidation Audit

### Current State:
- Navigation entry: `Settings` (`currentTab === 'settings'`) in `Sidebar.tsx`.
- TopNav profile menu has: `Account Settings` and `✦ AI Configuration` (both route to `settings`).
- `Settings.tsx` contains 5 cards:
  1. Account Profile (Name, Email, Role, Sign Out)
  2. AI & BYOK Configuration (Managed vs BYOK, Providers, Models, Masked Key, Test Connection, Managed Usage Counter)
  3. Scanning Engine Specifications (Google Lighthouse, Puppeteer, Evidence Gate)
  4. API & Backend Diagnostics (Backend URL, Client Mode)
  5. Data & Local Storage (Clear session cache, Server Data Sync)

### Audit of Fake / Duplicate Controls:
- **Subscriptions / Billing:** Searched codebase for `subscription`, `billing`, `plan`, `renewal`. ZERO fake billing UI found. AI usage is explicitly presented as `Included AI Explanations: X / 5` without fake subscription tiers.
- **Notifications:** Searched for fake notification bells. ZERO fake notification bells found in TopNav.
- **Developer Settings:** No separate `/developer-settings` route exists. The technical diagnostics are currently under "API & Backend Diagnostics" and "Data & Local Storage".
- **Duplicate Routes:** Verified no duplicate routes exist for `/ai-settings`, `/workspace-settings`, etc.

### Consolidation Plan:
Refactor `src/pages/Settings.tsx` into a unified **Profile & Account Settings** center with clean tabbed navigation adhering to Section 15:
```
Profile & Account Settings
├── Account Profile (User Info, Auth Details, Sign Out)
├── AI Configuration (PerfLens AI Managed 1/5 vs BYOK, Provider, Model, API Key, Test Connection)
├── Scanning Engine (Lighthouse, Puppeteer, Evidence Gate specifications)
└── Advanced / System (API Diagnostics, Session Storage, Server Sync)
```
- Support direct deep-linking / tab selection via `settingsTab` state or hash (e.g. from TopNav's `AI Configuration` button or error prompts).
- Label in sidebar: `Profile` or `Settings` (user-friendly unified entry point).

---

## 5. Marker Injection Verification Plan (`TEST_AI_MARKER_84721`)

To conclusively prove that the UI is receiving and rendering live AI output rather than deterministic templates:
1. **Mock / Provider Test:** Inject marker `TEST_AI_MARKER_84721` into provider output.
2. **UI Assertion:** Verify that `TEST_AI_MARKER_84721` appears inside the AI Explanation container.
3. **Failure Simulation:** Trigger provider failure (invalid key or mock rejection) and verify:
   - UI shows *"AI explanation unavailable — showing original finding"*
   - Managed quota does NOT increment
   - Deterministic finding remains intact.
