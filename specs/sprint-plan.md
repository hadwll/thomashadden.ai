## 1. Project digestion

**System shape.**  
This project is a single Next.js 14+ App Router application with TypeScript and Tailwind, where the frontend, SSR pages, and backend API route handlers live together. The browser talks only to Next.js `/api/*` routes, while those routes fan out to Supabase Auth/Postgres, Azure AI Foundry, pgvector-based RAG, and Resend. The site has public pages (`/`, `/about`, `/projects`, `/research`, `/insights`, `/contact`), a public readiness flow at `/readiness`, and an auth-gated result page at `/readiness/result`.

**Main user-facing flows.**  
1. Public content browsing across Home, About, Projects, Research, Insights, and Contact, with SSR content fetched through the content API layer.  
2. Homepage LLM flow, using SSE streaming, anonymous per-tab session IDs, and bounded query scope.  
3. AI Readiness Check, which is a 7-question same-device resumable assessment, ending in an auth gate and then a result page.  
4. Contact conversion, including normal contact submission and readiness-result-driven prefill into Contact.

**Major subsystems.**  
The major subsystems are: public content delivery; LLM routing/classification/streaming; RAG ingestion and retrieval; readiness-check state, scoring, and auth handoff; contact submission and email dispatch; auth/session handling; and infra/deploy plumbing.

**Main technical dependencies.**  
The core dependencies are Next.js App Router, Tailwind, Supabase Auth + PostgreSQL + pgvector, Azure AI Foundry for GPT-4.5 / GPT-4.5-mini / embeddings, Resend for email, Cloudflare for DNS/CDN, Plausible for analytics, and GitHub Actions for deployment.

**Highest-risk areas.**  
- frontend/backend boundary ambiguity  
- LLM SSE passthrough and partial-frame parsing  
- readiness auth gate and localStorage-to-session handoff  
- contact flow edge cases and readiness prefill  
- deploy-linked RAG ingestion and content freshness

**Spec contradictions resolved in this alignment pass.**  
- V1 runtime is a single Next.js app: browser calls `/api/*`; `/v1/*` remains the logical contract namespace.  
- `GET /users/me` allows `jobTitle?` as best-effort projection from `linkedin_headline` and does not include `company` in V1.  
- `contact` request `type` is required at the API contract level (stored as `enquiry_type` in the database).  
- duplicate readiness session creation is idempotent: same `sessionToken` returns existing session with `200`, no duplicate row.  
- readiness question count wording is fixed at 7 questions for V1.

**Visual implementation implications from DesktopMock.png and MobileMock.png.**  
- Desktop requires a rounded premium shell, integrated nav bar, centered hero, large LLM showcase vessel, card-based content sections, split About panel, readiness strip, and integrated footer.  
- Mobile requires compact top header, Ask pill, theme toggle, fixed bottom nav, launcher-style LLM entry, separate answer card/carousel, collapsed section rows, readiness card, and collaborate row.  
- The mockups are binding planning references, not optional styling inspiration.

## 2. Delivery strategy

Begin as a **single Next.js application with in-app route handlers**.

This is the right delivery strategy because the written system context, frontend structure, and infrastructure spec all converge on one deployable Next.js application where the browser uses `/api/*`, the API is hosted in the same Azure App Service instance, and local development runs through the main app. Splitting frontend and backend now would create unnecessary rework, add a second runtime boundary, and increase coordination overhead during manual development.

Implementation rule for this rebuild:

- treat `/v1/*` as the logical contract namespace
- treat `/api/*` as the concrete V1 runtime surface
- keep the frontend calling relative `/api/*` routes
- keep validation, auth, and downstream service access inside route handlers
- use tests to ensure those handlers conform to the documented contracts

First release scope is not reduced to an MVP cut: public site + LLM + readiness flow + readiness auth gate/result + contact all remain in V1 release scope.

Manual development strategy:

1. lock runtime architecture and document contract tensions first
2. build the shell and homepage composition early
3. complete public content pages before fragile interactive flows
4. implement LLM and readiness as separate vertical slices
5. finish contact, hardening, and deploy flow only after core user journeys are structurally sound

## 3. Testing strategy

Use a three-layer strategy:

- **unit tests** for pure logic and transforms
- **component/integration tests** for React stateful flows and route handlers
- **Playwright** for a small number of high-value end-to-end user journeys

### Playwright recommendation

Yes, integrate Playwright from the start, but in two steps:

- **Sprint 1:** install/configure it, wire desktop/mobile projects, add one smoke check so the harness is live
- **Sprint 2:** begin real browser coverage once the shell and content routes exist

Policy for the main automated browser suite: mock Azure LLM and mock Supabase auth. Live-provider verification (Azure/Supabase) is optional manual testing outside the main automated suite.

### First flows Playwright should cover

- home route renders on desktop and mobile
- desktop nav and mobile bottom-nav route correctly
- mobile collapsed rows navigate correctly
- readiness CTA is present and routes correctly
- contact form client validation and success path with mocked backend

### Next flows Playwright should cover

- mocked LLM streaming UI flow
- readiness session start/resume/restart
- auth-gate screen transitions
- result-to-contact prefill path

### Flows not to E2E first

Do not start with:

- live Azure LLM calls
- live LinkedIn OAuth
- real magic-link email delivery
- real Resend outbound email
- live RAG deploy ingestion

These should initially be covered by mocked integration tests and contract tests.

### Recommended ownership by layer

**Unit**
- readiness scoring/normalisation helpers
- session token utilities
- query/session ID helpers
- SSE parser helpers
- contact payload mapping
- theme/state helpers

**Component/integration**
- `PageShell`
- `NavBar`
- `MobileHeader`
- `MobileNav`
- `ThemeToggle`
- `LLMInterface`
- `ReadinessCheck`
- `AuthGate`
- `ResultScreen`
- `ContactForm`
- route handlers with mocked Supabase/Azure/Resend

**Contract tests**
- response envelope shapes
- error code mapping
- `/api/content/*` behaviour
- SSE event framing
- readiness state transitions
- honeypot handling
- route-handler conformance to documented payload shapes

## 4. Sprint manifest

### SPR-01 — Contract lock and shell foundation

**Goal**  
Establish the runtime shape, testing harness, theme system, and visual shell so manual development has a stable base.

**Scope**  
Architecture decision for V1 same-app deployment; spec contradiction log; Next.js/Tailwind/theme bootstrap; App Router page skeletons; `PageShell`, desktop nav, mobile header, mobile nav, footer shell; route placeholders for all main pages; Vitest/RTL + Playwright setup.

**Dependencies**  
None.

**Deliverables**  
Architecture note for `/api/*` in V1; route scaffold; shell components; theme toggle plumbing; desktop/mobile navigation chrome; test runners configured.

**Acceptance criteria**  
- all target routes render without broken navigation
- desktop and mobile shells visibly reflect the mockups
- dark/light themes are both functional
- Playwright and unit tests run locally

**Test expectations**  
Unit/component tests for shell/nav/theme; one Playwright smoke spec for route boot and desktop/mobile render.

**Risks / notes**  
Must lock `/api/*` vs `/v1/*` before deeper work.

### SPR-02 — Public content slice and homepage visual parity

**Goal**  
Get to a credible, content-backed public site that already looks like thomashadden.ai on desktop and mobile.

**Scope**  
Public content models/helpers; `GET /api/content/*` path; SSR fetching for home/about/projects/research/insights; Hero; Featured Work; About teaser; Research teaser; Insights teaser or row entry; desktop readiness strip + integrated footer; mobile collapsed-row home pattern + collaborate row; inner list/detail pages.

**Dependencies**  
SPR-01.

**Deliverables**  
Home page with near-final structural composition; About/Projects/Research/Insights/Contact routes rendering real content structures; mobile and desktop layout parity for the public site.

**Acceptance criteria**  
- desktop homepage matches the shell/hero/LLM-vessel-placeholder/mid-page/lower-page composition implied by the desktop mockup
- mobile home matches the mobile mockup structure with collapsed rows and bottom nav
- public content pages route correctly and SSR fetches work

**Test expectations**  
Component tests for content cards and responsive row behaviour; Playwright for home, nav, collapsed rows, and one inner-page route per section.

**Risks / notes**  
Keep the LLM visual shell present here even if live query is not yet enabled.

### SPR-03 — LLM centerpiece and RAG core

**Goal**  
Ship the site’s differentiator: a working homepage AI experience with correct UI behaviour and bounded backend plumbing.

**Scope**  
`LLMInterface` desktop/mobile variants; anonymous `llm_session_id`; `/api/llm/query` route; SSE passthrough; SSE client buffering/rendering; classifier/routing integration; initial general-AI and Thomas-profile/RAG path; manual/dev RAG ingest route and seed process; source/suggested-action rendering.

**Dependencies**  
SPR-01, SPR-02.

**Deliverables**  
Homepage LLM actually works; desktop vessel and mobile launcher/carousel are live; SSE streaming behaves correctly; dev RAG ingest can be run manually.

**Acceptance criteria**  
- homepage prompt submission works from chips and input
- streaming answer appears progressively
- error event handling is user-safe
- Thomas-profile queries can use curated content after ingestion
- UI matches desktop/mobile interaction framing from the mockups

**Test expectations**  
Unit tests for SSE parsing and query helpers; route-handler tests with mocked Azure/Supabase; Playwright with mocked streaming backend.

**Risks / notes**  
Do not mix this sprint with auth or contact.

### SPR-04 — Readiness check and auth gate

**Goal**  
Implement the primary conversion mechanic end-to-end, including auth handoff and result rendering.

**Scope**  
Question fetch; session creation; resume/restart logic; answer submission; progress UI; completion transition; auth gate; Supabase LinkedIn/email-magic-link frontend integration; `/api/readiness-check/*` handlers; link-session + result retrieval; result screen; result-to-contact prefill bridge.

**Dependencies**  
SPR-01, SPR-02.

**Deliverables**  
Working readiness flow from start to completed result, with same-device resume, auth gate, and result CTA into Contact.

**Acceptance criteria**  
- a user can start the assessment, answer 7 questions, reach the auth gate, authenticate, retrieve the correct result, and land on Contact with the right prefill
- restart/resume/stale-session states work

**Test expectations**  
Unit tests for scoring/session logic; integration tests for route handlers and auth-gate state; Playwright for mocked readiness journey including resume and result-to-contact transition.

**Risks / notes**  
Depends on clarifying duplicate-token behaviour and enforcing the 7-question contract.

### SPR-05 — Contact, hardening, and release pass

**Goal**  
Close the loop on conversion, stabilise infra-facing pieces, and make the build ready for launch.

**Scope**  
`ContactForm`; `/api/contact/submit`; DOM `website` honeypot → API `honeypot` mapping; readiness-result contact source handling; notification + auto-reply wiring; `/api/health`; deploy/env hardening; GitHub Actions polish including post-deploy RAG ingest; final accessibility/perf/visual cleanup.

**Dependencies**  
SPR-01 to SPR-04.

**Deliverables**  
Working contact conversion flow; reliable launch checklist; deployable environment template; final browser regression set for core flows.

**Acceptance criteria**  
- contact submissions validate, store, and report success correctly
- readiness-originated submissions carry source metadata
- deploy pipeline can build/migrate/deploy/health-check
- the site passes a focused manual release checklist on desktop and mobile

**Test expectations**  
Route-handler tests for contact submission and error mapping; Playwright for contact success/failure and homepage-to-contact CTA paths; final smoke over home/content/readiness/contact.

**Risks / notes**  
Do not let peripheral admin/compliance work block the core build unless it is needed for launch.

## 5. Unit / work package breakdown per sprint

### SPR-01

#### WP-01.1 — Architecture lock memo
- **Purpose:** resolve `/v1/*` contract vs `/api/*` runtime ambiguity
- **Main files or folders likely involved:** `docs/adr/`, spec patch notes, `app/api/`
- **Prerequisite work:** none
- **Recommended test type:** contract/doc review
- **Type:** shared
- **Visual anchor:** neither

#### WP-01.2 — App/router/bootstrap skeleton
- **Purpose:** create route inventory and base layout structure
- **Main files or folders likely involved:** `app/`, `app/layout.tsx`, route folders
- **Prerequisite work:** WP-01.1
- **Recommended test type:** Playwright smoke + route render tests
- **Type:** frontend
- **Visual anchor:** both

#### WP-01.3 — Theme tokens, fonts, globals
- **Purpose:** implement dark/light foundations and shell tokens
- **Main files or folders likely involved:** `app/globals.css`, `tailwind.config.*`, theme provider files
- **Prerequisite work:** WP-01.2
- **Recommended test type:** component/unit
- **Type:** frontend
- **Visual anchor:** both

#### WP-01.4 — PageShell and navigation chrome
- **Purpose:** build `PageShell`, `NavBar`, `MobileHeader`, `MobileNav`, base `Footer`
- **Main files or folders likely involved:** `components/layout/*`
- **Prerequisite work:** WP-01.2, WP-01.3
- **Recommended test type:** component + Playwright smoke
- **Type:** frontend
- **Visual anchor:** both

#### WP-01.5 — Test harness setup
- **Purpose:** install/configure Vitest, RTL, Playwright, fixtures, viewport presets
- **Main files or folders likely involved:** test config files, `tests/`, `playwright/` or `e2e/`
- **Prerequisite work:** none
- **Recommended test type:** infra smoke
- **Type:** infra
- **Visual anchor:** neither

### SPR-02

#### WP-02.1 — Content types and API adapter layer
- **Purpose:** define typed content contracts and client/server fetch helpers
- **Main files or folders likely involved:** `lib/types.ts`, `lib/api.ts`, content mapper utilities
- **Prerequisite work:** SPR-01
- **Recommended test type:** unit/contract
- **Type:** shared
- **Visual anchor:** neither

#### WP-02.2 — Public content route handlers
- **Purpose:** implement `/api/content/*` for page/list/detail fetches
- **Main files or folders likely involved:** `app/api/content/[page]/route.ts`, related helpers
- **Prerequisite work:** WP-02.1
- **Recommended test type:** route-handler contract tests
- **Type:** backend
- **Visual anchor:** neither

#### WP-02.3 — Homepage hero and LLM vessel shell
- **Purpose:** implement hero and the non-live LLM showcase surface
- **Main files or folders likely involved:** `components/sections/HeroSection.tsx`, `components/sections/LLMInterface.tsx`
- **Prerequisite work:** WP-01.4, WP-02.1
- **Recommended test type:** component + Playwright
- **Type:** frontend
- **Visual anchor:** both

#### WP-02.4 — Desktop mid/lower homepage sections
- **Purpose:** Featured Work, About teaser, Research teaser, readiness strip, integrated footer sequencing
- **Main files or folders likely involved:** `components/sections/*`, `components/layout/Footer.tsx`
- **Prerequisite work:** WP-02.2, WP-02.3
- **Recommended test type:** component + Playwright visual route tests
- **Type:** frontend
- **Visual anchor:** DesktopMock.png

#### WP-02.5 — Mobile collapsed-home pattern
- **Purpose:** implement collapsed rows, readiness card, collaborate row, bottom-nav termination
- **Main files or folders likely involved:** mobile variants within section/layout components
- **Prerequisite work:** WP-02.3
- **Recommended test type:** component + Playwright mobile tests
- **Type:** frontend
- **Visual anchor:** MobileMock.png

#### WP-02.6 — Inner public content pages
- **Purpose:** About, Projects, Research, Insights list/detail rendering
- **Main files or folders likely involved:** `app/about`, `app/projects`, `app/research`, `app/insights`
- **Prerequisite work:** WP-02.2
- **Recommended test type:** route/component tests
- **Type:** frontend
- **Visual anchor:** neither

### SPR-03

#### WP-03.1 — LLM API contract and route proxy
- **Purpose:** implement `/api/llm/query` with validated request/response envelope
- **Main files or folders likely involved:** `app/api/llm/query/route.ts`, LLM service helpers
- **Prerequisite work:** WP-02.1
- **Recommended test type:** contract/integration
- **Type:** backend
- **Visual anchor:** neither

#### WP-03.2 — SSE passthrough and client parser
- **Purpose:** make streaming robust at route and browser levels
- **Main files or folders likely involved:** LLM route, `LLMInterface.tsx`, streaming helpers
- **Prerequisite work:** WP-03.1
- **Recommended test type:** unit + integration + mocked Playwright
- **Type:** shared
- **Visual anchor:** both

#### WP-03.3 — LLM routing/classification implementation
- **Purpose:** wire query validation, classification, general-AI path, suggested actions, logging
- **Main files or folders likely involved:** server LLM modules, analytics helper, env config
- **Prerequisite work:** WP-03.1
- **Recommended test type:** integration/contract
- **Type:** backend
- **Visual anchor:** neither

#### WP-03.4 — RAG ingest and retrieval core
- **Purpose:** implement vector ingest/retrieve path against Supabase pgvector
- **Main files or folders likely involved:** RAG service modules, `app/api/rag/ingest/route.ts`, content ingest scripts
- **Prerequisite work:** DB/env setup
- **Recommended test type:** integration
- **Type:** backend
- **Visual anchor:** neither

#### WP-03.5 — Homepage LLM UI finalisation
- **Purpose:** finish desktop vessel, mobile launcher, answer preview card/carousel, chips, errors, sources
- **Main files or folders likely involved:** `components/sections/LLMInterface.tsx`, `components/ui/PromptChip.tsx`
- **Prerequisite work:** WP-03.2, WP-03.3
- **Recommended test type:** component + Playwright
- **Type:** frontend
- **Visual anchor:** both

### SPR-04

#### WP-04.1 — Readiness data and endpoints
- **Purpose:** implement questions/session/answer/result route handlers and shared models
- **Main files or folders likely involved:** `app/api/readiness-check/**`, readiness server helpers
- **Prerequisite work:** DB seed/schema availability
- **Recommended test type:** route-handler contract tests
- **Type:** backend
- **Visual anchor:** neither

#### WP-04.2 — Readiness client flow
- **Purpose:** question rendering, progress, option selection, next-step logic, resume/restart
- **Main files or folders likely involved:** `components/readiness/ReadinessCheck.tsx`, `QuestionScreen.tsx`, `ProgressBar.tsx`
- **Prerequisite work:** WP-04.1
- **Recommended test type:** component/integration
- **Type:** frontend
- **Visual anchor:** MobileMock.png primarily, both secondarily

#### WP-04.3 — Auth gate UI and Supabase auth bridge
- **Purpose:** implement LinkedIn/email auth prompt and callback plumbing
- **Main files or folders likely involved:** `components/readiness/AuthGate.tsx`, `app/auth/callback/route.ts`, `lib/supabase/*`
- **Prerequisite work:** WP-04.1
- **Recommended test type:** integration + mocked browser tests
- **Type:** shared
- **Visual anchor:** neither

#### WP-04.4 — Result screen and contact bridge
- **Purpose:** implement link-session, result fetch, CTA handoff into contact prefill
- **Main files or folders likely involved:** `components/readiness/ResultScreen.tsx`, contact prefill helper, result page route
- **Prerequisite work:** WP-04.2, WP-04.3
- **Recommended test type:** component/integration + Playwright mocked flow
- **Type:** shared
- **Visual anchor:** neither

#### WP-04.5 — Contract-ambiguity patch set
- **Purpose:** settle duplicate session behaviour, question-count wording, staleness/config note
- **Main files or folders likely involved:** spec notes, implementation docs, config
- **Prerequisite work:** findings from WP-04.1 to WP-04.4
- **Recommended test type:** contract review
- **Type:** shared
- **Visual anchor:** neither

### SPR-05

#### WP-05.1 — Contact form UI and request mapping
- **Purpose:** implement contact page form, validation, DOM `website` honeypot, API `honeypot` mapping, readiness prefill
- **Main files or folders likely involved:** `components/contact/ContactForm.tsx`, `app/contact/page.tsx`, API helpers
- **Prerequisite work:** SPR-02 and SPR-04
- **Recommended test type:** component + integration + Playwright
- **Type:** shared
- **Visual anchor:** neither

#### WP-05.2 — Contact submission backend
- **Purpose:** implement storage, notification, auto-reply, source metadata
- **Main files or folders likely involved:** `app/api/contact/submit/route.ts`, email/service modules
- **Prerequisite work:** WP-05.1
- **Recommended test type:** route-handler/integration
- **Type:** backend
- **Visual anchor:** neither

#### WP-05.3 — Health and deployability endpoints
- **Purpose:** finish `/api/health`, local ingest commands, env completeness, launch diagnostics
- **Main files or folders likely involved:** `app/api/health/route.ts`, scripts/docs/env example
- **Prerequisite work:** prior backend slices
- **Recommended test type:** curl/integration
- **Type:** infra
- **Visual anchor:** neither

#### WP-05.4 — CI/CD and post-deploy ingestion
- **Purpose:** align deploy workflow with build/migrate/deploy/ingest/health sequence
- **Main files or folders likely involved:** `.github/workflows/*`, deploy docs, ingest route
- **Prerequisite work:** WP-03.4, WP-05.3
- **Recommended test type:** pipeline dry run + focused integration
- **Type:** infra
- **Visual anchor:** neither

#### WP-05.5 — Final regression and polish pass
- **Purpose:** accessibility cleanup, visual parity pass, focused browser regression set
- **Main files or folders likely involved:** cross-cutting UI files and test specs
- **Prerequisite work:** all previous work
- **Recommended test type:** Playwright + manual QA checklist
- **Type:** shared
- **Visual anchor:** both

## 6. Critical decisions to make before coding (now patched)

1. V1 architecture is locked: single Next.js app, browser uses `/api/*`, `/v1/*` remains the logical contract namespace.  
2. Duplicate readiness-session behaviour is locked: repeated `POST /readiness-check/session` with the same token is idempotent `200` returning the existing session shape.  
3. Contact enquiry type is locked as required: no backend default.  
4. `/users/me` shape is locked for V1: `jobTitle?` may be best-effort from `linkedin_headline`; `company` is excluded without a real source field.  
5. Browser E2E policy is locked: automated Playwright mocks Azure LLM and Supabase auth; live-provider checks are manual/optional outside the main suite.  
6. Scope is locked for first release: public site + LLM + readiness + auth gate/result + contact (no MVP cut).

## 7. Suggested execution order for the first week

### Day 1
- lock architecture in writing
- resolve `/api/*` vs `/v1/*`
- confirm no split frontend/backend build for V1
- scaffold app routes, base layout, and test runners

### Day 2
- implement theme tokens, fonts, global styles
- build `PageShell`, desktop nav, mobile header, mobile bottom nav, placeholder footer
- get desktop/mobile chrome aligned with the mockups

### Day 3
- build typed content layer
- implement `/api/content/*` handlers
- seed or mock enough content to render Home, About, Projects, Research, and Insights
- implement hero and homepage structure

### Day 4
- finish homepage public composition
- implement desktop readiness strip + integrated footer
- implement mobile collapsed rows and collaborate row
- wire inner public content pages

### Day 5
- add Playwright smoke coverage for home/nav/mobile row flows
- run a visual parity pass against both mockups
- log remaining contract blockers before starting the LLM slice in week two
