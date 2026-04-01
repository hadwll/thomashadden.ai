# thomashadden.ai — Backend Specification: Auth

**Version:** 1.0  
**Date:** March 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** backend-api.md · backend-llm.md · backend-rag.md · backend-database.md

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Auth Platform & Strategy](#1-auth-platform--strategy)
2. [Supported Auth Methods](#2-supported-auth-methods)
3. [Auth Gate: AI Readiness Check](#3-auth-gate-ai-readiness-check)
4. [LinkedIn OAuth: Scope & Metadata](#4-linkedin-oauth-scope--metadata)
5. [Email Magic Link](#5-email-magic-link)
6. [Session Management](#6-session-management)
7. [User Profile Creation](#7-user-profile-creation)
8. [Anonymous Sessions](#8-anonymous-sessions)
9. [Protected Routes & Access Model](#9-protected-routes--access-model)
10. [Security Requirements](#10-security-requirements)
11. [Environment Variables](#11-environment-variables)
12. [Error Handling & Edge Cases](#12-error-handling--edge-cases)

---

## 1. Auth Platform & Strategy

### 1.1 Platform

| Property | Value |
|----------|-------|
| Provider | Supabase Auth |
| Auth methods | LinkedIn OAuth, Email Magic Link |
| Session storage | Supabase managed (JWT + refresh token) |
| User table | `auth.users` (Supabase managed) |
| Profile extension | `public.user_profiles` (see backend-database.md §6.1) |

### 1.2 Strategy

Auth in V1 is **additive, not gatekeeping**. The vast majority of site content — the LLM centerpiece, all page content, the readiness check questions — is accessible without authentication.

The single auth gate is the **AI Readiness Check result screen**. A visitor completes the full assessment anonymously, then must authenticate to unlock their result. This is an intentional conversion design: the visitor has already invested time in the assessment and is at peak motivation when the auth prompt appears.

Auth is not required to:
- Browse the site
- Use the LLM centerpiece
- Start or progress through the readiness check

Auth is required to:
- View the readiness check result
- Have results saved against a persistent profile

### 1.3 V1 Scope

Google OAuth is explicitly excluded from V1. LinkedIn provides professional identity metadata that Google does not. Email Magic Link provides a universal fallback for visitors without a LinkedIn account or preference.

---

## 2. Supported Auth Methods

| Method | Provider | Primary Use Case |
|--------|----------|-----------------|
| LinkedIn OAuth | LinkedIn via Supabase | Professional identity, metadata capture, B2B visitors |
| Email Magic Link | Supabase Auth (SMTP) | Universal fallback, visitors without LinkedIn |

### 2.1 Method Presentation

On the auth prompt screen (result gate), both methods are presented with equal visual weight. LinkedIn is listed first as the preferred option given its metadata value.

Suggested copy:

> **Sign in to see your results**
> Your assessment is ready. Sign in to view your AI Readiness score and recommended next steps.

- `[Continue with LinkedIn]` — primary button style
- `[Continue with Email]` — secondary button style

No account creation friction — both flows create an account automatically on first sign-in via Supabase Auth's default behaviour.

---

## 3. Auth Gate: AI Readiness Check

### 3.1 Flow

```
Start Assessment (anonymous)
        ↓
Questions 1–N (anonymous, session tracked via session_token)
        ↓
Final question submitted
        ↓
"Your results are ready" screen — auth prompt displayed
        ↓
User authenticates (LinkedIn or Email)
        ↓
session_token linked to auth.users.id in readiness_sessions
        ↓
Result screen rendered with category + score + CTA
```

### 3.2 Anonymous Session Handoff

While the user is completing the assessment unauthenticated, their progress is tracked via a `session_token` (a client-generated UUID stored in `localStorage` and passed with each API request). On successful authentication, the frontend calls `POST /readiness-check/link-session` and the backend:

1. Retrieves the `readiness_sessions` record matching the `session_token`
2. Sets `user_id = auth.users.id` on that record
3. Returns success to the frontend

The `session_token` field is **retained** on the record. It continues to serve as the lookup key when the frontend subsequently calls `GET /readiness-check/result/:sessionToken`. The backend verifies that the authenticated user's `user_id` matches the `user_id` on the session before returning the result.

If the same user later signs in again, any prior session linked to their `user_id` is retrievable (future "my results" feature, V2).

### 3.3 Result Screen Behaviour

| State | Behaviour |
|-------|-----------|
| Auth successful, link successful, session found | Render result category, score, interpretation, and CTA |
| Auth successful, session token missing from localStorage | Show generic error, offer to restart assessment |
| Auth successful, link failed (session not found on backend) | Show generic error, offer to restart assessment |
| Auth successful, link failed (session already linked to different user) | Show error: "This assessment is linked to a different account." Offer to restart. |
| Auth failed / dismissed | Hold on the auth prompt screen, allow retry |
| Session expired (> 24h old, incomplete) | Prompt to restart |

### 3.4 Post-Auth CTA

After the result is displayed, the primary CTA is contextual to the result category:

| Result Category | CTA Copy |
|----------------|----------|
| Early-stage | "Start with a conversation — get in touch" |
| Foundational | "Explore what's possible — get in touch" |
| Ready to Pilot | "Let's identify your first use case — get in touch" |
| Ready to Scale | "Let's talk about scaling — get in touch" |

All CTAs route to the Contact page or trigger the contact capture form. The authenticated user's name and email are pre-filled where available.

---

## 4. LinkedIn OAuth: Scope & Metadata

### 4.1 Configuration

LinkedIn OAuth is configured via the Supabase Auth dashboard (LinkedIn provider). The LinkedIn Developer app must be created at [linkedin.com/developers](https://linkedin.com/developers) and the OAuth redirect URI registered as:

```
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

### 4.2 Requested Scopes

| Scope | Data | Availability |
|-------|------|-------------|
| `openid` | OpenID Connect identity | Required |
| `profile` | Name, profile picture, headline, location | Required — request explicitly |
| `email` | Verified email address | Required |

### 4.3 Metadata Capture Strategy

LinkedIn profile data is available in the Supabase Auth `raw_user_meta_data` field on the `auth.users` record immediately after OAuth. The backend extracts and stores the following fields into `public.user_profiles` on first sign-in:

| Field | LinkedIn Source | Storage | Availability |
|-------|----------------|---------|-------------|
| `display_name` | `name` | `user_profiles.display_name` | Reliable |
| `email` | `email` | `auth.users.email` | Reliable |
| `avatar_url` | `picture` | `user_profiles.avatar_url` | Reliable |
| `linkedin_headline` | `headline` | `user_profiles.linkedin_headline` | Best-effort |
| `linkedin_location` | `locale` / `location` | `user_profiles.linkedin_location` | Best-effort |

**Best-effort fields** — `linkedin_headline` and `linkedin_location` — are stored if present in the OAuth payload. If absent (dependent on LinkedIn API version, app review status, or user privacy settings), they are stored as `NULL`. The application degrades gracefully — no error is thrown and no retry is attempted.

### 4.4 Schema for LinkedIn Metadata

The `linkedin_headline`, `linkedin_location`, and `auth_provider` columns are defined in the canonical `public.user_profiles` CREATE TABLE in `backend-database.md` §6.1. No separate ALTER TABLE migration is required — the columns are part of the initial table definition.

- `linkedin_headline` and `linkedin_location` are best-effort fields — stored as `NULL` if absent from the OAuth payload. No error is thrown and no retry is attempted.
- `auth_provider` is set to `'linkedin'` or `'email'` based on the sign-in method.

### 4.5 Metadata and Lead Quality

LinkedIn metadata captured at sign-in is accessible to Thomas via the admin view of `readiness_contact_leads` and `user_profiles`. A contact lead record that includes a LinkedIn headline and location is significantly more qualified than an email-only submission. The backend stores this metadata regardless of whether the user explicitly opts into contact.

---

## 5. Email Magic Link

### 5.1 Configuration

Email magic link is configured via Supabase Auth (Email provider). SMTP is configured using a transactional email provider (e.g. Resend or Postmark — to be confirmed at infrastructure setup).

### 5.2 Flow

```
User enters email address
        ↓
Supabase sends magic link to that address
        ↓
User clicks link in email
        ↓
Supabase validates token, creates or retrieves auth.users record
        ↓
Session established, redirect to result screen
```

### 5.3 Email Template

The magic link email should be minimal and on-brand. Suggested subject and body:

**Subject:** Your AI Readiness results — sign in to Thomas Hadden

**Body:**
> Here's your sign-in link for thomashadden.ai. Click below to view your AI Readiness results.
>
> [View My Results] ← magic link button
>
> This link expires in 1 hour. If you didn't request this, you can ignore it.
>
> — Thomas Hadden | thomashadden.ai

Template is configured in Supabase Auth dashboard under Email Templates.

### 5.4 Magic Link Expiry

| Setting | Value |
|---------|-------|
| Link expiry | 1 hour (Supabase default) |
| OTP expiry | N/A (magic link only in V1) |
| Redirect URL | `https://thomashadden.ai/readiness/result` |

---

## 6. Session Management

### 6.1 Session Tokens

Supabase Auth issues a JWT access token and a refresh token on successful sign-in. These are managed automatically by the `@supabase/ssr` package, which overrides the default `@supabase/supabase-js` behaviour of storing tokens in `localStorage`.

| Token | Expiry | Storage |
|-------|--------|---------|
| Access token (JWT) | 1 hour | HTTP-only cookie (managed by `@supabase/ssr`) |
| Refresh token | 30 days | HTTP-only cookie (managed by `@supabase/ssr`) |

**Note:** The `@supabase/ssr` cookie-based storage is used instead of the default `localStorage` storage. This provides XSS protection (tokens are not accessible to client-side JavaScript) and enables server-side session access in Next.js API routes and Server Components. See `frontend-interface.md` §7.1 and §7.6 for the client initialisation code that configures this behaviour.

### 6.2 Session Persistence

Sessions persist across page loads via the Supabase JS client's built-in session restoration. No custom session logic is required in V1.

### 6.3 Sign Out

Sign out is available from the user profile area (V2 feature surface). In V1, explicit sign-out is not a prominent UI element — the session naturally expires after 30 days of inactivity.

---

## 7. User Profile Creation

On first sign-in (either provider), a `public.user_profiles` record is created automatically via a Supabase database trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    display_name,
    avatar_url,
    auth_provider,
    linkedin_headline,
    linkedin_location
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'headline',    -- NULL if not present
    NEW.raw_user_meta_data->>'locale'       -- NULL if not present
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Notes:**
- `ON CONFLICT DO NOTHING` prevents duplicate profile creation on re-authentication
- Best-effort LinkedIn fields stored as `NULL` if absent — no error thrown
- Trigger runs with `SECURITY DEFINER` to allow writes to `public.user_profiles` from the auth schema context

---

## 8. Anonymous Sessions

### 8.1 Readiness Check Anonymous Tracking

Before authentication, a visitor's readiness check progress is tracked via a client-generated `session_token`:

```typescript
// Generated client-side on assessment start
const sessionToken = crypto.randomUUID();
localStorage.setItem('readiness_session_token', sessionToken);
```

This token is passed in the request body on each answer submission and used to associate `readiness_responses` records with the correct `readiness_sessions` row.

### 8.2 LLM Queries

LLM queries in the centerpiece are fully anonymous. A session identifier (UUID) is generated client-side per page load and passed with each query for grouping purposes in `llm_query_log`. This identifier is not linked to any auth identity unless the user later signs in, and even then no retroactive linkage is performed.

### 8.3 No Supabase Anonymous Auth

Supabase's anonymous auth feature is not used in V1. Anonymous state is handled entirely via client-generated tokens passed at the API layer. This keeps the `auth.users` table clean and avoids anonymous user record accumulation.

---

## 9. Protected Routes & Access Model

### 9.1 Route Access Table

| Route | Auth Required | Notes |
|-------|--------------|-------|
| `/` | No | Public |
| `/about` | No | Public |
| `/projects` | No | Public |
| `/research` | No | Public |
| `/insights` | No | Public |
| `/contact` | No | Public |
| `/readiness` | No | Assessment is public |
| `/readiness/result` | Yes | Auth gate — result screen only |

### 9.2 API Endpoint Access

All API endpoints are called server-side using the service role key. Client-facing endpoints validate the Supabase JWT where auth context is required (e.g. result retrieval). See backend-api.md for endpoint-level auth requirements.

---

## 10. Security Requirements

- `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client or included in frontend bundles
- All auth callbacks and redirects use HTTPS only
- Magic link redirect URL is allowlisted in Supabase Auth settings to `https://thomashadden.ai/*`
- LinkedIn OAuth redirect URI is registered exactly as issued by Supabase — no wildcards
- JWT verification is handled by Supabase Auth middleware — no custom JWT parsing in application code
- `user_profiles` table has RLS enabled — users can only read their own profile row
- `readiness_sessions` RLS policy restricts users to their own session records (see backend-database.md §9)
- No auth tokens logged in `llm_query_log` or any other analytics table
- All Supabase auth cookies are set with `SameSite=Lax` to prevent cross-site request attachment while allowing top-level navigations (required for OAuth callback redirects)
- Anonymous POST endpoints (`/contact/submit`, `/readiness-check/answer`, `/llm/query`) do not read cookie-based auth state and are therefore not vulnerable to CSRF. They are protected by rate limiting and honeypot/session-token checks instead of CSRF tokens

---

## 11. Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (client-safe, used by Supabase JS client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only — never expose to client) |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app client secret |
| `AUTH_REDIRECT_URL` | Post-auth redirect — `https://thomashadden.ai/readiness/result` |
| `SMTP_HOST` | Transactional email host (for magic link delivery) |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender address — e.g. `noreply@thomashadden.ai` |

---

## 12. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| User dismisses auth prompt | Held on result gate screen, prompt remains visible, no data lost |
| Magic link expired | Show "link expired" message, offer to resend |
| Magic link already used | Supabase returns error — show "link already used, request a new one" |
| LinkedIn OAuth denied by user | Return to auth prompt with soft error message |
| LinkedIn returns no email | Block sign-in, show message asking user to use email method instead |
| Session token not found on auth | Show error, offer to restart assessment — responses not recoverable |
| Duplicate sign-in (same user, new session) | `ON CONFLICT DO NOTHING` on profile — existing profile retained, new session linked |
| Assessment session > 24h old on auth | Treat as expired, prompt to restart |

---

*thomashadden.ai | Industrial Analytics & Automation | backend-auth.md v1.0*
