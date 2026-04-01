# thomashadden.ai — Frontend Interface Specification

**Version:** 1.1  
**Date:** March 26, 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** golden-truth-frontend-spec.md · backend-api.md · backend-auth.md · backend-readiness-check.md · backend-llm.md · backend-contact.md · backend-database.md · backend-infrastructure.md

---

## Contents

1. [Tech Stack](#1-tech-stack)
2. [Design Tokens](#2-design-tokens)
3. [Page Inventory](#3-page-inventory)
4. [Component Specifications](#4-component-specifications)
5. [LLM Interface — Full Interaction Spec](#5-llm-interface--full-interaction-spec)
6. [AI Readiness Check — Full Interaction Spec](#6-ai-readiness-check--full-interaction-spec)
7. [Auth Flow — Frontend Perspective](#7-auth-flow--frontend-perspective)
8. [Contact Form — Full Interaction Spec](#8-contact-form--full-interaction-spec)
9. [Routing & Navigation](#9-routing--navigation)
10. [State Management](#10-state-management)
11. [Environment Variables](#11-environment-variables)
12. [Performance Requirements](#12-performance-requirements)
13. [Accessibility Requirements](#13-accessibility-requirements)

---

## 1. Tech Stack

### 1.1 Core Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js (App Router) | 14+ | Framework, SSR, routing, API routes |
| TypeScript | 5+ | Type safety across all application code |
| Tailwind CSS | 3+ | Utility-first styling, design token integration |
| `@supabase/supabase-js` | 2+ | Auth client, Supabase session management |
| `@supabase/ssr` | 0.3+ | Server-side Supabase client for Next.js App Router |

### 1.2 Fonts

| Font | Source | Use |
|------|--------|-----|
| Plus Jakarta Sans | Google Fonts | Headings, body text, UI elements |
| JetBrains Mono | Google Fonts | Prompt chips, tags, technical accents, monospace labels |

Both loaded via `next/font/google` with `font-display: swap`. Plus Jakarta Sans is preloaded.

### 1.3 Analytics

Plausible script tag placed in `app/layout.tsx` inside `<head>`:

```html
<script defer data-domain="thomashadden.ai" src="https://plausible.io/js/script.js"></script>
```

No backend integration required. Plausible operates independently via its own script.

### 1.4 Environment Variable Categories

| Prefix | Visibility | Use |
|--------|-----------|-----|
| `NEXT_PUBLIC_` | Bundled into client JS, visible in browser | Supabase URL, Supabase anon key, site URL |
| No prefix | Server-only, never in client bundle | Service role key, API keys, SMTP credentials |

See §11 for the complete `.env.example`.

### 1.5 Repository Structure

```
app/
├── layout.tsx                  # Root layout: fonts, theme provider, Plausible script
├── page.tsx                    # Home
├── about/page.tsx
├── projects/
│   ├── page.tsx                # Projects list
│   └── [slug]/page.tsx         # Project detail
├── research/
│   ├── page.tsx                # Research list
│   └── [slug]/page.tsx         # Research detail
├── insights/
│   ├── page.tsx                # Insights list
│   └── [slug]/page.tsx         # Insight detail
├── contact/page.tsx
├── readiness/
│   ├── page.tsx                # Assessment flow
│   └── result/page.tsx         # Result screen (auth-gated)
├── privacy/page.tsx
├── cookies/page.tsx
├── auth/
│   └── callback/route.ts       # Supabase auth callback handler
├── api/                         # Next.js API routes (proxy to backend)
│   ├── llm/query/route.ts
│   ├── readiness-check/
│   │   ├── session/route.ts
│   │   ├── session/[token]/route.ts
│   │   ├── answer/route.ts
│   │   └── result/[token]/route.ts
│   ├── contact/submit/route.ts
│   ├── content/[page]/route.ts
│   └── analytics/event/route.ts
components/
├── layout/
│   ├── NavBar.tsx
│   ├── MobileNav.tsx
│   ├── MobileHeader.tsx
│   ├── PageShell.tsx
│   ├── Footer.tsx
│   └── ThemeToggle.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── SectionHeader.tsx
│   ├── PromptChip.tsx
│   └── InsightCard.tsx
├── sections/
│   ├── HeroSection.tsx
│   ├── LLMInterface.tsx
│   ├── FeaturedWork.tsx
│   ├── AboutTeaser.tsx
│   ├── ResearchTeaser.tsx
│   ├── ReadinessTeaser.tsx
│   └── CollaborateCTA.tsx
├── readiness/
│   ├── ReadinessCheck.tsx
│   ├── QuestionScreen.tsx
│   ├── ProgressBar.tsx
│   ├── AuthGate.tsx
│   └── ResultScreen.tsx
├── contact/
│   └── ContactForm.tsx
lib/
├── supabase/
│   ├── client.ts                # Browser Supabase client
│   └── server.ts                # Server Supabase client
├── api.ts                       # API helper functions
├── analytics.ts                 # Event tracking helper
├── theme.ts                     # Theme context provider
└── types.ts                     # Shared TypeScript interfaces
```

---

## 2. Design Tokens

### 2.1 CSS Custom Properties

All colour values are defined as CSS custom properties on `:root` (light) and `.dark` (dark). Theme is toggled by adding/removing the `dark` class on `<html>`.

```css
/* app/globals.css */

:root {
  /* Backgrounds */
  --bg-primary: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F1F5F9;

  /* Text */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;

  /* Accent */
  --accent-primary: #0284C7;
  --accent-hover: #0369A1;
  --accent-subtle: rgba(2, 132, 199, 0.08);

  /* Borders */
  --border-default: rgba(148, 163, 184, 0.25);
  --border-accent: rgba(2, 132, 199, 0.3);

  /* Effects */
  --glow-accent: rgba(2, 132, 199, 0.10);

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dark {
  --bg-primary: #0F172A;
  --bg-surface: #1E293B;
  --bg-elevated: #334155;

  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;

  --accent-primary: #0EA5E9;
  --accent-hover: #38BDF8;
  --accent-subtle: rgba(14, 165, 233, 0.12);

  --border-default: rgba(148, 163, 184, 0.15);
  --border-accent: rgba(14, 165, 233, 0.4);

  --glow-accent: rgba(14, 165, 233, 0.08);

  --shadow-card: none;
}
```

### 2.2 Tailwind Configuration Extension

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        border: {
          default: 'var(--border-default)',
          accent: 'var(--border-accent)',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        'hero': ['clamp(2.125rem, 5vw, 3.75rem)', { lineHeight: '1.08' }],
        'h2': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2' }],
        'h3': ['clamp(1.125rem, 2vw, 1.5rem)', { lineHeight: '1.3' }],
        'body': ['clamp(0.9375rem, 1.5vw, 1.125rem)', { lineHeight: '1.6' }],
        'small': ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.5' }],
        'mono': ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.4' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '80px',
      },
      borderRadius: {
        'control': '14px',
        'content': '18px',
        'vessel': '24px',
        'shell': '30px',
        'pill': '999px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
      },
      maxWidth: {
        'shell': '1400px',
        'content': '1200px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2.3 Typography Scale Summary

| Element | Desktop | Mobile | Weight | Font |
|---------|---------|--------|--------|------|
| H1 Hero | 52–60px | 34–40px | 700 | Plus Jakarta Sans |
| H2 Section | 32–36px | 24–28px | 700 | Plus Jakarta Sans |
| H3 Card title | 20–24px | 18–20px | 600 | Plus Jakarta Sans |
| Body | 16–18px | 15–16px | 400 | Plus Jakarta Sans |
| Small / meta | 13–14px | 12–13px | 400 | Plus Jakarta Sans |
| Monospace | 13–14px | 12–13px | 400 | JetBrains Mono |

All sizes use `clamp()` for fluid scaling between breakpoints as defined in the Tailwind `fontSize` extension.

---

## 3. Page Inventory

### 3.1 Home — `/`

| Property | Value |
|----------|-------|
| Route | `/` |
| Layout | `PageShell` |
| Data fetched | `GET /content/home` (SSR), `GET /content/projects?featured=true` (SSR, 3 items) |
| Auth | None |
| Key sections | `HeroSection`, `LLMInterface`, `FeaturedWork`, `AboutTeaser`, `ResearchTeaser`, `ReadinessTeaser`, integrated `Footer` |
| Desktop | After `ResearchTeaser`, render `ReadinessTeaser` as the desktop homepage readiness strip. The strip CTA is right-aligned, routes to `/readiness`, and the integrated `Footer` renders immediately after the strip. |
| Mobile | `Featured Work`, `About Thomas`, `Current Research`, and `Latest Insights` collapse into tappable title + chevron rows. `HeroSection`, `LLMInterface`, and `ReadinessTeaser` still render in full. Home ends with the `CollaborateCTA` row, then `MobileNav`; no standalone footer block renders on mobile home. |

### 3.2 About — `/about`

| Property | Value |
|----------|-------|
| Route | `/about` |
| Layout | `PageShell` |
| Data fetched | `GET /content/about` (SSR) |
| Auth | None |
| Key sections | Full-width content: heading, multi-paragraph biography, professional context (Park, IA&A), portrait image, relevant achievements |
| Mobile | Image stacked above text. Full-width layout, no sidebar. |

### 3.3 Projects List — `/projects`

| Property | Value |
|----------|-------|
| Route | `/projects` |
| Layout | `PageShell` |
| Data fetched | `GET /content/projects` (SSR) |
| Auth | None |
| Key sections | `SectionHeader` ("Projects"), grid of `Card` components (project variant) |
| Mobile | Single-column card stack. Cards full-width. |

### 3.4 Project Detail — `/projects/[slug]`

| Property | Value |
|----------|-------|
| Route | `/projects/[slug]` |
| Layout | `PageShell` |
| Data fetched | `GET /content/projects?slug=<slug>` (SSR) — returns a single-item `sections` array for the matching project. Returns 404 if slug not found. |
| Auth | None |
| Key sections | Project title, category tag, status badge, full markdown body, back link to `/projects` |
| Mobile | Full-width. Image above content. |

### 3.5 Research List — `/research`

| Property | Value |
|----------|-------|
| Route | `/research` |
| Layout | `PageShell` |
| Data fetched | `GET /content/research` (SSR) |
| Auth | None |
| Key sections | `SectionHeader` ("Research"), grid of `Card` components (research variant) |
| Mobile | Single-column card stack. |

### 3.6 Research Detail — `/research/[slug]`

| Property | Value |
|----------|-------|
| Route | `/research/[slug]` |
| Layout | `PageShell` |
| Data fetched | `GET /content/research` filtered by slug (SSR) |
| Auth | None |
| Key sections | Research title, theme tag, full markdown body, back link to `/research` |
| Mobile | Full-width. |

### 3.7 Insights List — `/insights`

| Property | Value |
|----------|-------|
| Route | `/insights` |
| Layout | `PageShell` |
| Data fetched | `GET /content/insights?page=1&perPage=10` (SSR), paginated |
| Auth | None |
| Key sections | `SectionHeader` ("Insights"), list of `InsightCard` components, pagination controls |
| Mobile | Single-column card stack. |

### 3.8 Insight Detail — `/insights/[slug]`

| Property | Value |
|----------|-------|
| Route | `/insights/[slug]` |
| Layout | `PageShell` |
| Data fetched | `GET /content/insights` filtered by slug (SSR) |
| Auth | None |
| Key sections | Insight title, publication date, tags, full markdown body, back link to `/insights` |
| Mobile | Full-width. |

### 3.9 Contact — `/contact`

| Property | Value |
|----------|-------|
| Route | `/contact` |
| Layout | `PageShell` |
| Data fetched | None (form-only page). Pre-fill data read from URL query params and Supabase session if present. |
| Auth | None |
| Key sections | Page heading, `ContactForm`, ReadinessTeaser CTA (if visitor hasn't completed one) |
| Mobile | Full-width form. All inputs stack vertically. |

**Query params for pre-fill:**

| Param | Maps to field | Source |
|-------|--------------|-------|
| `source` | `source` hidden field | `readiness_check`, `llm`, or absent |
| `result` | contextual subject pre-fill | Result category key |

Name and email are **not** passed as query params. They are read exclusively from the Supabase auth session (see §8.3). This prevents PII from appearing in browser history, Referer headers, and server logs.

### 3.10 AI Readiness Check — `/readiness`

| Property | Value |
|----------|-------|
| Route | `/readiness` |
| Layout | `PageShell` (no nav bar visible during assessment — progress bar replaces it) |
| Data fetched | `GET /readiness-check/questions` (CSR on mount), `GET /readiness-check/session/:token` (CSR if returning session detected) |
| Auth | None for questions. Auth gate triggers after final answer. |
| Key sections | `ReadinessCheck` (manages full flow: abandonment detection → questions → auth gate → redirect to result) |
| Mobile | Full-width option buttons (min 48px height). Progress bar fixed top. "Next" button fixed bottom. |

### 3.11 Readiness Result — `/readiness/result`

| Property | Value |
|----------|-------|
| Route | `/readiness/result` |
| Layout | `PageShell` |
| Data fetched | `GET /readiness-check/result/:sessionToken` (CSR, requires auth) |
| Auth | Required — Supabase session must be active. If no session, redirect to `/readiness`. |
| Key sections | `ResultScreen` (category label, score, interpretation paragraph, next step, contextual CTA) |
| Mobile | Full-width card. CTA button full-width. |

### 3.12 Privacy Policy — `/privacy`

| Property | Value |
|----------|-------|
| Route | `/privacy` |
| Layout | `PageShell` |
| Data fetched | Static content (no API call) |
| Auth | None |
| Key sections | Static markdown-rendered privacy policy content |
| Mobile | Full-width text. |

### 3.13 Cookie Policy — `/cookies`

| Property | Value |
|----------|-------|
| Route | `/cookies` |
| Layout | `PageShell` |
| Data fetched | Static content (no API call) |
| Auth | None |
| Key sections | Static markdown-rendered cookie policy content |
| Mobile | Full-width text. |

---

## 4. Component Specifications

### 4.1 `<NavBar />`

**File:** `components/layout/NavBar.tsx`

```typescript
interface NavBarProps {
  currentPath: string;
}
```

**Behaviour:**
- Fixed to top of the `PageShell`, not the viewport.
- Background: `var(--bg-surface)` with `backdrop-filter: blur(8px)`.
- Height: 60px.
- Border bottom: `1px solid var(--border-default)`.
- Left: Simplified cog-derived SVG mark + "Thomas Hadden" text (links to `/`).
- Centre: Nav links — Home, About, Projects, Research, Insights, Contact. Font: 14px, `var(--text-secondary)`. Active link: `var(--accent-primary)` with underline indicator (2px, animated slide).
- Right: small primary capsule `Button` labelled "Ask Thomas AI" (scrolls to LLM section on home, or focuses the LLM input on other pages where present).
- Desktop homepage nav does **not** show `ThemeToggle` in v1.2. Theme switching is exposed via the desktop footer utility cluster instead.
- **Desktop only.** Hidden below 1024px breakpoint.

**States:**
- Default: semi-transparent background.
- Scrolled: increased background opacity via scroll listener.
- Active link: accent colour + underline.
- Hover on link: `var(--accent-primary)` colour transition, 200ms ease.

**Accessibility:**
- `<nav>` element with `aria-label="Main navigation"`.
- All links are `<a>` elements.
- Active link: `aria-current="page"`.
- Ask button: `aria-label` set.
- Full keyboard navigation with visible focus rings using `var(--border-accent)`.

---

### 4.2 `<MobileHeader />`

**File:** `components/layout/MobileHeader.tsx`

```typescript
interface MobileHeaderProps {
  currentPath: string;
}
```

**Behaviour:**
- Visible below 1024px breakpoint only.
- Fixed to top of viewport. Height: 48–52px.
- Background: `var(--bg-surface)` with subtle border beneath.
- Left: Cog mark + "Thomas Hadden" wordmark.
- Right: "Ask" pill button (accent background, white text, border-radius 20px) + `ThemeToggle` icon.

**Accessibility:**
- `<header>` element with `role="banner"`.
- Ask pill: `aria-label="Ask the AI assistant"`.

---

### 4.3 `<MobileNav />`

**File:** `components/layout/MobileNav.tsx`

```typescript
interface MobileNavProps {
  currentPath: string;
}
```

**Behaviour:**
- Fixed bottom bar. Visible below 1024px only.
- 5 items: Home, Projects, Research, Insights, Contact.
- Each item: icon (Lucide or custom SVG, 20px) above label (11px).
- Active item: icon and label in `var(--accent-primary)`. Inactive: `var(--text-muted)`.
- Background: `var(--bg-surface)` with top border `1px solid var(--border-default)`.
- Height: 56–64px. Items evenly distributed across width.
- Minimum tap target: 44×44px per item.
- About page is not in the bottom nav — accessible from Home content and footer links.

**Accessibility:**
- `<nav>` element with `aria-label="Mobile navigation"`.
- Each item is an `<a>` with `aria-current="page"` when active.
- All icons have `aria-hidden="true"`; labels are the accessible names.

---

### 4.4 `<PageShell />`

**File:** `components/layout/PageShell.tsx`

```typescript
interface PageShellProps {
  children: React.ReactNode;
  hideNav?: boolean; // true during readiness check flow
}
```

**Behaviour:**
- Wraps all page content.
- Max width: 1400px. Centred with auto margins.
- Outer margin: 16–24px on desktop, 0 on mobile.
- Outer border radius: 24–32px on desktop, 0 on mobile.
- Inner padding: 32–48px desktop, 16–24px mobile.
- Background: `var(--bg-primary)`.
- Contains `NavBar` (desktop), `MobileHeader` (mobile), page content `{children}`, `MobileNav` (mobile), and a route-aware footer treatment.
- Home route: desktop renders `ReadinessTeaser` as a horizontal readiness strip after `ResearchTeaser` and before the integrated lower-shell `Footer`. The strip CTA is anchored on the right side of the strip and navigates to `/readiness`. Mobile home suppresses the standalone footer block, collapses `Featured Work`, `About Thomas`, `Current Research`, and `Latest Insights` into navigational rows, and ends with `CollaborateCTA` row + `MobileNav`.
- Inner pages: standard footer remains available across breakpoints.
- When `hideNav` is true, `NavBar` and `MobileNav` are not rendered (used during readiness check).

---

### 4.5 `<Card />`

**File:** `components/ui/Card.tsx`

```typescript
interface CardProps {
  variant: 'project' | 'research' | 'insight';
  title: string;
  summary: string;
  slug: string;
  imageUrl?: string;
  tags?: string[];
  category?: string;
  status?: string;
  location?: string;
  publishedAt?: string;
  theme?: string;
}
```

**Variants:**
- **project**: Image top slot (16:9 aspect ratio), title (H3), summary (2–3 lines, `text-secondary`), location/category tag (monospace, `text-muted`).
- **research**: Image top slot (3:2 aspect ratio), title (H3), summary, theme tag.
- **insight**: No image. Title (H3), summary, tags as pills, published date (`text-muted`, monospace).

**Shared styling:**
- Background: `var(--bg-surface)`.
- Border: `1px solid var(--border-default)`.
- Border radius: 18px (`content-card` family).
- Padding: 20–24px (below image if present).
- Shadow: `var(--shadow-card)` (light mode only).
- Hover: border transitions to `var(--border-accent)`, `translateY(-2px)`, 200ms ease.
- Image: rounded top corners matching card radius, `object-fit: cover`, cool technical grading, low-clutter art direction.

These cards are homepage and inner-page content cards only. The homepage LLM uses a dedicated vessel surface rather than the shared `Card` treatment.

**States:**
- Default: as described.
- Hover: border accent + subtle lift.
- Focus: `var(--border-accent)` focus ring (2px offset).
- Loading: skeleton placeholder matching card dimensions.

**Mobile:**
- Full-width, single column.
- Image aspect ratios preserved.
- No hover lift on touch devices (remove via `@media (hover: hover)`).

**Accessibility:**
- Entire card is wrapped in `<a>` linking to detail page.
- `<article>` element inside.
- Image has descriptive `alt` text from content.
- Focus ring visible on keyboard navigation.

---

### 4.6 `<Button />`

**File:** `components/ui/Button.tsx`

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}
```

**Variants:**

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| primary | `var(--accent-primary)` | `#FFFFFF` | none |
| secondary | transparent | `var(--accent-primary)` | `1px solid var(--accent-primary)` |
| ghost | transparent | `var(--text-secondary)` | none |

**Shared:**
- Height: 40px (sm), 44px (md default), 48px (lg).
- Horizontal padding: 16px (sm), 20px (md), 24px (lg).
- Border radius: 14px by default; primary and secondary buttons may render as full capsules on hero, nav CTA, readiness strip, and mobile launcher surfaces.
- Font: 14–15px, weight 500.
- Transition: background-color and border-color, 200ms ease.

**States:**
- Hover (primary): background `var(--accent-hover)`.
- Hover (secondary): background `var(--accent-subtle)`.
- Hover (ghost): text `var(--text-primary)`.
- Disabled: opacity 0.5, `cursor: not-allowed`.
- Loading: text replaced with spinner (14px, `var(--accent-primary)` or white).
- Focus: 2px `var(--border-accent)` focus ring.

**Renders as `<a>` when `href` is provided, `<button>` otherwise.**

---

### 4.7 `<LLMInterface />`

**File:** `components/sections/LLMInterface.tsx`

Full specification in §5. Props:

```typescript
interface LLMInterfaceProps {
  variant: 'homepage' | 'standalone';
}
```

For `variant: 'homepage'`, the component must render the v1.2 showcase treatment:

- Desktop: dedicated vessel surface plus companion answer preview card
- Mobile: compact launcher / suggestion bar plus separate answer carousel card
- Shared interaction contract: query submission, streaming, error handling, and readiness routing remain identical across both visual variants

---

### 4.8 `<PromptChip />`

**File:** `components/ui/PromptChip.tsx`

```typescript
interface PromptChipProps {
  label: string;
  onClick: (label: string) => void;
}
```

**Styling:**
- Background: `var(--accent-subtle)`.
- Border: `1px solid var(--border-accent)`.
- Border radius: 20px (full pill).
- Text: 13–14px, font-mono, `var(--accent-primary)`.
- Padding: 8px 16px.

On homepage mobile, only one suggestion chip / launcher prompt is visible at a time.

**States:**
- Default: as described.
- Hover: background opacity increase to ~0.2, subtle scale (1.02).
- Focus: 2px `var(--border-accent)` focus ring.
- Active (pressed): scale 0.98.

**Accessibility:**
- `<button>` element.
- `aria-label` set to full prompt text.

---

### 4.9 `<ReadinessCheck />`

**File:** `components/readiness/ReadinessCheck.tsx`

Full specification in §6. No external props — manages its own state.

---

### 4.10 `<ContactForm />`

**File:** `components/contact/ContactForm.tsx`

Full specification in §8. Props:

```typescript
interface ContactFormProps {
  prefill?: {
    name?: string;
    email?: string;
    enquiryType?: string;
    subject?: string;
    source?: string;
  };
}
```

---

### 4.11 `<ThemeToggle />`

**File:** `components/layout/ThemeToggle.tsx`

```typescript
// No props — reads and writes theme from context
```

**Behaviour:**
- Icon button: moon icon (dark mode active) or sun icon (light mode active).
- On click: toggles `dark` class on `<html>`, stores preference in `localStorage` under `theme`.
- On page load: reads `localStorage.theme`, falls back to `prefers-color-scheme` media query, defaults to dark.
- Size: 36px tap target. Icon: 18px.
- Placement: visible in the mobile header and in desktop footer utility areas. It is not shown in the desktop homepage nav bar in v1.2.

**States:**
- Default: `var(--text-secondary)`.
- Hover: `var(--text-primary)`.
- Icon transitions with 200ms cross-fade.

**Accessibility:**
- `<button>` element.
- `aria-label`: "Switch to light mode" / "Switch to dark mode" (dynamic).

---

### 4.12 `<Footer />`

**File:** `components/layout/Footer.tsx`

```typescript
// No props
```

**Behaviour:**
- Desktop homepage: integrated lower-shell bar directly below the readiness strip.
- On the desktop home route, this footer renders immediately after `ReadinessTeaser`; no other homepage block sits between the strip and the footer.
- Desktop content: IA&A brand mark + "Thomas Hadden" wordmark, links — About, Privacy, Cookies, Contact — lightweight social icons, and `ThemeToggle` utility.
- Border top: `1px solid var(--border-default)`.
- Padding: 24px vertical.
- Background: `var(--bg-primary)`.

**Mobile home:** Not rendered as a standalone footer block.

**Inner pages:** Standard footer remains available. On mobile inner pages it can use a simplified stacked layout.

**Accessibility:**
- `<footer>` element.
- All links have descriptive text.
- Social links: `aria-label="LinkedIn profile"`.

---

### 4.13 `<InsightCard />`

**File:** `components/ui/InsightCard.tsx`

```typescript
interface InsightCardProps {
  title: string;
  summary: string;
  slug: string;
  tags?: string[];
  publishedAt?: string;
}
```

**Behaviour:** Text-only card. No image. Title, summary (2–3 lines), tag pills, date. Uses same base card styling as `Card` insight variant.

---

### 4.14 `<HeroSection />`

**File:** `components/sections/HeroSection.tsx`

```typescript
// No props — content is static
```

**Content:**
- Heading: "Thomas Hadden" — H1, bold, hero size.
- Subheading: "Industrial AI, Automation, and Research" — `var(--accent-primary)`.
- Metadata row: inline text — "Park Electrical Belfast" | divider | "Industrial AI Research".
- Primary CTA: "Explore AI" — primary button, scrolls to LLM section.
- Secondary CTA: "View Projects" — secondary button, links to `/projects`.
- Layout: centred, single column.
- Vertical padding: 88–112px top, 68–80px bottom on desktop. 48–64px top, 32–48px bottom on mobile.
- Background: visible but subordinate CSS-only technical linework / circuit pattern with localized haze support.

---

### 4.15 `<SectionHeader />`

**File:** `components/ui/SectionHeader.tsx`

```typescript
interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string; // defaults to "View all →"
}
```

**Behaviour:**
- Left-aligned H2 title.
- Optional right-aligned "View all →" link in `var(--text-secondary)`.
- Thin spacing beneath (16px) before content.
- Mobile: view-all link beneath title on its own line.

---

## 5. LLM Interface — Full Interaction Spec

### 5.1 Component Structure

The `LLMInterface` component keeps one interaction model but exposes two homepage presentation variants.

**Desktop homepage variant (`variant="homepage"` at desktop breakpoint):**
- `ShowcaseVessel` wrapper: centered centerpiece surface with vessel radius, localized edge luminance, and deeper padding than `Card`
- Heading group: title "Targeted answers on AI, industry, and my work" with a one-line subtitle
- `PromptRow`: large prompt field, search icon left, visible "Ask" button docked right
- `PromptChipRail`: 3–4 low-density `PromptChip` controls in a single controlled row
- `AnswerPreviewCard`: separate companion content card below the vessel, with question-header row and bullet list

**Mobile homepage variant (`variant="homepage"` below desktop breakpoint):**
- `PromptLauncherBar`: compact launcher / suggestion bar rather than a full text-input-first form
- Visible controls: one launcher suggestion plus an icon-only submit control
- `AnswerPreviewCarousel`: separate swipeable card beneath the launcher
- `CarouselDots`: centered beneath the answer card with one active state

**Standalone variant (`variant="standalone"`):**
- Standard query + response layout for non-home contexts

**Suggested prompt chips (desktop):**
1. "How can AI help an engineering business?"
2. "What is Thomas working on?"
3. "Where does AI fit into industry?"
4. "What is RAG?"

### 5.2 Session Management

On component mount, generate or retrieve an anonymous session ID:

```typescript
function getOrCreateLLMSession(): string {
  let sessionId = sessionStorage.getItem('llm_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('llm_session_id', sessionId);
  }
  return sessionId;
}
```

This session ID is passed with every query for grouping in `llm_query_log`. It is per-tab, not persisted across browser sessions. It is never linked to auth identity.

### 5.3 Query Submission

On submit (button click, Enter key, or chip click):

1. Validate input: minimum 3 characters, maximum 500 characters. Show inline error if invalid.
2. Set loading state.
3. Call `POST /v1/llm/query` with:

```typescript
{
  query: inputValue,
  stream: true,
  sessionId: llmSessionId,
  context: {
    source: chipClicked ? 'homepage_chip' : 'homepage_input'
  }
}
```

4. Open SSE connection for streaming response.

### 5.4 Streaming Rendering

The response is rendered via Server-Sent Events. Implementation:

```typescript
const response = await fetch('/api/llm/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let fullAnswer = '';
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  // Split on double-newline (SSE event terminator). Process only complete events.
  const events = buffer.split('\n\n');
  buffer = events.pop() || ''; // Last element may be incomplete — keep in buffer

  for (const event of events) {
    const line = event.trim();
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));

    if (data.error) {
      setError(data.code);
      setIsStreaming(false);
      return;
    }

    if (data.chunk) {
      fullAnswer += data.chunk;
      setAnswer(fullAnswer); // React state update → re-render
    }

    if (data.done) {
      setQueryType(data.queryType);
      setSources(data.sources || []);
      setSuggestedActions(data.suggestedActions || []);
      setIsStreaming(false);
    }
  }
}
```

**Buffering note:** SSE chunks may arrive split across `read()` calls. A single `read()` may deliver a partial JSON line, or multiple complete events. The code above accumulates data into a buffer and only parses after splitting on the `\n\n` event terminator. The final array element (which may be an incomplete event) is retained in the buffer for the next iteration.

**Proxy streaming requirement:** The Next.js API route at `/api/llm/query` must forward the upstream SSE stream to the client without buffering. The proxy route must:

- Set response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Use a `ReadableStream` passthrough — pipe the upstream response body directly to the client response
- Not `await` the full upstream response before returning — the response must begin streaming immediately when the first chunk arrives from the backend
- Enforce a maximum stream duration of **30 seconds**. If the upstream stream has not sent a completion or error event within 30 seconds, the proxy closes the stream. The frontend treats this as a stream interruption (see §5.7, "Stream interrupted" row).

**Rendering rules:**
- Text appears progressively as chunks arrive.
- A blinking cursor indicator appears at the end of the last chunk while streaming.
- No layout shift: the answer container has `min-height` set to prevent CLS.
- Markdown is rendered using `react-markdown` with `rehype-sanitize`.
- **Allowed elements:** `p`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `code`, `pre`, `h3`, `h4`. All other elements — including raw HTML and `img` — are stripped.
- **Link safety:** All links in rendered markdown use `rel="noopener noreferrer"` and `target="_blank"`. Links with `javascript:` URIs are rejected and not rendered.
- **No image rendering:** `img` elements in LLM markdown output are stripped. Images are never rendered from LLM responses.
- On stream completion, sources and suggested actions fade in below the answer (200ms ease).

### 5.5 Prompt Chip Behaviour

On chip click:
1. Populate input field with the chip's label text.
2. Auto-submit immediately (no second click required).
3. Chip becomes visually inactive (opacity 0.5) once used.
4. Scroll to the answer area if below fold.

On homepage mobile, the launcher suggestion follows the same submit behaviour, but only one visible suggestion is rendered at a time.

### 5.6 Loading State

While waiting for the first token (target < 1.5s):
- Input field is disabled.
- Chips are disabled.
- A typing indicator appears in the answer area: three animated dots in `var(--accent-primary)`.
- The answer area is reserved with `min-height: 200px` to prevent layout shift.

### 5.7 Error States

| Error | UI Response |
|-------|-------------|
| `LLM_ERROR` (500) | "I'm having a moment — please try again in a few seconds." displayed in the answer area. Retry button. |
| `SERVICE_UNAVAILABLE` (503) | "This feature is temporarily unavailable. The rest of the site works normally — try again later." No retry button. No countdown. LLM input disabled. |
| `OUT_OF_SCOPE` (400) | Natural redirect message displayed as the answer (from backend redirect pool). No retry button. |
| `CONTENT_FILTERED` (400) | Same as out-of-scope — natural redirect. |
| `RATE_LIMITED` (429) | "You've been asking great questions — give me a moment and try again shortly." Input disabled. Countdown timer showing `retryAfter` seconds from the response header. |
| Network error | "Connection lost. Please check your connection and try again." Retry button. |
| Stream interrupted | Partial answer displayed. Append: "I was interrupted — try asking again." Retry button. |
| SSE error event | Handled inline: if the SSE stream delivers `{"error": true, "code": "SERVICE_UNAVAILABLE", ...}`, display the `message` field in the answer area. Same treatment as the 503 row above. |

### 5.8 Sources Rendering

When the final SSE event includes `sources`, render below the answer:

```typescript
interface Source {
  title: string;
  url: string;
  relevance: number;
}
```

- Only show sources with `relevance > 0.8`.
- **URL validation:** Source URLs must begin with `/` (internal site paths only). Any source with a URL that does not match this pattern is silently dropped and not rendered. This prevents external or malicious URLs from appearing in source links.
- Render as small linked pills: title text, linking to `url`.
- All source links render with `rel="noopener noreferrer"`.
- Style: `var(--text-muted)`, font-small, underline on hover.
- Fade in after stream completes.

### 5.9 Suggested Actions Rendering

When the final SSE event includes `suggestedActions`, render below sources:

```typescript
interface SuggestedAction {
  type: 'readiness_check' | 'contact' | 'page_link';
  label: string;
  url: string;
}
```

- Render as secondary `Button` components.
- `readiness_check` type: accent-subtle background with accent border.
- `contact` type: ghost button style.
- Fade in after stream completes.

### 5.10 Rate Limit Handling

The LLM endpoint allows 10 requests per minute per IP. On 429 response:
1. Parse `Retry-After` header (seconds).
2. Disable input and chips.
3. Show countdown timer in the submit button area.
4. Re-enable on countdown completion.
5. Do not clear the previous answer — keep it visible.

### 5.11 Answer Preview Card (Static)

The static preview card on the homepage renders without any API call. In desktop showcase mode it is a dedicated companion content card beneath the vessel; in mobile showcase mode it is a swipeable carousel. Content is hardcoded:

**Question:** "How can AI help an engineering business?"

**Answer preview content:**
- Automate repetitive reporting and data entry tasks
- Improve quality control through predictive analytics
- Optimise scheduling and resource allocation
- Analyse operational data to identify cost savings
- Enhance customer communication with intelligent workflows
- Support decision-making with real-time dashboards

**Desktop header treatment:** small icon left of the question text, then a short divider or spacing break before bullets.

**Mobile carousel:** 2–3 preview cards, swipeable, with dot pagination indicators beneath the card. Each shows a different sample Q&A.

---

## 6. AI Readiness Check — Full Interaction Spec

### 6.1 Session Token Generation

On first visit to `/readiness` (no existing token in `localStorage`):

```typescript
const sessionToken = crypto.randomUUID();
localStorage.setItem('readiness_session_token', sessionToken);
localStorage.setItem('readiness_session_started', new Date().toISOString());
```

### 6.2 Session Creation

After token generation, create the session on the backend:

```
POST /v1/readiness-check/session
Body: { "sessionToken": "<uuid>" }
```

This creates a `readiness_sessions` row with `status: 'in_progress'`.

### 6.3 Abandonment Detection

On page load at `/readiness`, before rendering any question:

1. Check `localStorage` for `readiness_session_token`.
2. If not found → start fresh (§6.1).
3. If found → check staleness:
   ```typescript
   const started = localStorage.getItem('readiness_session_started');
   const ageHours = (Date.now() - new Date(started!).getTime()) / 1000 / 60 / 60;
   if (ageHours > 24) {
     localStorage.removeItem('readiness_session_token');
     localStorage.removeItem('readiness_session_started');
     // Start fresh
   }
   ```
4. If not stale → fetch session state:
   ```
   GET /v1/readiness-check/session/:token
   ```
5. Response shape:
   ```typescript
   interface SessionState {
     sessionToken: string;
     status: 'in_progress' | 'completed';
     answeredQuestions: number[];  // indices of answered questions
     nextQuestionIndex: number;
     totalQuestions: number;
   }
   ```
6. If `status === 'completed'` → redirect to auth gate or `/readiness/result`.
7. If `status === 'in_progress'` and `answeredQuestions.length > 0` → show continue/restart prompt.
8. If `status === 'in_progress'` and `answeredQuestions.length === 0` → start from question 1.

### 6.4 Continue vs Restart Prompt

Rendered as a centred card:

> **Continue where you left off?**
> You've answered {n} of 7 questions. Pick up from where you stopped, or start again from the beginning.
>
> `[Continue]` (primary) `[Start again]` (secondary)

- **Continue:** resume from `nextQuestionIndex`.
- **Start again:** clear `localStorage` token, generate new token, create new session. Old session is retained in the database with status `abandoned` after 30 days.

### 6.5 Questions Fetch

On assessment start, fetch the full question set:

```
GET /v1/readiness-check/questions
```

Response is cached in component state. Shape:

```typescript
interface QuestionSet {
  version: string;
  questions: Question[];
  totalQuestions: number;
  estimatedMinutes: number;
}

interface Question {
  id: string;
  order: number;
  text: string;
  type: 'single_choice';
  options: Option[];
}

interface Option {
  id: string;
  label: string;
}
```

### 6.6 Question Rendering

One question per screen. Forward-only navigation — no back button in V1.

**Layout:**
- Progress bar at top (see §6.7).
- Question text: H2 style, centred or left-aligned, max 600px width.
- Options: full-width buttons stacked vertically, 48px minimum height, 12px gap between.
- "Next" button: primary style, bottom of viewport on mobile, below options on desktop. Disabled until an option is selected.

**On option selection:**
1. Selected option gets accent border and `var(--accent-subtle)` background. Other options return to default.
2. Immediately submit the answer to the backend (do not wait for "Next"):
   ```
   POST /v1/readiness-check/answer
   Body: {
     "sessionToken": "<uuid>",
     "questionId": "<question.id>",
     "optionId": "<option.id>"
   }
   ```
3. "Next" button becomes enabled.
4. On "Next" click → advance to next question.
5. On final question: "Next" label changes to "See my results". On click → submission + transition to auth gate.

### 6.7 Progress Bar

**File:** `components/readiness/ProgressBar.tsx`

```typescript
interface ProgressBarProps {
  answeredCount: number;
  totalQuestions: number;
}
```

**Calculation:** `width = (answeredCount / totalQuestions) * 100 + '%'`.

**Styling:**
- Full width, 4px height.
- Background track: `var(--border-default)`.
- Fill: `var(--accent-primary)`.
- Transition: width 300ms ease.
- Fixed to top of the question area (below mobile header if present).

**The progress bar updates after answer submission (§6.6 step 2), not on selection.** This means the bar reflects confirmed answers.

### 6.8 Completion — Auth Gate Transition

When the final answer is submitted:

1. Backend returns a completion acknowledgement (not the result — that requires auth).
2. Response shape:
   ```typescript
   { success: true, data: { isComplete: true } }
   ```
3. Show brief loading state: "Calculating your results…" (spinner + text, 1–2 seconds).
4. Transition to the auth gate screen.

### 6.9 Auth Gate Screen

**File:** `components/readiness/AuthGate.tsx`

**Content:**

> **Your results are ready.**
> Sign in to view your AI Readiness score and recommended next steps. It takes seconds and your result will be saved to your profile.

- `[Continue with LinkedIn]` — primary button style, LinkedIn icon left.
- `[Continue with Email]` — secondary button style, email icon left.

**Below buttons:** subtle text: "Your information is only used to deliver your results."

**Below subtle text:** a keyboard-focusable link: "Back to assessment start" — ghost style, `var(--text-muted)`. Clicking this link clears `readiness_session_token` and `readiness_session_started` from `localStorage` and navigates to `/readiness`. This provides an exit path for users who do not wish to authenticate, including keyboard-only users who cannot escape the focus trap by other means.

**Behaviour:**
- LinkedIn click → triggers Supabase LinkedIn OAuth (see §7).
- Email click → shows email input field with "Send sign-in link" button.
- Email submission → calls Supabase `signInWithOtp({ email })`.
- On successful auth (either method) → redirect to `/readiness/result`.

**Error states:**
- Auth dismissed / cancelled: remain on auth gate screen. No data lost.
- LinkedIn denied by user: soft message "LinkedIn sign-in was cancelled. Try again or use email instead."
- Magic link expired: "That link has expired. Enter your email to receive a new one."
- Session not found after auth: "Something went wrong. Would you like to start the assessment again?" with restart button.
- Session > 24h old: "Your session has expired. Start a fresh assessment to get your results." with restart button.

### 6.10 Result Screen

**File:** `components/readiness/ResultScreen.tsx`

Renders on `/readiness/result` after authenticated result fetch.

On mount, the component performs a two-step sequence:

1. **Link session:** Read `readiness_session_token` from `localStorage`. Call `POST /v1/readiness-check/link-session` with the JWT and session token (see §7.5). This associates the anonymous session with the authenticated user.
2. **Fetch result:** Call `GET /v1/readiness-check/result/:sessionToken` with the JWT. The backend verifies that the authenticated user's `user_id` matches the `user_id` linked to the session.

If the link call succeeds but the result fetch fails, show an error. If no `readiness_session_token` is found in `localStorage`, show the "session not found" error state (see §6.9 error states).

```
GET /v1/readiness-check/result/:sessionToken
Authorization: Bearer <jwt>
```

Response shape:

```typescript
interface ReadinessResult {
  resultId: string;
  category: 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';
  categoryLabel: string;
  score: number;       // 0–100
  summary: string;     // interpretation paragraph
  nextStep: string;    // suggested next step paragraph
  cta: {
    label: string;
    url: string;       // e.g. "/contact?source=readiness_check&result=ready_to_pilot"
  };
}
```

**Layout:**
- Category label: H2, `var(--accent-primary)`.
- Score: large number (48px) with "/100" suffix in `var(--text-muted)`.
- Interpretation: body text paragraph.
- Next step: body text paragraph, slightly emphasised.
- CTA button: primary, full-width on mobile. Links to contact page with pre-fill query params.
- Below CTA: secondary link "Retake assessment" (clears token, redirects to `/readiness`).

**Pre-fill contact from result:**

The CTA `url` includes non-PII query params only. On `/contact` page load, these are parsed and passed to `ContactForm` as `prefill`. Name and email are read from the Supabase auth session, not from query params (see §8.3).

| Query param | Contact field | Value |
|------------|--------------|-------|
| `source` | `source` | `readiness_check` |
| `result` | `subject` | `"AI Readiness follow-up"` |

Enquiry type is pre-selected as `business_enquiry`. Name and email are pre-filled from `supabase.auth.getUser()` if a session is active.

---

## 7. Auth Flow — Frontend Perspective

### 7.1 Supabase Client Initialisation

**Browser client** — `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server client** — `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### 7.2 LinkedIn OAuth

Triggered from the auth gate `[Continue with LinkedIn]` button:

```typescript
const supabase = createClient();
await supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    redirectTo: `${window.location.origin}/auth/callback?next=/readiness/result`,
    scopes: 'openid profile email',
  },
});
```

This redirects the browser to LinkedIn. After approval, LinkedIn redirects to Supabase's callback URL, which then redirects to `/auth/callback`.

### 7.3 Email Magic Link

Triggered from the auth gate `[Continue with Email]` button:

1. Show email input field.
2. On submit:
   ```typescript
   const supabase = createClient();
   const { error } = await supabase.auth.signInWithOtp({
     email: emailValue,
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback?next=/readiness/result`,
     },
   });
   ```
3. On success: show confirmation message "Check your email for a sign-in link."
4. On error: show inline error.

### 7.4 Auth Callback Handler

**File:** `app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/';

  // Validate `next` to prevent open redirect — must be a relative internal path
  const next = /^\/[a-z]/.test(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/readiness?error=auth_failed`);
}
```

The callback exchanges the OAuth code for a Supabase session and redirects to the result page. It does **not** perform session linking — that is handled client-side on `/readiness/result` (see §7.5).

The `readiness_session_token` is stored in `localStorage`, which is not accessible in a server-side route handler. Therefore, session linking must happen after the redirect, in the browser, where `localStorage` is available.

**Open redirect prevention:** The `next` parameter is validated against the pattern `^/[a-z]` (must start with `/` followed by a lowercase letter). This ensures the redirect target is always a relative internal path. If the `next` value does not match — for example, `https://evil.com` or `//evil.com` — it defaults to `/`. This prevents an attacker from crafting a callback URL that redirects the user to an external site after authentication.

### 7.5 Session Token Linking

After the auth callback redirects to `/readiness/result`, the `ResultScreen` component performs session linking client-side:

```typescript
// On mount of /readiness/result page
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // No auth session — redirect back to /readiness
  router.push('/readiness');
  return;
}

const sessionToken = localStorage.getItem('readiness_session_token');

if (!sessionToken) {
  // No session token — cannot link. Show error, offer restart.
  setError('session_not_found');
  return;
}

// Link the anonymous session to the authenticated user
const linkResponse = await fetch('/api/readiness-check/link-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ sessionToken }),
});

if (!linkResponse.ok) {
  // Link failed — show error, offer restart
  setError('link_failed');
  return;
}

// Fetch the result
const resultResponse = await fetch(`/api/readiness-check/result/${sessionToken}`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

if (resultResponse.ok) {
  const { data } = await resultResponse.json();
  setResult(data);
} else {
  setError('result_fetch_failed');
}
```

**Link-session endpoint contract:**

```
POST /v1/readiness-check/link-session
Authorization: Bearer <jwt>
Body: { "sessionToken": "<uuid from localStorage>" }
```

The backend sets `user_id` on the `readiness_sessions` record. The `session_token` field is **retained** — it continues to serve as the lookup key for result retrieval.

If the session is already linked to the same `user_id`, the call is idempotent and returns success. If the session is already linked to a different `user_id`, the call returns `403 Forbidden`.

### 7.6 JWT Storage

Supabase JS client manages JWT storage automatically:
- Access token (JWT): stored in memory and as an HTTP-only cookie via `@supabase/ssr`.
- Refresh token: stored in an HTTP-only cookie.
- Token refresh is automatic — the client refreshes before expiry.

No custom JWT storage logic is needed.

### 7.7 Authenticated API Calls

For endpoints requiring auth (readiness result fetch), the Supabase client attaches the JWT automatically. For custom API routes that need the JWT:

```typescript
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('/api/readiness-check/result/' + token, {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
  },
});
```

### 7.8 Sign Out

Explicit sign-out is not a prominent V1 feature. Sessions expire after 30 days of inactivity. If sign-out is triggered (future feature):

```typescript
const supabase = createClient();
await supabase.auth.signOut();
```

---

## 8. Contact Form — Full Interaction Spec

### 8.1 Fields

| Field | HTML Type | Required | Validation |
|-------|----------|----------|------------|
| `name` | `<input type="text">` | Yes | 2–100 characters |
| `email` | `<input type="email">` | Yes | Valid email format (regex + native browser validation) |
| `enquiry_type` | `<select>` | Yes | Must match a valid key (no default selection) |
| `subject` | `<input type="text">` | No | Max 200 characters |
| `message` | `<textarea>` | Yes | 20–2000 characters |
| `honeypot` | `<input type="text">` | No | Must be empty |

### 8.2 Enquiry Type Options

| Key | Label |
|-----|-------|
| `business_enquiry` | AI in my business |
| `research_collaboration` | Research collaboration |
| `technical_enquiry` | Technical enquiry |
| `general` | General |

Default: no selection. Placeholder text: "What's this about?"

### 8.3 Pre-fill Behaviour

On `/contact` page load, read URL query params for non-PII context only:

```typescript
const params = useSearchParams();
const prefill = {
  source: params.get('source') || 'contact_page',
  subject: params.get('result') ? 'AI Readiness follow-up' : '',
  enquiryType: params.get('source') === 'readiness_check' ? 'business_enquiry' : '',
  name: '',
  email: '',
};
```

If a Supabase session is active, read name and email from the authenticated user:

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  prefill.name = user.user_metadata?.name || '';
  prefill.email = user.email || '';
}
```

Name and email are never read from URL query params. This prevents PII from leaking through browser history, Referer headers, server logs, and analytics.

All pre-filled values are editable.

### 8.4 Honeypot Implementation

Hidden field, invisible to humans, filled by bots:

```html
<div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
  <label htmlFor="website">Website</label>
  <input
    type="text"
    id="website"
    name="website"
    tabIndex={-1}
    autoComplete="off"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />
</div>
```

The `honeypot` field is named `website` in the DOM. Its value is sent as the `honeypot` field in the API request.

### 8.5 Validation

**Client-side validation** runs on blur (per field) and on submit (all fields):

| Field | Rule | Error message |
|-------|------|--------------|
| `name` | 2–100 chars | "Please enter your name (2–100 characters)" |
| `email` | Valid email format | "Please enter a valid email address" |
| `enquiry_type` | Must be selected | "Please select an enquiry type" |
| `message` | 20–2000 chars | "Your message must be between 20 and 2000 characters" |
| `subject` | Max 200 chars | "Subject must be 200 characters or fewer" |

**Error display:** red border on the input, error message text below the field in red (`#EF4444` light, `#F87171` dark). Errors clear on valid input.

### 8.6 Submission Flow

On form submit:

1. Run client-side validation. If errors, focus the first invalid field.
2. If honeypot is non-empty, simulate success (no API call). This matches backend behaviour.
3. Set loading state on submit button.
4. Call:
   ```
   POST /v1/contact/submit
   Body: {
     "name": "...",
     "email": "...",
     "subject": "...",
     "message": "...",
     "type": "business_enquiry",
     "source": "contact_page",
     "honeypot": ""
   }
   ```
5. On success: replace the form with the success state.
6. On error: display error and re-enable form.

### 8.7 Success State

On successful submission, the form is replaced with:

> **Thanks {name}, Thomas will be in touch shortly.**

The success message uses the `data.message` from the API response, which is personalised with the submitter's name. Below the message: a subtle "Submit another message" link that resets the form.

### 8.8 Error Handling

| Error | UI Response |
|-------|-------------|
| 422 `VALIDATION_ERROR` | Map `error.details` to field-level errors. Re-enable form. |
| 429 `RATE_LIMITED` | "You've already submitted recently. Please try again later." Disable submit button. |
| 500 `INTERNAL_ERROR` | "Something went wrong. Please try again or email thomas@ia-2.com directly." |
| Network error | "Connection lost. Please check your connection and try again." |

---

## 9. Routing & Navigation

### 9.1 Full Route Map

| Route | Page | Nav highlight |
|-------|------|--------------|
| `/` | Home | Home |
| `/about` | About | (no nav item — accessed via content) |
| `/projects` | Projects list | Projects |
| `/projects/[slug]` | Project detail | Projects |
| `/research` | Research list | Research |
| `/research/[slug]` | Research detail | Research |
| `/insights` | Insights list | Insights |
| `/insights/[slug]` | Insight detail | Insights |
| `/contact` | Contact | Contact |
| `/readiness` | AI Readiness Check | (no nav item) |
| `/readiness/result` | Readiness result | (no nav item) |
| `/privacy` | Privacy policy | (no nav item) |
| `/cookies` | Cookie policy | (no nav item) |
| `/auth/callback` | Auth callback (no UI) | — |

### 9.2 Active Nav State Logic

The active nav item is determined by matching the current pathname against the route prefixes:

```typescript
function getActiveNav(pathname: string): string | null {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/research')) return 'research';
  if (pathname.startsWith('/insights')) return 'insights';
  if (pathname === '/contact') return 'contact';
  return null;
}
```

Active state: `var(--accent-primary)` text colour with underline (desktop) or highlighted icon+label (mobile bottom nav).

### 9.3 Mobile Bottom Tab Bar

| Tab | Icon | Route |
|-----|------|-------|
| Home | House | `/` |
| Projects | Briefcase | `/projects` |
| Research | FlaskConical | `/research` |
| Insights | Lightbulb | `/insights` |
| Contact | Mail | `/contact` |

Icons from Lucide React (or custom SVG). 20px icon size. 11px label beneath. Minimum 44×44px tap target.

### 9.4 Back Navigation on Inner Pages

Detail pages (`/projects/[slug]`, `/research/[slug]`, `/insights/[slug]`) include a back link above the content:

- Text: "← Back to Projects" / "← Back to Research" / "← Back to Insights".
- Style: `var(--text-secondary)`, ghost button style.
- Links to the parent list page.

### 9.5 Scroll Restoration

Next.js App Router handles scroll restoration automatically. For anchor-based scrolling (e.g. "Explore AI" CTA scrolling to LLM section), use:

```typescript
document.getElementById('llm-section')?.scrollIntoView({ behavior: 'smooth' });
```

Respect `prefers-reduced-motion` — if enabled, use `behavior: 'auto'` (instant).

---

## 10. State Management

### 10.1 localStorage

| Key | Type | Purpose | Lifetime |
|-----|------|---------|----------|
| `theme` | `'dark' \| 'light'` | User theme preference | Persistent |
| `readiness_session_token` | UUID string | Anonymous readiness session ID | Cleared on completion or restart |
| `readiness_session_started` | ISO date string | Timestamp of session start | Cleared with token |

### 10.2 sessionStorage

| Key | Type | Purpose | Lifetime |
|-----|------|---------|----------|
| `llm_session_id` | UUID string | Anonymous LLM query grouping | Per tab, cleared on tab close |

### 10.3 React State (Component-Level)

| Component | State | Description |
|-----------|-------|-------------|
| `LLMInterface` | `query`, `answer`, `isStreaming`, `queryType`, `sources`, `suggestedActions`, `error`, `previewIndex` | Full LLM interaction state plus homepage preview carousel state |
| `ReadinessCheck` | `currentQuestionIndex`, `selectedOption`, `answeredQuestions`, `questions`, `sessionState`, `phase` (`questions` / `loading` / `auth_gate` / `complete`) | Assessment flow state |
| `ContactForm` | `formValues`, `errors`, `isSubmitting`, `isSubmitted` | Form state |
| `ThemeToggle` | theme context via `ThemeProvider` | Current theme |

### 10.4 Supabase Auth Session

Managed entirely by the Supabase JS client:
- Access token (JWT): memory + HTTP-only cookie.
- Refresh token: HTTP-only cookie.
- User metadata: available via `supabase.auth.getUser()`.
- Auto-refresh before expiry.

### 10.5 No Global State Library

V1 uses React state and React Context only. No Redux, Zustand, or Jotai. The only context provider is `ThemeProvider` for dark/light mode.

---

## 11. Environment Variables

### 11.1 Complete `.env.example`

```bash
# =============================================================================
# thomashadden.ai — Environment Variables
# =============================================================================
# Copy this file to .env.local and fill in the values.
# Variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
# All other variables are server-only.
# =============================================================================

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL (e.g. https://xxxx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=             # Supabase service role key — NEVER expose to client

# --- Site ---
NEXT_PUBLIC_SITE_URL=                  # Full site URL (e.g. https://thomashadden.ai)

# --- Azure AI Foundry ---
AZURE_OPENAI_ENDPOINT=                 # Azure AI Foundry endpoint URL
AZURE_OPENAI_API_KEY=                  # Azure AI Foundry API key
AZURE_LLM_DEPLOYMENT=                  # Primary LLM deployment name (e.g. gpt-4-5)
AZURE_CLASSIFIER_DEPLOYMENT=           # Intent classifier deployment name (e.g. gpt-4-5-mini)
AZURE_EMBEDDING_DEPLOYMENT=            # Embedding model deployment name (e.g. text-embedding-3-large)

# --- Auth ---
LINKEDIN_CLIENT_ID=                    # LinkedIn OAuth app client ID
LINKEDIN_CLIENT_SECRET=                # LinkedIn OAuth app client secret
AUTH_REDIRECT_URL=                     # Post-auth redirect (e.g. https://thomashadden.ai/readiness/result)

# --- Email (Resend) ---
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=                             # Resend API key
EMAIL_FROM=noreply@thomashadden.ai
CONTACT_NOTIFICATION_EMAIL=thomas@ia-2.com

# --- Application ---
ADMIN_API_KEY=                         # Internal admin API key
DATABASE_URL=                          # Direct PostgreSQL connection string (migrations only)
EMBEDDING_DIMENSIONS=3072
RAG_MATCH_THRESHOLD=0.75
RAG_MATCH_COUNT=5
READINESS_SESSION_EXPIRY_HOURS=24
LLM_DAILY_TOKEN_CAP=                   # Daily token budget hard limit
READINESS_QUESTION_VERSION=1.0
```

### 11.2 Client-Safe vs Server-Only Summary

| Variable | Client-safe |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `NEXT_PUBLIC_SITE_URL` | Yes |
| Everything else | No — server-only |

---

## 12. Performance Requirements

### 12.1 Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 90+ |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| LLM first token | < 1.5s |

### 12.2 Image Optimisation

- Use Next.js `<Image>` component for all images.
- Set explicit `width` and `height` props (or `fill` with `sizes`) on every image to prevent CLS.
- Project card images: 16:9 aspect ratio. Research card images: 3:2.
- Formats: WebP primary, AVIF where supported (handled by Next.js automatic optimisation).
- Lazy load all images below the fold: `loading="lazy"` (default for `<Image>`).
- Hero portrait on About: priority loaded (`priority` prop).

### 12.3 Font Loading

```typescript
// app/layout.tsx
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true,
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,  // secondary font, not preloaded
});
```

### 12.4 Code Splitting

- Inner pages (`/about`, `/projects`, `/research`, `/insights`, `/contact`, `/readiness`) are automatically code-split by Next.js App Router.
- `LLMInterface` streaming logic: dynamically imported with `next/dynamic` if not on the home page.
- `ReadinessCheck` component: dynamically imported on `/readiness` route.
- Third-party libraries (`react-markdown`, `rehype-sanitize`): dynamically imported. These are used for LLM response rendering (see §5.4) and are not included in the initial bundle.

### 12.5 Plausible Script

```html
<script defer data-domain="thomashadden.ai" src="https://plausible.io/js/script.js"></script>
```

- `defer` attribute ensures non-blocking load.
- Placed in `<head>` via `app/layout.tsx`.
- No impact on LCP or FCP.

### 12.6 API Call Deduplication & Caching

- Content endpoints (`GET /content/:page`) are called via React Server Components at build/request time. Next.js automatically deduplicates identical fetch calls within a single render pass.
- Content pages use ISR (Incremental Static Regeneration) with `revalidate: 60`. Pages are statically generated and revalidated in the background at most once per 60 seconds. This aligns with the backend `Cache-Control: public, max-age=60, stale-while-revalidate=300` headers on content endpoints.
- LLM queries: debounced — no duplicate submissions within 500ms.
- Readiness answer submissions: disabled button after click prevents double-submit.

### 12.7 Streaming Response — No Layout Shift

- The LLM answer container has `min-height: 200px` set before any content arrives.
- Answer text is appended incrementally. Container grows naturally — no jump.
- Sources and suggested actions appear below the answer after stream completes, with a fade-in transition (no sudden insertion).

---

## 13. Accessibility Requirements

### 13.1 Global Standards

- WCAG 2.1 AA compliance minimum.
- Colour contrast: 4.5:1 for body text, 3:1 for large text (≥24px or ≥18.66px bold) and UI components.
- All design token colours meet these thresholds in both light and dark modes.

### 13.2 Semantic HTML

Every page uses:
- `<nav>` for navigation bars.
- `<main>` for primary content area.
- `<section>` for major page sections (with `aria-label` or `aria-labelledby`).
- `<article>` for cards and content items.
- `<header>` for page/section headers.
- `<footer>` for the footer.

### 13.3 Skip-to-Content Link

First focusable element in the DOM:

```html
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-2 focus:bg-bg-surface focus:text-accent-primary focus:rounded-button">
  Skip to content
</a>
```

Target: `<main id="main-content">`.

### 13.4 Focus Management

- All interactive elements have visible focus rings: `outline: 2px solid var(--border-accent); outline-offset: 2px;`.
- After route transitions: focus is moved to the `<main>` element or the first `<h1>`.
- Readiness check question transitions: focus moves to the question text.
- LLM answer completion: focus remains on the answer area. Screen readers announced via `aria-live="polite"` region.
- Modal-like auth gate: focus trapped within the gate component. Escape key does not dismiss (result requires auth). A visible "Back to assessment start" link is keyboard-focusable within the focus trap, providing an exit path that clears the session token and navigates to `/readiness`. This ensures keyboard-only users are never trapped without an escape route.

### 13.5 ARIA Labels

| Element | ARIA attribute |
|---------|---------------|
| Desktop nav | `aria-label="Main navigation"` |
| Mobile bottom nav | `aria-label="Mobile navigation"` |
| Theme toggle | `aria-label="Switch to light/dark mode"` (dynamic) |
| "Ask" pill button | `aria-label="Ask the AI assistant"` |
| LLM input field | `aria-label="Ask a question about AI or Thomas's work"` |
| LLM answer area | `aria-live="polite"`, `role="region"`, `aria-label="AI response"` |
| Prompt chips | `aria-label` set to the full prompt text |
| Progress bar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Assessment progress"` |
| Readiness options | `role="radiogroup"` with `role="radio"` per option, `aria-checked` |
| Contact form fields | Associated `<label>` elements. `aria-describedby` for error messages. `aria-invalid="true"` on error. |
| Social links | `aria-label="LinkedIn profile"` etc. |

### 13.6 Keyboard Navigation

| Context | Keyboard behaviour |
|---------|-------------------|
| Nav links | Tab between links, Enter to navigate |
| Prompt chips | Tab to chip, Enter or Space to activate |
| LLM input | Enter to submit, Tab to chips |
| Readiness options | Arrow keys to move between options, Enter or Space to select |
| "Next" / "See my results" button | Tab to button, Enter to advance |
| Auth gate buttons | Tab between LinkedIn and Email options, Enter to activate |
| Contact form | Tab through fields, Enter to submit |
| Cards | Tab to card, Enter to navigate to detail |

### 13.7 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

When reduced motion is enabled:
- Card hover lift disabled.
- Progress bar width changes are instant.
- Section entrance fade-ups disabled.
- LLM typing indicator static (no animation).
- Smooth scrolling becomes instant.

### 13.8 Alt Text

- All `<Image>` components require descriptive `alt` text.
- Decorative images (background patterns, circuit traces): `alt=""` with `aria-hidden="true"`.
- Icons inside buttons with text labels: `aria-hidden="true"` on the icon.
- Icon-only buttons: `aria-label` required.

---

*thomashadden.ai | Industrial Analytics & Automation | frontend-interface.md v1.0*
