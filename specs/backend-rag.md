# thomashadden.ai — Backend RAG Specification

**Version:** 1.0
**Date:** March 2026
**Status:** Confidential
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation
**Companion documents:** backend-api.md, backend-llm.md, backend-database.md, backend-infrastructure.md

---

## Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Content Sources](#3-content-sources)
4. [Chunking Strategy](#4-chunking-strategy)
5. [Embedding Model](#5-embedding-model)
6. [Vector Store](#6-vector-store)
7. [Ingestion Pipeline](#7-ingestion-pipeline)
8. [Retrieval Pipeline](#8-retrieval-pipeline)
9. [Context Assembly](#9-context-assembly)
10. [Re-ingestion on Deploy](#10-re-ingestion-on-deploy)
11. [Performance & Scaling](#11-performance--scaling)
12. [Error Handling](#12-error-handling)

---

## 1. Overview

RAG (Retrieval Augmented Generation) is the mechanism that allows the LLM to answer questions about Thomas Hadden accurately and specifically. Rather than relying on general training data, the LLM retrieves relevant content from Thomas's own site content before generating a response.

The LLM only knows what is in the approved markdown files. This is both a feature and a privacy control — Thomas has full authority over what the LLM can and cannot speak to by controlling what goes into those files.

### 1.1 Design Principles

- **Simple by design** — small content volume, no over-engineering
- **Fully automated** — re-ingestion triggers on every deploy, no manual steps
- **Configurable** — embedding model and retrieval parameters stored in environment config
- **Private by default** — LLM only knows what is explicitly provided
- **Fast** — retrieval target under 300ms

---

## 2. Architecture

```
Markdown files (repository)
        ↓
  Ingestion pipeline (on deploy)
        ↓
  Text chunker (section-aware)
        ↓
  Azure OpenAI Embeddings API
        ↓
  Supabase pgvector (vector store)
        ↓
  Retrieval pipeline (on query)
        ↓
  Query embedding → similarity search
        ↓
  Top-K chunks returned
        ↓
  Context assembled for LLM
```

### 2.1 Service Dependencies

| Service | Role |
|---------|------|
| Azure OpenAI | Embedding generation (ingestion and query time) |
| Supabase pgvector | Vector storage and similarity search |
| CI/CD pipeline | Triggers re-ingestion on every deploy |
| LLM service | Consumes retrieved context to generate answers |

---

## 3. Content Sources

### 3.1 Approved Markdown Files

The following markdown files are ingested into the RAG knowledge base. Only these files are processed — nothing else.

| File | Content | Priority |
|------|---------|----------|
| `about.md` | Thomas's background, role, Park Electrical, IA&A | High |
| `projects.md` | Current and selected past projects | High |
| `research.md` | Research themes, grant work, collaboration areas | High |
| `insights.md` | Short-form thinking, field notes, observations | Medium |
| `home.md` | Homepage content, positioning, overview | High |
| Additional files as added | Up to 15 files total in V1 | Medium |

### 3.2 File Location

All RAG source files live in a dedicated directory in the repository:

```
/content/rag/
  about.md
  projects.md
  research.md
  insights.md
  home.md
```

Only files in this directory are ingested. Files elsewhere in the repository are never processed.

### 3.3 Content Guidelines for RAG Files

These guidelines ensure the markdown files produce high quality, retrievable chunks:

- Use clear markdown headings (`##`, `###`) to delineate sections
- Each section should be self-contained and meaningful on its own
- Avoid excessive use of tables for prose content — paragraph form retrieves better
- Include context within each section — don't rely on the reader having read the previous section
- Keep sections between 200-600 words for optimal chunking
- Avoid very short sections (under 50 words) — these produce weak chunks

---

## 4. Chunking Strategy

### 4.1 Approach

Chunking is section-aware. The pipeline splits on markdown headings first, then applies token-based splitting within sections that exceed the maximum chunk size. This keeps related content together and avoids splitting mid-thought.

### 4.2 Chunk Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Target chunk size | 450 tokens | Large enough for meaningful context, small enough for precise retrieval |
| Maximum chunk size | 500 tokens | Hard ceiling |
| Chunk overlap | 50 tokens | Prevents context loss at chunk boundaries |
| Minimum chunk size | 50 tokens | Avoids weak near-empty chunks |
| Split priority | Markdown headings first, then token limit | Preserves semantic coherence |

### 4.3 Chunking Process

```
1. Read markdown file
2. Parse markdown structure — identify headings and sections
3. For each section:
   a. If section tokens ≤ 500 → single chunk
   b. If section tokens > 500 → split into overlapping sub-chunks of 450 tokens
4. Assign metadata to each chunk (see section 4.4)
5. Pass chunks to embedding pipeline
```

### 4.4 Chunk Metadata

Every chunk stores the following metadata alongside its vector embedding:

| Field | Type | Description |
|-------|------|-------------|
| `chunkId` | string | Unique identifier for this chunk |
| `sourceFile` | string | Source markdown filename (e.g. `projects.md`) |
| `sectionHeading` | string | Nearest parent heading in the markdown structure |
| `chunkIndex` | integer | Position of this chunk within its source file |
| `tokenCount` | integer | Token count of this chunk |
| `contentText` | string | Raw text content of the chunk |
| `pageSlug` | string | Frontend URL slug for this content (e.g. `/projects`) |
| `ingestedAt` | datetime | UTC timestamp of ingestion |
| `fileHash` | string | Hash of source file at time of ingestion |

### 4.5 Estimated Chunk Volume — V1

| File | Estimated Chunks |
|------|-----------------|
| `about.md` | 6–10 |
| `projects.md` | 10–20 |
| `research.md` | 8–12 |
| `insights.md` | 10–20 |
| `home.md` | 4–6 |
| Additional files | 5–10 each |
| **Total V1 estimate** | **75–120 chunks** |

This is a small dataset. Supabase pgvector handles this with ease.

---

## 5. Embedding Model

### 5.1 Model Configuration

| Property | Value |
|----------|-------|
| Provider | Azure OpenAI |
| Model | text-embedding-3-large |
| Deployment name | Configured via `AZURE_EMBEDDING_DEPLOYMENT` environment variable |
| Dimensions | 3072 |
| Endpoint | Configured via `AZURE_OPENAI_ENDPOINT` environment variable |

### 5.2 Model Configurability

The embedding model is never hardcoded. All model identifiers reference environment variables:

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large
```

To switch to a new embedding model:
1. Deploy the new model in Azure AI Foundry
2. Update `AZURE_EMBEDDING_DEPLOYMENT` environment variable
3. Trigger a full re-ingestion to rebuild all embeddings with the new model
4. No code changes required

> **Important:** When the embedding model is changed, a full re-ingestion is mandatory. Embeddings from different models are not compatible and cannot be mixed in the same vector store.

### 5.3 Embedding at Query Time

When a user query arrives, it is embedded using the same model and deployment as the ingestion embeddings. The query embedding is then used for similarity search against the stored chunk embeddings. The same environment variable is used for both — they are always in sync.

---

## 6. Vector Store

### 6.1 Supabase pgvector

Vectors are stored in Supabase using the pgvector extension. This keeps the stack simple — the same Supabase instance used for the main application database also hosts the vector store.

See `backend-database.md` for full database specification.

### 6.2 Schema

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- RAG chunks table
create table rag_chunks (
  id uuid primary key default gen_random_uuid(),
  chunk_id text not null unique,
  source_file text not null,
  section_heading text,
  chunk_index integer not null,
  token_count integer not null,
  content_text text not null,
  page_slug text,
  embedding vector(3072) not null,
  ingested_at timestamptz not null default now(),
  file_hash text not null
);

-- Index for fast similarity search
create index on rag_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 10);
```

### 6.3 Index Configuration

| Property | Value | Rationale |
|----------|-------|-----------|
| Index type | IVFFlat | Good performance for small-medium datasets |
| Distance metric | Cosine similarity | Standard for text embeddings |
| Lists | 10 | Appropriate for 75-120 chunk dataset |

IVFFlat with 10 lists is well suited to the V1 chunk volume. As content grows the lists parameter can be increased. At very large scale (10,000+ chunks) migration to HNSW index should be considered. See `backend-roadmap.md`.

---

## 7. Ingestion Pipeline

### 7.1 Trigger

Re-ingestion is triggered automatically by the CI/CD pipeline on every successful deploy to production. It is not triggered manually and requires no human intervention. See `backend-infrastructure.md` for CI/CD specification.

### 7.2 Full Re-ingestion Process

Every deploy performs a full re-ingest of all files. Given the small content volume this completes in seconds.

```
1. CI/CD pipeline deploy completes successfully
2. Ingestion job triggered automatically
3. Read all markdown files from /content/rag/
4. Delete all existing chunks from rag_chunks table
5. For each markdown file:
   a. Parse markdown structure
   b. Split into chunks per chunking strategy (section 4)
   c. Generate embedding for each chunk via Azure OpenAI
   d. Insert chunk + embedding + metadata into rag_chunks table
6. Log ingestion summary (files processed, chunks created, duration)
7. Ingestion complete — RAG knowledge base is current
```

### 7.3 Ingestion Job Logging

Each ingestion run is logged with:

| Field | Description |
|-------|-------------|
| `runId` | Unique identifier for this ingestion run |
| `triggeredAt` | UTC timestamp |
| `triggeredBy` | Always `ci_cd_deploy` in V1 |
| `filesProcessed` | Count of markdown files ingested |
| `chunksCreated` | Total chunks written to vector store |
| `embeddingModel` | Azure deployment name used |
| `durationMs` | Total ingestion duration |
| `status` | `success` or `failed` |
| `errorDetail` | Error message if failed |

### 7.4 Ingestion Failure Handling

If ingestion fails during a deploy:
- The previous chunks remain in the vector store (delete happens before insert — see note below)
- An alert is sent to Thomas via configured notification channel
- The site continues to function using the previous RAG knowledge base
- The failure is logged in full for investigation

> **Implementation note:** To protect against partial ingestion failures, use a transaction — delete old chunks and insert new chunks atomically. If any insert fails, the transaction rolls back and the previous chunks are preserved intact.

---

## 8. Retrieval Pipeline

### 8.1 Trigger

Retrieval is triggered by the LLM service when the intent classifier returns `thomas_profile`. It is an internal service call, not exposed directly to the frontend.

### 8.2 Retrieval Process

```
1. Query text received from LLM service
2. Generate query embedding via Azure OpenAI (same model as ingestion)
3. Run cosine similarity search against rag_chunks table
4. Return top-K chunks above confidence threshold
5. Return chunks with metadata to LLM service for context assembly
```

### 8.3 Retrieval Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Top-K | 5 | Maximum number of chunks returned |
| Confidence threshold | 0.75 | Minimum cosine similarity score — chunks below this are discarded |
| Max context tokens | 2000 | Total token budget for all returned chunks combined |

### 8.4 Parameter Configurability

Retrieval parameters are stored in environment configuration:

```
RAG_TOP_K=5
RAG_CONFIDENCE_THRESHOLD=0.75
RAG_MAX_CONTEXT_TOKENS=2000
```

These can be tuned without code changes. If retrieval quality needs improvement — either too many irrelevant results or too few results — adjust these values and redeploy.

### 8.5 No Results Handling

If no chunks meet the confidence threshold the retrieval pipeline returns an empty result. The LLM service handles this gracefully — see `backend-llm.md` section 7.3 for RAG fallback behaviour.

---

## 9. Context Assembly

### 9.1 Assembly Format

Retrieved chunks are assembled into a structured context block injected into the LLM system prompt:

```
CONTEXT FROM THOMAS'S SITE:
---
[Section: About Thomas — Background]
Thomas Hadden is an engineer and applied AI professional...
Source: about.md | Relevance: 0.94
---
[Section: Projects — Connected AI]
Thomas is currently working on Connected AI, a project focused on...
Source: projects.md | Relevance: 0.88
---
[Section: Research — Industrial AI Themes]
Thomas's research interests centre on practical AI deployment in...
Source: research.md | Relevance: 0.81
---
```

### 9.2 Chunk Ordering

Chunks are ordered by relevance score descending — most relevant context appears first. This ensures the most pertinent information is within the LLM's strongest attention window.

### 9.3 Token Budget Management

If the top-K chunks would exceed the `RAG_MAX_CONTEXT_TOKENS` budget, chunks are included in relevance order until the budget is reached. Lower-relevance chunks are dropped rather than truncated — a complete chunk is always better than a partial one.

---

## 10. Re-ingestion on Deploy

### 10.1 Workflow Summary

```
Thomas edits markdown file in /content/rag/
→ Commits and pushes to main branch on GitHub
→ CI/CD pipeline triggers
→ Site builds and deploys
→ Ingestion job runs automatically
→ All markdown files re-ingested
→ RAG knowledge base updated
→ LLM immediately reflects new content
```

### 10.2 Typical Re-ingestion Duration

| Stage | Estimated Duration |
|-------|-------------------|
| Read and parse all markdown files | < 1s |
| Generate embeddings for 75-120 chunks | 10-20s |
| Delete old chunks and insert new chunks | < 2s |
| **Total** | **~15-25 seconds** |

Re-ingestion runs as a background job after deploy. The site is live and fully functional during re-ingestion. The previous RAG knowledge base serves queries until re-ingestion completes.

### 10.3 Editing Guidelines for Thomas

To update what the LLM knows:

1. Edit the relevant markdown file in `/content/rag/`
2. Follow the content guidelines in section 3.3
3. Commit and push to main branch
4. Re-ingestion runs automatically — no further action needed
5. Changes are reflected in LLM responses within ~2 minutes of push

To remove something from the LLM's knowledge:
- Delete or edit the relevant content from the markdown file
- Push — it will be gone from the next re-ingestion

---

## 11. Performance & Scaling

### 11.1 V1 Performance Targets

| Metric | Target |
|--------|--------|
| Query embedding generation | < 100ms |
| Vector similarity search | < 100ms |
| Total retrieval pipeline | < 300ms |
| Re-ingestion duration | < 30s |

### 11.2 Scaling Considerations

The V1 architecture is deliberately simple and appropriate for the content volume. Future scaling considerations are documented in `backend-roadmap.md`. Key thresholds to monitor:

- At 500+ chunks: review IVFFlat lists parameter
- At 2000+ chunks: consider HNSW index
- At 10,000+ chunks: evaluate dedicated vector database

None of these thresholds are expected to be reached in V1 or V2.

---

## 12. Error Handling

| Error | Handling |
|-------|---------|
| Embedding API unavailable | Log error, return empty retrieval result, LLM uses RAG fallback response |
| Vector store unavailable | Log error, return empty retrieval result, LLM uses RAG fallback response |
| Ingestion job fails | Alert sent, previous chunks preserved via transaction rollback, logged in full |
| Chunk below confidence threshold | Silently excluded from results |
| All chunks below threshold | Return empty result, LLM handles gracefully |
| Token budget exceeded | Drop lowest-relevance chunks, never truncate mid-chunk |

RAG errors must never surface as technical errors to the user. The LLM always responds naturally regardless of retrieval outcome.

---

*thomashadden.ai | Industrial Analytics & Automation | backend-rag v1.0*
