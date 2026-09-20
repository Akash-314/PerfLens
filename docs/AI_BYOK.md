# PerfLens AI Configuration & Bring-Your-Own-Key (BYOK) V1

## Overview
PerfLens AI Explainer translates verified, deterministic findings into clear, developer-friendly diagnostic insights. PerfLens supports two operating modes:

1. **PerfLens AI (Managed)**: Free included convenience powered by server-side credentials with a strict, low monthly usage quota.
2. **Bring Your Own Key (BYOK)**: Connect your own provider (Google Gemini, OpenAI, Anthropic, or OpenAI-Compatible) using personal API keys. Requests bypass the managed quota and use your personal provider allowance.

---

## Architecture & Provider Router

The explanation pipeline strictly decouples deterministic measurement from AI explanation:

```
VERIFIED EVIDENCE GATE
         ↓
  ExplanationInput
         ↓
   ProviderRouter
    ├── Managed Mode  →  ManagedProvider (Internal Gemini) [Tracks Quota]
    └── BYOK Mode     →  GeminiProvider | OpenAIProvider | AnthropicProvider | OpenAICompatibleProvider
         ↓
    Raw JSON Text
         ↓
  Schema & Hallucination Guard
         ↓
  Normalized ExplanationOutput
```

### Core Pipeline Invariants
- **Analysis Untouched**: Existing analyzers (Lighthouse, Puppeteer, DOM, Network, CSS, JS, Bundle, SEO, Scoring) are NEVER modified by the AI.
- **Evidence Gate**: Explanations can only be generated for verified findings containing non-empty evidence.
- **Zero Hallucinations**: Model outputs are strictly validated against JSON schema and hallucination guards.
- **Safe Fallback**: Any upstream provider failure (429, 500, timeout) degrades gracefully to the engine's deterministic explainer without breaking the finding or report.

---

## Modes & Quota Behavior

### 1. Managed Mode
- **Credentials**: Managed server-side (`GEMINI_API_KEY`, `PERFLENS_AI_MODEL`). Credentials are never exposed to the client.
- **Monthly Limit**: Configured via `PERFLENS_MANAGED_AI_MONTHLY_LIMIT` (default: 5 explanations/month).
- **Tracking**: Tracked per user and billing period (`YYYY-MM`).
- **Exhaustion**: When `used >= limit`, the server rejects with `MANAGED_AI_QUOTA_EXCEEDED`. The user is presented with a prompt: *"You've used your included PerfLens AI explanations."* and a direct action: `[ Use My Own API ]`.
- **Increment Rule**: Managed usage increments exactly once upon successful explanation generation. It never increments on cached hits, provider failures, or schema validation failures.

### 2. BYOK Mode
- **Zero Managed Quota Consumed**: When BYOK is active, explanation requests use the user's personal provider credentials and do not decrement the PerfLens managed monthly quota.
- **Isolation**: When BYOK is selected, server-managed keys are never used. When Managed is selected, user keys are never loaded.

---

## Supported Providers & Models

| Provider | Default / Recommended Model | Alternate Models | Connection Test Mechanism |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-flash-lite-latest` | `gemini-3.5-flash-lite`, `gemini-3.6-flash` | Minimal 1-token probe |
| **OpenAI** | `gpt-4o-mini` | `gpt-4o` | Minimal 1-token completion |
| **Anthropic** | `claude-3-5-haiku-latest` | `claude-3-5-sonnet-latest` | Minimal 1-token message |
| **OpenAI-Compatible** | User specified | User specified | Minimal completion to custom `baseUrl` |

---

## Credential Storage & Security

1. **Encryption at Rest**:
   - User API keys are encrypted at rest using **AES-256-GCM** authenticated encryption.
   - A unique 12-byte random IV and 16-byte authentication tag are generated per secret.
   - Master key is derived using `scrypt` from `process.env.AI_ENCRYPTION_KEY || process.env.JWT_SECRET`.
2. **In-Memory Decryption**:
   - Plaintext keys exist only transiently in server memory during active request execution and are discarded immediately afterward.
3. **No Secret Leakage**:
   - Stored keys are NEVER returned in API responses. Responses return `configured: true` and masked placeholder `••••••••••••••••`.
   - Logging utilities sanitize headers (`Authorization: Bearer [REDACTED]`, `key=[REDACTED]`, `x-api-key: [REDACTED]`).
4. **Server-Side Request Forgery (SSRF) Prevention**:
   - Custom `baseUrl` endpoints for OpenAI-Compatible providers are validated against static SSRF filters and asynchronous DNS lookup.
   - Blocked: `localhost`, loopback (`127.0.0.0/8`, `::1`), cloud metadata (`169.254.169.254`), and private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

---

## Provider Error Normalization

Upstream provider errors are normalized into consistent application codes:

- `AUTH_ERROR`: Invalid or revoked API key (HTTP 401/403).
- `RATE_LIMITED`: Provider rate limit or quota exceeded (HTTP 429).
- `INVALID_MODEL`: Selected model identifier not found or unsupported (HTTP 404).
- `TIMEOUT`: Upstream provider failed to respond within deadline.
- `PROVIDER_UNAVAILABLE`: Upstream provider service error (HTTP 500/502/503).
- `SSRF_BLOCKED`: Custom endpoint rejected by security policy.
- `NETWORK_ERROR`: Connection dropped or unreachable host.

---

## API Endpoints

- `POST /api/v1/ai/explain`: Generates structured explanation from verified finding. Supports optional Bearer token to load personal AI settings.
- `GET /api/v1/ai/status`: Reports whether the AI capability is enabled.
- `GET /api/v1/ai/config`: Fetches user AI settings, masked status, and monthly quota usage (requires Bearer auth).
- `PUT /api/v1/ai/config`: Saves mode, provider, model, and encrypts API key (requires Bearer auth).
- `DELETE /api/v1/ai/config/key`: Purges stored encrypted key (requires Bearer auth).
- `POST /api/v1/ai/test-connection`: Executes minimal ping against selected provider without saving or consuming full explanations (requires Bearer auth).
