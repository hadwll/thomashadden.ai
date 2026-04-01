# thomashadden.ai — Golden Truth Frontend Specification

**Version:** 1.2  
**Date:** March 26, 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Project Overview & Positioning](#1-project-overview--positioning)
2. [Site Architecture & Navigation](#2-site-architecture--navigation)
3. [Design System: Theme, Colour & Typography](#3-design-system-theme-colour--typography)
4. [Layout System & Page Shell](#4-layout-system--page-shell)
5. [Component Library](#5-component-library)
6. [Homepage Section-by-Section Specification](#6-homepage-section-by-section-specification)
7. [Inner Page Specifications](#7-inner-page-specifications)
8. [LLM Centerpiece: Interaction Design](#8-llm-centerpiece-interaction-design)
9. [AI Readiness Check: Interaction Design](#9-ai-readiness-check-interaction-design)
10. [Responsive & Mobile Specification](#10-responsive--mobile-specification)
11. [Motion & Animation](#11-motion--animation)
12. [Accessibility Requirements](#12-accessibility-requirements)
13. [Performance Requirements](#13-performance-requirements)
14. [Dark / Light Mode Parity Rules](#14-dark--light-mode-parity-rules)
15. [Content & RAG Grounding Requirements](#15-content--rag-grounding-requirements)
16. [Implementation Notes & Tech Constraints](#16-implementation-notes--tech-constraints)

---

## 1. Project Overview & Positioning

### 1.1 Project Identity

- **Domain:** thomashadden.ai
- **Subject:** Thomas Hadden — personal professional website
- **Platform identity:** Industrial Analytics & Automation (IA&A) as a supporting brand, not the primary front-facing entity
- **Current workplace:** Park Electrical Belfast

### 1.2 Core Positioning Statement

Thomas Hadden is an engineer and applied AI/automation professional with a strong interest in practical AI for industry and business. He currently works with Park Electrical Belfast and uses Industrial Analytics & Automation as a platform for independent technical projects, research-led development, and AI exploration.

### 1.3 Primary Goals

- Establish Thomas Hadden as a credible and practical local AI expert
- Create a strong personal professional first impression
- Use the LLM as the main differentiator from a standard personal website
- Provide useful AI-related guidance to visitors
- Convert interested visitors into business contacts through the AI Readiness Check and contact pathways
- Showcase relevant work, research, projects, and thinking

### 1.4 Secondary Goals

- Support SEO and AI discoverability
- Provide structured content for RAG grounding
- Create a premium, modern, mobile-friendly experience
- Avoid ambiguity around Thomas's relationship with Park Electrical Belfast

### 1.5 What the Site Is

- A premium personal AI product site
- A calm technical interface
- A modern, polished professional homepage
- A design system with strong layout discipline

### 1.6 What the Site Is Not

- A dramatic concept landing page
- A motif-heavy AI showcase
- An overwrought or decorative atmosphere-led landing page
- A visually loud product promo page
- A generic company brochure site or generic chatbot site

Controlled technical atmosphere is allowed, especially on desktop, but it must remain subordinate to structure, legibility, and product clarity.

---

## 2. Site Architecture & Navigation

### 2.1 Page Structure

| Page | Purpose | Priority |
|------|---------|----------|
| Home | First impression, LLM centerpiece, featured work, conversion | Primary |
| About | Fuller context on Thomas, Park, IA&A, credibility | Secondary |
| Projects | Real work showcase, credibility, LLM grounding | Secondary |
| Research | R&D themes, grant work, collaboration | Secondary |
| Insights | Short-form thinking, SEO, thought leadership | Secondary |
| Contact | Clear path to reach out, define conversation types | Secondary |
| AI Readiness Check | Lead conversion diagnostic, commercial bridge | Primary conversion |

### 2.2 Desktop Navigation

Navigation bar is integrated into the top of the rounded page shell as a refined control bar. It should feel capsule-like and premium but not appear as an exaggerated floating object detached from the page.

- **Nav items:** Home | About | Projects | Research | Insights | Contact
- **Right-side control cluster:** Single small primary CTA labelled "Ask Thomas AI"
- **Theme-toggle behaviour:** No visible theme toggle in the desktop homepage navbar in v1.2; desktop theme switching lives in the integrated footer utility cluster instead

The nav should feel like a refined top control bar within the overall page frame. Softly elevated or bordered, lightweight and minimal, visually neat rather than exaggerated. Control order is fixed: brand, nav links, then the single CTA.

### 2.3 Mobile Navigation

#### Mobile Header Bar

On mobile, the desktop navigation bar is replaced by a compact top header bar:

- **Left:** Simplified cog-derived mark + "Thomas Hadden" wordmark
- **Right:** Small "Ask" pill button + theme toggle icon (moon/sun)
- **Height:** ~48–52px
- **Background:** `var(--bg-surface)` or `var(--bg-primary)` with subtle border beneath
- **Behaviour:** Fixed to top of viewport

The full page navigation links (About, Projects, Research, etc.) are removed from the header on mobile and replaced by the bottom navigation bar.

#### Bottom Navigation Bar

Fixed bottom bar with 5 items:

- Home
- Projects
- Research
- Insights
- Contact

Each item uses an icon above a small label. The active item is highlighted in `var(--accent-primary)`. All items must have strong tap targets (minimum 44×44px).

About is accessible from Home page content and a visible secondary link from the Home or header area. The AI Readiness Check is promoted via CTAs on Home, in the LLM section, on Contact, and contextually via LLM responses — not as a persistent bottom-nav item.

---

## 3. Design System: Theme, Colour & Typography

### 3.1 Theme Strategy

The website supports both dark mode and light mode. The accent colour remains consistent across both themes so the brand feels unified. Both themes must be equally resolved — light mode is not a fallback.

### 3.2 Dark Theme Palette

| Token | Role | Value |
|-------|------|-------|
| `--bg-primary` | Page background | `#0F172A` (near-black slate) |
| `--bg-surface` | Card / panel backgrounds | `#1E293B` (dark slate) |
| `--bg-elevated` | Elevated card / hover states | `#334155` (gunmetal) |
| `--text-primary` | Headings, body text | `#F1F5F9` (soft white) |
| `--text-secondary` | Metadata, descriptions | `#94A3B8` (cool grey) |
| `--text-muted` | Tertiary text, placeholders | `#64748B` (muted grey) |
| `--accent-primary` | CTAs, links, active states | `#0EA5E9` (electric cyan) |
| `--accent-hover` | CTA hover states | `#38BDF8` (lighter cyan) |
| `--accent-subtle` | Accent backgrounds, chips | `rgba(14,165,233,0.12)` |
| `--border-default` | Card borders, dividers | `rgba(148,163,184,0.15)` |
| `--border-accent` | Active borders, focus rings | `rgba(14,165,233,0.4)` |
| `--glow-accent` | Subtle glow effects | `rgba(14,165,233,0.08)` |

Dark mode should not feel cyberpunk or over-neon. It should be restrained and balanced with a technical, premium, modern, slightly product-like mood.

### 3.3 Light Theme Palette

| Token | Role | Value |
|-------|------|-------|
| `--bg-primary` | Page background | `#F8FAFC` (pale slate) |
| `--bg-surface` | Card / panel backgrounds | `#FFFFFF` (white) |
| `--bg-elevated` | Elevated card / hover states | `#F1F5F9` (light grey) |
| `--text-primary` | Headings, body text | `#0F172A` (deep charcoal) |
| `--text-secondary` | Metadata, descriptions | `#475569` (grey-blue) |
| `--text-muted` | Tertiary text, placeholders | `#94A3B8` (muted grey) |
| `--accent-primary` | CTAs, links, active states | `#0284C7` (deep cyan) |
| `--accent-hover` | CTA hover states | `#0369A1` (darker cyan) |
| `--accent-subtle` | Accent backgrounds, chips | `rgba(2,132,199,0.08)` |
| `--border-default` | Card borders, dividers | `rgba(148,163,184,0.25)` |
| `--border-accent` | Active borders, focus rings | `rgba(2,132,199,0.3)` |
| `--glow-accent` | Low-intensity ambient bloom | `rgba(2,132,199,0.10)` |

Light mode should feel intentional, clean, intelligent, and breathable. Use milky surfaces, crisp white vessels, pale cyan ambient haze, and soft luminous edges rather than a flat glow-free treatment.

### 3.4 Typography System

| Element | Font | Weight | Size (desktop) | Size (mobile) | Line Height |
|---------|------|--------|----------------|---------------|-------------|
| H1 — Hero heading | Sans-serif (e.g. Plus Jakarta Sans) | Bold (700) | 52–60px | 34–40px | 1.08–1.1 |
| H2 — Section headings | Same family | Bold (700) | 32–36px | 24–28px | 1.2 |
| H3 — Card titles | Same family | Semibold (600) | 20–24px | 18–20px | 1.3 |
| Body | Same family | Regular (400) | 16–18px | 15–16px | 1.6 |
| Small / meta | Same family | Regular (400) | 13–14px | 12–13px | 1.5 |
| Monospace accents | JetBrains Mono or similar | Regular (400) | 13–14px | 12–13px | 1.4 |

Typography should be clean, modern, and highly legible. Use a strong modern sans-serif for headings and body. Optional restrained monospace use for prompt chips, tags, technical accents, or micro-labels. Avoid overly futuristic fonts and excessive font mixing. The hero stack needs optical spacing discipline: tighter headline-to-subheading spacing than standard section stacks, a shorter gap into metadata, and a larger gap before CTAs.

### 3.5 Spacing Scale

Based on a consistent 4px grid:

- **4px (xs)** — micro gaps
- **8px (sm)** — inner padding, chip gaps
- **16px (md)** — card internal padding, list item spacing
- **24px (lg)** — section internal padding
- **32px (xl)** — between related sections
- **48–64px (2xl)** — major section gaps
- **80–120px (3xl)** — hero vertical padding, major page breaks

Use the larger end of the scale for hero-to-LLM transitions and for the readiness strip entering the footer zone. Image-card sections use tighter header-to-grid spacing than the LLM area, while the lower footer strip uses the tightest vertical rhythm of the homepage.

### 3.6 Border Radius Scale

Use a four-tier geometry hierarchy:

- **Shell:** 28–32px — page shell and integrated lower shell bars
- **Vessel:** 22–28px — homepage LLM vessel and other hero-weight surfaces
- **Content-card:** 16–20px — project, research, insight, and split-panel surfaces
- **Control:** 12–14px by default, with capsule / pill geometry where the mockups show pill buttons, CTA strips, and suggestion controls

---

## 4. Layout System & Page Shell

### 4.1 Page Shell

The homepage should feel like a single designed surface rather than a stack of unrelated website sections. The entire page lives inside a rounded outer page shell or framed container.

- **Max width:** 1280–1400px
- **Outer radius:** 24–32px
- **Outer margin:** 16–24px on desktop, 0 on mobile
- **Inner padding:** 32–48px on desktop, 16–24px on mobile
- **Background:** `var(--bg-primary)`

The shell creates consistent internal spacing and rhythm. Sections should feel visually related through shared surfaces, borders, padding, and controlled shell-edge luminance. Within the shell, distinct surface families may nest: vessel cards, content cards, split panels, and strip CTAs. The page should feel cohesive from top to bottom with a premium UI-system quality.

### 4.2 Content Grid

- **Desktop:** 12-column grid, 1120–1200px content width
- **Tablet:** 8-column grid, fluid
- **Mobile:** 4-column grid, 16px gutters

Single-column priority on mobile. Strong vertical rhythm. Large tap targets. No horizontal scrolling. No hover-only essential interactions. Readable without zoom.

### 4.3 Section Rhythm

The chosen direction uses a spacious, calm vertical rhythm:

- Strong spacing between sections (64–96px desktop, 48–64px mobile)
- No cramped content blocks
- Limited content per section
- Curated rather than dense presentation
- Clear visual pauses between major page areas
- The page should feel editorially paced and easy to scan

---

## 5. Component Library

### 5.1 Card System

The surface system is central to the visual identity. Do not force every surface into one base card treatment. Use the following named families:

| Family | Primary use | Surface treatment |
|--------|-------------|-------------------|
| Vessel cards | Homepage LLM centerpiece and other centerpiece surfaces | Highest radius after the shell, deeper padding, localized glow, stronger tonal separation |
| Content cards | Projects, research, insights, and response cards | Consistent border, moderate elevation, calmer radius, image-first or text-first layouts |
| Split panels | About and other text/image paired panels | Shared outer surface with internal two-column split and integrated image block |
| Strip CTAs | Readiness strip and integrated footer bar | Horizontal band layout, lower height, strong alignment, capsule CTA geometry where needed |

#### Surface Family Rules

- **Vessel cards:** `var(--bg-surface)` or `var(--bg-elevated)` with visible but restrained glow pooling, 24–32px padding, and vessel-tier radius
- **Content cards:** `var(--bg-surface)`, `1px solid var(--border-default)`, content-card radius, 20–24px padding, light-mode shadow only where needed for separation
- **Split panels:** Shared outer surface with content-card radius, text and image treated as one composed panel rather than two isolated cards
- **Strip CTAs:** Long horizontal band, shell or vessel radius depending placement, aligned content zones, and clearer CTA anchoring than a generic card

Cards should feel softly rounded, lightly elevated, consistently spaced, visually calm, premium but restrained, and technically credible. Avoid cards that feel overly glossy, template-like, busy, or aggressively promotional.

#### Image Art Direction

All homepage imagery follows one coherent technical art-direction system:

- **Grading:** Cool technical grading with controlled contrast and no warm lifestyle drift
- **Clutter:** Low-clutter imagery only; backgrounds should not compete with type or overlays
- **Crop behaviour:** Project and research images should crop confidently without losing the main industrial or technical focal point
- **Overlay tolerance:** Images must remain legible under light linework or soft surface overlays; avoid compositions that collapse when subtle overlays are applied
- **Theme handling:** Dark mode can carry deeper shadows and brighter highlights; light mode should preserve clean whites without washing out cyan haze or borders
- **About portrait:** Portrait anchors into the panel edge as part of the layout, not as a floating stock-style rectangle; framing should feel calm, professional, and integrated

### 5.2 Buttons

| Variant | Background | Text | Border | Radius |
|---------|-----------|------|--------|--------|
| Primary | `var(--accent-primary)` | White | None | Capsule or 14px |
| Secondary | Transparent | `var(--accent-primary)` | `1px solid var(--accent-primary)` | Capsule or 14px |
| Ghost | Transparent | `var(--text-secondary)` | None | 12–14px |

All buttons: 40–44px height, 16–24px horizontal padding, smooth hover transitions (colour shift, no dramatic scale). Use capsule geometry for primary and secondary CTAs where the homepage mockups show pill treatment, especially in the hero, nav CTA, readiness strip, and mobile launcher surfaces.

### 5.3 Input Fields

- **Background:** `var(--bg-surface)`
- **Border:** `1px solid var(--border-default)`, focus: `var(--border-accent)`
- **Radius:** 12–14px for standard inputs, capsule treatment for homepage LLM controls
- **Height:** 44–48px
- **Placeholder text:** `var(--text-muted)`

The LLM prompt input should be larger and more prominent (56–60px height) with a search icon and visible Ask control. On desktop home it lives inside a dedicated vessel row rather than reading as a standard isolated form field. On mobile home it is presented as part of a compact launcher row / prompt-suggestion bar rather than a text-input-first mini form.

### 5.4 Prompt Chips

Suggested prompt chips for the LLM section:

- **Background:** `var(--accent-subtle)`
- **Border:** `1px solid var(--border-accent)`
- **Radius:** Capsule / full pill
- **Text:** 13–14px, monospace or small sans-serif, `var(--accent-primary)`
- **Hover:** Background opacity increase, subtle scale
- **Padding:** 8px 16px

On desktop home, suggestion chips sit in a dedicated low-density row beneath the prompt control and should not wrap into a crowded multi-line stack. On mobile home, only a single compact launcher suggestion is visible at a time.

### 5.5 Section Headers

Each content section uses a consistent header pattern:

- Left-aligned H2 section title
- Optional right-aligned "View all projects →" link in `text-secondary` colour
- Thin divider or spacing beneath before cards

Header spacing varies by section family:

- **Image-card sections:** 16–20px between header and card grid
- **LLM area:** 24–28px between heading group and vessel
- **Readiness strip / footer strip:** tighter vertical centering, no decorative divider

### 5.6 Navigation Bar

- **Position:** Fixed to top of page shell
- **Background:** `var(--bg-surface)` with slight backdrop blur
- **Height:** 56–64px
- **Border bottom:** `1px solid var(--border-default)`
- **Logo area:** Simplified cog-derived mark + "Thomas Hadden" wordmark
- **Nav links:** 14–15px, `text-secondary`, active: `accent-primary` with underline or pill highlight
- **Right controls:** Single small primary CTA button labelled "Ask Thomas AI"

The desktop homepage navbar does not expose a theme toggle in v1.2. Theme switching remains part of the desktop UI via the integrated footer utility cluster.

### 5.7 Micro-UI

The following micro-UI rules apply across rows, carousels, nav, and compact controls:

- **Pagination dots:** 6–8px circles, centered, with one clearly brighter active state and generous spacing so they read as intentional controls rather than decoration
- **Chevron alignment:** Right-aligned on collapsed rows, vertically centered with the row label, with optical inset matching the row divider inset
- **Row separators:** Thin inset dividers using `var(--border-default)` at low-to-medium opacity; they should not run full bleed on mobile home rows
- **Active bottom-nav icon treatment:** Accent-colour icon and label, slightly stronger icon fill or glow emphasis than inactive states, but no oversized pill background
- **Small icon stroke weight:** Consistent, slightly refined stroke weight across nav, answer headers, and inline control icons
- **Icon/button spacing:** Tight but deliberate spacing between icons and labels or buttons; do not let compact controls look crammed

---

## 6. Homepage Section-by-Section Specification

### 6.1 Hero

The hero should be clean and centered in composition. Quality comes from spacing, typography, restraint, and polish.

- **Layout:** Centered, single column
- **Heading:** "Thomas Hadden" — H1, bold, largest type size
- **Subheading:** "Industrial AI, Automation, and Research" — accent colour
- **Metadata row:** Inline text metadata, not chips: "Park Electrical Belfast" | divider | "Industrial AI Research"
- **Primary CTA:** "Explore AI" — primary button
- **Secondary CTA:** "View Projects" — secondary button
- **Background:** Visible but subordinate technical linework / circuit traces with localized haze behind the hero field
- **Vertical padding:** 88–112px top, 68–80px bottom

Hero stack spacing should be optically tuned: tighter gap between H1 and subheading, short gap into metadata, then a larger gap into the CTA row.

No large right-side illustration. No oversized hero graphics. The hero should feel confident, modern, clear, calm, and premium.

### 6.2 LLM Centerpiece

This is the defining section. The interaction model stays the same, but the homepage presentation is a showcase vessel pattern rather than a generic prompt card.

#### Desktop Showcase Vessel

- **Vessel width:** Centered centerpiece surface spanning roughly 8–10 desktop grid columns
- **Vessel shape:** High-radius capsule or rounded vessel with localized edge luminance, accent-subtle wash, and deeper internal padding than a standard card
- **Title:** "Targeted answers on AI, industry, and my work"
- **Subtitle:** Brief explanation of what the assistant can help with
- **Title/subtitle spacing:** 8–12px between title and subtitle, then 20–24px before the prompt row
- **Prompt field placement:** Primary prompt control sits inside the vessel as a dominant horizontal row
- **Ask control placement:** Visible Ask button docked to the right side of the prompt row
- **Suggestion-chip row:** 3–4 prompts in a single controlled row beneath the prompt field; do not crowd into a generic multi-line chip cloud

Suggested prompt chips:

- "How can AI help an engineering business?"
- "What is Thomas working on?"
- "Where does AI fit into industry?"
- "What is RAG?"

#### Desktop Answer Companion Card

- **Placement:** Separate content card below the vessel with a 20–24px relationship gap
- **Header treatment:** Question line with a small icon on the left and the question text as a distinct header row
- **Answer content:** 5–6 concise bullets with enough density to feel useful, but not so much text that the card reads like a full article
- **Purpose:** Communicate usefulness and clarity, demonstrate that the LLM is real and helpful

#### Mobile Launcher + Answer Carousel

- **Prompt treatment:** Compact launcher row or prompt-suggestion bar, not a standard text-input-first composition
- **Visible controls:** One compact suggestion / launcher prompt plus a distinct icon submit control
- **Answer card:** Separate carousel card beneath the launcher
- **Carousel dots:** Dots live beneath the answer card with clear separation and scale so pagination reads instantly
- **Desktop-to-mobile relationship:** Mobile should feel like a purpose-built compact variant of the same component, not a squeezed desktop form

The LLM should feel strong because of interface quality and structure, not because of decorative excess. It should feel like a core part of the product experience, not like a support widget bolted onto the page.

### 6.3 Featured Work

- **Layout (desktop):** 3 cards in a row
- **Layout (mobile):** Collapsed into a compact navigational row — section title on the left, chevron arrow on the right — tapping navigates to the full Featured Work / Projects view. Cards are not shown inline on the mobile homepage.
- **Card content (desktop):** Image thumbnail following §5.1 image art direction, project title, short description, location/category tag
- **Header:** "Featured Work" + "View all projects →" link
- **Card count:** 3 maximum on homepage (desktop)

Projects should feel practical, technically credible, and relevant to industry/automation/AI/engineering/analytics. This section should not read like a CV dump.

### 6.4 About Thomas

- **Layout (desktop):** Two-column — text left, portrait image right
- **Layout (mobile):** Collapsed into a compact navigational row — "About Thomas" on the left, chevron arrow on the right — tapping navigates to the full About page. The two-column portrait layout is not shown inline on the mobile homepage.
- **Heading:** "About Thomas"
- **Content (desktop):** 2–3 concise paragraphs covering background, Park relationship, IA&A context
- **CTA:** "Learn more →" button linking to full About page
- **Image:** Professional portrait following §5.1 image art direction, clean, integrated into layout, not stock-like

This section should humanise the site while remaining premium and technically grounded. The portrait treatment should feel professional, clean, and not overly corporate.

### 6.5 Research

- **Layout (desktop):** 2–3 cards in a row
- **Layout (mobile):** Collapsed into a compact navigational row — "Current Research" on the left, chevron arrow on the right — tapping navigates to the full Research page. Cards are not shown inline on the mobile homepage.
- **Card content (desktop):** Image following §5.1 image art direction, research title, short description
- **Header:** "Research" + "View all →" link

Limited number of cards with strong image consistency, simple metadata, clean titles and short descriptions.

#### Mobile Collapsed Row Pattern

On the homepage, Featured Work, About Thomas, Current Research, and any Latest Insights teaser all collapse into a consistent list of tappable rows. This row pattern is authoritative for the mobile home route; inline cards do not render there. Each row consists of:

- **Left:** Section title (e.g. "Featured Work", "About Thomas", "Current Research", "Latest Insights")
- **Right:** Chevron arrow (→)
- **Separator:** Thin divider between rows using `var(--border-default)`
- **Tap target:** Full row width, minimum 48px height
- **Behaviour:** Tapping navigates to the corresponding full page

This pattern keeps the mobile homepage focused on the hero, LLM centerpiece, and readiness check — the primary conversion flow — while still providing clear paths to deeper content. Stacked cards remain appropriate on inner pages only.

### 6.6 AI Readiness Check Teaser

- **Desktop treatment:** Horizontal readiness strip / band, not a generic stacked sales panel
- **Desktop layout:** Heading left, short supporting copy adjacent, CTA anchored on the right
- **Heading:** "How AI-ready is your business?" — accent colour on "AI-ready" (light theme) or "business" (dark theme)
- **Body:** "Assess your company's AI potential."
- **CTA:** "Start the 2-minute assessment" — primary button, full-width on mobile
- **Mobile treatment:** Lightly elevated card surface with accent-subtle border to distinguish it from the collapsed row sections above

This is a key commercial bridge between curiosity, useful interaction, and business contact. On desktop, it flows directly into the integrated footer zone below.

### 6.7 Collaborate on Research

The homepage handles research collaboration differently by breakpoint:

- **Desktop homepage:** No standalone collaborate block in v1.2; collaboration remains accessible through research, contact, and footer pathways
- **Mobile homepage:** A single "Collaborate on Research" row remains as the terminal home-row CTA above the fixed bottom nav
- **Purpose:** Provides a clear path for academic, grant, and R&D collaboration without inserting an extra desktop homepage panel

### 6.8 Footer

- **Desktop homepage layout:** Integrated lower shell bar directly following the readiness strip
- **Desktop content:** IA&A brand mark + Thomas Hadden wordmark, secondary nav links, lightweight social icons, and desktop theme toggle utility
- **Desktop style:** Restrained, neat, premium. Not oversized or promotional
- **Mobile homepage behaviour:** No standalone footer content block on home; the mobile home route terminates with the collaborate row followed by the fixed bottom nav
- **Inner-page behaviour:** Footer content remains available on inner pages across breakpoints

---

## 7. Inner Page Specifications

### 7.1 About Page

Provides fuller context on Thomas Hadden. Removes ambiguity around Park and Industrial Analytics & Automation. Covers: background, technical focus areas, current role / Park relationship, IA&A explanation, relevant achievements, professional positioning in AI, industry, engineering, and automation.

Tone: confident, clear, factual, not boastful. Must make clear that Thomas is the main subject, Park is his workplace, IA&A is a personal/project/research platform.

### 7.2 Projects Page

Showcases real work with project cards or modular sections. Includes: current projects, selected past projects, summaries, technical domains, relevance, optional status/category tags. Should feel practical and technically credible, not like a CV dump.

### 7.3 Research Page

Presents research, grant, R&D, and collaboration themes. Can distinguish between current research themes, collaboration areas, and emerging interests. Tone: serious, thoughtful, applied rather than purely academic.

### 7.4 Insights Page

Concise insights, short technical notes, observations on AI in business/industry, reflections on automation and practical AI adoption. Should feel like field notes, concise essays, practical observations, and curated thinking — not an old-fashioned blog.

### 7.5 Contact Page

Invites contact for: AI in business discussions, industrial/engineering AI conversations, collaboration, research/grant opportunities, technical enquiries. Approachable, professional, low friction. Not a hard-sell sales page — an invitation to start the right kind of conversation.

---

## 8. LLM Centerpiece: Interaction Design

Homepage presentation uses two breakpoint-specific showcase variants while keeping one interaction contract:

- **Desktop home:** Dedicated showcase vessel plus companion answer card
- **Mobile home:** Compact launcher / suggestion bar plus separate answer carousel card
- **Shared rule:** These are presentation variants only; query routing, answer generation, and readiness-routing behaviour do not change

### 8.1 In-Scope Behaviour

The LLM supports two broad classes of queries:

#### A. Questions About Thomas Hadden (RAG)

- Who is Thomas Hadden?
- What kind of work does Thomas do?
- What projects is he involved in?
- What is Industrial Analytics & Automation?
- How does Thomas's work relate to Park Electrical Belfast?
- What research or grant work is he involved in?

#### B. General AI Questions (Web-Backed)

- How can AI help a business?
- Where does AI fit into industry?
- What are realistic AI use cases for SMEs?
- What is RAG? What is an LLM?
- How can engineering firms use AI?
- What are the risks of using AI in business?

### 8.2 Out-of-Scope Behaviour

The LLM should not answer irrelevant or off-topic questions. Examples: general trivia, entertainment questions, random life advice, unrelated personal assistant tasks. It should politely redirect to Thomas's work, AI in business, AI in industry, or AI readiness.

### 8.3 Readiness Survey Routing

The LLM should actively guide suitable users toward the AI Readiness Check:

- "You may find the AI Readiness Check useful."
- "If you want a more structured next step, try the readiness assessment."
- "The assessment can help identify where AI may realistically fit in your business."

### 8.4 V1 Constraints

- No document upload required
- No file attachments required
- No generic open-ended assistant behaviour
- No attempt to answer everything

---

## 9. AI Readiness Check: Interaction Design

### 9.1 Product Framing

- **Title:** "How AI-ready is your business?" or "AI Readiness Check"
- This should feel like a practical business diagnostic, not a quiz that tests intelligence.

### 9.2 Assessment Structure

- 7 questions (V1)
- Mostly multiple choice
- Practical business framing
- Optional contact capture
- Clear result at the end

### 9.3 Question Themes

- Business type / sector
- Current AI awareness or use
- Operational pain points
- Data / process maturity
- Willingness to experiment
- Internal capability / confidence
- Urgency / interest level

### 9.4 Result Categories

| Category | Description |
|----------|-------------|
| Early-stage | Limited AI awareness, basic digital processes |
| Foundational | Some awareness, growing data maturity |
| Ready to pilot | Clear use cases identified, infrastructure emerging |
| Ready to scale | Active AI use, looking to expand and optimise |

Results include: simple interpretation, suggested next step, CTA to discuss or contact Thomas.

### 9.5 Mobile UX

The readiness survey should be especially clean on mobile: simple question flow, obvious progress, low friction, one-question-at-a-time or highly readable stacked layout.

---

## 10. Responsive & Mobile Specification

### 10.1 Breakpoints

| Breakpoint | Width | Grid | Shell |
|------------|-------|------|-------|
| Mobile | < 640px | 4-column, 16px gutters | Full-width, no outer radius |
| Tablet | 640–1024px | 8-column, 24px gutters | Reduced outer margin |
| Desktop | 1024–1440px | 12-column, 32px gutters | Centered shell, 24px outer margin |
| Large desktop | > 1440px | 12-column, capped at max-width | Centered shell, auto margins |

### 10.2 Mobile Priorities

- Readable hero with reduced type sizes
- Excellent prompt UX — compact launcher / suggestion bar with a clearly tappable submit control
- Clean answer rendering with no tiny side panels or cramped multi-column layout
- Homepage content sections collapse into navigational rows rather than inline cards; stacked cards are reserved for inner pages
- Easy bottom navigation with strong tap targets
- Fast load times
- Prompt interface fully usable on smaller screens

### 10.3 Mobile-Specific Behaviours

- **Mobile header:** Compact top bar with cog mark + "Thomas Hadden" wordmark, "Ask" pill button, and theme toggle icon — replaces the full desktop navigation bar
- **Content sections (Featured Work, About Thomas, Current Research, Latest Insights):** Collapse into tappable navigational rows with section title + chevron arrow, not inline card grids
- **LLM prompt:** Compact launcher row or prompt-suggestion bar with a single visible suggestion and compact icon submit control, not a full text-input-first composition
- **LLM answer preview:** Separate swipeable carousel card with dot pagination indicators beneath it
- **AI Readiness Check teaser:** Full-width card with accent border, "Start the 2-minute assessment" CTA button at full width
- **Collaborate on Research:** Terminal mobile home row immediately before the fixed bottom nav
- **About section:** Image above text (stacked) on the full About page; collapsed row on mobile homepage
- **Footer:** No standalone footer block on the mobile homepage; footer content lives on inner pages instead
- **Bottom nav:** Fixed bar with 5 icon+label items replacing top nav links, active state in accent colour

Rows, chevrons, pagination dots, and bottom-nav icon treatment inherit the micro-UI rules in §5.7.

---

## 11. Motion & Animation

### 11.1 Principles

Motion should be subtle, smooth, modern, and secondary to clarity. Polish should reinforce luminous surfaces, row clarity, and control feedback without becoming loud or elastic.

### 11.2 Approved Motion Patterns

- Page transitions: smooth fade / slide
- Button hover states: colour transition (200ms ease)
- Nav active state: underline slide or pill background transition
- Prompt suggestions: fade-in on section enter
- Card hover: subtle lift (`translateY -2px`) + border colour shift
- Luminous surfaces: restrained hover glow or edge-brightening on vessel and readiness-strip surfaces
- Primary controls: subtle focus bloom tied to `var(--glow-accent)` rather than thick dramatic halos
- Mobile collapsed rows: row-hover / row-press clarity through divider contrast and chevron emphasis
- Bottom nav and prompt vessel: polished active-state transitions for icon emphasis, launcher focus, and answer-card reveal
- Section entrance: gentle fade-up on scroll (intersection observer), staggered 50–100ms delay between siblings
- LLM answer rendering: text stream / fade-in line by line

### 11.3 Prohibited Motion

- Excessive parallax
- Loud entrance animations
- Distracting moving backgrounds
- Scale transforms > 1.02
- Bouncing or elastic easing

---

## 12. Accessibility Requirements

- WCAG 2.1 AA compliance minimum
- Colour contrast: 4.5:1 for body text, 3:1 for large text and UI components
- All interactive elements keyboard accessible
- Focus ring visible on all focusable elements (`var(--border-accent)`)
- Alt text on all images
- Semantic HTML throughout (`nav`, `main`, `section`, `article`, `header`, `footer`)
- ARIA labels on icon-only buttons (theme toggle, search)
- Skip-to-content link
- Reduced motion: respect `prefers-reduced-motion`, disable scroll animations
- LLM prompt input: proper label, live region for answer updates

---

## 13. Performance Requirements

- Lighthouse performance score: 90+ target
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Font loading: use `font-display: swap`, preload primary font
- Images: WebP/AVIF with responsive `srcset`, lazy load below fold
- Background effects: CSS-only where possible, no heavy JS canvas on mobile
- Code splitting: lazy load inner pages
- Critical CSS inlined for above-the-fold content

---

## 14. Dark / Light Mode Parity Rules

Both themes must preserve identical structure and feel:

- Same page shell
- Same layout
- Same card rhythm
- Same LLM composition
- Same typography hierarchy
- Same structural system with theme-specific atmospheric rendering

| Rendering dimension | Dark mode | Light mode |
|---------------------|-----------|------------|
| Border visibility | Lower-contrast borders, still readable | Slightly brighter borders for vessel and card separation |
| Bloom strength | Controlled cyan glow at edges and focal controls | Lower-intensity ambient bloom with pale cyan haloing |
| Panel shadowing | Mostly tonal separation and glow, minimal cast shadow | Soft shadowing permitted to maintain white-surface separation |
| Background trace opacity | Medium-low traces with more tonal depth | Pale but visible traces with milky haze support |
| Surface separation | Depth from contrast and luminance | Depth from white vessels, soft bloom, and crisp border rhythm |

**Dark mode specifics:** Richer depth, stronger contrast, localized blue technical glow where needed.

**Light mode specifics:** Cleaner and softer, pale technical linework, crisp white vessels, soft cyan haze, equally premium.

**Implementation:** Use CSS custom properties for all colour values. Theme switching toggles a `dark` class on the `<html>` element. No structural HTML changes between themes.

---

## 15. Content & RAG Grounding Requirements

### 15.1 RAG Content Sources

The LLM should be grounded on public approved site content:

- Home page content
- About page content
- Projects page content
- Research page content
- Insights page content
- Readiness Check framing / FAQs if useful

### 15.2 Query Routing

| Query Type | Source | Example |
|------------|--------|---------|
| Thomas / profile / work | RAG over curated site content | Who is Thomas Hadden? |
| Practical AI / business / industry | Live web-backed answers | How can AI help a business? |
| Irrelevant / off-topic | Refuse or redirect | What's the weather today? |

### 15.3 V1 Content Constraints

- No document uploads
- No file analysis
- No open-ended personal assistant behaviour
- All structured content on the site should also serve as RAG grounding material

---

## 16. Implementation Notes & Tech Constraints

### 16.1 Background Treatment

Use controlled technical atmosphere rather than flat suppression or dramatic spectacle:

- Medium-opacity circuit-like linework where the shell needs visible technical structure
- Localized glow pools and soft light bloom at focal surfaces
- Shell-edge luminance and sectional tonal emphasis to articulate major zones
- Subtle grid / systems texture where it supports layout depth
- Background traces that remain subordinate to content and never compete with type

Avoid: large decorative sci-fi energy effects, strong radial hero graphics, decorative spectacle, or atmosphere so heavy that it overwhelms the page structure.

### 16.2 Brand Expression

The IA&A brand language should be present but restrained:

- Simplified cog-derived mark in the header / identity
- Subtle technical or industrial visual cues
- Clean analytics / systems styling
- Restrained blue-accent brand language

Do not rely on oversized cog illustrations, repeated dominant gear graphics, or decorative motifs that overpower the layout. The brand should feel embedded in the interface design, not layered on top of it.

### 16.3 Distinctiveness

Distinctiveness must come primarily from:

- The page shell and layout discipline
- The refined technical background language
- The calm premium card system
- The strong LLM interface treatment
- Controlled atmospheric rendering used in service of the interface
- The restrained industrial/analytics brand cues

It must not depend on oversized hero graphics, excessive visual effects, generic AI illustration tropes, or template-level component styling.

### 16.4 Success Criteria

The design is successful if a visitor quickly understands:

- This is Thomas Hadden
- He is positioned as the local AI expert
- The site is different because it includes a helpful, bounded LLM
- The LLM is relevant and useful
- There is real substance behind the positioning
- The AI Readiness Check is the next practical step for business visitors
- The site is credible, modern, and mobile-friendly

---

*thomashadden.ai | Industrial Analytics & Automation | v1.2*
