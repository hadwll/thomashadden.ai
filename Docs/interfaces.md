# interface.md — thomashadden.ai Integration Contract

**Version:** 1.0  
**Date:** March 2026  
**Status:** Integration Contract — Implementation-Ready  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation

---

## 1. Purpose and Scope

### 1.1 What This Document Covers

This document defines all system interfaces for thomashadden.ai. It is the single authoritative integration contract between the frontend, backend API, authentication layer, database, LLM/RAG subsystem, and operational infrastructure.

It covers:

- Every HTTP endpoint exposed by the backend API
- All canonical data models and payloads
- Authentication and session interfaces
- End-to-end flow contracts (readiness check, contact, LLM query, auth)
- Frontend integration expectations (response shapes, error handling, state management)
- Error taxonomy and status codes
- State machines and lifecycle rules
- Infrastructure dependencies that affect application contracts

### 1.2 What This Document Does Not Cover

- Visual design specifications (colours, typography, spacing, motion) — see golden-truth-frontend-spec.md and frontend-interface.md
- Component-level UI implementation (React props, CSS) — see frontend-interface.md
- RAG ingestion pipeline internals — see backend-rag.md (referenced but not a project file)
- Compliance and GDPR implementation detail — see backend-compliance.md (referenced but not a project file)
- Analytics dashboard or admin UI — out of V1 frontend scope
- Content authoring workflows

### 1.3 Intended Audience

- Frontend developers: build against endpoint contracts, response shapes, and error handling rules
- Backend developers: implement endpoints, validation, state machines, and side effects to spec
- Testers: derive test cases from flow contracts, state transitions, and error taxonomy
- Auditors: compare implemented code against this contract

---

## 2. Source Documents and Precedence

### 2.1 Source Files

| File | Role |
|------|------|
| `backend-api.md` | Primary endpoint contract — defines all HTTP interfaces |
| `backend-auth.md` | Auth platform, session management, OAuth/magic link flows |
| `backend-readiness-check.md` | Readiness check domain logic, scoring, session lifecycle |
| `backend-contact.md` | Contact form submission, notification, auto-reply |
| `backend-llm.md` | LLM pipeline, intent classification, streaming, cost controls |
| `backend-database.md` | Database schema, tables, indexes, RLS, retention |
| `backend-infrastructure.md` | Deployment stack, environment variables, CI/CD |
| `frontend-interface.md` | Frontend implementation spec, component contracts, client-side flows |
| `golden-truth-frontend-spec.md` | UI/UX intent, design system, interaction design |
| `thomashadden-ai-test-plan.md` | Test cases — used to verify interface coverage |
| `thomashadden-p0-content.md` | Seed content — confirms data model fields |
| `thomashadden-p1-research.md` | Seed content — confirms research_items schema |
| `thomashadden-p1-contact.md` | Seed content — confirms content_pages schema |

### 2.2 Precedence Rules

Where sources conflict:

1. `backend-api.md` is authoritative for HTTP endpoint contracts (method, path, request/response shape, status codes)
2. Domain-specific backend specs (`backend-readiness-check.md`, `backend-contact.md`, `backend-llm.md`, `backend-auth.md`) are authoritative for domain logic, validation rules, and state transitions
3. `backend-database.md` is authoritative for table schemas, column names, and constraints
4. `golden-truth-frontend-spec.md` is authoritative for UI flow intent and interaction design
5. `frontend-interface.md` is treated as input, not unquestioned truth — reconciled against backend specs
6. Content files (`p0`, `p1`) are treated as seed data references only

### 2.3 Source Quality Notes

- `backend-rag.md` is referenced by multiple specs but is not present in the project files. RAG interfaces are documented only as they appear in `backend-api.md` and `backend-llm.md`. **Gap identified.**
- `backend-analytics.md` is referenced but not present. Analytics interfaces are documented only as they appear in `backend-api.md`. **Gap identified.**
- `backend-compliance.md` is referenced but not present. GDPR and data deletion are documented only as they appear in `backend-api.md` (DELETE /users/me). **Gap identified.**
- `backend-roadmap.md` is referenced but not present. No impact on current contracts.

---

## 3. System Context

### 3.1 Major System Parts

| Part | Technology | Responsibility |
|------|-----------|----------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS | SSR/CSR rendering, client-side interaction, API proxy |
| Backend API | Next.js API routes (same application) | RESTful JSON API — single communication layer to all services |
| Auth/Session | Supabase Auth + `@supabase/ssr` | LinkedIn OAuth, Email Magic Link, JWT session management |
| Database | Supabase PostgreSQL 15+ with pgvector | All persistent storage — content, sessions, logs, profiles |
| LLM Service | Azure AI Foundry (GPT-4.5) | Response generation (RAG and general AI modes) |
| Intent Classifier | Azure AI Foundry (GPT-4.5-mini) | Pre-classification of every query before routing |
| Embedding Service | Azure AI Foundry (text-embedding-3-large) | Vector embeddings for RAG ingestion and query |
| RAG Service | Internal (vector search via pgvector) | Content retrieval, context assembly for LLM |
| Email | Resend (SMTP) | Magic links, contact notifications, auto-replies |
| CDN/DNS | Cloudflare | Domain, HTTPS, caching, bot protection |
| Analytics | Plausible (external, script-only) | Page views, traffic — no backend integration |

### 3.2 Interaction Overview

```
Browser ──► Next.js App (Azure App Service)
              │
              ├── /api/* routes (backend API layer)
              │      │
              │      ├── Supabase Auth (JWT validation, OAuth, magic link)
              │      ├── Supabase PostgreSQL (all data reads/writes via service role key)
              │      ├── Azure AI Foundry (LLM calls: classifier + primary model)
              │      │     └── pgvector (RAG retrieval via match_rag_chunks function)
              │      └── Resend SMTP (email dispatch)
              │
              ├── SSR pages (content fetched server-side from Supabase)
              └── Static pages (privacy, cookies)
```

**Key architectural rule:** No backend service is called directly from the browser. All backend communication flows through Next.js API routes under `/api/*`. The frontend calls `/api/llm/query`, not the Azure AI Foundry endpoint directly.

### 3.3 Environment Configuration

Two environments exist. No separate staging environment in V1.

| Environment | Frontend + API | Database | AI Models |
|-------------|---------------|----------|-----------|
| Local (dev) | `localhost:3000` | `thomashadden-dev` (Supabase) | Azure AI Foundry (shared) |
| Production | `thomashadden.ai` (Azure App Service) | `thomashadden-prod` (Supabase) | Azure AI Foundry (shared) |

Base API URL pattern: `https://api.thomashadden.ai/v1` (production), `http://localhost:3001/v1` (local).

**V1 mapping note (settled):** In V1, the frontend calls same-app relative `/api/*` routes (for example, `/api/llm/query`). These route handlers implement the `/v1/*` contract namespace documented in `backend-api.md`.

---

## 4. Interface Inventory

### 4.1 HTTP/REST Endpoints — Public

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/v1/llm/query` | Submit LLM query (streaming or non-streaming) | None (rate-limited) |
| GET | `/v1/readiness-check/questions` | Fetch question set | None |
| POST | `/v1/readiness-check/session` | Create assessment session | None |
| GET | `/v1/readiness-check/session/:token` | Retrieve session state | None |
| POST | `/v1/readiness-check/answer` | Submit individual answer | None (rate-limited) |
| POST | `/v1/contact/submit` | Submit contact form | None (rate-limited, spam-protected) |
| GET | `/v1/content/:page` | Fetch page content | None |
| GET | `/v1/content/insights` | Fetch paginated insights | None |
| GET | `/v1/health` | Health check | None |

### 4.2 HTTP/REST Endpoints — Authenticated

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/v1/readiness-check/link-session` | Link anonymous session to user | Bearer token |
| GET | `/v1/readiness-check/result/:sessionToken` | Retrieve readiness result | Bearer token |
| GET | `/v1/users/me` | Get current user profile | Bearer token |
| DELETE | `/v1/users/me` | Request account deletion | Bearer token |

### 4.3 HTTP/REST Endpoints — Admin

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/v1/analytics/event` | Ingest analytics event | API key |
| GET | `/v1/analytics/summary` | Aggregated analytics | Admin key |
| GET | `/v1/contact/submissions` | View submissions | Admin key |
| GET | `/v1/health/services` | Detailed service health | Admin key |

### 4.4 HTTP/REST Endpoints — Internal Service

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/v1/rag/retrieve` | RAG content retrieval | Internal only |
| POST | `/v1/rag/ingest` | Trigger RAG re-ingestion | Internal + admin key |

### 4.5 Auth/Session Interfaces

| Interface | Provider | Mechanism |
|-----------|----------|-----------|
| LinkedIn OAuth | Supabase Auth | `signInWithOAuth({ provider: 'linkedin_oidc' })` |
| Email Magic Link | Supabase Auth | `signInWithOtp({ email })` |
| Session management | `@supabase/ssr` | JWT access token (1h) + refresh token (30d) in HTTP-only cookies |
| Auth callback | Next.js route handler | `/auth/callback` — exchanges code for session |

### 4.6 Streaming Interfaces

| Interface | Protocol | Endpoint |
|-----------|----------|----------|
| LLM response streaming | Server-Sent Events (SSE) | `POST /v1/llm/query` with `stream: true` |

### 4.7 Client-Side Storage

| Key | Storage | Purpose |
|-----|---------|---------|
| `readiness_session_token` | localStorage | Anonymous readiness check session ID |
| `readiness_session_started` | localStorage | Session start timestamp for staleness check |
| `llm_session_id` | sessionStorage | Anonymous LLM query grouping (per-tab) |
| `theme` | localStorage | Dark/light mode preference |
| Supabase auth tokens | HTTP-only cookies | JWT access + refresh tokens (managed by @supabase/ssr) |

### 4.8 Database Interfaces

All database access is through the Supabase service role key. No direct client-side database queries in V1 (RLS policies exist as a safety net only).

### 4.9 External Integrations

| Integration | Purpose | Protocol |
|-------------|---------|----------|
| Azure AI Foundry | LLM + embedding inference | OpenAI-compatible REST API |
| Supabase Auth | User authentication | Supabase SDK |
| Resend | Transactional email | SMTP |
| Plausible | Page analytics | Client-side script tag (no backend integration) |
| Cloudflare | CDN, DNS, bot protection | Infrastructure-level |

---

## 5. Canonical Data Models

### 5.1 Standard API Envelope

All API responses use this envelope. **Confirmed** — consistent across backend-api.md and all domain specs.

```typescript
// Success
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;    // e.g. "req_abc123"
    timestamp: string;    // ISO 8601
  };
}

// Error
interface ApiError {
  success: false;
  error: {
    code: string;         // e.g. "VALIDATION_ERROR"
    message: string;      // Human-readable
    details?: Record<string, any>;  // Field-level errors for 422
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

// Paginated
interface ApiPaginated<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}
```

### 5.2 LLM Query Request

```typescript
interface LLMQueryRequest {
  query: string;           // Required. Max 500 chars. Min 3 chars.
  stream?: boolean;        // Default: false. If true, SSE response.
  sessionId?: string;      // Client-generated UUID from sessionStorage.
  context?: {
    source?: 'homepage_chip' | 'homepage_input' | 'llm_page' | 'readiness_check';
  };
}
```

### 5.3 LLM Query Response (Non-Streaming)

```typescript
interface LLMQueryResponse {
  answer: string;
  queryType: 'thomas_profile' | 'general_ai' | 'out_of_scope' | 'filtered';
  sources: Source[];
  suggestedActions: SuggestedAction[];
  queryId: string;
}

interface Source {
  title: string;
  url: string;          // Must begin with "/" (internal paths only)
  relevance: number;    // 0.0–1.0. Frontend renders only > 0.8.
}

interface SuggestedAction {
  type: 'readiness_check' | 'contact' | 'page_link';
  label: string;
  url: string;
}
```

### 5.4 SSE Stream Events

SSE is the primary LLM response mode. Three event types exist. No `event:`, `id:`, or `retry:` fields are used in V1.

**Chunk event** — sent as tokens are generated:
```json
{"chunk": "text fragment", "queryId": "qry_abc123"}
```

**Completion event** — sent once after final token:
```json
{
  "done": true,
  "queryType": "general_ai",
  "sources": [],
  "suggestedActions": [],
  "queryId": "qry_abc123"
}
```
`sources` and `suggestedActions` are always present (may be empty arrays).

**Error event** — sent instead of chunk/completion if service unavailable:
```json
{"error": true, "code": "SERVICE_UNAVAILABLE", "message": "..."}
```
Stream closes after error event. No further events sent.

**Framing rules:**
- Each `data:` line contains exactly one complete JSON object
- Each event terminated by `\n\n`
- Frontend must buffer partial reads and parse only complete `data: {...}\n` lines

### 5.5 Readiness Check Question Set

```typescript
interface QuestionSet {
  version: string;           // e.g. "1.0"
  questions: Question[];
  totalQuestions: number;     // 7 in V1
  estimatedMinutes: number;   // 2 in V1
}

interface Question {
  id: string;                // UUID
  order: number;
  text: string;
  type: 'single_choice';    // Only type in V1
  options: Option[];
}

interface Option {
  id: string;                // UUID
  label: string;
}
```

**Note:** `score_value` per option is NOT returned to the frontend. Scores exist only in the database and are used server-side for scoring. **Confirmed** — backend-readiness-check.md and backend-api.md both exclude score from client responses.

### 5.6 Readiness Session State

```typescript
interface SessionState {
  sessionToken: string;
  status: 'in_progress' | 'completed';
  answeredQuestions: number[];   // Indices of answered questions
  nextQuestionIndex: number;
  totalQuestions: number;
}
```

### 5.7 Readiness Answer Submission

**Request:**
```typescript
interface AnswerSubmission {
  sessionToken: string;    // UUID
  questionId: string;      // UUID
  optionId: string;        // UUID
}
```

**Response:**
```typescript
interface AnswerResponse {
  answeredCount: number;
  isComplete: boolean;
}
```

### 5.8 Readiness Result

```typescript
interface ReadinessResult {
  resultId: string;
  category: 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';
  categoryLabel: string;
  score: number;          // 0–100 normalised
  summary: string;        // Interpretation paragraph
  nextStep: string;       // Suggested next step paragraph
  cta: {
    label: string;
    url: string;          // e.g. "/contact?source=readiness_check&result=ready_to_pilot"
  };
}
```

### 5.9 User Profile

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  provider: 'linkedin' | 'email';
  jobTitle?: string;       // Best-effort projection from linkedin_headline.
  createdAt: string;
  readinessResults: string[];
}
```

`jobTitle` is an optional API projection from `linkedin_headline`. `company` is excluded from the V1 API shape because there is no guaranteed source column in the current schema.

### 5.10 Contact Submission

**Request:**
```typescript
interface ContactSubmission {
  name: string;           // Required. 2–100 chars.
  email: string;          // Required. Valid email.
  subject?: string;       // Optional. Max 200 chars.
  message: string;        // Required. 20–2000 chars.
  type: 'business_enquiry' | 'research_collaboration' | 'technical_enquiry' | 'general';
  source?: string;        // 'contact_page' | 'readiness_check' | 'llm'
  honeypot: string;       // Required field. Must be empty string.
}
```

**Naming discrepancy:** The API request uses `type` for enquiry type, but the database column is `enquiry_type`. The API layer performs this mapping. **Confirmed** — backend-api.md uses `type`, backend-database.md uses `enquiry_type`.

**Response:**
```typescript
interface ContactSubmissionResponse {
  submissionId: string;
  message: string;        // Personalised: "Thanks {name}, Thomas will be in touch shortly."
}
```

### 5.11 Content Page Response

```typescript
interface ContentPageResponse {
  page: string;            // 'about' | 'projects' | 'research' | 'insights' | 'home'
  title: string;
  sections: ContentSection[];
  lastUpdated: string;     // ISO 8601
}

interface ContentSection {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags?: string[];
  status?: string;         // 'active' | 'completed' | 'archived'
  updatedAt: string;
}
```

### 5.12 Database Tables — Canonical Reference

| Table | Schema | Purpose |
|-------|--------|---------|
| `content_pages` | public | Page content (about, projects, research, etc.) |
| `projects` | public | Project records |
| `research_items` | public | Research records |
| `insights` | public | Short-form posts |
| `rag_chunks` | public | Vector-embedded content chunks |
| `readiness_sessions` | public | Assessment session state |
| `readiness_questions` | public | Seeded question bank |
| `readiness_options` | public | Seeded answer options with scores |
| `readiness_responses` | public | Individual answer records |
| `user_profiles` | public | Extension of auth.users |
| `llm_query_log` | public | LLM query/response audit log |
| `readiness_contact_leads` | public | Leads from readiness result screen |
| `contact_submissions` | public | General contact form submissions |
| `auth.users` | auth | Managed by Supabase Auth — not modified directly |

---

## 6. HTTP API Contract

### 6.1 POST /v1/llm/query

| Property | Value |
|----------|-------|
| **Purpose** | Submit a query to the LLM |
| **Auth** | Public (rate-limited: 10 req/min/IP) |
| **Request body** | See §5.2 `LLMQueryRequest` |
| **Validation** | `query`: required, 3–500 chars, non-whitespace-only. `sessionId`: must be valid UUID if provided. |
| **Non-streaming response** | `200` — See §5.3 `LLMQueryResponse` |
| **Streaming response** | `200` — `Content-Type: text/event-stream`. See §5.4 SSE events. |
| **Error codes** | `400 CONTENT_FILTERED`, `400 OUT_OF_SCOPE`, `429 RATE_LIMITED`, `500 LLM_ERROR`, `503 SERVICE_UNAVAILABLE` |
| **Side effects** | Row written to `llm_query_log`. Analytics event fired. |
| **Idempotency** | Not idempotent — each call creates a new log entry and LLM invocation. |
| **Pipeline** | Input validation → session token validation → rate limit → content filter → blocklist → intent classification → routing → context assembly → LLM call → post-processing → logging → response. |
| **Cost controls** | Per-session: max 20 queries, max 40,000 total tokens. Per-query: max 4,000 input tokens, max 1,000 output tokens. Daily global cap at provider level. |
| **Proxy requirement** | Next.js API route must stream SSE passthrough without buffering. Max stream duration: 30 seconds. |

### 6.2 GET /v1/readiness-check/questions

| Property | Value |
|----------|-------|
| **Purpose** | Fetch the current question set |
| **Auth** | Public |
| **Response** | `200` — See §5.5 `QuestionSet` |
| **Error codes** | `500 INTERNAL_ERROR` |
| **Side effects** | None |
| **Caching** | Not explicitly specified. Questions are seeded and change only via migration. *Inference:* could be cached aggressively. |

### 6.3 POST /v1/readiness-check/session

| Property | Value |
|----------|-------|
| **Purpose** | Create a new assessment session |
| **Auth** | Public |
| **Request body** | `{ "sessionToken": "<uuid>" }` — client-generated UUID |
| **Response** | `200` — `{ sessionToken, status: "in_progress", totalQuestions: 7 }` |
| **Error codes** | `422 VALIDATION_ERROR` (invalid UUID) |
| **Side effects** | Row created in `readiness_sessions` with `status = 'in_progress'` |
| **Idempotency** | Repeated calls with the same `sessionToken` while the session exists return `200` with the existing session shape and create no duplicate row. |

### 6.4 GET /v1/readiness-check/session/:token

| Property | Value |
|----------|-------|
| **Purpose** | Retrieve session state (abandonment/resume detection) |
| **Auth** | Public (rate-limited: 20 req/min/IP) |
| **Path params** | `:token` — UUID session token |
| **Response** | `200` — See §5.6 `SessionState` |
| **Error codes** | `404 NOT_FOUND` (session token does not exist) |
| **Side effects** | None |

### 6.5 POST /v1/readiness-check/answer

| Property | Value |
|----------|-------|
| **Purpose** | Submit a single answer |
| **Auth** | Public (rate-limited: 30 req/min/IP) |
| **Request body** | See §5.7 `AnswerSubmission` |
| **Validation** | Session token must exist and be `in_progress`. Question must belong to active question set. Option must belong to question. |
| **Response** | `200` — See §5.7 `AnswerResponse` |
| **Duplicate handling** | Same `(sessionToken, questionId, optionId)` → idempotent 200, no new row. Same `(sessionToken, questionId)` with different `optionId` → `409 Conflict`. |
| **Completion trigger** | When 7th answer submitted: backend scores session, sets `status = 'completed'`, populates `result_category`, `result_score`, `completed_at`. Returns `isComplete: true`. |
| **Error codes** | `404 NOT_FOUND` (session not found), `409 CONFLICT` (answer change attempted), `422 VALIDATION_ERROR` (invalid question/option) |
| **Side effects** | Row in `readiness_responses`. On completion: session record updated with result. |

### 6.6 POST /v1/readiness-check/link-session

| Property | Value |
|----------|-------|
| **Purpose** | Link anonymous session to authenticated user |
| **Auth** | Required (Bearer token) |
| **Request body** | `{ "sessionToken": "<uuid>" }` |
| **Response** | `200` — `{ linked: true }` |
| **Preconditions** | Session must exist. Session must have `status = 'completed'`. |
| **Idempotency** | Same user re-linking same session → success. Different user → `403 Forbidden`. |
| **Error codes** | `401 UNAUTHORISED`, `403 FORBIDDEN` (session linked to different user), `404 NOT_FOUND` (session not found or not completed) |
| **Side effects** | Sets `user_id` on `readiness_sessions` record. `session_token` field is retained. |

### 6.7 GET /v1/readiness-check/result/:sessionToken

| Property | Value |
|----------|-------|
| **Purpose** | Retrieve readiness result |
| **Auth** | Required (Bearer token — must match linked user) |
| **Path params** | `:sessionToken` — UUID |
| **Response** | `200` — See §5.8 `ReadinessResult` |
| **Verification** | Session must exist, `status = 'completed'`, authenticated user's `user_id` must match session's `user_id`. |
| **Error codes** | `401 UNAUTHORISED`, `403 FORBIDDEN` (user mismatch), `404 NOT_FOUND` (session not found or not completed) |
| **Side effects** | None |

### 6.8 GET /v1/users/me

| Property | Value |
|----------|-------|
| **Purpose** | Get current user profile |
| **Auth** | Required (Bearer token) |
| **Response** | `200` — See §5.9 `UserProfile` |
| **Error codes** | `401 UNAUTHORISED` |
| **Side effects** | None |

### 6.9 DELETE /v1/users/me

| Property | Value |
|----------|-------|
| **Purpose** | Request account deletion (GDPR) |
| **Auth** | Required (Bearer token) |
| **Response** | `200` — `{ message: "Your account and data have been scheduled for deletion within 30 days." }` |
| **Error codes** | `401 UNAUTHORISED` |
| **Side effects** | Account and associated data scheduled for deletion. Implementation in backend-compliance.md (not present). |

### 6.10 POST /v1/contact/submit

| Property | Value |
|----------|-------|
| **Purpose** | Submit contact form |
| **Auth** | Public (rate-limited: 3 req/hr/IP, spam-protected) |
| **Request body** | See §5.10 `ContactSubmission` |
| **Validation** | `name`: 2–100 chars. `email`: valid format. `message`: 20–2000 chars. `subject`: max 200 chars. `type`: required and must be a valid enum value. `honeypot`: must be empty. |
| **Spam handling** | If `honeypot` is non-empty: silently return success response, store nothing, send no emails. |
| **Response** | `200` — See §5.10 `ContactSubmissionResponse` |
| **Error codes** | `422 VALIDATION_ERROR` (with field-level details), `429 RATE_LIMITED`, `500 INTERNAL_ERROR` |
| **Side effects** | Row in `contact_submissions`. Notification email to `thomas@ia-2.com`. Auto-reply email to submitter (content varies by enquiry type). Steps are independent — failure of one does not block others. |
| **Readiness integration** | When `source = 'readiness_check'`: `readiness_session_id`, `result_category`, `result_score` are stored on the submission record. Included in notification email. |

### 6.11 GET /v1/content/:page

| Property | Value |
|----------|-------|
| **Purpose** | Fetch rendered content for a page |
| **Auth** | Public (rate-limited: 100 req/min/IP) |
| **Path params** | `:page` — `about`, `projects`, `research`, `insights`, `home` |
| **Query params** | `slug` (optional): filter sections to single match, 404 if not found. `featured` (optional, boolean): filter to featured items only. |
| **Response** | `200` — See §5.11 `ContentPageResponse` |
| **Cache headers** | `Cache-Control: public, max-age=60, stale-while-revalidate=300`. ETag from `lastUpdated`. Supports `304 Not Modified` via `If-None-Match`. |
| **Error codes** | `404 NOT_FOUND` (page or slug not found) |
| **Frontend integration** | Called via React Server Components. ISR with `revalidate: 60`. |

### 6.12 GET /v1/content/insights

| Property | Value |
|----------|-------|
| **Purpose** | Fetch paginated insights list |
| **Auth** | Public |
| **Query params** | `page` (integer, default 1), `perPage` (integer, default 10, max 20) |
| **Response** | Paginated response (see §5.1 `ApiPaginated`) |

### 6.13 POST /v1/analytics/event (Internal)

| Property | Value |
|----------|-------|
| **Purpose** | Ingest frontend analytics event |
| **Auth** | API key protected |
| **Request body** | `{ event, sessionId, properties, timestamp }` |
| **Tracked events** | `page_view`, `llm_query_submitted`, `llm_query_completed`, `readiness_check_started`, `readiness_check_completed`, `contact_form_submitted`, `auth_started`, `auth_completed`, `cta_clicked` |
| **Side effects** | Event stored in analytics tables (schema in backend-analytics.md, not present) |

### 6.14 GET /v1/health

| Property | Value |
|----------|-------|
| **Purpose** | Basic health check |
| **Auth** | Public |
| **Response** | `200` — `{ status: "healthy", version: "1.0.0", timestamp: "..." }` |

### 6.15 GET /v1/health/services (Admin)

| Property | Value |
|----------|-------|
| **Purpose** | Detailed downstream service health |
| **Auth** | Admin key |
| **Response** | `200` — Status of api, llm, rag, database, auth |

---

## 7. Auth and Session Interfaces

### 7.1 Auth Platform

| Property | Value |
|----------|-------|
| Provider | Supabase Auth |
| Methods | LinkedIn OAuth (`linkedin_oidc`), Email Magic Link (`signInWithOtp`) |
| Session storage | JWT access token (1h) + refresh token (30d) in HTTP-only cookies via `@supabase/ssr` |
| User table | `auth.users` (Supabase managed) |
| Profile table | `public.user_profiles` (created via database trigger on first sign-in) |

### 7.2 Auth Strategy

Auth is **additive, not gatekeeping**. The single auth gate is the readiness check result screen.

| Action | Auth required |
|--------|--------------|
| Browse all pages | No |
| Use LLM | No |
| Start/complete readiness check | No |
| View readiness result | **Yes** |
| Access saved profile/results | **Yes** |
| Submit contact form | No |

### 7.3 Protected vs Unprotected Routes

| Route | Auth |
|-------|------|
| `/` through `/contact` | Public |
| `/readiness` | Public |
| `/readiness/result` | **Required** — redirect to `/readiness` if no session |
| `/privacy`, `/cookies` | Public |
| `/auth/callback` | Internal handler |

### 7.4 LinkedIn OAuth Flow

1. User clicks "Continue with LinkedIn" on auth gate
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: '{origin}/auth/callback?next=/readiness/result', scopes: 'openid profile email' } })`
3. Browser redirects to LinkedIn → user approves → LinkedIn redirects to Supabase callback
4. Supabase exchanges code, creates/retrieves `auth.users` record, redirects to `/auth/callback`
5. Auth callback handler exchanges code for session, redirects to `/readiness/result`
6. Result screen performs session linking client-side (see §8.3)

**Metadata captured from LinkedIn:**

| Field | Source | Storage | Reliability |
|-------|--------|---------|-------------|
| `display_name` | `raw_user_meta_data.name` | `user_profiles.display_name` | Reliable |
| `email` | `raw_user_meta_data.email` | `auth.users.email` | Reliable |
| `avatar_url` | `raw_user_meta_data.picture` | `user_profiles.avatar_url` | Reliable |
| `linkedin_headline` | `raw_user_meta_data.headline` | `user_profiles.linkedin_headline` | Best-effort (NULL if absent) |
| `linkedin_location` | `raw_user_meta_data.locale` | `user_profiles.linkedin_location` | Best-effort (NULL if absent) |

### 7.5 Email Magic Link Flow

1. User clicks "Continue with Email" on auth gate
2. Email input field appears. User enters email and submits.
3. Frontend calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '{origin}/auth/callback?next=/readiness/result' } })`
4. Supabase sends magic link email via Resend SMTP
5. User clicks link → Supabase validates → session established → redirect to `/auth/callback`
6. Same callback handling as LinkedIn flow

**Magic link properties:**

| Property | Value |
|----------|-------|
| Expiry | 1 hour |
| Redirect URL | `https://thomashadden.ai/readiness/result` |
| Email template | Configured in Supabase Auth dashboard |

### 7.6 User Profile Creation

On first sign-in, a database trigger creates a `user_profiles` record:

- Trigger: `AFTER INSERT ON auth.users`
- Function: `handle_new_user()` — extracts name, avatar, provider, LinkedIn metadata
- Conflict handling: `ON CONFLICT (id) DO NOTHING` — prevents duplicates on re-auth

### 7.7 Session Token Storage

| Token | Expiry | Storage | Management |
|-------|--------|---------|------------|
| Access token (JWT) | 1 hour | HTTP-only cookie + memory | `@supabase/ssr` |
| Refresh token | 30 days | HTTP-only cookie | `@supabase/ssr` |

Cookies set with `SameSite=Lax`. Auto-refresh before expiry. No custom JWT logic.

### 7.8 Auth Callback Security

The callback handler at `/auth/callback` validates the `next` parameter against `^/[a-z]` to prevent open redirect attacks. Invalid values default to `/`.

### 7.9 Auth Failure Modes

| Scenario | Handling |
|----------|----------|
| User dismisses auth prompt | Stay on auth gate. No data lost. |
| LinkedIn denied by user | Soft message, allow retry or switch to email |
| Magic link expired | "Link expired" message, offer to resend |
| Magic link already used | Error message, offer to request new one |
| LinkedIn returns no email | Block sign-in, suggest email method |
| Session token not found after auth | Error, offer to restart assessment |
| Session > 24h old on auth | Expired, prompt restart |
| Session linked to different user | `403` — "This assessment is linked to a different account" |

### 7.10 Sign Out

Not a prominent V1 feature. Sessions naturally expire after 30 days of inactivity. Sign-out mechanism exists via `supabase.auth.signOut()` but is not surfaced in V1 UI.

---

## 8. Flow Contracts

### 8.1 LLM Query Flow

**Trigger:** User submits query via input field or prompt chip click.

**Steps:**

1. Frontend validates input (3–500 chars)
2. Frontend generates/retrieves `llm_session_id` from sessionStorage
3. Frontend calls `POST /v1/llm/query` with `{ query, stream: true, sessionId, context: { source } }`
4. Next.js API route proxies request to backend, forwarding SSE stream without buffering
5. Backend pipeline executes: validation → rate limit → content filter → blocklist → intent classify → route → context assembly → LLM call → log → stream
6. Frontend receives SSE chunks, renders progressively
7. On `done: true` event: sources and suggested actions rendered below answer

**Success outcome:** Answer streams into response area. Sources and CTAs fade in.

**Failure outcomes:**

| Failure | Frontend behaviour |
|---------|--------------------|
| LLM_ERROR (500) | "I'm having a moment — please try again in a few seconds." + retry button |
| SERVICE_UNAVAILABLE (503) | "This feature is temporarily unavailable." No retry. Input disabled. |
| RATE_LIMITED (429) | Countdown timer from `Retry-After` header. Input disabled during countdown. |
| Network error | "Connection lost." + retry button |
| Stream interrupted (30s timeout) | Partial answer displayed + "I was interrupted — try asking again." + retry button |
| SSE error event mid-stream | Display error `message` from event. Same as 503 treatment. |
| OUT_OF_SCOPE / CONTENT_FILTERED | Natural redirect message displayed as the answer. No retry. |

**Retry:** User re-submits. No automatic retry.

### 8.2 Readiness Check Flow

**Trigger:** User clicks "Start the 2-minute assessment" CTA.

**Steps:**

1. Frontend checks localStorage for existing `readiness_session_token`
2. If found and < 24h old: call `GET /v1/readiness-check/session/:token`
   - If `in_progress` with answers: show continue/restart prompt
   - If `completed`: redirect to auth gate or result
   - If not found (404): clear localStorage, start fresh
3. If not found or stale: generate new UUID, store in localStorage, call `POST /v1/readiness-check/session`
4. Fetch questions: `GET /v1/readiness-check/questions`
5. Display questions one per page, forward-only
6. On option selection: immediately call `POST /v1/readiness-check/answer` (before "Next" tap)
7. Progress bar updates after answer submission confirms
8. On 7th answer: backend scores, returns `isComplete: true`
9. Show "Calculating your results…" loading state (1–2s)
10. Transition to auth gate screen

**Success outcome:** All 7 questions answered. Session scored. Auth gate displayed.

**Failure outcomes:**

| Failure | Handling |
|---------|----------|
| Session not found (404) on resume | Clear localStorage, start fresh |
| Answer conflict (409) | Frontend ignores, advances to next question |
| Session already completed | Redirect to auth gate |
| Incomplete session scored (422) | Show error, prompt completion of remaining questions |

### 8.3 Auth + Result Delivery Flow

**Trigger:** User authenticates via LinkedIn or Email from auth gate.

**Steps:**

1. Auth gate displays: "Your results are ready." + LinkedIn/Email buttons
2. User authenticates → Supabase callback → `/auth/callback` handler → redirect to `/readiness/result`
3. ResultScreen component mounts:
   a. Verify Supabase session exists. If not → redirect to `/readiness`.
   b. Read `readiness_session_token` from localStorage. If not found → show "session not found" error.
   c. Call `POST /v1/readiness-check/link-session` with JWT + sessionToken
   d. On link success: call `GET /v1/readiness-check/result/:sessionToken` with JWT
   e. Render result: category, score, interpretation, next step, CTA

**Success outcome:** Result screen rendered with category, score, and contextual CTA.

**Failure outcomes:**

| Failure | Handling |
|---------|----------|
| No auth session on result page | Redirect to `/readiness` |
| No session token in localStorage | "Something went wrong" + restart button |
| Link failed (403 — different user) | "This assessment is linked to a different account" + restart |
| Link failed (404 — session not found) | Error + restart button |
| Result fetch failed | Error + restart button |
| Session > 24h old | "Session expired" + restart button |

### 8.4 Contact Form Flow

**Trigger:** User submits contact form.

**Steps:**

1. Client-side validation on blur + on submit
2. If honeypot non-empty: simulate success (no API call)
3. Call `POST /v1/contact/submit` with form data
4. On success: replace form with personalised success message

**Pre-fill behaviour (from readiness check):**

| Source | Field | Value |
|--------|-------|-------|
| URL query param `source` | `source` hidden field | `readiness_check` |
| URL query param `result` | `subject` | "AI Readiness follow-up" |
| URL query param `source=readiness_check` | `enquiryType` | `business_enquiry` |
| Supabase session | `name` | From `user.user_metadata.name` |
| Supabase session | `email` | From `user.email` |

Name and email are NEVER passed as URL query params (prevents PII in browser history/logs).

**Backend side effects (independent — partial failure does not block others):**
1. Write to `contact_submissions` table
2. Send notification email to `thomas@ia-2.com`
3. Send auto-reply email to visitor (content varies by enquiry type)

**Failure outcomes:**

| Failure | Frontend behaviour |
|---------|--------------------|
| 422 VALIDATION_ERROR | Map field-level errors. Re-enable form. |
| 429 RATE_LIMITED | "You've already submitted recently." Disable submit. |
| 500 INTERNAL_ERROR | "Something went wrong. Email thomas@ia-2.com directly." |
| Network error | "Connection lost." + retry |

---

## 9. Frontend Integration Contract

### 9.1 Endpoint Availability

The frontend can rely on all public endpoints being available without authentication. The backend API is the single communication layer — no direct calls to Supabase, Azure AI Foundry, or Resend from client-side code.

### 9.2 Response Shape Guarantees

- All responses use the standard envelope (§5.1)
- Success responses always have `success: true` and `data`
- Error responses always have `success: false` and `error.code` + `error.message`
- `meta.requestId` and `meta.timestamp` are present on all responses
- Paginated responses include `pagination` object

### 9.3 Loading States

| Context | Loading indicator | Max expected duration |
|---------|-------------------|----------------------|
| LLM first token | Three-dot typing indicator | < 1.5s |
| Readiness answer submission | None visible (fire-and-forget) | < 200ms |
| Final answer → scoring | "Calculating your results…" spinner | < 1s |
| Post-auth → result fetch | "Loading your results…" spinner | < 1s |
| Content page load | Skeleton placeholders | SSR — instant |
| Contact form submission | Button loading spinner | < 2s |

### 9.4 Error State Requirements

Frontend must handle these error codes from all relevant endpoints:

| Code | HTTP | Frontend handling |
|------|------|-------------------|
| `VALIDATION_ERROR` | 422 | Map `error.details` to field-level errors |
| `RATE_LIMITED` | 429 | Show rate limit message, disable input, countdown from `Retry-After` |
| `UNAUTHORISED` | 401 | Redirect to auth gate or show auth prompt |
| `FORBIDDEN` | 403 | Show contextual error (e.g. "linked to different account") |
| `NOT_FOUND` | 404 | Show not-found state or restart prompt |
| `LLM_ERROR` | 500 | Show friendly error + retry button |
| `SERVICE_UNAVAILABLE` | 503 | Show unavailability message, no retry |
| `INTERNAL_ERROR` | 500 | Generic error, offer alternative (direct email) |

### 9.5 Streaming Behaviour

- SSE is the primary LLM response mode
- Frontend must buffer partial reads across `read()` calls
- Parse only complete `data: {...}\n` lines (split on `\n\n`)
- Next.js proxy must stream passthrough without buffering
- Max stream duration enforced at 30 seconds
- Partial answers preserved on interruption

### 9.6 Content Caching

- Content endpoints use ISR with `revalidate: 60`
- Backend sets `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- ETags supported — client should send `If-None-Match`
- Content fetched via React Server Components (auto-deduplicated)

### 9.7 Validation Contracts

**Client-side validation (run on blur + submit):**

| Field | Rule |
|-------|------|
| LLM query | 3–500 chars |
| Contact name | 2–100 chars |
| Contact email | Valid email format |
| Contact enquiry type | Must be selected |
| Contact message | 20–2000 chars |
| Contact subject | Max 200 chars |
| Contact honeypot | Must be empty |

**Server-side validation mirrors client-side.** On 422, `error.details` maps to field names for field-level error display.

### 9.8 Deduplication and Double-Submit Prevention

| Context | Mechanism |
|---------|-----------|
| LLM queries | 500ms debounce |
| Readiness answer | Button disabled after click |
| Contact form | Button disabled + loading state during submission |

---

## 10. Error Model

### 10.1 Error Code Taxonomy

| Code | HTTP Status | Category | Description |
|------|-------------|----------|-------------|
| `UNAUTHORISED` | 401 | Auth | Missing or invalid Bearer token |
| `FORBIDDEN` | 403 | Auth | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Validation | Request body failed validation |
| `RATE_LIMITED` | 429 | Rate limit | Rate limit exceeded |
| `CONTENT_FILTERED` | 400 | LLM | Query blocked by content filter |
| `OUT_OF_SCOPE` | 400 | LLM | Query outside defined scope |
| `LLM_ERROR` | 500 | Dependency | LLM service error |
| `RAG_ERROR` | 500 | Dependency | RAG retrieval error |
| `INTERNAL_ERROR` | 500 | Server | Unspecified internal error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency | Downstream service unavailable |

### 10.2 Rate Limit Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again shortly.",
    "retryAfter": 60
  }
}
```
HTTP status: 429. Header: `Retry-After: <seconds>`.

### 10.3 Validation Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body failed validation",
    "details": {
      "email": "Please enter a valid email address",
      "message": "Your message must be between 20 and 2000 characters"
    }
  }
}
```

**Note:** The exact structure of `error.details` for field-level errors is inferred from frontend-interface.md §8.8 and backend-contact.md §11. The backend spec does not explicitly define the details object shape. **Labelled as Inference.**

### 10.4 Graceful Degradation Hierarchy

```
Full functionality
  → LLM available, RAG unavailable (general AI answers still work)
  → LLM unavailable, site fully functional (content, readiness, contact all work)
  → API unavailable, static site still loads
```

LLM unavailability must never impact other site functionality. **Confirmed** — backend-llm.md §16.4.

---

## 11. State Machines and Lifecycle Rules

### 11.1 Readiness Session Lifecycle

| Status | Description | Allowed transitions |
|--------|-------------|---------------------|
| `in_progress` | Session created. 0–6 answers submitted. | → `completed` (on 7th answer) |
| `completed` | All questions answered, result calculated. | → (linked to user via `user_id`) |
| `abandoned` | Session > 30 days old with status `in_progress`. | Terminal state (cleanup job) |

**Illegal transitions:** `completed` → `in_progress`. `abandoned` → `in_progress`. Re-answering a question with a different option (409).

**Stale session:** Sessions > 24 hours old and `in_progress` are considered stale by the frontend. The frontend prompts restart. The backend does not enforce staleness — it only stores the `started_at` timestamp. Staleness check is client-side. **Confirmed** — backend-readiness-check.md §6.3.

### 11.2 Readiness Session — user_id Linking

| State | Transition |
|-------|------------|
| `user_id = NULL` | → `user_id = <auth_user_id>` via `POST /link-session` |
| `user_id = X` | → Same user X re-links: idempotent success |
| `user_id = X` | → Different user Y attempts link: `403 Forbidden` |

### 11.3 Auth Session Lifecycle

| State | Duration | Transition |
|-------|----------|------------|
| Active | Access token valid (< 1h since issue/refresh) | Auto-refresh before expiry |
| Refreshable | Access token expired, refresh token valid (< 30d) | Auto-refresh → Active |
| Expired | Both tokens expired | User must re-authenticate |

No explicit sign-out in V1 UI. Sessions expire naturally.

### 11.4 LLM Session Lifecycle

| State | Storage | Lifetime |
|-------|---------|----------|
| Active | sessionStorage (`llm_session_id`) | Per browser tab |
| Destroyed | Cleared on tab close | N/A |

Per-session limits: 20 queries, 40,000 total tokens. On cap: LLM returns natural-language cap message (not error code).

### 11.5 Contact Submission Lifecycle

| State | Description |
|-------|-------------|
| Submitted | Row in `contact_submissions`, `read = false` |
| Read | Thomas marks as read via Supabase dashboard (`read = true`) |

No automated state transitions. Admin-only field.

---

## 12. Infrastructure and Operational Interface Notes

### 12.1 Runtime Dependencies

| Dependency | Impact if unavailable |
|-----------|----------------------|
| Supabase PostgreSQL | All data reads/writes fail. Site non-functional except static pages. |
| Azure AI Foundry | LLM queries return SERVICE_UNAVAILABLE. All other features work. |
| Resend SMTP | Magic links and contact emails fail. Auth via LinkedIn still works. Contact submissions still stored. |
| Cloudflare | DNS resolution fails. Site unreachable. |

### 12.2 Client IP Source

Rate limiting must read client IP from `CF-Connecting-IP` header (set by Cloudflare). Must NOT trust `X-Forwarded-For` (spoofable). **Confirmed** — backend-infrastructure.md §2.3.

### 12.3 Environment Variables Affecting Contracts

| Variable | Contract impact |
|----------|----------------|
| `LLM_DAILY_TOKEN_CAP` | When exhausted: LLM returns SERVICE_UNAVAILABLE |
| `READINESS_SESSION_EXPIRY_HOURS` | Default 24. Frontend staleness check uses this value. |
| `READINESS_QUESTION_VERSION` | Identifies active question set. Changes require migration. |
| `RAG_MATCH_THRESHOLD` | Default 0.75. Affects RAG retrieval quality. |
| `RAG_MATCH_COUNT` | Default 5. Max chunks per query. |
| `EMBEDDING_DIMENSIONS` | 3072 (text-embedding-3-large). Must match pgvector column. |

### 12.4 Deployment Contract

Push to `main` → GitHub Actions → build → test → migrate → deploy → RAG re-ingestion → health check.

RAG re-ingestion is triggered automatically post-deploy via `POST /api/rag/ingest` with admin key. Content changes are not live until re-ingestion completes.

### 12.5 Database Retention Rules

| Data | Retention |
|------|-----------|
| `llm_query_log` | 90 days rolling. Aggregates computed before deletion. |
| `readiness_sessions` (abandoned) | 30 days — incomplete sessions with no responses deleted |
| `contact_submissions` | Indefinite |
| `readiness_contact_leads` | Indefinite |

---

## 13. Traceability Matrix

| Interface / Model / Flow | Source File(s) | Confidence | Notes |
|--------------------------|---------------|------------|-------|
| Standard API envelope | backend-api.md §5 | Confirmed | Consistent across all specs |
| POST /llm/query | backend-api.md §7.1, backend-llm.md §3, frontend-interface.md §5 | Confirmed | All three agree on contract |
| SSE streaming format | backend-api.md §7.1, frontend-interface.md §5.4 | Confirmed | Chunk/completion/error events consistent |
| SSE proxy 30s timeout | frontend-interface.md §5.4 | Confirmed | Backend-api.md silent on timeout — frontend spec adds it |
| LLM intent categories | backend-llm.md §4.2, backend-api.md §7.1 | Confirmed | 5 categories + `filtered` |
| LLM cost controls | backend-llm.md §13 | Confirmed | Per-session and daily caps |
| GET /readiness-check/questions | backend-api.md §9.1 | Confirmed | |
| POST /readiness-check/session | backend-api.md §9.2 | Confirmed | |
| GET /readiness-check/session/:token | backend-api.md §9.3, backend-readiness-check.md §7 | Confirmed | |
| POST /readiness-check/answer | backend-api.md §9.4, backend-readiness-check.md §10.1 | Confirmed | Idempotency/conflict rules aligned |
| POST /readiness-check/link-session | backend-api.md §9.5, backend-auth.md §3.2 | Confirmed | |
| GET /readiness-check/result/:sessionToken | backend-api.md §9.6, backend-readiness-check.md §10.3 | Confirmed | |
| Readiness scoring model | backend-readiness-check.md §4 | Confirmed | Raw 7–28, normalised 0–100 |
| Readiness categories | backend-readiness-check.md §5, backend-database.md §5.1 | Confirmed | 4 categories, enum values aligned |
| Readiness session lifecycle | backend-readiness-check.md §6.2 | Confirmed | 3 states |
| POST /contact/submit | backend-api.md §11.1, backend-contact.md §2, §5 | Confirmed | |
| Contact enquiry types | backend-contact.md §3, frontend-interface.md §8.2 | Confirmed | 4 types, keys match |
| Contact spam protection | backend-contact.md §4 | Confirmed | Honeypot + rate limit |
| Contact notification/auto-reply | backend-contact.md §6, §7 | Confirmed | Per-enquiry-type templates |
| GET /content/:page | backend-api.md §13.1 | Confirmed | |
| Content caching | backend-api.md §13.1, frontend-interface.md §12.6 | Confirmed | 60s max-age, ISR aligned |
| User profile model | backend-api.md §10.1, backend-database.md §6.1 | Confirmed | `jobTitle?` is best-effort projection from `linkedin_headline`; `company` omitted in V1 |
| Contact field naming | backend-api.md §11.1, backend-database.md §7.3 | Confirmed | API `type` → DB `enquiry_type` (mapping in API layer) |
| Auth methods | backend-auth.md §2 | Confirmed | LinkedIn + Email Magic Link |
| Auth gate flow | backend-auth.md §3, backend-readiness-check.md §8, frontend-interface.md §6.8–6.10 | Confirmed | All three aligned |
| LinkedIn metadata | backend-auth.md §4.3 | Confirmed | 5 fields, 2 best-effort |
| Session token storage | backend-auth.md §6.1, frontend-interface.md §7.6 | Confirmed | HTTP-only cookies via @supabase/ssr |
| User profile trigger | backend-auth.md §7, backend-database.md §6.1 | Confirmed | ON CONFLICT DO NOTHING |
| Anonymous sessions | backend-auth.md §8 | Confirmed | Client-generated UUIDs, no Supabase anon auth |
| Protected routes | backend-auth.md §9.1, frontend-interface.md §3 | Confirmed | Only /readiness/result gated |
| RLS policies | backend-database.md §9 | Confirmed | All tables RLS-enabled |
| Rate limits | backend-api.md §4 | Confirmed | Per-endpoint limits defined |
| Health endpoints | backend-api.md §14 | Confirmed | |
| Analytics events | backend-api.md §12.1 | Confirmed | 9 event types |
| Error codes | backend-api.md §6 | Confirmed | 11 codes defined |
| Database schema | backend-database.md §3–7 | Confirmed | 13 tables |
| question_count (7 in V1) | backend-readiness-check.md §1.2 | Confirmed | Frontend-facing wording is 7 questions in V1 |
| `type` field in contact request | backend-api.md §11.1 | Confirmed | Named `type`, not `enquiry_type` |
| `honeypot` field required | backend-api.md §11.1 | Confirmed | "Must be empty" |
| Nav height | golden-truth §5.6 (56–64px) vs frontend-interface.md §4.1 (60px) | Inferred | Minor discrepancy, non-blocking |
| API base URL vs Next.js routes | backend-api.md §2.1, frontend-interface.md §1.5 | Confirmed | V1 runtime uses same-app `/api/*`; handlers implement `/v1/*` contract namespace |

---

## 14. Open Questions

| # | Question | Impact | Source |
|---|----------|--------|--------|
| OQ-3 | The `backend-rag.md` file is referenced but not present. What is the full RAG retrieval contract? | RAG integration completeness | Multiple specs reference it |
| OQ-4 | The `backend-analytics.md` file is referenced but not present. What tables store analytics events? Is there a dedicated analytics schema? | Analytics implementation | backend-api.md §12 |
| OQ-5 | The `backend-compliance.md` file is referenced but not present. How is account deletion (DELETE /users/me) actually implemented? What data is purged? | GDPR compliance | backend-api.md §10.2 |
| OQ-6 | `READINESS_SESSION_EXPIRY_HOURS` is defined as an env var (default 24), but the frontend hardcodes a 24-hour check in client-side JavaScript. Should the frontend read this from an API response instead? | Staleness check consistency | backend-readiness-check.md §13, frontend-interface.md §6.3 |
| OQ-7 | How does the frontend know the active `READINESS_QUESTION_VERSION`? If questions change (via migration + version bump), does the frontend need to invalidate cached question sets? | Question versioning | backend-readiness-check.md §13 |
| OQ-9 | Where is the `readiness_contact_leads` insert triggered? backend-database.md defines the table, backend-contact.md §8.2 says it's "reserved for leads captured directly on the result screen before the visitor navigates to the contact form." No endpoint writes to it. | Missing write path | backend-database.md §7.2, backend-contact.md §8.2 |
| OQ-10 | `readiness_sessions` has `contact_email` and `contact_name` columns. No endpoint populates these. Are they used? | Unused schema columns | backend-database.md §5.1 |

---

## 15. Residual Conflicts Requiring Resolution

### Conflict 1: Honeypot Field Name

| Aspect | Detail |
|--------|--------|
| **Topic** | Honeypot field naming between DOM and API |
| **Source A** | backend-contact.md §4.1: hidden field named `website` in HTML |
| **Source B** | backend-api.md §11.1: API field named `honeypot` |
| **Source C** | frontend-interface.md §8.4: DOM name is `website`, API field is `honeypot` |
| **Why it matters** | Frontend must map DOM field `website` to API field `honeypot` |
| **Recommendation** | Not a true conflict — this is intentional (DOM name `website` is a decoy for bots, API field `honeypot` is the contract name). Document the mapping explicitly. |

---

## 16. Recommended Next Actions

### 16.1 Missing Documents to Create

- `backend-rag.md` — full RAG retrieval contract, chunking strategy, embedding pipeline
- `backend-analytics.md` — analytics event schema, storage tables, aggregation queries
- `backend-compliance.md` — GDPR data deletion implementation, data subject access requests

### 16.2 Specs to Amend

- None required for the settled V1 alignment decisions in this patch set.

### 16.3 Interfaces to Clarify

- `readiness_contact_leads` write path — no endpoint currently writes to this table (OQ-9)
- `contact_email` and `contact_name` columns on `readiness_sessions` — clarify usage or remove (OQ-10)

### 16.4 Test Cases to Derive

Based on this contract, the following test areas need coverage beyond what `thomashadden-ai-test-plan.md` already defines:

- `error.details` field-level mapping for 422 responses (§10.3 — currently Inferred)
- Content endpoint ETag / 304 behaviour
- Magic link re-send flow (expired link → re-request)
- Pre-fill contact form from readiness check CTA with authenticated session
- SSE proxy 30-second timeout handling

### 16.5 Gaps to Review with Stakeholders

- Is `readiness_contact_leads` still needed, or is it replaced by `contact_submissions` with `source = 'readiness_check'`?
- Should the 24-hour staleness threshold be configurable via API rather than hardcoded in frontend JS?
- Is `DELETE /users/me` a V1 priority, or should it be deferred until `backend-compliance.md` is written?

---

*thomashadden.ai | Industrial Analytics & Automation | interface.md v1.0*
