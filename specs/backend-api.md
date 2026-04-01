# thomashadden.ai — Backend API Specification

**Version:** 1.0
**Date:** March 2026
**Status:** Confidential
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation
**Companion documents:** backend-llm.md, backend-rag.md, backend-auth.md, backend-readiness-check.md, backend-contact.md, backend-analytics.md

---

## Contents

1. [Overview](#1-overview)
2. [Base URL & Versioning](#2-base-url--versioning)
3. [Authentication](#3-authentication)
4. [Rate Limiting](#4-rate-limiting)
5. [Standard Response Format](#5-standard-response-format)
6. [Error Codes](#6-error-codes)
7. [LLM Endpoints](#7-llm-endpoints)
8. [RAG Endpoints](#8-rag-endpoints)
9. [Readiness Check Endpoints](#9-readiness-check-endpoints)
10. [User & Auth Endpoints](#10-user--auth-endpoints)
11. [Contact Endpoints](#11-contact-endpoints)
12. [Analytics Endpoints](#12-analytics-endpoints)
13. [Content Endpoints](#13-content-endpoints)
14. [Health & Status Endpoints](#14-health--status-endpoints)

---

## 1. Overview

This document defines all API endpoints for thomashadden.ai. The API is a RESTful JSON API that serves the frontend, the LLM interface, the AI Readiness Check, user authentication, contact form, and internal analytics.

The API is the single communication layer between the frontend and all backend services. No backend service is called directly from the frontend.

### 1.1 Design Principles

- All endpoints return JSON
- All endpoints use HTTPS
- All mutations use POST or PATCH, never GET
- All responses follow a consistent envelope format
- Authentication is handled via Bearer tokens
- Public endpoints are rate-limited
- Sensitive endpoints require authentication
- All endpoints are versioned

### 1.2 Service Boundaries

| Service | Responsibility |
|---------|---------------|
| LLM Service | Query routing, prompt construction, response streaming |
| RAG Service | Content retrieval, vector search, context assembly |
| Auth Service | OAuth flows, session management, token issuance |
| Users Service | User identity, lead capture, result storage |
| Readiness Check Service | Question delivery, answer submission, result scoring |
| Contact Service | Form submission, notification dispatch |
| Analytics Service | Event ingestion, visit tracking |
| Content Service | Markdown content delivery for frontend rendering |

---

## 2. Base URL & Versioning

### 2.1 Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.thomashadden.ai/v1` |
| Staging (not used in V1) | `https://api-staging.thomashadden.ai/v1` |
| Local development (contract namespace) | `http://localhost:3001/v1` |

### 2.2 Versioning

All endpoints are prefixed with `/v1`. When breaking changes are introduced a new version prefix `/v2` will be introduced. Old versions will be supported for a deprecation window before removal. Version deprecation will be communicated in `backend-roadmap.md`.

**V1 runtime mapping note:** In V1, browser clients call same-app relative `/api/*` routes handled by Next.js route handlers (for example, `/api/llm/query`). Those same-app route handlers are the concrete V1 runtime surface and implement the `/v1/*` contract defined in this specification. `/v1/*` remains the logical/public contract namespace. No separate local API server is required for frontend integration in V1.

---

## 3. Authentication

Full authentication specification is defined in `backend-auth.md`. This section summarises the API-level requirements.

### 3.1 Public Endpoints

The following endpoints require no authentication:

- `POST /llm/query` — LLM query (rate-limited)
- `GET /readiness-check/questions` — Fetch question set
- `POST /readiness-check/session` — Create assessment session
- `GET /readiness-check/session/:token` — Retrieve session state (abandonment/resume)
- `POST /readiness-check/answer` — Submit individual answer
- `POST /contact/submit` — Contact form submission
- `GET /content/*` — Public content delivery
- `GET /health` — Health check

### 3.2 Authenticated Endpoints

The following endpoints require a valid Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

- `POST /readiness-check/link-session` — Link anonymous session to authenticated user
- `GET /readiness-check/result/:sessionToken` — Retrieve readiness result
- `GET /users/me` — Get current user profile
- `DELETE /users/me` — Request account deletion

### 3.3 Admin Endpoints

Admin endpoints require an additional `X-Admin-Key` header. These are not exposed to the frontend.

- `GET /analytics/*` — Analytics data access
- `GET /contact/submissions` — View contact submissions

### 3.4 API Key Protection

All endpoints are additionally protected by a server-side API key validation layer to prevent direct abuse. This is handled transparently and is not visible to end users. See `backend-auth.md` for full detail.

---

## 4. Rate Limiting

Rate limiting is applied per IP address on public endpoints and per user token on authenticated endpoints.

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| `POST /llm/query` | 10 requests | per minute per IP |
| `POST /contact/submit` | 3 requests | per hour per IP |
| `POST /readiness-check/answer` | 30 requests | per minute per IP |
| `GET /readiness-check/session/:token` | 20 requests | per minute per IP |
| `GET /content/*` | 100 requests | per minute per IP |
| All authenticated endpoints | 60 requests | per minute per token |

### 4.1 Rate Limit Response

When a rate limit is exceeded the API returns:

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

HTTP status: `429 Too Many Requests`
Header: `Retry-After: 60`

---

## 5. Standard Response Format

All API responses follow a consistent envelope format.

### 5.1 Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-03-15T10:30:00Z"
  }
}
```

### 5.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-03-15T10:30:00Z"
  }
}
```

### 5.3 Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 42,
    "page": 1,
    "perPage": 10,
    "totalPages": 5
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-03-15T10:30:00Z"
  }
}
```

---

## 6. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORISED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `LLM_ERROR` | 500 | LLM service error |
| `RAG_ERROR` | 500 | RAG retrieval error |
| `INTERNAL_ERROR` | 500 | Unspecified internal error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unavailable |
| `CONTENT_FILTERED` | 400 | Query blocked by content filter |
| `OUT_OF_SCOPE` | 400 | Query outside defined LLM scope |

---

## 7. LLM Endpoints

Full LLM behaviour specification is defined in `backend-llm.md`. This section defines the API contract.

### 7.1 POST /llm/query

Submit a query to the LLM. Supports both streaming and non-streaming responses.

**Authentication:** Public (rate-limited)

**Request:**

```json
{
  "query": "How can AI help an engineering business?",
  "stream": true,
  "sessionId": "sess_abc123",
  "context": {
    "source": "homepage_chip"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | User's query text. Max 500 characters. |
| `stream` | boolean | No | If true, response is streamed as SSE. Default: false. |
| `sessionId` | string | No | Anonymous session identifier for conversation context. |
| `context.source` | string | No | Where the query originated. Used for analytics. Values: `homepage_chip`, `homepage_input`, `llm_page`, `readiness_check` |

**Non-streaming response:**

```json
{
  "success": true,
  "data": {
    "answer": "AI can help engineering businesses in several key ways...",
    "queryType": "general_ai",
    "sources": [
      {
        "title": "AI in Engineering",
        "url": "/projects/ai-in-engineering",
        "relevance": 0.92
      }
    ],
    "suggestedActions": [
      {
        "type": "readiness_check",
        "label": "Take the AI Readiness Check",
        "url": "/readiness-check"
      }
    ],
    "queryId": "qry_abc123"
  }
}
```

**Streaming response (SSE):**

When `stream: true` the endpoint returns a `text/event-stream` response with headers:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Each SSE event is a single `data:` line containing valid JSON, terminated by a blank line (`\n\n`). No `event:` type field, `id:` field, or `retry:` field is used in V1. No auto-reconnect behaviour is specified.

**Chunk events** — sent as tokens are generated:

```
data: {"chunk": "AI can help", "queryId": "qry_abc123"}

data: {"chunk": " engineering businesses", "queryId": "qry_abc123"}

data: {"chunk": " in several key ways...", "queryId": "qry_abc123"}

```

**Completion event** — sent once after the final token. Contains metadata and the `sources` array:

```
data: {"done": true, "queryType": "general_ai", "sources": [{"title": "AI in Engineering", "url": "/projects/ai-in-engineering", "relevance": 0.92}], "suggestedActions": [{"type": "readiness_check", "label": "Take the AI Readiness Check", "url": "/readiness"}], "queryId": "qry_abc123"}

```

The `sources` and `suggestedActions` arrays may be empty but are always present in the completion event.

**Error event** — sent instead of chunk/completion events if the service is temporarily unavailable (e.g. daily token cap exhaustion):

```
data: {"error": true, "code": "SERVICE_UNAVAILABLE", "message": "This feature is temporarily unavailable. The rest of the site works normally — try again later."}

```

After an error event, the stream is closed. No further events are sent.

**Framing rules:**
- Each `data:` line contains exactly one complete JSON object
- Each event is terminated by `\n\n` (blank line after the `data:` line)
- The frontend must buffer partial reads and only parse complete `data: {...}\n` lines — a single `read()` call may deliver a partial event or multiple events

**Query types returned:**

| Value | Description |
|-------|-------------|
| `thomas_profile` | Query answered via RAG over Thomas's content |
| `general_ai` | Query answered via general LLM knowledge |
| `out_of_scope` | Query outside defined scope, polite redirect returned |
| `filtered` | Query blocked by content filter |

---

## 8. RAG Endpoints

Full RAG specification is defined in `backend-rag.md`. These endpoints are internal and not directly called by the frontend. They are called by the LLM service. Documented here for completeness.

### 8.1 POST /rag/retrieve (internal)

Retrieve relevant content chunks for a given query.

**Authentication:** Internal service only

**Request:**

```json
{
  "query": "What projects is Thomas working on?",
  "topK": 5,
  "threshold": 0.75
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "chunks": [
      {
        "content": "Thomas is currently working on...",
        "source": "projects.md",
        "score": 0.94
      }
    ]
  }
}
```

### 8.2 POST /rag/ingest (internal)

Trigger re-ingestion of markdown content files into the vector store. Called automatically by the CI/CD pipeline on deploy.

**Authentication:** Internal service + admin key

**Request:**

```json
{
  "files": ["about.md", "projects.md", "research.md", "insights.md"],
  "forceReingest": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "filesProcessed": 4,
    "chunksCreated": 142,
    "duration": "4.2s"
  }
}
```

---

## 9. Readiness Check Endpoints

Full Readiness Check specification is defined in `backend-readiness-check.md`.

### 9.1 GET /readiness-check/questions

Fetch the current question set for the AI Readiness Check.

**Authentication:** Public

**Response:**

```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "questions": [
      {
        "id": "q1",
        "order": 1,
        "text": "What best describes your business sector?",
        "type": "single_choice",
        "options": [
          { "id": "q1_a", "label": "Engineering / Manufacturing" },
          { "id": "q1_b", "label": "Construction / Electrical" },
          { "id": "q1_c", "label": "Professional Services" },
          { "id": "q1_d", "label": "Other" }
        ]
      }
    ],
    "totalQuestions": 7,
    "estimatedMinutes": 2
  }
}
```

### 9.2 POST /readiness-check/session

Create a new assessment session. Called once when the visitor starts the readiness check.

**Authentication:** Public

**Request:**

```json
{
  "sessionToken": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionToken` | string (UUID) | Yes | Client-generated session identifier, stored in `localStorage`. |

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionToken": "uuid",
    "status": "in_progress",
    "totalQuestions": 7
  }
}
```

**Duplicate `sessionToken` handling (idempotent):** If `POST /readiness-check/session` is called again with a `sessionToken` that already exists for an active session, return `200` with the existing session shape (`sessionToken`, `status`, `totalQuestions`) and do not create a duplicate session row.

### 9.3 GET /readiness-check/session/:token

Retrieve the state of an existing session. Used for abandonment detection and resume flow.

**Authentication:** Public

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `:token` | string (UUID) | The session token from `localStorage`. |

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionToken": "uuid",
    "status": "in_progress",
    "answeredQuestions": [1, 2, 3],
    "nextQuestionIndex": 4,
    "totalQuestions": 7
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `in_progress` or `completed` |
| `answeredQuestions` | number[] | Indices of answered questions |
| `nextQuestionIndex` | number | Index of the next unanswered question |

If the session token does not exist, returns `404`.

### 9.4 POST /readiness-check/answer

Submit a single answer. Called each time the visitor selects an option, before they tap "Next". See `backend-readiness-check.md` §10.1 for validation rules.

**Authentication:** Public (rate-limited: 30 req/min/IP)

**Request:**

```json
{
  "sessionToken": "uuid",
  "questionId": "uuid",
  "optionId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionToken` | string (UUID) | Yes | Session identifier. |
| `questionId` | string | Yes | Question being answered. |
| `optionId` | string | Yes | Selected option. |

**Response:**

```json
{
  "success": true,
  "data": {
    "answeredCount": 3,
    "isComplete": false
  }
}
```

When the final answer is submitted and all 7 questions are answered, the backend scores the session and returns `isComplete: true`:

```json
{
  "success": true,
  "data": {
    "answeredCount": 7,
    "isComplete": true
  }
}
```

The result is not returned at this stage — it requires authentication. See §9.5 and §9.6.

### 9.5 POST /readiness-check/link-session

Link an anonymous assessment session to the authenticated user. Called client-side after the auth callback redirect. See `backend-auth.md` §3.2 and `backend-readiness-check.md` §8.3.

**Authentication:** Required (Bearer token)

**Request:**

```json
{
  "sessionToken": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionToken` | string (UUID) | Yes | Session identifier from `localStorage`. |

**Response:**

```json
{
  "success": true,
  "data": {
    "linked": true
  }
}
```

The backend sets `user_id` on the `readiness_sessions` record. The `session_token` field is retained.

If the session is already linked to the same `user_id`, the call is idempotent and returns success. If the session is linked to a different `user_id`, returns `403 Forbidden`. If the session token does not exist or the session is not completed, returns `404`.

### 9.6 GET /readiness-check/result/:sessionToken

Retrieve the result for a completed and linked session.

**Authentication:** Required (Bearer token — must be the linked user)

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `:sessionToken` | string (UUID) | The session token from `localStorage`. |

**Response:**

```json
{
  "success": true,
  "data": {
    "resultId": "res_abc123",
    "category": "ready_to_pilot",
    "categoryLabel": "Ready to Pilot",
    "score": 68,
    "summary": "Your business has clear AI use cases identified and emerging infrastructure...",
    "nextStep": "Let's discuss where AI fits into your business specifically.",
    "cta": {
      "label": "Talk to Thomas",
      "url": "/contact?source=readiness_check&result=ready_to_pilot"
    }
  }
}
```

The backend verifies:
1. The session exists and has `status = 'completed'`
2. The authenticated user's `user_id` matches the `user_id` on the session record

If the session is not found or not completed, returns `404`. If the user does not match, returns `403`.

---

## 10. User & Auth Endpoints

Authentication is handled entirely by the Supabase Auth client SDK (`@supabase/ssr` on the server, `@supabase/supabase-js` in the browser). No custom auth endpoints are implemented in V1. See `backend-auth.md` for the full auth specification, including LinkedIn OAuth, Email Magic Link, session management, and the readiness check auth gate.

The following user-facing endpoints are available for profile access and account management:

### 10.1 GET /users/me

Get the current authenticated user's profile.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "Jane Smith",
    "provider": "linkedin",
    "jobTitle": "Operations Manager",
    "createdAt": "2026-03-15T10:00:00Z",
    "readinessResults": ["res_abc123"]
  }
}
```

`jobTitle` is optional and may be projected on a best-effort basis from `user_profiles.linkedin_headline`. `company` is not part of the V1 response shape.

### 10.2 DELETE /users/me

Request deletion of the current user's account and all associated data. GDPR compliance. See `backend-compliance.md`.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Your account and data have been scheduled for deletion within 30 days."
  }
}
```

---

## 11. Contact Endpoints

Full specification in `backend-contact.md`.

### 11.1 POST /contact/submit

Submit the contact form.

**Authentication:** Public (rate-limited, spam-protected)

**Request:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "AI in our engineering business",
  "message": "We're a manufacturing company looking to explore AI...",
  "type": "business_enquiry",
  "source": "contact_page",
  "honeypot": ""
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Sender's name. Max 100 chars. |
| `email` | string | Yes | Sender's email address. |
| `subject` | string | No | Subject line. Max 200 chars. |
| `message` | string | Yes | Message body. Max 2000 chars. |
| `type` | string | Yes | Enquiry type. Values: `business_enquiry`, `research_collaboration`, `technical_enquiry`, `general` |
| `source` | string | No | Where form was submitted from. |
| `honeypot` | string | Yes | Must be empty. Spam protection field. |

**Response:**

```json
{
  "success": true,
  "data": {
    "submissionId": "sub_abc123",
    "message": "Thanks Jane, Thomas will be in touch shortly."
  }
}
```

---

## 12. Analytics Endpoints

Full specification in `backend-analytics.md`. Analytics endpoints are admin-only and not exposed to the frontend.

### 12.1 POST /analytics/event (internal)

Ingest an analytics event from the frontend. Called automatically by the frontend analytics module.

**Authentication:** Public (API key protected)

**Request:**

```json
{
  "event": "llm_query_submitted",
  "sessionId": "sess_abc123",
  "properties": {
    "source": "homepage_chip",
    "queryType": "general_ai",
    "queryId": "qry_abc123"
  },
  "timestamp": "2026-03-15T10:30:00Z"
}
```

**Tracked events:**

| Event | Description |
|-------|-------------|
| `page_view` | Page visited |
| `llm_query_submitted` | User submitted a query |
| `llm_query_completed` | LLM returned a response |
| `readiness_check_started` | User started the assessment |
| `readiness_check_completed` | User completed the assessment |
| `contact_form_submitted` | Contact form submitted |
| `auth_started` | User initiated sign-in |
| `auth_completed` | User successfully signed in |
| `cta_clicked` | Any CTA button clicked, with label |

### 12.2 GET /analytics/summary (admin)

Retrieve aggregated analytics summary. Admin only.

**Authentication:** Admin key required

**Response:**

```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "pageViews": 1240,
    "uniqueSessions": 430,
    "llmQueries": 312,
    "readinessCheckCompletions": 48,
    "contactSubmissions": 12,
    "topQueries": [
      { "query": "How can AI help my business?", "count": 34 }
    ]
  }
}
```

---

## 13. Content Endpoints

Serves markdown content for frontend rendering. Content is sourced from the markdown files in the repository and served via this layer.

### 13.1 GET /content/:page

Fetch rendered content for a given page.

**Authentication:** Public

**Parameters:**

| Param | Type | Location | Description |
|-------|------|----------|-------------|
| `:page` | string | path | `about`, `projects`, `research`, `insights`, `home` |
| `slug` | string | query (optional) | If provided, the response `sections` array is filtered to the single item matching this slug. If no match, returns `404`. |
| `featured` | boolean | query (optional) | If `true`, only items with `featured = true` are returned. Applicable to `projects` and `research` pages. |

**Cache headers:**

All `GET /content/*` responses include:

```
Cache-Control: public, max-age=60, stale-while-revalidate=300
ETag: "<hash-of-lastUpdated>"
```

ETags are generated from the `lastUpdated` field. If the client sends `If-None-Match` with a matching ETag, the server returns `304 Not Modified`.

**Response:**

```json
{
  "success": true,
  "data": {
    "page": "projects",
    "title": "Projects",
    "sections": [
      {
        "id": "connected-ai",
        "title": "Connected AI",
        "slug": "connected-ai",
        "summary": "AI-driven connectivity for engineering environments...",
        "tags": ["AI", "Engineering", "Belfast"],
        "status": "active",
        "updatedAt": "2026-03-01T00:00:00Z"
      }
    ],
    "lastUpdated": "2026-03-01T00:00:00Z"
  }
}
```

When `slug` is provided, the `sections` array contains a single item or the endpoint returns `404`.

### 13.2 GET /content/insights

Fetch insights list.

**Authentication:** Public

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | integer | Pagination page. Default: 1 |
| `perPage` | integer | Items per page. Default: 10, max: 20 |

**Response:** Paginated response containing insight items.

---

## 14. Health & Status Endpoints

### 14.1 GET /health

Basic health check. Returns 200 if the API is running.

**Authentication:** Public

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-03-15T10:30:00Z"
  }
}
```

### 14.2 GET /health/services

Detailed service health check. Returns status of all downstream services.

**Authentication:** Admin key required

**Response:**

```json
{
  "success": true,
  "data": {
    "api": "healthy",
    "llm": "healthy",
    "rag": "healthy",
    "database": "healthy",
    "auth": "healthy"
  }
}
```

---

*thomashadden.ai | Industrial Analytics & Automation | backend-api v1.0*
