# SPR-01-01 — V1 runtime contract lock

## Status
Accepted

## Date
2026-04-01

## Context
`backend-api.md` documents base URLs under the `/v1/*` namespace, including a local contract-namespace reference at `http://localhost:3001/v1`.

System and integration specifications, including infrastructure deployment statements, define V1 as a single Next.js application where the browser calls same-app routes under `/api/*`.

This created a contradiction risk: `/v1/*` is required as the logical/public contract namespace, but V1 frontend runtime integration is through same-app Next.js route handlers.

## Decision
- V1 is a single Next.js application.
- Browser clients call same-app relative `/api/*` routes.
- `/v1/*` remains the logical/public contract namespace documented by `backend-api.md`.
- The same-app Next.js route handlers are the concrete V1 runtime surface that implements that `/v1/*` contract.
- No separate local API server is required for frontend integration in V1.
- `api.thomashadden.ai` remains future-facing for possible later extraction, not a present V1 frontend dependency.

## Consequences
- Frontend code should use relative `/api/*` calls in V1.
- Contract tests should validate Next.js route-handler conformance to the documented `/v1/*` contract.
- If API extraction occurs later, `/v1/*` can be preserved without forcing a frontend contract rewrite.

## Out of scope
- No code or route implementation changes in this ticket.
- No auth, database, or payload-shape changes in this ticket.
