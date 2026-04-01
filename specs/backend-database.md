# thomashadden.ai — Backend Specification: Database

**Version:** 1.0  
**Date:** March 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** backend-api.md · backend-llm.md · backend-rag.md

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Database Platform & Configuration](#1-database-platform--configuration)
2. [Schema Overview](#2-schema-overview)
3. [Core Tables](#3-core-tables)
4. [RAG & Vector Tables](#4-rag--vector-tables)
5. [AI Readiness Check Tables](#5-ai-readiness-check-tables)
6. [Auth & Session Tables](#6-auth--session-tables)
7. [Analytics & Audit Tables](#7-analytics--audit-tables)
8. [Indexes & Performance](#8-indexes--performance)
9. [Row Level Security (RLS)](#9-row-level-security-rls)
10. [Environment Variables](#10-environment-variables)
11. [Migrations & Seeding Strategy](#11-migrations--seeding-strategy)
12. [Backup & Retention Policy](#12-backup--retention-policy)

---

## 1. Database Platform & Configuration

### 1.1 Platform

| Property | Value |
|----------|-------|
| Provider | Supabase (hosted PostgreSQL) |
| PostgreSQL version | 15+ |
| Vector extension | `pgvector` |
| Auth layer | Supabase Auth (LinkedIn, Email Magic Link) |
| Realtime | Disabled unless needed for future dashboard features |
| Storage | Supabase Storage (profile images, optional document blobs) |
| Region | EU West (aligned with Azure AI Foundry region) |

### 1.2 Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text search on content tables
```

### 1.3 Schema Separation

| Schema | Purpose |
|--------|---------|
| `public` | Core site data, RAG content, readiness check |
| `auth` | Managed by Supabase Auth — do not modify directly |
| `analytics` | Event logging, query logs, audit trail |

---

## 2. Schema Overview

The database serves four distinct functional areas:

1. **Content & RAG** — Structured site content (about, projects, research, insights) stored both as readable records and as embedded vector chunks for retrieval
2. **AI Readiness Check** — Survey session state, responses, and results
3. **Conversation Logs** — LLM query/response pairs tied to anonymous or authenticated sessions
4. **Analytics & Audit** — Query logging, model routing decisions, error tracking, and usage telemetry

Auth user records are managed entirely by Supabase Auth (`auth.users`). The `public` schema references `auth.users.id` via foreign key where user identity is relevant (e.g. readiness check submissions).

---

## 3. Core Tables

### 3.1 `content_pages`

Stores the canonical text content for each site page. This is the primary source of truth for RAG ingestion.

```sql
CREATE TABLE public.content_pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,          -- e.g. 'about', 'projects', 'research'
  title         TEXT NOT NULL,
  body_markdown TEXT NOT NULL,                 -- full page content in Markdown
  meta_description TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `slug` maps directly to site routes
- `body_markdown` is the source used for chunking and embedding (see section 4)
- Updates to `body_markdown` trigger re-ingestion of associated RAG chunks (handled at application layer)
- Managed via Supabase dashboard or admin API — not publicly writable

---

### 3.2 `projects`

```sql
CREATE TABLE public.projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,                 -- 2–3 sentence description
  body_markdown TEXT,                          -- full project detail (optional)
  category      TEXT,                          -- e.g. 'Industrial AI', 'Automation'
  status        TEXT DEFAULT 'active',         -- 'active' | 'completed' | 'archived'
  location      TEXT,                          -- e.g. 'Northern Ireland'
  featured      BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER DEFAULT 0,
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `featured = true` records are used by the homepage Featured Work section (max 3)
- `sort_order` controls display sequence
- `body_markdown` is included in RAG ingestion if populated

---

### 3.3 `research_items`

```sql
CREATE TABLE public.research_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  body_markdown TEXT,
  theme         TEXT,                          -- e.g. 'Grant Research', 'Industrial AI'
  status        TEXT DEFAULT 'active',         -- 'active' | 'completed'
  featured      BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER DEFAULT 0,
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.4 `insights`

Short-form posts. Field notes, technical observations, practical AI commentary.

```sql
CREATE TABLE public.insights (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,                 -- used on card and in RAG
  body_markdown TEXT NOT NULL,
  tags          TEXT[],                        -- e.g. ['LLM', 'SME', 'Industry']
  published_at  TIMESTAMPTZ,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. RAG & Vector Tables

### 4.1 `rag_chunks`

Stores processed text chunks ready for vector search. Each chunk maps back to a source record (page, project, research item, or insight).

```sql
CREATE TABLE public.rag_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type     TEXT NOT NULL,               -- 'page' | 'project' | 'research' | 'insight'
  source_id       UUID NOT NULL,               -- FK to source record
  source_slug     TEXT NOT NULL,               -- denormalised for query convenience
  chunk_index     INTEGER NOT NULL,            -- position within source document
  chunk_text      TEXT NOT NULL,               -- raw text of this chunk
  token_count     INTEGER,                     -- approximate token count
  embedding       VECTOR(3072),                -- text-embedding-3-large (3072 dimensions)
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source_type, source_id, chunk_index)
);
```

**Notes:**
- Dimension `3072` matches `text-embedding-3-large` output via Azure AI Foundry
- Configurable via environment variable `EMBEDDING_DIMENSIONS` (see section 10)
- On source content update, all chunks for that `source_id` are deleted and re-ingested
- `chunk_text` is stored alongside embedding so the retrieval pipeline can return context without a second query

### 4.2 Vector Similarity Search Function

```sql
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding VECTOR(3072),
  match_threshold FLOAT DEFAULT 0.75,
  match_count     INT    DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  source_type TEXT,
  source_slug TEXT,
  chunk_text  TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    source_type,
    source_slug,
    chunk_text,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.rag_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Notes:**
- `<=>` operator is cosine distance (provided by `pgvector`)
- `match_threshold` and `match_count` are configurable per call — defaults tuned for RAG quality vs latency
- Called by the RAG retrieval layer (see backend-rag.md)

---

## 5. AI Readiness Check Tables

### 5.1 `readiness_sessions`

Tracks each assessment attempt. Linked to an auth user if authenticated, otherwise anonymous.

```sql
CREATE TABLE public.readiness_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token   TEXT,                        -- anonymous session identifier (set if no user_id)
  status          TEXT NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'completed' | 'abandoned'
  result_category TEXT,                        -- populated on completion (see below)
  result_score    INTEGER,                     -- raw score (0–100 scale)
  contact_email   TEXT,                        -- optional capture on result screen
  contact_name    TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Result categories** (aligned with frontend spec section 9.4):

| Value | Label |
|-------|-------|
| `early_stage` | Early-stage |
| `foundational` | Foundational |
| `ready_to_pilot` | Ready to Pilot |
| `ready_to_scale` | Ready to Scale |

---

### 5.2 `readiness_questions`

Seeded, not user-generated. Defines the question bank for the assessment.

```sql
CREATE TABLE public.readiness_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_key  TEXT NOT NULL UNIQUE,          -- stable machine key, e.g. 'sector'
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice',  -- 'single_choice' | 'multi_choice'
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 5.3 `readiness_options`

Answer options per question.

```sql
CREATE TABLE public.readiness_options (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id   UUID NOT NULL REFERENCES public.readiness_questions(id) ON DELETE CASCADE,
  option_key    TEXT NOT NULL,                 -- stable machine key
  option_text   TEXT NOT NULL,
  score_value   INTEGER NOT NULL DEFAULT 0,    -- contributes to result_score
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (question_id, option_key)
);
```

---

### 5.4 `readiness_responses`

Stores each answer given within a session.

```sql
CREATE TABLE public.readiness_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.readiness_sessions(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES public.readiness_questions(id),
  option_id     UUID NOT NULL REFERENCES public.readiness_options(id),
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, question_id, option_id)
);
```

---

## 6. Auth & Session Tables

Auth user management is fully delegated to Supabase Auth (`auth.users`). No custom `users` table is maintained in `public` for V1.

### 6.1 `user_profiles`

Lightweight extension of `auth.users` for display name, preferences, and LinkedIn metadata. Created on first sign-in via trigger or API.

```sql
CREATE TABLE public.user_profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT,
  avatar_url         TEXT,
  preferred_theme    TEXT DEFAULT 'system',       -- 'dark' | 'light' | 'system'
  linkedin_headline  TEXT,                        -- best-effort from LinkedIn OAuth, NULL if absent
  linkedin_location  TEXT,                        -- best-effort from LinkedIn OAuth, NULL if absent
  auth_provider      TEXT,                        -- 'linkedin' | 'email'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Analytics & Audit Tables

### 7.1 `llm_query_log`

Logs every LLM query submitted through the site. Includes routing metadata for model cost analysis.

```sql
CREATE TABLE public.llm_query_log (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           TEXT,                        -- anonymous session identifier (from sessionStorage)
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query_text           TEXT NOT NULL,
  query_length         INTEGER,                     -- character count of query
  intent_category      TEXT,                        -- 'thomas_profile' | 'general_ai' | 'readiness_check' | 'out_of_scope' | 'blocked' | 'filtered'
  classifier_confidence FLOAT,                      -- confidence score from intent classifier
  model_used           TEXT,                        -- e.g. 'gpt-4.5', 'gpt-4.5-mini'
  rag_chunks_used      INTEGER DEFAULT 0,
  rag_sources          TEXT[],                      -- source files used in RAG context
  response_text        TEXT,
  input_tokens         INTEGER,
  output_tokens        INTEGER,
  response_time_ms     INTEGER,                     -- total response time in milliseconds
  streaming_used       BOOLEAN DEFAULT false,
  routed_to_readiness  BOOLEAN DEFAULT false,       -- did response suggest readiness check?
  source               TEXT,                        -- 'homepage_chip' | 'homepage_input' | 'llm_page'
  ip_hash              TEXT,                        -- hashed IP address (not raw IP, for privacy)
  user_agent           TEXT,
  pipeline_flags       TEXT[],                      -- any flags raised during pipeline processing
  error                TEXT,                        -- null if successful
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `response_text` is stored for quality review and RAG evaluation — not exposed publicly
- `intent_category` uses the classification enum defined in `backend-llm.md` §4.2
- `ip_hash` stores a one-way hash of the client IP — raw IP is never stored
- Retention policy: 90 days rolling (see section 12)
- Model routing decisions are logged here to support cost and quality analysis

---

### 7.2 `readiness_contact_leads`

Captures contact submissions from the readiness check result screen. Separate from the session table for clean CRM handling.

```sql
CREATE TABLE public.readiness_contact_leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID REFERENCES public.readiness_sessions(id) ON DELETE SET NULL,
  name            TEXT,
  email           TEXT NOT NULL,
  result_category TEXT,
  message         TEXT,
  contacted       BOOLEAN DEFAULT false,       -- admin flag
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 7.3 `contact_submissions`

General contact form submissions from the Contact page.

```sql
CREATE TABLE public.contact_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  enquiry_type    TEXT NOT NULL,
  subject         TEXT,
  message         TEXT NOT NULL,
  source          TEXT DEFAULT 'contact_page',   -- 'contact_page' | 'readiness_check' | 'llm'
  readiness_session_id UUID REFERENCES public.readiness_sessions(id) ON DELETE SET NULL,
  result_category TEXT,
  result_score    INTEGER,
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `read` is a manual admin flag — Thomas marks submissions as read in the Supabase dashboard
- `readiness_session_id`, `result_category`, and `result_score` are nullable — only populated for readiness check sourced submissions
- No RLS read access for clients — submissions are admin-only via service role key

---

## 8. Indexes & Performance

### 8.1 Vector Index

The primary performance-critical index. Uses HNSW for fast approximate nearest-neighbour search.

```sql
CREATE INDEX ON public.rag_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Notes:**
- HNSW is preferred over IVFFlat for smaller datasets (< 100k chunks) — faster query, simpler maintenance
- Rebuild the index after bulk re-ingestion using `REINDEX INDEX CONCURRENTLY`

### 8.2 Standard Indexes

```sql
-- Content lookup by slug
CREATE INDEX idx_content_pages_slug       ON public.content_pages (slug);
CREATE INDEX idx_projects_slug            ON public.projects (slug);
CREATE INDEX idx_projects_featured        ON public.projects (featured) WHERE featured = true;
CREATE INDEX idx_research_items_slug      ON public.research_items (slug);
CREATE INDEX idx_insights_slug            ON public.insights (slug);
CREATE INDEX idx_insights_published       ON public.insights (published_at DESC) WHERE is_published = true;

-- RAG chunk lookup by source
CREATE INDEX idx_rag_chunks_source        ON public.rag_chunks (source_type, source_id);

-- Readiness session lookup
CREATE INDEX idx_readiness_sessions_user  ON public.readiness_sessions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_readiness_responses_session ON public.readiness_responses (session_id);

-- Query log time-based access
CREATE INDEX idx_llm_query_log_created    ON public.llm_query_log (created_at DESC);

-- Contact leads
CREATE INDEX idx_contact_leads_created    ON public.readiness_contact_leads (created_at DESC);
CREATE INDEX idx_contact_submissions_read ON public.contact_submissions (read, created_at DESC);
```

---

## 9. Row Level Security (RLS)

RLS is enabled on all tables in the `public` schema. Policies follow a minimal-privilege model.

### 9.1 Principle

| Actor | Access |
|-------|--------|
| Anonymous (unauthenticated) | Read published content only |
| Authenticated user | Read published content + own readiness session + own profile |
| Service role (backend API) | Full access via `SUPABASE_SERVICE_ROLE_KEY` |
| Admin | Full access via service role key (no separate admin role in V1) |

The backend API uses the **service role key** for all database operations. RLS policies protect direct client-side SDK access only.

### 9.2 Policy Examples

```sql
-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_contact_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public read: published projects
CREATE POLICY "Public can read published projects"
  ON public.projects FOR SELECT
  USING (status != 'archived');

-- Public read: published insights
CREATE POLICY "Public can read published insights"
  ON public.insights FOR SELECT
  USING (is_published = true);

-- RAG chunks: not directly queryable by clients
CREATE POLICY "No direct client access to rag_chunks"
  ON public.rag_chunks FOR SELECT
  USING (false);

-- Readiness sessions: users can read their own
CREATE POLICY "Users can read own readiness sessions"
  ON public.readiness_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Query log: not accessible to clients
CREATE POLICY "No client access to llm_query_log"
  ON public.llm_query_log FOR SELECT
  USING (false);

-- Contact leads and submissions: no client access
CREATE POLICY "No client access to contact leads"
  ON public.readiness_contact_leads FOR SELECT
  USING (false);

CREATE POLICY "No client access to contact submissions"
  ON public.contact_submissions FOR SELECT
  USING (false);
```

---

## 10. Environment Variables

All database-related configuration is managed via environment variables. No credentials or connection strings are hardcoded.

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key (client-safe) | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Full-access service key (server only) | `eyJ...` |
| `DATABASE_URL` | Direct PostgreSQL connection string (migrations) | `postgresql://...` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions for embedding model | `3072` |
| `RAG_MATCH_THRESHOLD` | Cosine similarity threshold for chunk retrieval | `0.75` |
| `RAG_MATCH_COUNT` | Max chunks returned per query | `5` |

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the client or included in frontend bundles.

---

## 11. Migrations & Seeding Strategy

### 11.1 Migration Tool

Migrations are managed using the **Supabase CLI** (`supabase db diff`, `supabase migration new`, `supabase db push`).

All migrations are stored in `/supabase/migrations/` and version-controlled in the project repository.

### 11.2 Migration Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

Examples:
```
20260301120000_create_core_tables.sql
20260301120100_create_rag_chunks.sql
20260301120200_create_readiness_tables.sql
20260301120300_create_analytics_tables.sql
20260301120400_enable_rls_policies.sql
20260301120500_create_vector_index.sql
```

### 11.3 Seeding

Seed data is maintained in `/supabase/seed.sql` and covers:

- `readiness_questions` — all 7 assessment questions in V1
- `readiness_options` — all answer options with `score_value`
- `content_pages` — initial skeleton records for Home, About, Projects, Research, Insights (body content populated separately via CMS or admin API)

Production seeding is run once at initial deployment. Question/option updates after launch are applied via new migrations, not by re-running seed.

### 11.4 RAG Re-Ingestion

RAG chunk ingestion is not handled by migrations. It is triggered at the application layer:

- On initial deployment: full ingestion of all `content_pages`, `projects`, `research_items`, and `insights`
- On content update: incremental re-ingestion of the affected record
- Manual trigger: available via admin API endpoint (see backend-api.md)

---

## 12. Backup & Retention Policy

### 12.1 Supabase Managed Backups

| Tier | Frequency | Retention |
|------|-----------|-----------|
| Supabase Pro plan | Daily automated backup | 7 days |
| Point-in-time recovery | Available on Pro+ | Configurable |

For V1, daily automated backups on the Supabase Pro plan are sufficient.

### 12.2 Application-Level Retention

| Table | Retention Rule |
|-------|---------------|
| `llm_query_log` | 90 days rolling — raw records older than 90 days deleted by scheduled job. Anonymised aggregate metrics (query counts, response time averages, cost totals) are computed before deletion and retained indefinitely. |
| `readiness_sessions` (abandoned) | 30 days — incomplete sessions with no response records deleted |
| `contact_submissions` | Indefinite (low volume) |
| `readiness_contact_leads` | Indefinite (CRM record) |
| `rag_chunks` | Managed by ingestion pipeline — no time-based deletion |

A Supabase Edge Function or cron job (pg_cron) is used to enforce rolling deletion on `llm_query_log` and abandoned `readiness_sessions`.

```sql
-- Example pg_cron job for query log retention
SELECT cron.schedule(
  'cleanup-query-log',
  '0 3 * * *',   -- daily at 03:00
  $$DELETE FROM public.llm_query_log WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

---

*thomashadden.ai | Industrial Analytics & Automation | backend-database.md v1.0*
