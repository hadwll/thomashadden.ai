# thomashadden.ai — Backend Specification: AI Readiness Check

**Version:** 1.0  
**Date:** March 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** backend-api.md · backend-database.md · backend-auth.md

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Overview](#1-overview)
2. [User Flow](#2-user-flow)
3. [Question Set](#3-question-set)
4. [Scoring Model](#4-scoring-model)
5. [Result Categories](#5-result-categories)
6. [Session Management](#6-session-management)
7. [Abandonment & Return](#7-abandonment--return)
8. [Auth Gate](#8-auth-gate)
9. [Frontend UX Requirements](#9-frontend-ux-requirements)
10. [Backend Logic](#10-backend-logic)
11. [Data Storage](#11-data-storage)
12. [Error Handling](#12-error-handling)
13. [Environment Variables](#13-environment-variables)

---

## 1. Overview

The AI Readiness Check is the primary commercial conversion mechanism on thomashadden.ai. It is a short, practical business diagnostic that helps visitors understand where their organisation sits on the AI adoption curve and provides a concrete next step — a conversation with Thomas.

It is not a quiz. It is not a test of intelligence or technical knowledge. It is a structured reflection tool for business owners, operations managers, and decision-makers who are curious about AI but unsure where to start.

### 1.1 Design Principles

- **Low friction** — anyone can start it, no account required, no commitment
- **Respectful of time** — 5–7 questions, completable in under 2 minutes
- **Value before ask** — the visitor completes the full assessment before being asked to authenticate
- **Commercially useful** — every completion produces a qualified lead with professional identity metadata
- **Honest** — results are practical and grounded, not inflated to flatter or deflate to alarm

### 1.2 V1 Scope

- 7 questions, single choice per question
- Linear scoring model
- 4 result categories
- Auth gate at result screen (LinkedIn or Email Magic Link)
- Same-device session continuation for abandoned assessments
- No document upload, no open-text answers, no branching logic

---

## 2. User Flow

```
Visitor clicks "Start the 2-minute assessment" CTA
        ↓
Session token generated and stored in localStorage
        ↓
Question 1 displayed (one question per page, progress bar shown)
        ↓
Visitor selects answer → answer stored → next question displayed
        ↓
Questions 2–7 (same pattern)
        ↓
Final answer submitted
        ↓
"Your results are ready" screen displayed
Auth prompt shown (LinkedIn or Email Magic Link)
        ↓
Visitor authenticates
        ↓
session_token linked to auth.users.id
        ↓
Result screen rendered:
  - Category label and score
  - Interpretation paragraph
  - Suggested next step
  - Contextual CTA (get in touch)
```

### 2.1 Return Flow (Abandoned Session)

```
Visitor returns to /readiness on same device
        ↓
Frontend checks localStorage for existing session_token
        ↓
If found: GET /readiness-check/session/:token
        ↓
Backend returns session status and last answered question index
        ↓
"Continue where you left off?" prompt displayed
        ↓
Visitor resumes from next unanswered question
        ↓
Normal completion flow
```

---

## 3. Question Set

All questions are single choice. Questions are displayed one per page in the order defined here. Order is fixed — no randomisation in V1.

---

### Q1 — Business Sector

**Question:** What best describes your business sector?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `sector_engineering` | Engineering or Manufacturing | 3 |
| `sector_construction` | Construction or Electrical | 3 |
| `sector_professional` | Professional Services | 2 |
| `sector_retail` | Retail or Hospitality | 1 |
| `sector_other` | Other | 1 |

**Rationale:** Engineering, manufacturing, and construction/electrical are the sectors Thomas works in and where AI has the clearest near-term ROI. Higher scores reflect stronger alignment with his work and higher likelihood of a qualified lead.

---

### Q2 — Business Size

**Question:** How many people work in your business?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `size_solo` | Just me | 1 |
| `size_small` | 2–10 people | 2 |
| `size_medium` | 11–50 people | 3 |
| `size_large` | 51–200 people | 3 |
| `size_enterprise` | 200+ people | 2 |

**Rationale:** SMEs in the 11–200 range are the primary target audience — large enough to have real operational complexity, small enough that AI adoption decisions can be made quickly. Solo operators and very large enterprises score lower as they are less likely to be the right fit for Thomas's work.

---

### Q3 — Current AI Awareness

**Question:** How would you describe your business's current relationship with AI?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `ai_none` | We haven't looked at it yet | 1 |
| `ai_curious` | We've read about it but haven't tried anything | 2 |
| `ai_experimenting` | We've tried a few tools informally | 3 |
| `ai_using` | We're actively using AI in some areas | 4 |
| `ai_scaling` | AI is already core to how we operate | 4 |

**Rationale:** Awareness and early experimentation indicate a visitor who is ready to have a structured conversation. No awareness scores low not because the lead is bad, but because the next step (education) is different from the next step for someone already experimenting.

---

### Q4 — Operational Pain Points

**Question:** Where does your business most feel the pressure to do things better or faster?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `pain_reporting` | Reporting and data analysis | 4 |
| `pain_process` | Repetitive manual processes | 4 |
| `pain_quality` | Quality control or consistency | 3 |
| `pain_customers` | Customer communication or service | 2 |
| `pain_none` | We're not feeling significant pressure right now | 1 |

**Rationale:** Reporting, data analysis, and repetitive manual processes are the areas where AI delivers the fastest and most demonstrable ROI in engineering and industrial businesses — Thomas's primary domain. High scores here indicate strong alignment between the visitor's problem and Thomas's capability.

---

### Q5 — Data Maturity

**Question:** How well does your business currently capture and use data?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `data_none` | We don't really track data systematically | 1 |
| `data_basic` | We use spreadsheets or basic tools | 2 |
| `data_systems` | We have systems but don't analyse the data much | 3 |
| `data_analysing` | We regularly analyse data to make decisions | 4 |
| `data_advanced` | We have dashboards and structured reporting | 4 |

**Rationale:** Data maturity is one of the strongest predictors of AI readiness. Businesses with no data infrastructure need foundational work before AI is viable. Businesses with existing data systems are primed for AI augmentation.

---

### Q6 — Willingness to Experiment

**Question:** If a low-risk AI pilot were available for your business, how likely would you be to try it?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `experiment_unlikely` | Unlikely — we need to see proof first | 1 |
| `experiment_maybe` | Possibly — if the case was clear | 2 |
| `experiment_open` | Open to it with the right guidance | 3 |
| `experiment_keen` | Very keen — we've been looking for a starting point | 4 |
| `experiment_already` | We're already doing this | 4 |

**Rationale:** Willingness to experiment is a strong leading indicator of conversion. Visitors who are keen or already experimenting are the most likely to follow through to a conversation with Thomas.

---

### Q7 — Biggest Perceived Barrier

**Question:** What feels like the biggest barrier to adopting AI in your business right now?

| Option Key | Option Text | Score |
|------------|-------------|-------|
| `barrier_cost` | Cost and ROI uncertainty | 2 |
| `barrier_knowledge` | We don't know where to start | 3 |
| `barrier_time` | We don't have the time to figure it out | 3 |
| `barrier_trust` | We're not sure we can trust AI outputs | 2 |
| `barrier_none` | No major barrier — we're ready to move | 4 |

**Rationale:** "Don't know where to start" and "don't have time" are the most commercially relevant barriers — they are precisely what Thomas's consultancy addresses. These score higher because the visitor is describing a problem Thomas can solve directly.

---

## 4. Scoring Model

### 4.1 Score Calculation

Each answer carries a `score_value` as defined in the question set above. The total score is the sum of all seven answers.

| Minimum possible score | 7 (all lowest options) |
|------------------------|------------------------|
| Maximum possible score | 28 (all highest options) |

### 4.2 Score Normalisation

The raw score is normalised to a 0–100 scale for storage and display:

```
normalised_score = round(((raw_score - 7) / (28 - 7)) * 100)
```

This gives a percentage-style score that is more intuitive to present on the result screen.

### 4.3 Category Bands

| Normalised Score | Category | Label |
|-----------------|----------|-------|
| 0–24 | `early_stage` | Early-Stage |
| 25–49 | `foundational` | Foundational |
| 50–74 | `ready_to_pilot` | Ready to Pilot |
| 75–100 | `ready_to_scale` | Ready to Scale |

---

## 5. Result Categories

Each category has a label, an interpretation paragraph, a suggested next step, and a contextual CTA. This content is rendered on the result screen after authentication.

---

### 5.1 Early-Stage

**Label:** Early-Stage

**Score range:** 0–24

**Interpretation:**
> Your business is at the beginning of the AI journey — and that's completely normal. Most businesses are. The good news is that starting with a clear picture of where you are is exactly the right first move. AI doesn't have to be complicated or expensive to be useful, and there are practical starting points that don't require a major investment or a technical team.

**Suggested next step:**
> A short conversation about your business and the areas where you're feeling the most pressure is the best place to start. No jargon, no sales pitch — just a practical look at what might be possible.

**CTA:** "Start with a conversation — get in touch"

---

### 5.2 Foundational

**Label:** Foundational

**Score range:** 25–49

**Interpretation:**
> Your business has the building blocks in place. You're aware of AI, you have some data to work with, and you're open to exploring what's possible. The gap between where you are now and a meaningful first AI application is smaller than you might think. The key is identifying the right use case — one that fits your existing operations and delivers visible value quickly.

**Suggested next step:**
> It's worth mapping your current processes against a few targeted AI opportunities. That's a conversation that usually takes an hour and produces a clear picture of where to focus first.

**CTA:** "Explore what's possible — get in touch"

---

### 5.3 Ready to Pilot

**Label:** Ready to Pilot

**Score range:** 50–74

**Interpretation:**
> You're in a strong position. Your business has real data, identified pain points, and the appetite to move forward. A focused AI pilot — something scoped, measurable, and low-risk — is a realistic and sensible next step. Businesses at this stage typically see results within weeks rather than months when the right use case is chosen and the implementation is kept tight.

**Suggested next step:**
> The next step is scoping a pilot that fits your business specifically. That means identifying the right process, the right data, and the right success criteria before any work begins.

**CTA:** "Let's identify your first use case — get in touch"

---

### 5.4 Ready to Scale

**Label:** Ready to Scale

**Score range:** 75–100

**Interpretation:**
> Your business is ahead of the curve. You're already using data and, in some areas, AI — and you have the infrastructure and appetite to go further. The opportunity now is to move from isolated applications to a more joined-up approach: connecting your data sources, building on what's working, and identifying where AI can compound the value you're already creating.

**Suggested next step:**
> A conversation about your current AI landscape and where the highest-value opportunities sit next is a worthwhile hour. The focus at this stage is usually on integration, automation pipelines, and scaling what's already proving its worth.

**CTA:** "Let's talk about scaling — get in touch"

---

## 6. Session Management

### 6.1 Session Token

A UUID session token is generated client-side when the visitor starts the assessment:

```typescript
const sessionToken = crypto.randomUUID();
localStorage.setItem('readiness_session_token', sessionToken);
localStorage.setItem('readiness_session_started', new Date().toISOString());
```

This token is passed with every answer submission request and used to associate responses with the correct `readiness_sessions` record in the database.

### 6.2 Session Lifecycle

| Status | Description |
|--------|-------------|
| `in_progress` | Session created. Zero or more answers submitted. |
| `completed` | All questions answered, result calculated |
| `abandoned` | Session older than 30 days with status still `in_progress` |

### 6.3 Session Expiry

Sessions older than 24 hours that have not been completed are considered stale. If a visitor returns after 24 hours, the frontend detects the stale session and prompts them to restart rather than continue. The stale session record is retained in the database for analytics purposes but is not resumable.

```typescript
const started = localStorage.getItem('readiness_session_started');
const ageHours = (Date.now() - new Date(started).getTime()) / 1000 / 60 / 60;
if (ageHours > 24) {
  // clear token, prompt to restart
}
```

---

## 7. Abandonment & Return

### 7.1 Detection

On page load at `/readiness`, the frontend checks localStorage for an existing `readiness_session_token`. If found and not stale (< 24 hours old), it calls the backend to retrieve the session state:

```
GET /readiness-check/session/:token
```

### 7.2 Backend Response

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

### 7.3 Frontend Prompt

If an in-progress session is found, the frontend displays a prompt before the first question:

> **Continue where you left off?**
> You've answered 3 of 7 questions. Pick up from where you stopped, or start again from the beginning.
>
> `[Continue]` `[Start again]`

If the visitor chooses to start again, the existing session token is cleared from localStorage, a new token is generated, and a new session record is created. The old session record is retained in the database with status `abandoned`.

### 7.4 Same-Device Only

Session continuation is only possible on the same device and browser where the assessment was started. If the visitor switches device or clears their browser storage, the session token is lost and they start fresh. No cross-device resume is supported in V1.

---

## 8. Auth Gate

Full auth specification is defined in `backend-auth.md`. This section covers the readiness check specific behaviour.

### 8.1 Gate Trigger

The auth gate is triggered after the final question is submitted and the result has been calculated server-side. The result is held server-side — it is not returned to the frontend until authentication is complete.

### 8.2 Gate Screen

The gate screen displays:

- A confirmation that the assessment is complete
- A brief statement that sign-in is required to view the result
- LinkedIn and Email Magic Link sign-in options
- No preview of the result category or score

Suggested copy:

> **Your results are ready.**
> Sign in to view your AI Readiness score and recommended next steps. It takes seconds and your result will be saved to your profile.

### 8.3 Post-Auth Result Delivery

Result delivery is a two-step process initiated by the frontend after the auth callback redirect:

**Step 1 — Link session:** The frontend calls `POST /readiness-check/link-session` with the JWT and `sessionToken`. The backend:

1. Retrieves the `readiness_sessions` record matching the `session_token`
2. Verifies the session has `status = 'completed'`
3. Sets `user_id = auth.users.id` on the record (the `session_token` field is retained)
4. Returns `{ success: true }` to the frontend

If the session is already linked to the same `user_id`, the call is idempotent and returns success. If linked to a different `user_id`, the call returns `403 Forbidden`.

**Step 2 — Fetch result:** The frontend calls `GET /readiness-check/result/:sessionToken` with the JWT. The backend verifies the authenticated user's `user_id` matches the `user_id` on the session record, then returns the result category, normalised score, interpretation, and CTA.

The contact CTA is pre-filled with the authenticated user's name and email (read from the Supabase session on the frontend, not included in the result payload).

---

## 9. Frontend UX Requirements

This section defines the UX requirements the frontend must implement. These requirements are part of the backend spec because they directly affect session state, API call timing, and data integrity.

### 9.1 One Question Per Page

Each question is displayed on its own screen. The visitor cannot see upcoming questions or go back to change a previous answer in V1. Navigation is forward-only.

### 9.2 Progress Bar

A progress bar is displayed at the top of each question screen showing completion percentage:

```
Progress = (questions answered / total questions) * 100
```

The progress bar updates after each answer is submitted, not when selected. This means the bar reflects confirmed answers, not selections in progress.

### 9.3 Answer Submission Timing

Answers are submitted to the backend immediately when the visitor selects an option — before they tap "Next". This ensures partial progress is captured even if the visitor abandons mid-question. The "Next" button is enabled on selection and advances to the next question on tap.

### 9.4 Loading States

- After final answer submission: show a brief loading state ("Calculating your results…") while the backend scores the session
- After authentication: show a brief loading state ("Loading your results…") while the result is fetched
- Both loading states should be < 1 second in practice — the states exist to prevent blank screens on slow connections

### 9.5 Mobile UX

- Full-width option buttons with strong tap targets (minimum 48px height)
- No horizontal scrolling
- Progress bar fixed to top of viewport
- Single visible question at all times — no scrolling to see options
- "Next" button fixed to bottom of viewport on mobile

---

## 10. Backend Logic

### 10.1 Answer Submission Endpoint

Each individual answer is submitted as it is selected:

```
POST /readiness-check/answer
```

```json
{
  "sessionToken": "uuid",
  "questionId": "uuid",
  "optionId": "uuid"
}
```

The backend validates that:
- The session token exists and is `in_progress`
- The question belongs to the active question set
- The option belongs to the question

**Duplicate answer handling:**
- If the same `(sessionToken, questionId, optionId)` tuple has already been recorded, the call is **idempotent**: return `200` with the existing response. No new row is written.
- If the same `(sessionToken, questionId)` has already been answered with a **different** `optionId`, return `409 Conflict`. Answer overwriting is not permitted in V1.

### 10.2 Completion & Scoring

When the final answer is submitted, the backend:

1. Verifies all 7 questions have been answered
2. Retrieves all `readiness_responses` for the session
3. Sums `score_value` across all selected options
4. Normalises the score to 0–100
5. Assigns the result category based on the band thresholds
6. Updates `readiness_sessions` with `status = 'completed'`, `result_category`, `result_score`, and `completed_at`
7. Returns a completion acknowledgement to the frontend (not the result — that requires auth)

### 10.3 Result Retrieval

After session linking, the result is retrieved via:

```
GET /readiness-check/result/:sessionToken
Authorization: Bearer <jwt>
```

Authentication is required. The backend:

1. Looks up the `readiness_sessions` record where `session_token = :sessionToken`
2. Verifies the session has `status = 'completed'`
3. Verifies the authenticated user's `user_id` matches the `user_id` on the session record
4. If any check fails, returns `403 Forbidden` (user mismatch) or `404 Not Found` (session not found / not completed)
5. Returns the result payload (category, score, summary, next step, CTA)

---

## 11. Data Storage

All readiness check data is stored in the tables defined in `backend-database.md` sections 5.1–5.4:

- `readiness_sessions` — one record per assessment attempt
- `readiness_questions` — seeded question bank, not user-generated
- `readiness_options` — seeded answer options with score values
- `readiness_responses` — one record per answer given

Additionally, on result screen interaction, contact lead data may be captured in `readiness_contact_leads` (see `backend-database.md` §7.2).

### 11.1 Seed Data

The question and option records defined in section 3 of this spec are the seed data for `readiness_questions` and `readiness_options`. They are inserted once at initial deployment via `/supabase/seed.sql`.

To update questions or options after launch, a new migration is required — seed is not re-run in production.

---

## 12. Error Handling

| Scenario | Handling |
|----------|----------|
| Answer re-submitted with same option (idempotent) | Return 200, treat as success, no duplicate row written |
| Answer re-submitted with different option | Return 409 Conflict, frontend ignores and advances |
| Session token not found | Return 404, frontend prompts to restart |
| Session already completed | Return session status, frontend redirects to auth gate |
| Incomplete session submitted for scoring | Return 422, frontend shows error and prompts to complete remaining questions |
| Scoring produces out-of-range result | Clamp to nearest valid band, log anomaly |
| Auth succeeds but session not found | Show error, offer to restart — responses not recoverable |
| Result fetch by wrong user | Return 403 |

---

## 13. Environment Variables

| Variable | Description |
|----------|-------------|
| `READINESS_SESSION_EXPIRY_HOURS` | Hours before an in-progress session is considered stale. Default: `24` |
| `READINESS_QUESTION_VERSION` | Active question set version. Default: `1.0`. Increment when questions change. |

---

*thomashadden.ai | Industrial Analytics & Automation | backend-readiness-check.md v1.0*
