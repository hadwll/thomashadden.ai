## 9.6 Readiness CTA and Modal Assessment Journey (V1 Clarification Patch)

This section clarifies and extends the AI Readiness Check contract. Where this section conflicts with earlier generic readiness-flow wording, this section takes precedence for presentation, interaction, and conversion behaviour.

### 9.6.1 Purpose

The AI Readiness Check is a route-backed, premium assessment experience designed to convert business curiosity into a credible next step. It must feel integrated with the thomashadden.ai shell and brand language, not like a generic embedded form or survey tool.

The readiness journey exists to do four things well:

1. help a business visitor reflect on whether AI is practically relevant to their organisation
2. produce a useful, believable readiness outcome without over-claiming certainty
3. preserve a polished, low-friction public experience before authentication
4. hand the visitor cleanly into Contact after the result

### 9.6.2 Scope

This section applies to:

- homepage and public-site readiness CTAs
- the `/readiness` route and all in-assessment states
- the in-modal auth gate shown after assessment completion
- the dedicated `/readiness/result` route
- the result-to-contact bridge
- desktop and mobile behaviour in dark and light themes

### 9.6.3 UX Goals

The readiness journey must be:

- concise, calm, and business-facing
- visually integrated with the existing premium shell aesthetic
- one-question-at-a-time
- selection-card based, not long-form input driven
- credible in tone and framing
- clearly progressive, with obvious next/back controls
- resumable on the same device
- commercially useful without feeling manipulative

The experience must not read as a quiz, a lead-gen gimmick, or a consultancy-grade diagnostic pretending to know too much from a short survey.

### 9.6.4 Public CTA Section

Readiness remains a public CTA surfaced from the site shell, especially on the homepage readiness strip.

**CTA contract**
- Primary CTA label: `Start the AI readiness check`
- Supporting microcopy: `A short assessment to see where AI could fit in your business`
- Estimated duration label: `~2 minutes`
- CTA routes to `/readiness`

**Entry behaviour**
- Clicking the CTA must navigate to `/readiness`
- On desktop, the assessment appears as a centered modal-style panel over the site shell
- On mobile, the assessment appears as a route-backed full-height modal layer
- The readiness route is therefore both a deep-linkable page and the owner of the modal assessment experience

### 9.6.5 Route and State Model

The readiness flow uses a route-backed modal model rather than a visually separate blank page.

**Route ownership**
- `/readiness` owns the assessment layer
- `/readiness/result` owns the post-auth result page

**Primary states on `/readiness`**
- `question`
- `resume_prompt`
- `awaiting_auth`
- `loading_transition`
- `error`

**Primary state on `/readiness/result`**
- `result`
- `result_error`

**Direct route entry**
Opening `/readiness` directly must still preserve the modal experience. The page must render the site shell background treatment and immediately mount the readiness layer in its open state. Direct entry must not degrade into a plain full-page form layout.

**State authority**
- Server is authoritative for question progress, saved answers, completion, and result calculation
- Local storage is authoritative only for client resume hints and same-device continuity

**Locally stored values**
- `readiness_session_token`
- `readiness_session_started`
- `readiness_resume_state` (`in_progress` or `awaiting_auth`)
- optional return-route hint for dismiss behaviour

**Server-stored values**
- question responses
- current progress state
- completion state
- derived readiness band
- derived dimension scores
- derived strengths / blockers
- result timestamp and session linkage

**Pre-auth privacy rule**
No result category, score, or interpretation is stored client-side before authentication. Before auth, local storage may only indicate that a completed result is waiting.

### 9.6.6 Desktop Presentation

Desktop is the primary modal expression.

**Assessment shell**
- centered panel over the existing site shell
- width target: premium medium dialog, large enough for comfortable reading and card answers
- radius and material language must match the site’s vessel family rather than a generic OS dialog
- surface should feel custom to the site: refined border, atmospheric edge light, controlled translucency, and composed internal spacing

**Background treatment**
- the site remains visible behind the assessment
- a theme-sensitive scrim sits between the page and the assessment panel
- background content is visually present but non-interactive
- background scroll is locked while the assessment is open

**Answer layout**
- question body in a narrow readable measure
- four answer cards shown in a two-column grid where space allows
- clear back control on the left and next control on the right
- explicit close control in the panel header

**Dismissal rule**
Outside-click on the scrim does not dismiss the assessment. Dismissal must be explicit to avoid accidental loss of momentum.

### 9.6.7 Mobile Presentation

Mobile uses a **full-height modal layer**, not a small centered popup and not a short bottom sheet.

**Decision**
A full-height modal layer is the preferred mobile pattern because it:
- preserves focus and legibility for one-question-at-a-time flow
- gives sufficient room for large selection cards, progress, safe-area spacing, and fixed navigation controls
- avoids cramped sheet behaviour during keyboard entry in the auth state
- feels deliberate and premium rather than temporary or undersized

**Mobile shell**
- occupies the full viewport height, respecting safe areas
- has a dedicated header area for progress and dismissal
- uses a single-column answer-card stack
- keeps primary navigation controls anchored within easy thumb reach

**Mobile behaviour**
- the underlying page is visually suppressed beneath the layer
- the experience still reads as part of the same site rather than a separate app screen
- no tiny popup treatment is permitted

### 9.6.8 Theme Behaviour

The readiness layer must feel like part of the premium site shell in both themes.

**Dark theme**
- dimmed translucent scrim
- subtle backdrop blur
- preserve the site’s luminous, atmospheric depth behind the panel
- avoid flat black overlays that kill the premium feel
- readiness shell should use deep navy / charcoal surface language with restrained cyan edge life

**Light theme**
- soft cool translucent veil rather than muddy grey dimming
- preserve cleanliness, legibility, and depth behind the panel
- readiness shell should use milky white / pale slate surface treatment with cool cyan-accent borders or glow
- avoid heavy grey overlays that make the interface feel dull or dirty

**Shared rule**
The readiness shell must never look like a browser default dialog. It must inherit the site’s geometry, surface logic, and restraint.

### 9.6.9 Screen Sequence

#### A. Public CTA to assessment
User clicks readiness CTA from the public site and is routed to `/readiness`, where the readiness layer opens immediately.

#### B. Resume gate where applicable
If a same-device session exists:
- incomplete session: show `resume_prompt`
- completed-but-unauthenticated session: reopen directly into `awaiting_auth`
- completed and already authenticated for the linked session: route to `/readiness/result`

#### C. Question sequence
The core assessment is one question at a time.

#### D. Completion transition
After the final answer is saved, show a brief transition state:
- `Preparing your result`
- no result preview shown here

#### E. In-modal auth gate
After completion, the auth gate appears in the same readiness shell on `/readiness`

#### F. Post-auth route change
After successful auth, route to `/readiness/result`

#### G. Result-to-contact handoff
Primary CTA on the result page routes to Contact with readiness context preserved

### 9.6.10 Question Count and Question Model

**Recommended V1 question count: 6**

This patch reduces the recommended modal assessment from the earlier 7-question planning assumption to **6 questions**.

**Justification**
Six questions is the smallest count that still produces a credible business-facing result across:
- value clarity
- process understanding
- ambition
- data readiness
- delivery environment
- people / governance / supportability

A seventh question adds friction faster than it improves outcome quality in the modal format. Lead qualification should not be allowed to displace assessment usefulness.

**Question design rules**
- one question visible at a time
- single-select only
- default to four answer cards per question
- each card contains a short label and a one-line explanation
- no free text in V1
- no branching in V1
- language must be business-readable and non-academic

**Question set**

#### Q1 — Value clarity
**Question:** `How clearly can you identify where AI should create value first?`

**Answer cards**
- `Specific and measurable` — We can point to one process or outcome and explain why it matters.
- `Clear area, rough value` — We know the area, but the value case is still being shaped.
- `Several possibilities` — We have ideas, but no clear first priority.
- `Not yet clear` — We are interested in AI, but not yet sure where it should help.

**Purpose:** Ensures the assessment begins with business value before technology.

#### Q2 — Process understanding
**Question:** `How well do you understand the process behind that opportunity?`

**Answer cards**
- `Well understood and owned` — The workflow is mapped, repeatable, and has a responsible owner.
- `Understood but uneven` — People know it, but it is not consistently measured or documented.
- `Reliant on workarounds` — It depends heavily on manual steps or key individuals.
- `Not yet understood enough` — We would need to understand the process better before piloting AI.

**Purpose:** Tests process maturity and practical fit.

#### Q3 — Adoption ambition
**Question:** `What level of AI adoption are you aiming for in the next 12 months?`

**Answer cards**
- `Learn and identify use cases`
- `Improve one workflow with low-risk existing tools`
- `Run a focused pilot using our own data or systems`
- `Extend or integrate AI across multiple workflows`

**Purpose:** Captures ambition level without forcing technical jargon.

#### Q4 — Data readiness
**Question:** `How ready is the data needed for that work?`

**Answer cards**
- `Ready enough now` — The relevant data is available, accessible, and reasonably usable.
- `Available but fragmented` — The data exists, but it is spread across places and needs organising.
- `Partial with quality gaps` — There are gaps, inconsistencies, or low confidence in the data.
- `Not yet usable` — We would need to start collecting or structuring it first.

**Purpose:** Assesses availability, quality, and current usage maturity.

#### Q5 — Delivery environment
**Question:** `If you wanted to pilot AI, how ready are your systems and operating environment?`

**Answer cards**
- `Pilot-ready` — Systems, access, and security / hosting choices are manageable.
- `Possible with groundwork` — Core systems are stable, but integration choices still need work.
- `Constrained today` — Infrastructure, security, or operational constraints are a significant blocker.
- `Not yet known` — We have not yet worked out the technical route.

**Purpose:** Covers infrastructure readiness, supportability, and on-prem / cloud practicality without over-specifying architecture.

#### Q6 — People, governance, and trust
**Question:** `How ready is your organisation to adopt and support AI responsibly?`

**Answer cards**
- `Ready to own it` — Sponsor, owner, and day-to-day capability are clear.
- `Supported but developing` — Leadership is supportive, but skills or governance still need work.
- `Interest without clear ownership` — Trust, accountability, or support arrangements are still unclear.
- `Significant people gap` — We would need substantial support before using AI confidently.

**Purpose:** Covers workforce capability, ownership, transparency, accountability, and responsible AI readiness.

### 9.6.11 Answer Model and Question Controls

**Selection model**
- selecting a card marks it as the current answer for that question
- the selected card is visually persistent
- answers auto-save on selection
- the latest saved selection for a question is authoritative until completion

**Navigation**
- `Back` is visible from question 2 onward
- `Next` is disabled until the current question has a saved selection
- final step CTA label: `See my result`
- changing an earlier answer is permitted before completion

**Why back is required**
The readiness journey is short but business-significant. Users must be able to revisit an answer without feeling locked into an accidental choice.

### 9.6.12 Scoring and Result Model

The result must be helpful without pretending to offer consultancy-grade certainty.

**Primary output**
- one overall readiness band
- three supporting readiness dimensions
- two to four highlighted strengths or blockers
- one recommended next step
- one primary CTA into Contact

**Band labels**
- `Early-stage`
- `Foundational`
- `Ready to Pilot`
- `Ready to Scale`

**Dimension labels**
- `Value & Process Clarity` — derived from Q1 + Q2
- `Data & Delivery Readiness` — derived from Q4 + Q5
- `Adoption & Governance Readiness` — derived from Q3 + Q6

**Scoring contract**
- each answer card maps to an ordinal score from low to high readiness
- all six questions contribute equally to the overall band in V1
- a normalised 0–100 score may be retained for system logic, analytics, and thresholding
- the numeric score is secondary metadata, not the primary visual promise of the result

**Banding rule**
The result page should visually prioritise the readiness band and dimension states over the exact score.

**Highlight generation**
Highlights should be generated from the strongest and weakest signals in the response pattern. Examples:
- `Clear value target identified`
- `Process ownership needs tightening before pilot work`
- `Data exists but needs organising`
- `Governance and ownership need clarifying`

### 9.6.13 Auth Gate Behaviour

The auth gate appears **after** all questions are completed and remains within the same readiness shell.

**Auth gate purpose**
The gate unlocks the result and saves it against a persistent profile. It does not interrupt the assessment before completion.

**Required copy intent**
- the result is ready
- sign-in is needed to view it
- progress and result are already preserved
- auth takes seconds
- the ask is proportionate and professional

**Required reassurance**
The gate must explicitly reassure the user that:
- their answers are already saved
- their result will still be there after sign-in
- sign-in is for result delivery and saved follow-up, not to make them repeat the assessment

**Auth methods**
- `Continue with LinkedIn`
- `Continue with Email`

LinkedIn appears first, but both methods must be visually credible and easy to choose.

**State rules**
- auth success routes to `/readiness/result`
- auth cancellation keeps the user in the auth gate
- no result preview is shown behind the gate
- the gate may be dismissed, but reopening `/readiness` within the resume window must return the user to `awaiting_auth`, not restart the assessment

### 9.6.14 Result Page Behaviour

`/readiness/result` is a dedicated page, not a modal continuation.

**Result page content**
- readiness band heading
- short interpretation paragraph
- three dimension summaries
- two to four highlighted strengths or blockers
- suggested next step
- primary CTA to discuss with Thomas
- secondary action to retake the assessment

**Presentation rules**
- useful and commercially relevant
- specific enough to feel actionable
- not so specific that it over-promises certainty from six answers
- no fake precision language
- no pseudo-consulting theatre

**Score treatment**
If a numeric score is shown, it must be visually subordinate to the band and interpretation.

**Error handling**
If `/readiness/result` is opened without a valid linked authenticated session, the user is redirected to `/readiness`, where the system should resume at either:
- `awaiting_auth`, if a valid completed local session exists
- `resume_prompt`, if an incomplete valid session exists
- question 1, if no resumable session exists

### 9.6.15 Contact Bridge

The result page must lead naturally into Contact.

**Primary CTA behaviour**
- route to `/contact`
- pass non-PII readiness context only
- pre-select `business_enquiry`
- pre-fill subject as `AI Readiness follow-up`
- hydrate name and email from the authenticated session, not from query params

**Readiness metadata**
The contact submission must carry:
- readiness source
- readiness session reference
- result band
- normalised score, if retained by the backend
- enough context for Thomas to see why the visitor was prompted to get in touch

**CTA tone by band**
CTA copy should adapt to the band:
- `Early-stage` — `Start with a conversation`
- `Foundational` — `Explore what’s realistic first`
- `Ready to Pilot` — `Discuss a focused pilot`
- `Ready to Scale` — `Talk about scaling what works`

### 9.6.16 Resume, Restart, and Dismissal

**Resume window**
Same-device resume is supported for 24 hours.

**Resume states**
- incomplete assessment: show `Continue where you left off?`
- completed but not authenticated: show `Your result is still ready`

**Restart**
Restart must be explicit. Restart clears the local session token and begins a fresh assessment.

**Dismiss before completion**
The assessment may be dismissed before completion.

**Dismiss behaviour**
- if no answers have been given, dismissal closes immediately
- if one or more answers have been given, show an exit confirmation:
  - `Continue assessment`
  - `Save and exit`
  - `Start over`

**Exit messaging**
The confirmation must state that progress is saved on this device for 24 hours.

**Return destination**
- if the user entered from within the site and browser history exists, dismissal returns to the previous public route
- if `/readiness` was opened directly, dismissal routes to `/`

### 9.6.17 Accessibility and Usability Requirements

- focus is trapped within the readiness layer while it is open
- background content is inert and non-scrollable while the modal layer is active
- every question announces step position, for example `Question 2 of 6`
- answer cards are fully keyboard reachable and screen-reader labelled
- selected and saved states are clearly distinguishable
- progress is conveyed both visually and textually
- close, back, and next controls remain reachable without relying on hover
- reduced-motion mode removes decorative transitions while preserving state clarity
- mobile layout must respect safe areas and keyboard intrusion in the email-auth state
- outside-click dismissal is not relied on for any essential action

### 9.6.18 Sync Note

This patch updates the product recommendation from a generic 7-question readiness flow to a **6-question modal readiness flow** and makes the modal assessment presentation authoritative.

Companion readiness, interface, and backend contracts must be brought into sync with this section before implementation so that:
- `/readiness` remains route-backed
- desktop remains modal-style over the premium shell
- mobile uses full-height modal treatment
- back navigation is supported
- the auth gate remains in-modal
- `/readiness/result` remains the dedicated post-auth result page