# backend-analytics.md

## Status

Proposed V1/V1.1 backend analytics specification for `thomashadden.ai`.

## 1. Purpose and scope

This document defines the backend analytics model and the minimal internal analytics and operations page for `thomashadden.ai`.

The purpose of this specification is to remove the current analytics-documentation gap and provide an implementation-ready contract for:

- which backend analytics are collected
- which metrics are derived from domain tables rather than emitted as events
- where analytics data is stored
- how summary reporting is aggregated
- which internal endpoints are exposed
- how a small protected internal analytics and ops page is populated
- which cross-document amendments are required to keep the project documentation internally consistent

This specification applies to the existing V1 same-app architecture only. Browser code continues to call same-app `/api/*` routes, and those handlers continue to implement the logical `/v1/*` contract namespace. This specification does not introduce a separate analytics service, a separate admin platform, or a data warehouse.

This specification also preserves the existing split between public website analytics and backend product analytics:

- **Plausible remains the public website analytics tool** for traffic, referrers, and general page-level website reporting.
- **Backend analytics remains the product and operational analytics layer** for LLM activity, readiness funnel activity, contact/lead reporting, and internal operational visibility.

This specification is intentionally narrow. It defines a small, reliable analytics surface that can be implemented in the current codebase without inventing a larger admin suite.

## 2. Design principles

The backend analytics implementation must follow the principles below.

### 2.1 Separate public-site analytics from product analytics

Plausible is the source of truth for public website traffic analytics. Backend analytics must not attempt to replace Plausible or duplicate its public traffic reporting model. In particular, backend analytics is not the system of record for page views, acquisition channels, or referrer analysis.

### 2.2 Prefer domain truth over duplicated events

Where a durable domain table already represents the business fact, reporting must be derived from that table rather than duplicated into a generic analytics event stream. This applies especially to:

- readiness starts and completions
- contact submissions
- readiness-linked leads
- LLM query activity and quality

The analytics event layer exists only for facts that are genuinely interaction-level and otherwise not durably represented.

### 2.3 Keep V1 small and operationally useful

The internal page is a small protected ops page. It is not a CRM, not a BI suite, not a multi-role admin console, and not part of the public site navigation. The goal is to let Thomas quickly answer a small number of operational questions:

- Is the app healthy?
- Is the LLM being used?
- Is the readiness flow being used and completed?
- Are contact and readiness-linked leads arriving?
- Are there obvious failures or spikes that need attention?

### 2.4 Use a strict event contract, not an open-ended event dump

If a dedicated event table is introduced, it must be narrow, validated, and explicitly enumerated. It must not become a catch-all JSON bucket for arbitrary browser telemetry.

### 2.5 Minimise sensitive data in analytics storage

Analytics events must not store names, email addresses, phone numbers, free-text contact messages, or raw IP addresses. User-entered LLM text remains in `public.llm_query_log` because it already exists as an operational log with explicit retention. That operational log is not a licence to place free text into the general event store.

### 2.6 Preserve current contracts where possible, tighten them where necessary

Current placeholder analytics contracts in existing docs should be tightened rather than ignored. In particular:

- `POST /v1/analytics/event` remains valid but is narrowed to a strict set of accepted event names
- `GET /v1/analytics/summary` remains the primary summary endpoint
- `GET /v1/contact/submissions` and `GET /v1/health/services` continue to support the internal page

### 2.7 Make source-of-truth boundaries explicit

Every metric surfaced by the internal page must be labelled by source type:

- **event-derived**
- **domain-table-derived**
- **hybrid**
- **live operational state**

That classification is part of the contract and must not be left implicit.

## 3. Analytics layers and system boundaries

Backend analytics for `thomashadden.ai` is split into four layers.

### 3.1 Layer 1 — frontend and external analytics

This layer is Plausible-only.

It covers:

- public page views
- referrers
- traffic sources
- high-level public-site behaviour

It does not cover:

- LLM operational usage
- readiness session state
- contact conversion
- service health
- backend latency or error signals

Plausible data is not required for V1 implementation of the internal ops page. If Plausible metrics are later proxied into an internal page, they remain an external analytics source and must not be treated as backend product analytics.

### 3.2 Layer 2 — product interaction events

This layer exists for a narrow class of browser interactions that are not already captured as durable domain facts.

This specification introduces a dedicated table for this layer:

- `analytics.product_events`

This table is required because some important funnel signals do not exist in current domain tables, specifically:

- CTA clicks
- auth flow entry
- auth flow terminal outcome

This table is intentionally not a universal event store. It is used only for strictly enumerated interaction events.

### 3.3 Layer 3 — domain-derived analytics

This layer is the primary analytics source for product usage and conversion reporting.

It uses existing durable domain tables as the source of truth:

- `public.llm_query_log`
- `public.readiness_sessions`
- `public.readiness_contact_leads`
- `public.contact_submissions`

These tables represent the actual business facts. The analytics layer reads from them; it does not duplicate their facts back into the event table.

### 3.4 Layer 4 — operational and internal analytics

This layer exposes application health and operational reporting needed for the internal ops page.

It includes:

- live service health from `GET /v1/health/services`
- LLM latency, token, and error aggregates derived from `public.llm_query_log`
- readiness funnel aggregates derived from `public.readiness_sessions` and `public.readiness_contact_leads`
- contact volume aggregates derived from `public.contact_submissions`
- recent issue summaries derived from live health and recent operational errors

This layer is read-only. It does not include remediation workflows, queue controls, or record editing.

### 3.5 Boundary decision

The system of record for each major analytics concern is:

| Concern | Source of truth | Source type |
|---|---|---|
| Public traffic and page views | Plausible | External analytics |
| CTA clicks | `analytics.product_events` | Event-derived |
| Auth started / completed | `analytics.product_events` | Event-derived |
| LLM query count, latency, errors, tokens | `public.llm_query_log` | Domain-table-derived |
| Readiness starts / completions | `public.readiness_sessions` | Domain-table-derived |
| Readiness result distribution | `public.readiness_sessions` | Domain-table-derived |
| Readiness-to-contact conversion | `public.readiness_sessions` + `public.readiness_contact_leads` | Hybrid |
| Direct contact submissions | `public.contact_submissions` | Domain-table-derived |
| Total inbound lead records | `public.contact_submissions` + `public.readiness_contact_leads` | Hybrid |
| Service health | live `/v1/health/services` response | Live operational state |

## 4. Event taxonomy

### 4.1 Decision on the dedicated event store

A dedicated analytics event table **is introduced**.

The table is `analytics.product_events`.

It is introduced for one reason only: certain funnel interactions are valuable and not already represented by existing domain tables. Without an event table, there is no durable backend source of truth for CTA clicks or auth-entry behaviour.

The event table is **not** used for:

- page views
- contact form submissions
- readiness session starts or completions
- LLM query submitted/completed

Those facts are either already better represented elsewhere or intentionally left to Plausible.

### 4.2 Status of currently listed tracked event names

Existing docs list the following tracked names for `POST /analytics/event`:

- `page_view`
- `llm_query_submitted`
- `llm_query_completed`
- `readiness_check_started`
- `readiness_check_completed`
- `contact_form_submitted`
- `auth_started`
- `auth_completed`
- `cta_clicked`

Under this specification, those names are reclassified as follows:

| Event name | V1 status | Reason |
|---|---|---|
| `page_view` | Deprecated for backend analytics ingestion | Public page views belong to Plausible, not backend analytics |
| `llm_query_submitted` | Deprecated for backend analytics ingestion | Query submission/completion is already represented by `public.llm_query_log` |
| `llm_query_completed` | Deprecated for backend analytics ingestion | Query submission/completion is already represented by `public.llm_query_log` |
| `readiness_check_started` | Deprecated for backend analytics ingestion | Readiness session creation is derived from `public.readiness_sessions` |
| `readiness_check_completed` | Deprecated for backend analytics ingestion | Readiness completion is derived from `public.readiness_sessions` |
| `contact_form_submitted` | Deprecated for backend analytics ingestion | Contact submissions are derived from `public.contact_submissions` |
| `auth_started` | Accepted | No better durable source currently exists for auth-entry intent |
| `auth_completed` | Accepted | No better durable source currently exists for auth terminal outcome |
| `cta_clicked` | Accepted | No better durable source currently exists for CTA interaction intent |

### 4.3 Accepted backend event names

Only the following names are accepted by `POST /v1/analytics/event` in V1:

- `cta_clicked`
- `auth_started`
- `auth_completed`

Requests with any other event name must return `400 Bad Request`.

### 4.4 Event semantics

#### `cta_clicked`

Represents a meaningful CTA interaction that indicates funnel intent and is not otherwise captured by a later durable domain write.

Examples include:

- homepage readiness CTA clicked
- LLM readiness suggestion CTA clicked
- readiness result contact CTA clicked

A CTA that immediately produces a durable domain record may still be tracked if the click itself is useful as a funnel step. This is the primary reason this event exists.

#### `auth_started`

Represents the user initiating a public-user authentication flow from the site. This event is emitted when the user commits to an auth entry point, not on page render.

#### `auth_completed`

Represents a terminal auth outcome. This event is emitted for success, cancellation, or failure. The terminal outcome is recorded in a required property rather than split into separate event names.

### 4.5 Event taxonomy constraints

The event taxonomy must remain small. Adding a new event requires all of the following:

1. the interaction is not already a durable domain fact
2. the interaction materially improves product or funnel reporting
3. the event can be expressed without storing personal content
4. the event has a finite, documented set of properties
5. the event is added to the event-name allow-list and schema documentation

## 5. Canonical event payload schemas

### 5.1 Canonical event envelope

`POST /v1/analytics/event` accepts the following logical request body:

```json
{
  "eventId": "uuid-or-stable-client-generated-id",
  "eventName": "cta_clicked | auth_started | auth_completed",
  "occurredAt": "2026-04-03T21:15:00.000Z",
  "sessionId": "browser-session-id",
  "pagePath": "/readiness",
  "properties": {}
}
```

The canonical meaning of each field is:

| Field | Required | Type | Notes |
|---|---|---|---|
| `eventId` | Yes | string | Client-generated unique logical event id used for idempotency |
| `eventName` | Yes | string enum | Must be one of the accepted event names |
| `occurredAt` | No | ISO-8601 timestamp | Client event time if available; server `received_at` remains canonical ingestion time |
| `sessionId` | Yes | string | Stable browser-level session identifier already used by the application when available |
| `pagePath` | No | string | Path where the interaction occurred |
| `properties` | Yes | object | Event-specific validated property object |

The client must not send:

- raw IP address
- user agent
- authenticated user id
- name, email, phone number
- free-text message bodies
- free-text LLM prompt or response content

Those values are either set server-side or forbidden entirely.

### 5.2 Server-populated fields

On write to `analytics.product_events`, the server must also populate:

| Field | Source |
|---|---|
| `received_at` | server timestamp at ingestion |
| `user_id` | authenticated user id if a user session is present, else null |
| `ip_hash` | server-generated HMAC hash of client IP using analytics secret |
| `user_agent` | request user agent string, truncated to implementation-safe length |
| `request_id` | server request correlation id if available |

### 5.3 `cta_clicked` schema

Required properties:

```json
{
  "ctaId": "home_readiness_primary",
  "ctaSurface": "homepage_hero",
  "destination": "/readiness"
}
```

Optional properties:

```json
{
  "pageSection": "hero",
  "journey": "readiness",
  "variant": "default"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `ctaId` | Yes | string | Stable application-defined CTA identifier |
| `ctaSurface` | Yes | string | Stable surface identifier such as `homepage_hero` or `llm_suggested_action` |
| `destination` | Yes | string | Intended destination route or logical target |
| `pageSection` | No | string | Stable section identifier |
| `journey` | No | string | Logical funnel such as `readiness`, `contact`, or `general` |
| `variant` | No | string | Optional experiment or variant label |

`cta_clicked` properties must remain finite and controlled. Arbitrary marketing metadata is not permitted.

### 5.4 `auth_started` schema

Required properties:

```json
{
  "provider": "linkedin",
  "authContext": "readiness"
}
```

Optional properties:

```json
{
  "entrySurface": "readiness_gate",
  "readinessSessionId": "uuid",
  "returnPath": "/readiness"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `provider` | Yes | string | Normalised provider identifier such as `linkedin`, `email`, or `unknown` |
| `authContext` | Yes | string | Logical flow that initiated auth, such as `readiness`, `contact`, or `general` |
| `entrySurface` | No | string | Stable UI surface identifier |
| `readinessSessionId` | No | string | Present only when auth is initiated from a readiness flow already backed by a session |
| `returnPath` | No | string | Intended return route after auth |

### 5.5 `auth_completed` schema

Required properties:

```json
{
  "provider": "linkedin",
  "authContext": "readiness",
  "outcome": "success"
}
```

Optional properties:

```json
{
  "entrySurface": "readiness_gate",
  "readinessSessionId": "uuid",
  "returnPath": "/readiness/result"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `provider` | Yes | string | Same normalised identifier used at auth start |
| `authContext` | Yes | string | Same logical context used at auth start |
| `outcome` | Yes | string enum | `success`, `cancelled`, or `failed` |
| `entrySurface` | No | string | Stable UI surface identifier |
| `readinessSessionId` | No | string | Present when auth is linked to a readiness flow |
| `returnPath` | No | string | Final landing path when known |

### 5.6 Idempotency and deduplication

The client must generate a stable `eventId` per logical event emission.

`analytics.product_events` must enforce uniqueness on `event_idempotency_key`, which is the persisted form of `eventId`.

If the same logical event is received more than once:

- the first write is stored
- subsequent duplicates are ignored
- the endpoint returns a success response so the browser does not retry indefinitely

This endpoint is for best-effort analytics ingestion, not for transactional user workflows.

### 5.7 Session mapping across anonymous and authenticated flows

The following rules apply:

1. `sessionId` is the primary cross-step browser identifier for event ingestion.
2. `user_id` is null until an authenticated session exists.
3. Existing anonymous rows are not retroactively rewritten when a user later authenticates.
4. Funnel linkage across anonymous and authenticated phases uses:
   - shared `sessionId` where present
   - explicit domain ids such as `readinessSessionId` when present
   - domain tables as the authoritative completion source

This avoids complex identity stitching in V1 while preserving enough linkage for reporting.

## 6. Domain-derived analytics definitions

This section defines each metric exposed by backend analytics, including its source type and exact derivation.

### 6.1 Metrics matrix

| Metric | Classification | Source | Definition |
|---|---|---|---|
| `llm.totalQueries` | Domain-table-derived | `public.llm_query_log` | Count of query log rows created in the reporting period |
| `llm.uniqueSessions` | Domain-table-derived | `public.llm_query_log` | Count of distinct session identifiers in the reporting period |
| `llm.errorCount` | Domain-table-derived | `public.llm_query_log` | Count of rows in period where `error` is non-null |
| `llm.errorRate` | Domain-table-derived | `public.llm_query_log` | `errorCount / totalQueries` |
| `llm.avgResponseMs` | Domain-table-derived | `public.llm_query_log` | Arithmetic mean of response time in milliseconds for rows in period |
| `llm.p95ResponseMs` | Domain-table-derived | `public.llm_query_log` | 95th percentile response time in milliseconds for rows in period |
| `llm.totalInputTokens` | Domain-table-derived | `public.llm_query_log` | Sum of input token counts in period |
| `llm.totalOutputTokens` | Domain-table-derived | `public.llm_query_log` | Sum of output token counts in period |
| `llm.estimatedCostUsd` | Hybrid | `public.llm_query_log` + configured model rate card | Sum of token-based estimated costs when a rate card exists |
| `llm.readinessSuggestionCount` | Domain-table-derived | `public.llm_query_log` | Count of rows where readiness routing/suggestion flag is true |
| `llm.readinessSuggestionRate` | Domain-table-derived | `public.llm_query_log` | `readinessSuggestionCount / totalQueries` |
| `llm.topQueries` | Domain-table-derived | `public.llm_query_log` | Top normalised query strings in period after privacy filters |
| `readiness.startedCount` | Domain-table-derived | `public.readiness_sessions` | Count of readiness sessions created in period |
| `readiness.completedCount` | Domain-table-derived | `public.readiness_sessions` | Count of readiness sessions with `completed_at` in period |
| `readiness.completionRate` | Domain-table-derived | `public.readiness_sessions` | Share of sessions started in period that have reached completion by report time |
| `readiness.resultCategoryDistribution` | Domain-table-derived | `public.readiness_sessions` | Distribution of `result_category` among sessions completed in period |
| `readiness.contactLeadCount` | Hybrid | `public.readiness_sessions` + `public.readiness_contact_leads` | Count of readiness-linked lead rows attributable to sessions in period |
| `readiness.contactConversionRate` | Hybrid | `public.readiness_sessions` + `public.readiness_contact_leads` | `contactLeadCount / completedCount`, based on completed readiness sessions in period |
| `contact.directSubmissionCount` | Domain-table-derived | `public.contact_submissions` | Count of direct contact submissions created in period |
| `contact.readinessLeadCount` | Domain-table-derived | `public.readiness_contact_leads` | Count of readiness-linked leads created in period |
| `contact.totalInboundLeadRecords` | Hybrid | `public.contact_submissions` + `public.readiness_contact_leads` | Sum of both record counts, without person-level deduplication |
| `contact.bySource` | Domain-table-derived / Hybrid | source columns in both contact tables | Counts grouped by domain-level source |
| `contact.byEnquiryType` | Domain-table-derived | `public.contact_submissions` | Counts grouped by enquiry type for direct contacts only |
| `events.ctaClicks` | Event-derived | `analytics.product_events` | Count of `cta_clicked` rows in period |
| `events.authStarted` | Event-derived | `analytics.product_events` | Count of `auth_started` rows in period |
| `events.authCompleted` | Event-derived | `analytics.product_events` | Count of `auth_completed` rows in period |
| `events.authSuccessRate` | Event-derived | `analytics.product_events` | Count of `auth_completed` rows with `outcome = success` divided by `auth_started` count |
| `services.*` | Live operational state | `GET /v1/health/services` | Current downstream health, not persisted analytics |

### 6.2 LLM analytics definitions

`public.llm_query_log` is the source of truth for LLM analytics. No mirrored `llm_query_submitted` or `llm_query_completed` event rows are written to `analytics.product_events`.

For analytics purposes:

- the reporting period is determined by `created_at`
- rows with non-null `error` count as failed queries
- successful and failed queries both count toward total query volume
- response-time statistics use only rows with a recorded response-time value
- token totals use zero for missing token values only if the source row genuinely lacks a value; missing values must not be silently fabricated

If `public.llm_query_log` already records a boolean for readiness routing or readiness suggestion, that field is used directly. If the current field name differs, the contract in this document still applies semantically and must be mapped explicitly in implementation.

### 6.3 Readiness analytics definitions

`public.readiness_sessions` is the source of truth for readiness activity.

This specification depends on the readiness data model exposing, at minimum:

- a stable readiness session id
- session creation timestamp
- completion timestamp when completed
- result category or equivalent terminal classification when completed

For reporting:

- `startedCount` uses readiness sessions created in the period
- `completedCount` uses readiness sessions completed in the period
- `completionRate` uses the cohort of sessions started in the period and asks whether each has completed by report time
- `resultCategoryDistribution` uses completed sessions in the period

The completion-rate definition is deliberate. It prevents the displayed rate from becoming a misleading same-period ratio when starts and completions fall into different periods.

### 6.4 Readiness-to-contact conversion

`public.readiness_contact_leads` must link to `public.readiness_sessions` through a stable readiness session identifier.

`readiness.contactLeadCount` counts readiness-linked lead rows attributable to completed readiness sessions in the reporting period. If multiple lead rows can exist for one session, the implementation must choose one rule and document it in code. The V1 rule is:

- count distinct readiness session ids present in `public.readiness_contact_leads`

This prevents repeated submissions from inflating the readiness conversion rate.

### 6.5 Contact analytics definitions

Direct contact form analytics come from `public.contact_submissions`.

Readiness-generated lead analytics come from `public.readiness_contact_leads`.

`contact.totalInboundLeadRecords` is defined as the sum of record counts from those two tables. It is intentionally record-based, not person-deduplicated. V1 does not attempt cross-table person matching.

### 6.6 Query privacy rules for `topQueries`

`topQueries` is useful operationally but carries privacy risk because it derives from user-entered text.

Therefore `topQueries` must follow all of the rules below:

1. Normalise query text before grouping:
   - trim leading/trailing whitespace
   - lowercase
   - collapse repeated internal whitespace
2. Exclude queries that contain:
   - email-address patterns
   - phone-number-like patterns
3. Exclude queries that appear fewer than 3 times in the reporting period
4. Truncate displayed query strings to a maximum of 120 characters
5. Only compute `topQueries` from raw rows still within the raw retention window

This means `topQueries` is available for recent periods only. Historical indefinite top-query reporting is out of scope.

## 7. Storage model

### 7.1 Storage decision summary

The storage model for V1 is:

- **Plausible** remains external and separate
- **`analytics.product_events`** stores the small set of accepted funnel interaction events
- **existing domain tables remain unchanged as the source of truth** for LLM, readiness, and contact analytics
- **`analytics.llm_daily_rollup`** stores anonymised long-term LLM aggregate history required after raw `llm_query_log` retention deletes old rows
- no general-purpose analytics warehouse is introduced

### 7.2 Required new table: `analytics.product_events`

A new table is required:

`analytics.product_events`

Required columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | Yes | Primary key |
| `event_idempotency_key` | text | Yes | Unique client logical event id |
| `event_name` | text | Yes | Check-constrained to accepted event names |
| `session_id` | text | Yes | Browser session identifier |
| `user_id` | uuid nullable | No | Authenticated user id if present |
| `page_path` | text nullable | No | Path where event occurred |
| `properties` | jsonb | Yes | Validated event-specific property payload |
| `occurred_at` | timestamptz nullable | No | Client-reported time when supplied |
| `received_at` | timestamptz | Yes | Canonical server ingestion time |
| `ip_hash` | text nullable | No | HMAC hash, never raw IP |
| `user_agent` | text nullable | No | Request user agent |
| `request_id` | text nullable | No | Request correlation id if present |

Required indexes:

- unique index on `event_idempotency_key`
- index on `(event_name, received_at desc)`
- index on `(session_id, received_at desc)`
- index on `(user_id, received_at desc)` where `user_id` is not null

No arbitrary secondary dimensions are added in V1. Anything that needs long-term grouping must fit within the documented property set.

### 7.3 Required new table: `analytics.llm_daily_rollup`

A new anonymised aggregate table is required:

`analytics.llm_daily_rollup`

Purpose:

- preserve long-term daily LLM trend data after the 90-day raw `public.llm_query_log` retention window deletes old rows
- avoid indefinite retention of raw prompts/responses

Required columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `bucket_date` | date | Yes | UTC date bucket |
| `model` | text | Yes | Model identifier |
| `total_queries` | integer | Yes | Daily query count |
| `error_count` | integer | Yes | Daily failed query count |
| `avg_response_ms` | numeric | Yes | Daily mean latency |
| `p95_response_ms` | integer nullable | No | Daily p95 latency |
| `total_input_tokens` | bigint | Yes | Daily input token total |
| `total_output_tokens` | bigint | Yes | Daily output token total |
| `estimated_cost_usd` | numeric nullable | No | Daily token-cost estimate when configured |
| `readiness_suggestion_count` | integer | Yes | Daily readiness suggestion count |
| `unique_sessions` | integer nullable | No | Distinct sessions in day |
| `created_at` | timestamptz | Yes | Insert timestamp |
| `updated_at` | timestamptz | Yes | Last refresh timestamp |

Primary key:

- `(bucket_date, model)`

V1 reporting page periods are limited to `today`, `last_7_days`, and `last_30_days`, so the internal page can use raw `public.llm_query_log` for its live summary. The rollup table exists to satisfy the already-defined long-term retention direction and to keep future historical trend reporting possible.

### 7.4 No dedicated rollup tables for readiness and contact in V1

This specification does **not** introduce dedicated readiness or contact rollup tables in V1.

Reason:

- those records already exist durably in business tables
- the internal page periods are short
- query volume should be small enough for direct aggregation
- introducing extra rollups would duplicate metrics without a strong reason

If performance later requires materialised reporting structures, that can be added in a later revision.

### 7.5 No dedicated stored health-history table in V1

This specification does **not** introduce a database table for service health history in V1.

Reason:

- the internal page uses current health state, not historical uptime analytics
- health history quickly becomes a separate observability problem
- V1 only needs live operational status and recent operational issues derived from recent logs/errors

### 7.6 Data ownership boundaries

Data ownership for storage is:

| Storage object | Ownership role |
|---|---|
| Plausible | public-site analytics only |
| `analytics.product_events` | interaction analytics only |
| `public.llm_query_log` | operational LLM log and recent product analytics source |
| `analytics.llm_daily_rollup` | anonymised long-term LLM trend aggregate |
| `public.readiness_sessions` | readiness business state and readiness analytics source |
| `public.readiness_contact_leads` | readiness-lead business state and conversion analytics source |
| `public.contact_submissions` | direct contact business state and contact analytics source |

## 8. Aggregation and reporting model

### 8.1 Reporting periods

`GET /v1/analytics/summary` must support the following period keys:

- `today`
- `last_7_days`
- `last_30_days`

V1 does not require arbitrary custom ranges.

Period boundaries are evaluated in **UTC**.

### 8.2 Time-series granularity

The summary endpoint returns a `timeseries` block.

Granularity rules:

- `today` uses hourly buckets in UTC
- `last_7_days` uses daily buckets in UTC
- `last_30_days` uses daily buckets in UTC

### 8.3 Live versus cached aggregation

The internal page is small and read-only. V1 summary aggregation may be computed live from source tables with short server-side caching.

Required behaviour:

- summary responses may be cached for up to 60 seconds
- live service health responses should not be cached beyond normal request transit
- recent contact submissions should reflect near-live data and may be cached for up to 60 seconds

This keeps implementation simple while avoiding unnecessary query load.

### 8.4 Summary aggregation rules

The summary endpoint must aggregate:

- event-derived CTA and auth counts from `analytics.product_events`
- LLM analytics from `public.llm_query_log`
- readiness analytics from `public.readiness_sessions` and `public.readiness_contact_leads`
- contact analytics from `public.contact_submissions` and `public.readiness_contact_leads`
- recent issues from:
  - current non-healthy service states
  - recent LLM errors in the reporting window

### 8.5 Recent issues model

`recentIssues` is a small operational signal block, not a full incident system.

Each item must contain:

| Field | Type | Notes |
|---|---|---|
| `type` | string | `service_health` or `llm_error` in V1 |
| `severity` | string | `info`, `warning`, or `critical` |
| `message` | string | Sanitised operator-facing description |
| `count` | integer nullable | Count when issue is aggregated from multiple rows |
| `occurredAt` | timestamp nullable | Most recent occurrence time when applicable |

Rules:

- current degraded service states appear even if no recent database error row exists
- raw user prompt or response text must never appear in `recentIssues`
- error messages should be sanitised to avoid leaking secrets or internal stack details

### 8.6 Cost estimation model

Cost analytics is optional but supported.

If model pricing is configured in environment settings, the summary endpoint must calculate token-cost estimates using:

- model identifier
- input token count
- output token count
- configured per-model input and output rates

If pricing is not configured, the endpoint must return token totals and set cost fields to `null`.

Cost values are always labelled as estimates.

### 8.7 Retention and aggregation jobs

Two scheduled maintenance jobs are required.

#### Job 1 — LLM daily rollup

Runs daily.

Responsibilities:

1. aggregate the previous UTC day from `public.llm_query_log`
2. upsert rows into `analytics.llm_daily_rollup`
3. refresh any partial current-day row if the implementation chooses to support it

#### Job 2 — raw retention cleanup

Runs daily.

Responsibilities:

1. delete `public.llm_query_log` rows older than the configured retention window after rollup has been safely written
2. delete `analytics.product_events` rows older than the configured retention window

This specification does not require a separate cron scheduler technology. It only requires that the maintenance behaviour exist and be documented in deployment configuration.

## 9. Admin and internal endpoints

### 9.1 Endpoint classification

V1 analytics and ops uses four endpoint classes:

1. **same-origin product event ingestion**
   - `POST /v1/analytics/event`
2. **admin/internal analytics summary**
   - `GET /v1/analytics/summary`
3. **admin/internal recent contact submission access**
   - `GET /v1/contact/submissions`
4. **admin/internal live health**
   - `GET /v1/health/services`

In addition, this specification introduces one minimal internal route-protection endpoint for the ops page:

5. **internal ops session bootstrap**
   - `POST /v1/internal/ops/session`

### 9.2 Protection model decision

The internal ops page and its backing read endpoints must use a **server-side shared secret model** in V1.

This is separate from public-user auth.

The model is:

- internal access is granted by verifying a shared admin secret configured in environment
- on success, the server sets a short-lived, signed, HttpOnly, SameSite=Strict cookie used only for internal ops access
- the internal page and the admin/internal read endpoints require that cookie
- public-user auth providers such as LinkedIn or email do not grant ops access

This keeps V1 small and avoids expanding the scope to a richer admin identity system.

### 9.3 `POST /v1/internal/ops/session`

Purpose:

- unlock internal ops access using the configured shared admin secret
- set the signed internal-ops session cookie

Request body:

```json
{
  "secret": "provided-by-operator"
}
```

Successful response:

```json
{
  "ok": true
}
```

Rules:

- the secret is compared server-side against `OPS_ADMIN_SECRET`
- the secret must never be echoed back
- on success, the server sets the internal ops access cookie
- on failure, return `401 Unauthorized`
- this endpoint is not linked from the public site

### 9.4 `POST /v1/analytics/event`

Purpose:

- ingest the small set of accepted browser interaction events

Access model:

- same-origin browser endpoint
- not admin-only
- protected by strict event validation, same-origin controls, and rate limiting
- no public API key model is required in V1

Request body:

- must conform to the canonical envelope in section 5

Success response:

```json
{
  "accepted": true
}
```

Response code:

- `202 Accepted`

Error cases:

- `400` for invalid event name or invalid properties
- `401` only if the route is called in a context where same-origin protection fails and the implementation chooses to reject it explicitly
- `429` when rate limits are exceeded

### 9.5 `GET /v1/analytics/summary`

Purpose:

- return the entire dataset needed by the internal ops page, excluding recent contact detail rows and excluding live health detail

Access model:

- internal ops access only

Query parameters:

| Parameter | Required | Values |
|---|---|---|
| `period` | Yes | `today`, `last_7_days`, `last_30_days` |

Response shape:

```json
{
  "period": {
    "key": "last_7_days",
    "start": "2026-03-28T00:00:00.000Z",
    "end": "2026-04-03T23:59:59.999Z",
    "timezone": "UTC"
  },
  "overview": {
    "llmQueries": 0,
    "readinessStarts": 0,
    "readinessCompletions": 0,
    "directContactSubmissions": 0,
    "readinessContactLeads": 0,
    "totalInboundLeadRecords": 0
  },
  "events": {
    "ctaClicks": 0,
    "authStarted": 0,
    "authCompleted": 0,
    "authSuccessRate": 0
  },
  "llm": {
    "totalQueries": 0,
    "uniqueSessions": 0,
    "avgResponseMs": 0,
    "p95ResponseMs": 0,
    "errorCount": 0,
    "errorRate": 0,
    "totalInputTokens": 0,
    "totalOutputTokens": 0,
    "estimatedCostUsd": null,
    "readinessSuggestionCount": 0,
    "readinessSuggestionRate": 0,
    "topQueries": []
  },
  "readiness": {
    "startedCount": 0,
    "completedCount": 0,
    "completionRate": 0,
    "contactLeadCount": 0,
    "contactConversionRate": 0,
    "resultCategoryDistribution": []
  },
  "contact": {
    "directSubmissionCount": 0,
    "readinessLeadCount": 0,
    "totalInboundLeadRecords": 0,
    "bySource": [],
    "byEnquiryType": []
  },
  "timeseries": {
    "granularity": "day",
    "points": []
  },
  "recentIssues": []
}
```

Field meanings:

- `overview` is a compact card-friendly subset
- `events` exposes the event-derived funnel signals
- `llm`, `readiness`, and `contact` expose the main operational reporting blocks
- `timeseries` provides trend data for charts or sparklines
- `recentIssues` provides a compact operator-facing issue list

This endpoint must not return names, email addresses, phone numbers, full contact message bodies, or raw LLM prompts/responses.

### 9.6 `GET /v1/contact/submissions`

Purpose:

- return recent direct contact submissions for operator review on the internal page

Access model:

- internal ops access only

Required query parameters:

| Parameter | Required | Notes |
|---|---|---|
| `limit` | No | Default 10, maximum 50 |

Required ordering:

- newest first by creation time

Required minimum response fields for the internal page:

| Field | Notes |
|---|---|
| `id` | stable record id |
| `createdAt` | submission timestamp |
| `name` | submitter name if stored |
| `email` | submitter email if stored |
| `company` | company if stored |
| `source` | submission source |
| `enquiryType` | enquiry classification if stored |
| `status` | handling status if implemented |

This endpoint is business-data access, not analytics-event access.

### 9.7 `GET /v1/health/services`

Purpose:

- return live current service health for internal display

Access model:

- internal ops access only

Required services in response:

- `api`
- `llm`
- `rag`
- `database`
- `auth`

Required status semantics:

- `ok`
- `degraded`
- `down`

This endpoint remains a live operational check. Its response is not persisted into analytics tables by this specification.

## 10. Internal analytics and ops page contract

### 10.1 Route and scope

A new internal-only route is introduced:

- `/ops`

This route is:

- protected
- not linked from the public site navigation
- excluded from public sitemap/navigation concerns
- read-only

This route is an internal interface surface, not part of the public frontend scope.

### 10.2 Route protection behaviour

If the operator does not have a valid internal ops cookie:

- render a minimal access form or redirect to a minimal internal unlock page backed by `POST /v1/internal/ops/session`

The route must not rely on public-user auth state.

### 10.3 Data dependencies

The `/ops` page consumes exactly these same-app endpoints:

- `GET /api/v1/health/services`
- `GET /api/v1/analytics/summary?period=...`
- `GET /api/v1/contact/submissions?limit=10`

No other backend analytics endpoint is required for V1.

### 10.4 Required sections

The page must contain the following sections.

#### A. Service health

Source:

- `GET /v1/health/services`

Display:

- one status card or badge per downstream service
- service name
- current status
- optional timestamp of last refresh

Purpose:

- immediate visibility into whether the app is healthy

#### B. High-level summary

Source:

- `GET /v1/analytics/summary`

Display:

- LLM queries
- readiness starts
- readiness completions
- direct contact submissions
- readiness contact leads
- total inbound lead records

Purpose:

- quick operational snapshot

#### C. LLM overview

Source:

- `GET /v1/analytics/summary`

Display:

- total queries
- unique sessions
- average response time
- p95 response time
- error count and error rate
- input and output token totals
- estimated cost if configured
- top queries
- readiness suggestion count and rate

Purpose:

- understand usage, performance, and potential quality signals

#### D. Readiness funnel

Source:

- `GET /v1/analytics/summary`

Display:

- started count
- completed count
- completion rate
- result-category distribution
- readiness contact lead count
- readiness contact conversion rate

Purpose:

- observe whether the readiness flow is being used and converting

#### E. Contact and lead overview

Source:

- `GET /v1/analytics/summary`

Display:

- direct contact submissions
- readiness-linked leads
- total inbound lead records
- counts by source
- counts by enquiry type

Purpose:

- see inbound lead volume and where it is coming from

#### F. Recent submissions

Source:

- `GET /v1/contact/submissions`

Display:

- the latest direct contact submissions in a simple list or table
- newest first
- no editing controls required

Purpose:

- quick operator visibility without turning the page into a CRM

#### G. Recent issues

Source:

- `GET /v1/analytics/summary` plus current health display

Display:

- recent sanitised LLM errors
- any currently degraded/down services

Purpose:

- surface obvious failures worth investigation

### 10.5 Period selector

The page must include a period selector with these values:

- Today
- Last 7 days
- Last 30 days

Changing the period updates:

- high-level summary
- LLM overview
- readiness funnel
- contact and lead overview
- recent issues
- timeseries charts/sparklines if present

Service health remains live and is not period-dependent.

### 10.6 Refresh behaviour

Required refresh cadence:

- service health: refresh every 60 seconds while the page is open
- analytics summary: refresh on period change and optionally every 5 minutes
- recent submissions: refresh on page load and optionally every 5 minutes

### 10.7 Non-goals for the internal page

The page does not include:

- public navigation exposure
- multi-user role management
- record editing
- export tooling
- bulk actions
- CRM workflow
- detailed incident management
- Plausible replacement traffic dashboards

## 11. Privacy, retention, and redaction rules

### 11.1 Raw IP handling

Raw IP addresses must not be persisted in analytics tables introduced by this specification.

Where IP correlation is needed for abuse or coarse operational analysis:

- persist only `ip_hash`
- compute using HMAC with a server secret
- do not persist a reversible raw IP column

### 11.2 Product events must not contain personal content

`analytics.product_events.properties` must not contain:

- name
- email
- phone number
- free-text contact message
- free-text LLM prompt
- free-text LLM response

Properties are restricted to documented identifiers and small enums.

### 11.3 LLM log privacy boundary

`public.llm_query_log` already stores user-entered query and response data for operational reasons. This document preserves that existing direction and the existing 90-day rolling raw retention.

Rules:

- raw prompt/response content remains confined to `public.llm_query_log`
- raw prompt/response content must not be copied into `analytics.product_events`
- indefinite retention of raw prompt/response content is not permitted
- long-term history is preserved only through anonymised aggregate rollups

### 11.4 Retention rules

Retention windows are:

| Data set | Raw retention | Long-term retention |
|---|---|---|
| `public.llm_query_log` | 90 days | anonymised daily rollups retained indefinitely |
| `analytics.product_events` | 180 days | none required in V1 |
| `public.readiness_sessions` | business-data retention | as defined by product/business policy, not by analytics policy |
| `public.readiness_contact_leads` | business-data retention | as defined by product/business policy, not by analytics policy |
| `public.contact_submissions` | business-data retention | as defined by product/business policy, not by analytics policy |

### 11.5 Redaction for operator-facing responses

Operator-facing endpoints must not expose:

- raw IP or `ip_hash`
- raw full user agent strings unless explicitly needed for debugging
- raw secrets
- stack traces
- raw LLM prompts or responses in analytics summary payloads

`GET /v1/contact/submissions` may expose names and emails because it is a business-data endpoint for an internal operator page, but that data is not part of the analytics summary contract.

### 11.6 Test and non-production data

Production analytics must not be polluted with development or automated test data.

The preferred V1 method is environment separation at the deployment/database level. If multiple environments ever share a database, then explicit environment tagging must be added before this analytics spec can be considered correctly implemented.

## 12. Environment and configuration requirements

The following environment settings are required or recommended.

### 12.1 Required settings

| Setting | Required | Purpose |
|---|---|---|
| `OPS_ADMIN_SECRET` | Yes | Shared secret used to unlock internal ops access |
| `OPS_COOKIE_SIGNING_SECRET` | Yes | Secret used to sign the internal ops access cookie |
| `ANALYTICS_IP_HMAC_SECRET` | Yes | Secret used to hash IP addresses for analytics storage |
| `LLM_QUERY_LOG_RETENTION_DAYS` | Yes | Raw LLM log retention window, default 90 |
| `PRODUCT_EVENTS_RETENTION_DAYS` | Yes | Raw product-event retention window, default 180 |

### 12.2 Optional settings

| Setting | Required | Purpose |
|---|---|---|
| `LLM_MODEL_RATE_CARD_JSON` | No | Optional model pricing configuration for cost estimation |
| `ENABLE_INTERNAL_OPS_PAGE` | No | Feature flag to disable `/ops` in environments where it should not be exposed |

### 12.3 Operational requirements

Deployment must provide:

- a daily scheduled job for LLM rollup generation
- a daily scheduled job for retention cleanup
- secure cookie settings for internal ops access
- request correlation ids where possible for issue tracing

## 13. Required amendments to `interfaces.md`

The following changes are required in `interfaces.md`.

### 13.1 Add `backend-analytics.md` to source-file precedence

The source-file list or precedence section must add `backend-analytics.md` as an authoritative source document for backend analytics and internal ops reporting.

This removes the current missing-document gap.

### 13.2 Resolve the open analytics documentation question

Any existing open question equivalent to “backend analytics spec missing” or “do we need a dedicated analytics schema/table?” must be resolved as follows:

- yes, a dedicated analytics table is introduced
- the table is `analytics.product_events`
- it is intentionally narrow and does not duplicate domain facts
- LLM analytics remains primarily domain-table-derived from `public.llm_query_log`

### 13.3 Update the interface inventory

The interface inventory must explicitly distinguish between:

- same-origin product event ingestion
- internal admin/ops read endpoints
- internal ops access bootstrapping

Required endpoint inventory state:

- `POST /v1/analytics/event` — same-origin product event ingestion, not admin-only
- `GET /v1/analytics/summary` — internal ops only
- `GET /v1/contact/submissions` — internal ops only
- `GET /v1/health/services` — internal ops only
- `POST /v1/internal/ops/session` — internal ops access bootstrap

### 13.4 Add canonical analytics data models

`interfaces.md` must add or reference these canonical models:

- `AnalyticsProductEvent`
- `AnalyticsSummary`
- `InternalOpsAccessSession` or equivalent route-protection contract

At minimum, it must record that:

- product events are restricted to `cta_clicked`, `auth_started`, and `auth_completed`
- readiness, contact, and LLM metrics are not generic event-stream facts

### 13.5 Update database interface notes

The database interface section must record:

- new table `analytics.product_events`
- new table `analytics.llm_daily_rollup`
- continued use of `public.llm_query_log`, `public.readiness_sessions`, `public.readiness_contact_leads`, and `public.contact_submissions` as source tables

### 13.6 Clarify internal page scope

Where `interfaces.md` currently states that analytics dashboard/admin UI is out of V1 public frontend scope, it should be amended to state:

- a small internal-only ops route is included in scope as an internal interface surface
- it remains out of public frontend scope
- it is not part of the public site navigation or public user feature set

## 14. Recommended amendments to `backend-api.md`

The following changes are recommended to keep `backend-api.md` aligned with this specification.

### 14.1 Reclassify `POST /analytics/event`

If `backend-api.md` currently treats the analytics event endpoint as admin-only or API-key protected, that should be changed.

Recommended status:

- same-origin browser ingestion endpoint
- strict allow-list validation
- no public API key model required in V1
- rate limited
- only accepts `cta_clicked`, `auth_started`, `auth_completed`

### 14.2 Deprecate unsupported event names in the analytics endpoint contract

The endpoint documentation should explicitly deprecate backend ingestion for:

- `page_view`
- `llm_query_submitted`
- `llm_query_completed`
- `readiness_check_started`
- `readiness_check_completed`
- `contact_form_submitted`

Those facts are now derived elsewhere or intentionally left to Plausible.

### 14.3 Expand `GET /analytics/summary` to the internal page contract shape

`backend-api.md` should update `GET /analytics/summary` from the old placeholder flat structure to the nested contract defined in section 9.5 of this document.

If backward compatibility is important during implementation, the handler may temporarily preserve the legacy top-level fields while also returning the new nested structure. The documentation, however, should move to the new structure as the canonical contract.

### 14.4 Clarify that public page-view analytics are not backend summary requirements

If `backend-api.md` currently lists `pageViews` and `uniqueSessions` as required backend summary fields, that should be amended.

Recommended treatment:

- do not require Plausible traffic metrics for V1 backend analytics summary
- if such fields remain temporarily for compatibility, mark them optional or nullable and clearly sourced from external analytics rather than backend product analytics

### 14.5 Add `POST /v1/internal/ops/session`

`backend-api.md` should document the minimal internal ops access bootstrap endpoint if API docs are intended to cover internal routes as well as public ones.

## 15. Recommended amendments to `backend-database.md`

The following changes are recommended to keep `backend-database.md` aligned with this specification.

### 15.1 Add `analytics.product_events`

`backend-database.md` should define the new table with:

- strict event-name allow-list
- required idempotency key
- validated JSONB properties
- server-side received timestamp
- hashed IP only
- indexes described in section 7.2

It should explicitly state that this table is not a catch-all event stream.

### 15.2 Add `analytics.llm_daily_rollup`

`backend-database.md` should define the new rollup table and its purpose:

- anonymised long-term aggregate preservation after raw LLM log deletion
- daily UTC bucket
- per-model aggregates
- token and latency totals
- optional estimated cost

### 15.3 Clarify analytics-source dependencies on existing domain tables

`backend-database.md` should ensure the following source-table fields are explicitly documented if they are not already:

For `public.readiness_sessions`:

- id
- created_at or equivalent start timestamp
- completed_at
- result_category or equivalent terminal classification

For `public.readiness_contact_leads`:

- id
- readiness_session_id
- created_at

For `public.contact_submissions`:

- id
- created_at
- source
- enquiry_type if supported

For `public.llm_query_log`:

- created_at
- session/user linkage
- error
- token counts
- response time
- model
- readiness routing/suggestion flag
- source

### 15.4 Keep retention notes explicit

`backend-database.md` should retain the existing 90-day raw retention rule for `public.llm_query_log` and add the raw retention rule for `analytics.product_events` with a default of 180 days.

### 15.5 Do not add unnecessary aggregate tables

`backend-database.md` should explicitly state that V1 does not introduce:

- readiness rollup tables
- contact rollup tables
- stored health-history tables

## 16. Unresolved decisions

There are no blocking unresolved decisions for V1 in this specification.

A later revision may decide whether selected Plausible metrics should be proxied into the internal ops page for convenience, but that is explicitly out of scope for this backend analytics specification and is not required for V1 implementation.

## Appendix — Required cross-document amendments

### Required changes to `interfaces.md`

1. Add `backend-analytics.md` to the authoritative source-document list.
2. Resolve the missing analytics-spec open question by declaring:
   - backend analytics is now specified
   - `analytics.product_events` exists
   - domain tables remain the source of truth for LLM, readiness, and contact analytics
3. Update interface inventory to include:
   - `POST /v1/analytics/event` as same-origin product event ingestion
   - `GET /v1/analytics/summary` as internal ops only
   - `GET /v1/contact/submissions` as internal ops only
   - `GET /v1/health/services` as internal ops only
   - `POST /v1/internal/ops/session` as internal ops access bootstrap
4. Add canonical analytics models or direct references for:
   - `AnalyticsProductEvent`
   - `AnalyticsSummary`
   - internal ops session bootstrap
5. Update database-interface notes to include:
   - `analytics.product_events`
   - `analytics.llm_daily_rollup`
   - continued domain-table source-of-truth usage
6. Clarify that the internal ops page is:
   - inside internal interface scope
   - outside public frontend scope
   - not part of public navigation

### Recommended changes to `backend-api.md`

1. Reclassify `POST /v1/analytics/event` as same-origin browser ingestion rather than admin-only/API-key public ingestion.
2. Restrict accepted analytics event names to:
   - `cta_clicked`
   - `auth_started`
   - `auth_completed`
3. Deprecate backend analytics ingestion for:
   - `page_view`
   - `llm_query_submitted`
   - `llm_query_completed`
   - `readiness_check_started`
   - `readiness_check_completed`
   - `contact_form_submitted`
4. Replace the placeholder summary response with the nested `AnalyticsSummary` contract in this specification.
5. Mark Plausible-derived page-view fields as out of scope, optional, or nullable rather than required backend metrics.
6. Add the minimal internal route-protection endpoint `POST /v1/internal/ops/session`.

### Recommended changes to `backend-database.md`

1. Add table definition for `analytics.product_events`.
2. Add table definition for `analytics.llm_daily_rollup`.
3. Ensure readiness/contact source tables document the fields analytics depends on.
4. Preserve explicit 90-day raw retention for `public.llm_query_log`.
5. Add explicit 180-day raw retention for `analytics.product_events`.
6. State explicitly that V1 does not add readiness/contact/health aggregate tables.

### `frontend-interface.md`

No required change.

Reason:

- the new route is internal-only and outside the public frontend scope
- documenting it in `interfaces.md` is sufficient for V1

A small targeted note is optional only if `frontend-interface.md` is intended to be a complete route inventory rather than a public-scope frontend specification.
# backend-analytics.md

## Status

Proposed V1/V1.1 backend analytics specification for `thomashadden.ai`.

## 1. Purpose and scope

This document defines the backend analytics model and the minimal internal analytics and operations page for `thomashadden.ai`.

The purpose of this specification is to remove the current analytics-documentation gap and provide an implementation-ready contract for:

- which backend analytics are collected
- which metrics are derived from domain tables rather than emitted as events
- where analytics data is stored
- how summary reporting is aggregated
- which internal endpoints are exposed
- how a small protected internal analytics and ops page is populated
- which cross-document amendments are required to keep the project documentation internally consistent

This specification applies to the existing V1 same-app architecture only. Browser code continues to call same-app `/api/*` routes, and those handlers continue to implement the logical `/v1/*` contract namespace. This specification does not introduce a separate analytics service, a separate admin platform, or a data warehouse.

This specification also preserves the existing split between public website analytics and backend product analytics:

- **Plausible remains the public website analytics tool** for traffic, referrers, and general page-level website reporting.
- **Backend analytics remains the product and operational analytics layer** for LLM activity, readiness funnel activity, contact/lead reporting, and internal operational visibility.

This specification is intentionally narrow. It defines a small, reliable analytics surface that can be implemented in the current codebase without inventing a larger admin suite.

## 2. Design principles

The backend analytics implementation must follow the principles below.

### 2.1 Separate public-site analytics from product analytics

Plausible is the source of truth for public website traffic analytics. Backend analytics must not attempt to replace Plausible or duplicate its public traffic reporting model. In particular, backend analytics is not the system of record for page views, acquisition channels, or referrer analysis.

### 2.2 Prefer domain truth over duplicated events

Where a durable domain table already represents the business fact, reporting must be derived from that table rather than duplicated into a generic analytics event stream. This applies especially to:

- readiness starts and completions
- contact submissions
- readiness-linked leads
- LLM query activity and quality

The analytics event layer exists only for facts that are genuinely interaction-level and otherwise not durably represented.

### 2.3 Keep V1 small and operationally useful

The internal page is a small protected ops page. It is not a CRM, not a BI suite, not a multi-role admin console, and not part of the public site navigation. The goal is to let Thomas quickly answer a small number of operational questions:

- Is the app healthy?
- Is the LLM being used?
- Is the readiness flow being used and completed?
- Are contact and readiness-linked leads arriving?
- Are there obvious failures or spikes that need attention?

### 2.4 Use a strict event contract, not an open-ended event dump

If a dedicated event table is introduced, it must be narrow, validated, and explicitly enumerated. It must not become a catch-all JSON bucket for arbitrary browser telemetry.

### 2.5 Minimise sensitive data in analytics storage

Analytics events must not store names, email addresses, phone numbers, free-text contact messages, or raw IP addresses. User-entered LLM text remains in `public.llm_query_log` because it already exists as an operational log with explicit retention. That operational log is not a licence to place free text into the general event store.

### 2.6 Preserve current contracts where possible, tighten them where necessary

Current placeholder analytics contracts in existing docs should be tightened rather than ignored. In particular:

- `POST /v1/analytics/event` remains valid but is narrowed to a strict set of accepted event names
- `GET /v1/analytics/summary` remains the primary summary endpoint
- `GET /v1/contact/submissions` and `GET /v1/health/services` continue to support the internal page

### 2.7 Make source-of-truth boundaries explicit

Every metric surfaced by the internal page must be labelled by source type:

- **event-derived**
- **domain-table-derived**
- **hybrid**
- **live operational state**

That classification is part of the contract and must not be left implicit.

## 3. Analytics layers and system boundaries

Backend analytics for `thomashadden.ai` is split into four layers.

### 3.1 Layer 1 — frontend and external analytics

This layer is Plausible-only.

It covers:

- public page views
- referrers
- traffic sources
- high-level public-site behaviour

It does not cover:

- LLM operational usage
- readiness session state
- contact conversion
- service health
- backend latency or error signals

Plausible data is not required for V1 implementation of the internal ops page. If Plausible metrics are later proxied into an internal page, they remain an external analytics source and must not be treated as backend product analytics.

### 3.2 Layer 2 — product interaction events

This layer exists for a narrow class of browser interactions that are not already captured as durable domain facts.

This specification introduces a dedicated table for this layer:

- `analytics.product_events`

This table is required because some important funnel signals do not exist in current domain tables, specifically:

- CTA clicks
- auth flow entry
- auth flow terminal outcome

This table is intentionally not a universal event store. It is used only for strictly enumerated interaction events.

### 3.3 Layer 3 — domain-derived analytics

This layer is the primary analytics source for product usage and conversion reporting.

It uses existing durable domain tables as the source of truth:

- `public.llm_query_log`
- `public.readiness_sessions`
- `public.readiness_contact_leads`
- `public.contact_submissions`

These tables represent the actual business facts. The analytics layer reads from them; it does not duplicate their facts back into the event table.

### 3.4 Layer 4 — operational and internal analytics

This layer exposes application health and operational reporting needed for the internal ops page.

It includes:

- live service health from `GET /v1/health/services`
- LLM latency, token, and error aggregates derived from `public.llm_query_log`
- readiness funnel aggregates derived from `public.readiness_sessions` and `public.readiness_contact_leads`
- contact volume aggregates derived from `public.contact_submissions`
- recent issue summaries derived from live health and recent operational errors

This layer is read-only. It does not include remediation workflows, queue controls, or record editing.

### 3.5 Boundary decision

The system of record for each major analytics concern is:

| Concern | Source of truth | Source type |
|---|---|---|
| Public traffic and page views | Plausible | External analytics |
| CTA clicks | `analytics.product_events` | Event-derived |
| Auth started / completed | `analytics.product_events` | Event-derived |
| LLM query count, latency, errors, tokens | `public.llm_query_log` | Domain-table-derived |
| Readiness starts / completions | `public.readiness_sessions` | Domain-table-derived |
| Readiness result distribution | `public.readiness_sessions` | Domain-table-derived |
| Readiness-to-contact conversion | `public.readiness_sessions` + `public.readiness_contact_leads` | Hybrid |
| Direct contact submissions | `public.contact_submissions` | Domain-table-derived |
| Total inbound lead records | `public.contact_submissions` + `public.readiness_contact_leads` | Hybrid |
| Service health | live `/v1/health/services` response | Live operational state |

## 4. Event taxonomy

### 4.1 Decision on the dedicated event store

A dedicated analytics event table **is introduced**.

The table is `analytics.product_events`.

It is introduced for one reason only: certain funnel interactions are valuable and not already represented by existing domain tables. Without an event table, there is no durable backend source of truth for CTA clicks or auth-entry behaviour.

The event table is **not** used for:

- page views
- contact form submissions
- readiness session starts or completions
- LLM query submitted/completed

Those facts are either already better represented elsewhere or intentionally left to Plausible.

### 4.2 Status of currently listed tracked event names

Existing docs list the following tracked names for `POST /analytics/event`:

- `page_view`
- `llm_query_submitted`
- `llm_query_completed`
- `readiness_check_started`
- `readiness_check_completed`
- `contact_form_submitted`
- `auth_started`
- `auth_completed`
- `cta_clicked`

Under this specification, those names are reclassified as follows:

| Event name | V1 status | Reason |
|---|---|---|
| `page_view` | Deprecated for backend analytics ingestion | Public page views belong to Plausible, not backend analytics |
| `llm_query_submitted` | Deprecated for backend analytics ingestion | Query submission/completion is already represented by `public.llm_query_log` |
| `llm_query_completed` | Deprecated for backend analytics ingestion | Query submission/completion is already represented by `public.llm_query_log` |
| `readiness_check_started` | Deprecated for backend analytics ingestion | Readiness session creation is derived from `public.readiness_sessions` |
| `readiness_check_completed` | Deprecated for backend analytics ingestion | Readiness completion is derived from `public.readiness_sessions` |
| `contact_form_submitted` | Deprecated for backend analytics ingestion | Contact submissions are derived from `public.contact_submissions` |
| `auth_started` | Accepted | No better durable source currently exists for auth-entry intent |
| `auth_completed` | Accepted | No better durable source currently exists for auth terminal outcome |
| `cta_clicked` | Accepted | No better durable source currently exists for CTA interaction intent |

### 4.3 Accepted backend event names

Only the following names are accepted by `POST /v1/analytics/event` in V1:

- `cta_clicked`
- `auth_started`
- `auth_completed`

Requests with any other event name must return `400 Bad Request`.

### 4.4 Event semantics

#### `cta_clicked`

Represents a meaningful CTA interaction that indicates funnel intent and is not otherwise captured by a later durable domain write.

Examples include:

- homepage readiness CTA clicked
- LLM readiness suggestion CTA clicked
- readiness result contact CTA clicked

A CTA that immediately produces a durable domain record may still be tracked if the click itself is useful as a funnel step. This is the primary reason this event exists.

#### `auth_started`

Represents the user initiating a public-user authentication flow from the site. This event is emitted when the user commits to an auth entry point, not on page render.

#### `auth_completed`

Represents a terminal auth outcome. This event is emitted for success, cancellation, or failure. The terminal outcome is recorded in a required property rather than split into separate event names.

### 4.5 Event taxonomy constraints

The event taxonomy must remain small. Adding a new event requires all of the following:

1. the interaction is not already a durable domain fact
2. the interaction materially improves product or funnel reporting
3. the event can be expressed without storing personal content
4. the event has a finite, documented set of properties
5. the event is added to the event-name allow-list and schema documentation

## 5. Canonical event payload schemas

### 5.1 Canonical event envelope

`POST /v1/analytics/event` accepts the following logical request body:

```json
{
  "eventId": "uuid-or-stable-client-generated-id",
  "eventName": "cta_clicked | auth_started | auth_completed",
  "occurredAt": "2026-04-03T21:15:00.000Z",
  "sessionId": "browser-session-id",
  "pagePath": "/readiness",
  "properties": {}
}
```

The canonical meaning of each field is:

| Field | Required | Type | Notes |
|---|---|---|---|
| `eventId` | Yes | string | Client-generated unique logical event id used for idempotency |
| `eventName` | Yes | string enum | Must be one of the accepted event names |
| `occurredAt` | No | ISO-8601 timestamp | Client event time if available; server `received_at` remains canonical ingestion time |
| `sessionId` | Yes | string | Stable browser-level session identifier already used by the application when available |
| `pagePath` | No | string | Path where the interaction occurred |
| `properties` | Yes | object | Event-specific validated property object |

The client must not send:

- raw IP address
- user agent
- authenticated user id
- name, email, phone number
- free-text message bodies
- free-text LLM prompt or response content

Those values are either set server-side or forbidden entirely.

### 5.2 Server-populated fields

On write to `analytics.product_events`, the server must also populate:

| Field | Source |
|---|---|
| `received_at` | server timestamp at ingestion |
| `user_id` | authenticated user id if a user session is present, else null |
| `ip_hash` | server-generated HMAC hash of client IP using analytics secret |
| `user_agent` | request user agent string, truncated to implementation-safe length |
| `request_id` | server request correlation id if available |

### 5.3 `cta_clicked` schema

Required properties:

```json
{
  "ctaId": "home_readiness_primary",
  "ctaSurface": "homepage_hero",
  "destination": "/readiness"
}
```

Optional properties:

```json
{
  "pageSection": "hero",
  "journey": "readiness",
  "variant": "default"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `ctaId` | Yes | string | Stable application-defined CTA identifier |
| `ctaSurface` | Yes | string | Stable surface identifier such as `homepage_hero` or `llm_suggested_action` |
| `destination` | Yes | string | Intended destination route or logical target |
| `pageSection` | No | string | Stable section identifier |
| `journey` | No | string | Logical funnel such as `readiness`, `contact`, or `general` |
| `variant` | No | string | Optional experiment or variant label |

`cta_clicked` properties must remain finite and controlled. Arbitrary marketing metadata is not permitted.

### 5.4 `auth_started` schema

Required properties:

```json
{
  "provider": "linkedin",
  "authContext": "readiness"
}
```

Optional properties:

```json
{
  "entrySurface": "readiness_gate",
  "readinessSessionId": "uuid",
  "returnPath": "/readiness"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `provider` | Yes | string | Normalised provider identifier such as `linkedin`, `email`, or `unknown` |
| `authContext` | Yes | string | Logical flow that initiated auth, such as `readiness`, `contact`, or `general` |
| `entrySurface` | No | string | Stable UI surface identifier |
| `readinessSessionId` | No | string | Present only when auth is initiated from a readiness flow already backed by a session |
| `returnPath` | No | string | Intended return route after auth |

### 5.5 `auth_completed` schema

Required properties:

```json
{
  "provider": "linkedin",
  "authContext": "readiness",
  "outcome": "success"
}
```

Optional properties:

```json
{
  "entrySurface": "readiness_gate",
  "readinessSessionId": "uuid",
  "returnPath": "/readiness/result"
}
```

Property rules:

| Property | Required | Type | Notes |
|---|---|---|---|
| `provider` | Yes | string | Same normalised identifier used at auth start |
| `authContext` | Yes | string | Same logical context used at auth start |
| `outcome` | Yes | string enum | `success`, `cancelled`, or `failed` |
| `entrySurface` | No | string | Stable UI surface identifier |
| `readinessSessionId` | No | string | Present when auth is linked to a readiness flow |
| `returnPath` | No | string | Final landing path when known |

### 5.6 Idempotency and deduplication

The client must generate a stable `eventId` per logical event emission.

`analytics.product_events` must enforce uniqueness on `event_idempotency_key`, which is the persisted form of `eventId`.

If the same logical event is received more than once:

- the first write is stored
- subsequent duplicates are ignored
- the endpoint returns a success response so the browser does not retry indefinitely

This endpoint is for best-effort analytics ingestion, not for transactional user workflows.

### 5.7 Session mapping across anonymous and authenticated flows

The following rules apply:

1. `sessionId` is the primary cross-step browser identifier for event ingestion.
2. `user_id` is null until an authenticated session exists.
3. Existing anonymous rows are not retroactively rewritten when a user later authenticates.
4. Funnel linkage across anonymous and authenticated phases uses:
   - shared `sessionId` where present
   - explicit domain ids such as `readinessSessionId` when present
   - domain tables as the authoritative completion source

This avoids complex identity stitching in V1 while preserving enough linkage for reporting.

## 6. Domain-derived analytics definitions

This section defines each metric exposed by backend analytics, including its source type and exact derivation.

### 6.1 Metrics matrix

| Metric | Classification | Source | Definition |
|---|---|---|---|
| `llm.totalQueries` | Domain-table-derived | `public.llm_query_log` | Count of query log rows created in the reporting period |
| `llm.uniqueSessions` | Domain-table-derived | `public.llm_query_log` | Count of distinct session identifiers in the reporting period |
| `llm.errorCount` | Domain-table-derived | `public.llm_query_log` | Count of rows in period where `error` is non-null |
| `llm.errorRate` | Domain-table-derived | `public.llm_query_log` | `errorCount / totalQueries` |
| `llm.avgResponseMs` | Domain-table-derived | `public.llm_query_log` | Arithmetic mean of response time in milliseconds for rows in period |
| `llm.p95ResponseMs` | Domain-table-derived | `public.llm_query_log` | 95th percentile response time in milliseconds for rows in period |
| `llm.totalInputTokens` | Domain-table-derived | `public.llm_query_log` | Sum of input token counts in period |
| `llm.totalOutputTokens` | Domain-table-derived | `public.llm_query_log` | Sum of output token counts in period |
| `llm.estimatedCostUsd` | Hybrid | `public.llm_query_log` + configured model rate card | Sum of token-based estimated costs when a rate card exists |
| `llm.readinessSuggestionCount` | Domain-table-derived | `public.llm_query_log` | Count of rows where readiness routing/suggestion flag is true |
| `llm.readinessSuggestionRate` | Domain-table-derived | `public.llm_query_log` | `readinessSuggestionCount / totalQueries` |
| `llm.topQueries` | Domain-table-derived | `public.llm_query_log` | Top normalised query strings in period after privacy filters |
| `readiness.startedCount` | Domain-table-derived | `public.readiness_sessions` | Count of readiness sessions created in period |
| `readiness.completedCount` | Domain-table-derived | `public.readiness_sessions` | Count of readiness sessions with `completed_at` in period |
| `readiness.completionRate` | Domain-table-derived | `public.readiness_sessions` | Share of sessions started in period that have reached completion by report time |
| `readiness.resultCategoryDistribution` | Domain-table-derived | `public.readiness_sessions` | Distribution of `result_category` among sessions completed in period |
| `readiness.contactLeadCount` | Hybrid | `public.readiness_sessions` + `public.readiness_contact_leads` | Count of readiness-linked lead rows attributable to sessions in period |
| `readiness.contactConversionRate` | Hybrid | `public.readiness_sessions` + `public.readiness_contact_leads` | `contactLeadCount / completedCount`, based on completed readiness sessions in period |
| `contact.directSubmissionCount` | Domain-table-derived | `public.contact_submissions` | Count of direct contact submissions created in period |
| `contact.readinessLeadCount` | Domain-table-derived | `public.readiness_contact_leads` | Count of readiness-linked leads created in period |
| `contact.totalInboundLeadRecords` | Hybrid | `public.contact_submissions` + `public.readiness_contact_leads` | Sum of both record counts, without person-level deduplication |
| `contact.bySource` | Domain-table-derived / Hybrid | source columns in both contact tables | Counts grouped by domain-level source |
| `contact.byEnquiryType` | Domain-table-derived | `public.contact_submissions` | Counts grouped by enquiry type for direct contacts only |
| `events.ctaClicks` | Event-derived | `analytics.product_events` | Count of `cta_clicked` rows in period |
| `events.authStarted` | Event-derived | `analytics.product_events` | Count of `auth_started` rows in period |
| `events.authCompleted` | Event-derived | `analytics.product_events` | Count of `auth_completed` rows in period |
| `events.authSuccessRate` | Event-derived | `analytics.product_events` | Count of `auth_completed` rows with `outcome = success` divided by `auth_started` count |
| `services.*` | Live operational state | `GET /v1/health/services` | Current downstream health, not persisted analytics |

### 6.2 LLM analytics definitions

`public.llm_query_log` is the source of truth for LLM analytics. No mirrored `llm_query_submitted` or `llm_query_completed` event rows are written to `analytics.product_events`.

For analytics purposes:

- the reporting period is determined by `created_at`
- rows with non-null `error` count as failed queries
- successful and failed queries both count toward total query volume
- response-time statistics use only rows with a recorded response-time value
- token totals use zero for missing token values only if the source row genuinely lacks a value; missing values must not be silently fabricated

If `public.llm_query_log` already records a boolean for readiness routing or readiness suggestion, that field is used directly. If the current field name differs, the contract in this document still applies semantically and must be mapped explicitly in implementation.

### 6.3 Readiness analytics definitions

`public.readiness_sessions` is the source of truth for readiness activity.

This specification depends on the readiness data model exposing, at minimum:

- a stable readiness session id
- session creation timestamp
- completion timestamp when completed
- result category or equivalent terminal classification when completed

For reporting:

- `startedCount` uses readiness sessions created in the period
- `completedCount` uses readiness sessions completed in the period
- `completionRate` uses the cohort of sessions started in the period and asks whether each has completed by report time
- `resultCategoryDistribution` uses completed sessions in the period

The completion-rate definition is deliberate. It prevents the displayed rate from becoming a misleading same-period ratio when starts and completions fall into different periods.

### 6.4 Readiness-to-contact conversion

`public.readiness_contact_leads` must link to `public.readiness_sessions` through a stable readiness session identifier.

`readiness.contactLeadCount` counts readiness-linked lead rows attributable to completed readiness sessions in the reporting period. If multiple lead rows can exist for one session, the implementation must choose one rule and document it in code. The V1 rule is:

- count distinct readiness session ids present in `public.readiness_contact_leads`

This prevents repeated submissions from inflating the readiness conversion rate.

### 6.5 Contact analytics definitions

Direct contact form analytics come from `public.contact_submissions`.

Readiness-generated lead analytics come from `public.readiness_contact_leads`.

`contact.totalInboundLeadRecords` is defined as the sum of record counts from those two tables. It is intentionally record-based, not person-deduplicated. V1 does not attempt cross-table person matching.

### 6.6 Query privacy rules for `topQueries`

`topQueries` is useful operationally but carries privacy risk because it derives from user-entered text.

Therefore `topQueries` must follow all of the rules below:

1. Normalise query text before grouping:
   - trim leading/trailing whitespace
   - lowercase
   - collapse repeated internal whitespace
2. Exclude queries that contain:
   - email-address patterns
   - phone-number-like patterns
3. Exclude queries that appear fewer than 3 times in the reporting period
4. Truncate displayed query strings to a maximum of 120 characters
5. Only compute `topQueries` from raw rows still within the raw retention window

This means `topQueries` is available for recent periods only. Historical indefinite top-query reporting is out of scope.

## 7. Storage model

### 7.1 Storage decision summary

The storage model for V1 is:

- **Plausible** remains external and separate
- **`analytics.product_events`** stores the small set of accepted funnel interaction events
- **existing domain tables remain unchanged as the source of truth** for LLM, readiness, and contact analytics
- **`analytics.llm_daily_rollup`** stores anonymised long-term LLM aggregate history required after raw `llm_query_log` retention deletes old rows
- no general-purpose analytics warehouse is introduced

### 7.2 Required new table: `analytics.product_events`

A new table is required:

`analytics.product_events`

Required columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | Yes | Primary key |
| `event_idempotency_key` | text | Yes | Unique client logical event id |
| `event_name` | text | Yes | Check-constrained to accepted event names |
| `session_id` | text | Yes | Browser session identifier |
| `user_id` | uuid nullable | No | Authenticated user id if present |
| `page_path` | text nullable | No | Path where event occurred |
| `properties` | jsonb | Yes | Validated event-specific property payload |
| `occurred_at` | timestamptz nullable | No | Client-reported time when supplied |
| `received_at` | timestamptz | Yes | Canonical server ingestion time |
| `ip_hash` | text nullable | No | HMAC hash, never raw IP |
| `user_agent` | text nullable | No | Request user agent |
| `request_id` | text nullable | No | Request correlation id if present |

Required indexes:

- unique index on `event_idempotency_key`
- index on `(event_name, received_at desc)`
- index on `(session_id, received_at desc)`
- index on `(user_id, received_at desc)` where `user_id` is not null

No arbitrary secondary dimensions are added in V1. Anything that needs long-term grouping must fit within the documented property set.

### 7.3 Required new table: `analytics.llm_daily_rollup`

A new anonymised aggregate table is required:

`analytics.llm_daily_rollup`

Purpose:

- preserve long-term daily LLM trend data after the 90-day raw `public.llm_query_log` retention window deletes old rows
- avoid indefinite retention of raw prompts/responses

Required columns:

| Column | Type | Required | Notes |
|---|---|---|---|
| `bucket_date` | date | Yes | UTC date bucket |
| `model` | text | Yes | Model identifier |
| `total_queries` | integer | Yes | Daily query count |
| `error_count` | integer | Yes | Daily failed query count |
| `avg_response_ms` | numeric | Yes | Daily mean latency |
| `p95_response_ms` | integer nullable | No | Daily p95 latency |
| `total_input_tokens` | bigint | Yes | Daily input token total |
| `total_output_tokens` | bigint | Yes | Daily output token total |
| `estimated_cost_usd` | numeric nullable | No | Daily token-cost estimate when configured |
| `readiness_suggestion_count` | integer | Yes | Daily readiness suggestion count |
| `unique_sessions` | integer nullable | No | Distinct sessions in day |
| `created_at` | timestamptz | Yes | Insert timestamp |
| `updated_at` | timestamptz | Yes | Last refresh timestamp |

Primary key:

- `(bucket_date, model)`

V1 reporting page periods are limited to `today`, `last_7_days`, and `last_30_days`, so the internal page can use raw `public.llm_query_log` for its live summary. The rollup table exists to satisfy the already-defined long-term retention direction and to keep future historical trend reporting possible.

### 7.4 No dedicated rollup tables for readiness and contact in V1

This specification does **not** introduce dedicated readiness or contact rollup tables in V1.

Reason:

- those records already exist durably in business tables
- the internal page periods are short
- query volume should be small enough for direct aggregation
- introducing extra rollups would duplicate metrics without a strong reason

If performance later requires materialised reporting structures, that can be added in a later revision.

### 7.5 No dedicated stored health-history table in V1

This specification does **not** introduce a database table for service health history in V1.

Reason:

- the internal page uses current health state, not historical uptime analytics
- health history quickly becomes a separate observability problem
- V1 only needs live operational status and recent operational issues derived from recent logs/errors

### 7.6 Data ownership boundaries

Data ownership for storage is:

| Storage object | Ownership role |
|---|---|
| Plausible | public-site analytics only |
| `analytics.product_events` | interaction analytics only |
| `public.llm_query_log` | operational LLM log and recent product analytics source |
| `analytics.llm_daily_rollup` | anonymised long-term LLM trend aggregate |
| `public.readiness_sessions` | readiness business state and readiness analytics source |
| `public.readiness_contact_leads` | readiness-lead business state and conversion analytics source |
| `public.contact_submissions` | direct contact business state and contact analytics source |

## 8. Aggregation and reporting model

### 8.1 Reporting periods

`GET /v1/analytics/summary` must support the following period keys:

- `today`
- `last_7_days`
- `last_30_days`

V1 does not require arbitrary custom ranges.

Period boundaries are evaluated in **UTC**.

### 8.2 Time-series granularity

The summary endpoint returns a `timeseries` block.

Granularity rules:

- `today` uses hourly buckets in UTC
- `last_7_days` uses daily buckets in UTC
- `last_30_days` uses daily buckets in UTC

### 8.3 Live versus cached aggregation

The internal page is small and read-only. V1 summary aggregation may be computed live from source tables with short server-side caching.

Required behaviour:

- summary responses may be cached for up to 60 seconds
- live service health responses should not be cached beyond normal request transit
- recent contact submissions should reflect near-live data and may be cached for up to 60 seconds

This keeps implementation simple while avoiding unnecessary query load.

### 8.4 Summary aggregation rules

The summary endpoint must aggregate:

- event-derived CTA and auth counts from `analytics.product_events`
- LLM analytics from `public.llm_query_log`
- readiness analytics from `public.readiness_sessions` and `public.readiness_contact_leads`
- contact analytics from `public.contact_submissions` and `public.readiness_contact_leads`
- recent issues from:
  - current non-healthy service states
  - recent LLM errors in the reporting window

### 8.5 Recent issues model

`recentIssues` is a small operational signal block, not a full incident system.

Each item must contain:

| Field | Type | Notes |
|---|---|---|
| `type` | string | `service_health` or `llm_error` in V1 |
| `severity` | string | `info`, `warning`, or `critical` |
| `message` | string | Sanitised operator-facing description |
| `count` | integer nullable | Count when issue is aggregated from multiple rows |
| `occurredAt` | timestamp nullable | Most recent occurrence time when applicable |

Rules:

- current degraded service states appear even if no recent database error row exists
- raw user prompt or response text must never appear in `recentIssues`
- error messages should be sanitised to avoid leaking secrets or internal stack details

### 8.6 Cost estimation model

Cost analytics is optional but supported.

If model pricing is configured in environment settings, the summary endpoint must calculate token-cost estimates using:

- model identifier
- input token count
- output token count
- configured per-model input and output rates

If pricing is not configured, the endpoint must return token totals and set cost fields to `null`.

Cost values are always labelled as estimates.

### 8.7 Retention and aggregation jobs

Two scheduled maintenance jobs are required.

#### Job 1 — LLM daily rollup

Runs daily.

Responsibilities:

1. aggregate the previous UTC day from `public.llm_query_log`
2. upsert rows into `analytics.llm_daily_rollup`
3. refresh any partial current-day row if the implementation chooses to support it

#### Job 2 — raw retention cleanup

Runs daily.

Responsibilities:

1. delete `public.llm_query_log` rows older than the configured retention window after rollup has been safely written
2. delete `analytics.product_events` rows older than the configured retention window

This specification does not require a separate cron scheduler technology. It only requires that the maintenance behaviour exist and be documented in deployment configuration.

## 9. Admin and internal endpoints

### 9.1 Endpoint classification

V1 analytics and ops uses four endpoint classes:

1. **same-origin product event ingestion**
   - `POST /v1/analytics/event`
2. **admin/internal analytics summary**
   - `GET /v1/analytics/summary`
3. **admin/internal recent contact submission access**
   - `GET /v1/contact/submissions`
4. **admin/internal live health**
   - `GET /v1/health/services`

In addition, this specification introduces one minimal internal route-protection endpoint for the ops page:

5. **internal ops session bootstrap**
   - `POST /v1/internal/ops/session`

### 9.2 Protection model decision

The internal ops page and its backing read endpoints must use a **server-side shared secret model** in V1.

This is separate from public-user auth.

The model is:

- internal access is granted by verifying a shared admin secret configured in environment
- on success, the server sets a short-lived, signed, HttpOnly, SameSite=Strict cookie used only for internal ops access
- the internal page and the admin/internal read endpoints require that cookie
- public-user auth providers such as LinkedIn or email do not grant ops access

This keeps V1 small and avoids expanding the scope to a richer admin identity system.

### 9.3 `POST /v1/internal/ops/session`

Purpose:

- unlock internal ops access using the configured shared admin secret
- set the signed internal-ops session cookie

Request body:

```json
{
  "secret": "provided-by-operator"
}
```

Successful response:

```json
{
  "ok": true
}
```

Rules:

- the secret is compared server-side against `OPS_ADMIN_SECRET`
- the secret must never be echoed back
- on success, the server sets the internal ops access cookie
- on failure, return `401 Unauthorized`
- this endpoint is not linked from the public site

### 9.4 `POST /v1/analytics/event`

Purpose:

- ingest the small set of accepted browser interaction events

Access model:

- same-origin browser endpoint
- not admin-only
- protected by strict event validation, same-origin controls, and rate limiting
- no public API key model is required in V1

Request body:

- must conform to the canonical envelope in section 5

Success response:

```json
{
  "accepted": true
}
```

Response code:

- `202 Accepted`

Error cases:

- `400` for invalid event name or invalid properties
- `401` only if the route is called in a context where same-origin protection fails and the implementation chooses to reject it explicitly
- `429` when rate limits are exceeded

### 9.5 `GET /v1/analytics/summary`

Purpose:

- return the entire dataset needed by the internal ops page, excluding recent contact detail rows and excluding live health detail

Access model:

- internal ops access only

Query parameters:

| Parameter | Required | Values |
|---|---|---|
| `period` | Yes | `today`, `last_7_days`, `last_30_days` |

Response shape:

```json
{
  "period": {
    "key": "last_7_days",
    "start": "2026-03-28T00:00:00.000Z",
    "end": "2026-04-03T23:59:59.999Z",
    "timezone": "UTC"
  },
  "overview": {
    "llmQueries": 0,
    "readinessStarts": 0,
    "readinessCompletions": 0,
    "directContactSubmissions": 0,
    "readinessContactLeads": 0,
    "totalInboundLeadRecords": 0
  },
  "events": {
    "ctaClicks": 0,
    "authStarted": 0,
    "authCompleted": 0,
    "authSuccessRate": 0
  },
  "llm": {
    "totalQueries": 0,
    "uniqueSessions": 0,
    "avgResponseMs": 0,
    "p95ResponseMs": 0,
    "errorCount": 0,
    "errorRate": 0,
    "totalInputTokens": 0,
    "totalOutputTokens": 0,
    "estimatedCostUsd": null,
    "readinessSuggestionCount": 0,
    "readinessSuggestionRate": 0,
    "topQueries": []
  },
  "readiness": {
    "startedCount": 0,
    "completedCount": 0,
    "completionRate": 0,
    "contactLeadCount": 0,
    "contactConversionRate": 0,
    "resultCategoryDistribution": []
  },
  "contact": {
    "directSubmissionCount": 0,
    "readinessLeadCount": 0,
    "totalInboundLeadRecords": 0,
    "bySource": [],
    "byEnquiryType": []
  },
  "timeseries": {
    "granularity": "day",
    "points": []
  },
  "recentIssues": []
}
```

Field meanings:

- `overview` is a compact card-friendly subset
- `events` exposes the event-derived funnel signals
- `llm`, `readiness`, and `contact` expose the main operational reporting blocks
- `timeseries` provides trend data for charts or sparklines
- `recentIssues` provides a compact operator-facing issue list

This endpoint must not return names, email addresses, phone numbers, full contact message bodies, or raw LLM prompts/responses.

### 9.6 `GET /v1/contact/submissions`

Purpose:

- return recent direct contact submissions for operator review on the internal page

Access model:

- internal ops access only

Required query parameters:

| Parameter | Required | Notes |
|---|---|---|
| `limit` | No | Default 10, maximum 50 |

Required ordering:

- newest first by creation time

Required minimum response fields for the internal page:

| Field | Notes |
|---|---|
| `id` | stable record id |
| `createdAt` | submission timestamp |
| `name` | submitter name if stored |
| `email` | submitter email if stored |
| `company` | company if stored |
| `source` | submission source |
| `enquiryType` | enquiry classification if stored |
| `status` | handling status if implemented |

This endpoint is business-data access, not analytics-event access.

### 9.7 `GET /v1/health/services`

Purpose:

- return live current service health for internal display

Access model:

- internal ops access only

Required services in response:

- `api`
- `llm`
- `rag`
- `database`
- `auth`

Required status semantics:

- `ok`
- `degraded`
- `down`

This endpoint remains a live operational check. Its response is not persisted into analytics tables by this specification.

## 10. Internal analytics and ops page contract

### 10.1 Route and scope

A new internal-only route is introduced:

- `/ops`

This route is:

- protected
- not linked from the public site navigation
- excluded from public sitemap/navigation concerns
- read-only

This route is an internal interface surface, not part of the public frontend scope.

### 10.2 Route protection behaviour

If the operator does not have a valid internal ops cookie:

- render a minimal access form or redirect to a minimal internal unlock page backed by `POST /v1/internal/ops/session`

The route must not rely on public-user auth state.

### 10.3 Data dependencies

The `/ops` page consumes exactly these same-app endpoints:

- `GET /api/v1/health/services`
- `GET /api/v1/analytics/summary?period=...`
- `GET /api/v1/contact/submissions?limit=10`

No other backend analytics endpoint is required for V1.

### 10.4 Required sections

The page must contain the following sections.

#### A. Service health

Source:

- `GET /v1/health/services`

Display:

- one status card or badge per downstream service
- service name
- current status
- optional timestamp of last refresh

Purpose:

- immediate visibility into whether the app is healthy

#### B. High-level summary

Source:

- `GET /v1/analytics/summary`

Display:

- LLM queries
- readiness starts
- readiness completions
- direct contact submissions
- readiness contact leads
- total inbound lead records

Purpose:

- quick operational snapshot

#### C. LLM overview

Source:

- `GET /v1/analytics/summary`

Display:

- total queries
- unique sessions
- average response time
- p95 response time
- error count and error rate
- input and output token totals
- estimated cost if configured
- top queries
- readiness suggestion count and rate

Purpose:

- understand usage, performance, and potential quality signals

#### D. Readiness funnel

Source:

- `GET /v1/analytics/summary`

Display:

- started count
- completed count
- completion rate
- result-category distribution
- readiness contact lead count
- readiness contact conversion rate

Purpose:

- observe whether the readiness flow is being used and converting

#### E. Contact and lead overview

Source:

- `GET /v1/analytics/summary`

Display:

- direct contact submissions
- readiness-linked leads
- total inbound lead records
- counts by source
- counts by enquiry type

Purpose:

- see inbound lead volume and where it is coming from

#### F. Recent submissions

Source:

- `GET /v1/contact/submissions`

Display:

- the latest direct contact submissions in a simple list or table
- newest first
- no editing controls required

Purpose:

- quick operator visibility without turning the page into a CRM

#### G. Recent issues

Source:

- `GET /v1/analytics/summary` plus current health display

Display:

- recent sanitised LLM errors
- any currently degraded/down services

Purpose:

- surface obvious failures worth investigation

### 10.5 Period selector

The page must include a period selector with these values:

- Today
- Last 7 days
- Last 30 days

Changing the period updates:

- high-level summary
- LLM overview
- readiness funnel
- contact and lead overview
- recent issues
- timeseries charts/sparklines if present

Service health remains live and is not period-dependent.

### 10.6 Refresh behaviour

Required refresh cadence:

- service health: refresh every 60 seconds while the page is open
- analytics summary: refresh on period change and optionally every 5 minutes
- recent submissions: refresh on page load and optionally every 5 minutes

### 10.7 Non-goals for the internal page

The page does not include:

- public navigation exposure
- multi-user role management
- record editing
- export tooling
- bulk actions
- CRM workflow
- detailed incident management
- Plausible replacement traffic dashboards

## 11. Privacy, retention, and redaction rules

### 11.1 Raw IP handling

Raw IP addresses must not be persisted in analytics tables introduced by this specification.

Where IP correlation is needed for abuse or coarse operational analysis:

- persist only `ip_hash`
- compute using HMAC with a server secret
- do not persist a reversible raw IP column

### 11.2 Product events must not contain personal content

`analytics.product_events.properties` must not contain:

- name
- email
- phone number
- free-text contact message
- free-text LLM prompt
- free-text LLM response

Properties are restricted to documented identifiers and small enums.

### 11.3 LLM log privacy boundary

`public.llm_query_log` already stores user-entered query and response data for operational reasons. This document preserves that existing direction and the existing 90-day rolling raw retention.

Rules:

- raw prompt/response content remains confined to `public.llm_query_log`
- raw prompt/response content must not be copied into `analytics.product_events`
- indefinite retention of raw prompt/response content is not permitted
- long-term history is preserved only through anonymised aggregate rollups

### 11.4 Retention rules

Retention windows are:

| Data set | Raw retention | Long-term retention |
|---|---|---|
| `public.llm_query_log` | 90 days | anonymised daily rollups retained indefinitely |
| `analytics.product_events` | 180 days | none required in V1 |
| `public.readiness_sessions` | business-data retention | as defined by product/business policy, not by analytics policy |
| `public.readiness_contact_leads` | business-data retention | as defined by product/business policy, not by analytics policy |
| `public.contact_submissions` | business-data retention | as defined by product/business policy, not by analytics policy |

### 11.5 Redaction for operator-facing responses

Operator-facing endpoints must not expose:

- raw IP or `ip_hash`
- raw full user agent strings unless explicitly needed for debugging
- raw secrets
- stack traces
- raw LLM prompts or responses in analytics summary payloads

`GET /v1/contact/submissions` may expose names and emails because it is a business-data endpoint for an internal operator page, but that data is not part of the analytics summary contract.

### 11.6 Test and non-production data

Production analytics must not be polluted with development or automated test data.

The preferred V1 method is environment separation at the deployment/database level. If multiple environments ever share a database, then explicit environment tagging must be added before this analytics spec can be considered correctly implemented.

## 12. Environment and configuration requirements

The following environment settings are required or recommended.

### 12.1 Required settings

| Setting | Required | Purpose |
|---|---|---|
| `OPS_ADMIN_SECRET` | Yes | Shared secret used to unlock internal ops access |
| `OPS_COOKIE_SIGNING_SECRET` | Yes | Secret used to sign the internal ops access cookie |
| `ANALYTICS_IP_HMAC_SECRET` | Yes | Secret used to hash IP addresses for analytics storage |
| `LLM_QUERY_LOG_RETENTION_DAYS` | Yes | Raw LLM log retention window, default 90 |
| `PRODUCT_EVENTS_RETENTION_DAYS` | Yes | Raw product-event retention window, default 180 |

### 12.2 Optional settings

| Setting | Required | Purpose |
|---|---|---|
| `LLM_MODEL_RATE_CARD_JSON` | No | Optional model pricing configuration for cost estimation |
| `ENABLE_INTERNAL_OPS_PAGE` | No | Feature flag to disable `/ops` in environments where it should not be exposed |

### 12.3 Operational requirements

Deployment must provide:

- a daily scheduled job for LLM rollup generation
- a daily scheduled job for retention cleanup
- secure cookie settings for internal ops access
- request correlation ids where possible for issue tracing

## 13. Required amendments to `interfaces.md`

The following changes are required in `interfaces.md`.

### 13.1 Add `backend-analytics.md` to source-file precedence

The source-file list or precedence section must add `backend-analytics.md` as an authoritative source document for backend analytics and internal ops reporting.

This removes the current missing-document gap.

### 13.2 Resolve the open analytics documentation question

Any existing open question equivalent to “backend analytics spec missing” or “do we need a dedicated analytics schema/table?” must be resolved as follows:

- yes, a dedicated analytics table is introduced
- the table is `analytics.product_events`
- it is intentionally narrow and does not duplicate domain facts
- LLM analytics remains primarily domain-table-derived from `public.llm_query_log`

### 13.3 Update the interface inventory

The interface inventory must explicitly distinguish between:

- same-origin product event ingestion
- internal admin/ops read endpoints
- internal ops access bootstrapping

Required endpoint inventory state:

- `POST /v1/analytics/event` — same-origin product event ingestion, not admin-only
- `GET /v1/analytics/summary` — internal ops only
- `GET /v1/contact/submissions` — internal ops only
- `GET /v1/health/services` — internal ops only
- `POST /v1/internal/ops/session` — internal ops access bootstrap

### 13.4 Add canonical analytics data models

`interfaces.md` must add or reference these canonical models:

- `AnalyticsProductEvent`
- `AnalyticsSummary`
- `InternalOpsAccessSession` or equivalent route-protection contract

At minimum, it must record that:

- product events are restricted to `cta_clicked`, `auth_started`, and `auth_completed`
- readiness, contact, and LLM metrics are not generic event-stream facts

### 13.5 Update database interface notes

The database interface section must record:

- new table `analytics.product_events`
- new table `analytics.llm_daily_rollup`
- continued use of `public.llm_query_log`, `public.readiness_sessions`, `public.readiness_contact_leads`, and `public.contact_submissions` as source tables

### 13.6 Clarify internal page scope

Where `interfaces.md` currently states that analytics dashboard/admin UI is out of V1 public frontend scope, it should be amended to state:

- a small internal-only ops route is included in scope as an internal interface surface
- it remains out of public frontend scope
- it is not part of the public site navigation or public user feature set

## 14. Recommended amendments to `backend-api.md`

The following changes are recommended to keep `backend-api.md` aligned with this specification.

### 14.1 Reclassify `POST /analytics/event`

If `backend-api.md` currently treats the analytics event endpoint as admin-only or API-key protected, that should be changed.

Recommended status:

- same-origin browser ingestion endpoint
- strict allow-list validation
- no public API key model required in V1
- rate limited
- only accepts `cta_clicked`, `auth_started`, `auth_completed`

### 14.2 Deprecate unsupported event names in the analytics endpoint contract

The endpoint documentation should explicitly deprecate backend ingestion for:

- `page_view`
- `llm_query_submitted`
- `llm_query_completed`
- `readiness_check_started`
- `readiness_check_completed`
- `contact_form_submitted`

Those facts are now derived elsewhere or intentionally left to Plausible.

### 14.3 Expand `GET /analytics/summary` to the internal page contract shape

`backend-api.md` should update `GET /analytics/summary` from the old placeholder flat structure to the nested contract defined in section 9.5 of this document.

If backward compatibility is important during implementation, the handler may temporarily preserve the legacy top-level fields while also returning the new nested structure. The documentation, however, should move to the new structure as the canonical contract.

### 14.4 Clarify that public page-view analytics are not backend summary requirements

If `backend-api.md` currently lists `pageViews` and `uniqueSessions` as required backend summary fields, that should be amended.

Recommended treatment:

- do not require Plausible traffic metrics for V1 backend analytics summary
- if such fields remain temporarily for compatibility, mark them optional or nullable and clearly sourced from external analytics rather than backend product analytics

### 14.5 Add `POST /v1/internal/ops/session`

`backend-api.md` should document the minimal internal ops access bootstrap endpoint if API docs are intended to cover internal routes as well as public ones.

## 15. Recommended amendments to `backend-database.md`

The following changes are recommended to keep `backend-database.md` aligned with this specification.

### 15.1 Add `analytics.product_events`

`backend-database.md` should define the new table with:

- strict event-name allow-list
- required idempotency key
- validated JSONB properties
- server-side received timestamp
- hashed IP only
- indexes described in section 7.2

It should explicitly state that this table is not a catch-all event stream.

### 15.2 Add `analytics.llm_daily_rollup`

`backend-database.md` should define the new rollup table and its purpose:

- anonymised long-term aggregate preservation after raw LLM log deletion
- daily UTC bucket
- per-model aggregates
- token and latency totals
- optional estimated cost

### 15.3 Clarify analytics-source dependencies on existing domain tables

`backend-database.md` should ensure the following source-table fields are explicitly documented if they are not already:

For `public.readiness_sessions`:

- id
- created_at or equivalent start timestamp
- completed_at
- result_category or equivalent terminal classification

For `public.readiness_contact_leads`:

- id
- readiness_session_id
- created_at

For `public.contact_submissions`:

- id
- created_at
- source
- enquiry_type if supported

For `public.llm_query_log`:

- created_at
- session/user linkage
- error
- token counts
- response time
- model
- readiness routing/suggestion flag
- source

### 15.4 Keep retention notes explicit

`backend-database.md` should retain the existing 90-day raw retention rule for `public.llm_query_log` and add the raw retention rule for `analytics.product_events` with a default of 180 days.

### 15.5 Do not add unnecessary aggregate tables

`backend-database.md` should explicitly state that V1 does not introduce:

- readiness rollup tables
- contact rollup tables
- stored health-history tables

## 16. Unresolved decisions

There are no blocking unresolved decisions for V1 in this specification.

A later revision may decide whether selected Plausible metrics should be proxied into the internal ops page for convenience, but that is explicitly out of scope for this backend analytics specification and is not required for V1 implementation.

## Appendix — Required cross-document amendments

### Required changes to `interfaces.md`

1. Add `backend-analytics.md` to the authoritative source-document list.
2. Resolve the missing analytics-spec open question by declaring:
   - backend analytics is now specified
   - `analytics.product_events` exists
   - domain tables remain the source of truth for LLM, readiness, and contact analytics
3. Update interface inventory to include:
   - `POST /v1/analytics/event` as same-origin product event ingestion
   - `GET /v1/analytics/summary` as internal ops only
   - `GET /v1/contact/submissions` as internal ops only
   - `GET /v1/health/services` as internal ops only
   - `POST /v1/internal/ops/session` as internal ops access bootstrap
4. Add canonical analytics models or direct references for:
   - `AnalyticsProductEvent`
   - `AnalyticsSummary`
   - internal ops session bootstrap
5. Update database-interface notes to include:
   - `analytics.product_events`
   - `analytics.llm_daily_rollup`
   - continued domain-table source-of-truth usage
6. Clarify that the internal ops page is:
   - inside internal interface scope
   - outside public frontend scope
   - not part of public navigation

### Recommended changes to `backend-api.md`

1. Reclassify `POST /v1/analytics/event` as same-origin browser ingestion rather than admin-only/API-key public ingestion.
2. Restrict accepted analytics event names to:
   - `cta_clicked`
   - `auth_started`
   - `auth_completed`
3. Deprecate backend analytics ingestion for:
   - `page_view`
   - `llm_query_submitted`
   - `llm_query_completed`
   - `readiness_check_started`
   - `readiness_check_completed`
   - `contact_form_submitted`
4. Replace the placeholder summary response with the nested `AnalyticsSummary` contract in this specification.
5. Mark Plausible-derived page-view fields as out of scope, optional, or nullable rather than required backend metrics.
6. Add the minimal internal route-protection endpoint `POST /v1/internal/ops/session`.

### Recommended changes to `backend-database.md`

1. Add table definition for `analytics.product_events`.
2. Add table definition for `analytics.llm_daily_rollup`.
3. Ensure readiness/contact source tables document the fields analytics depends on.
4. Preserve explicit 90-day raw retention for `public.llm_query_log`.
5. Add explicit 180-day raw retention for `analytics.product_events`.
6. State explicitly that V1 does not add readiness/contact/health aggregate tables.

### `frontend-interface.md`

No required change.

Reason:

- the new route is internal-only and outside the public frontend scope
- documenting it in `interfaces.md` is sufficient for V1

A small targeted note is optional only if `frontend-interface.md` is intended to be a complete route inventory rather than a public-scope frontend specification.
