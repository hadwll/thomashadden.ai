# thomashadden.ai — Backend Specification: Contact

**Version:** 1.0  
**Date:** March 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** backend-api.md · backend-database.md · backend-auth.md

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Overview](#1-overview)
2. [Contact Form](#2-contact-form)
3. [Enquiry Types](#3-enquiry-types)
4. [Spam Protection](#4-spam-protection)
5. [Submission Handling](#5-submission-handling)
6. [Notification Email](#6-notification-email)
7. [Auto-Reply Email](#7-auto-reply-email)
8. [Readiness Check Integration](#8-readiness-check-integration)
9. [Data Storage](#9-data-storage)
10. [Environment Variables](#10-environment-variables)
11. [Error Handling](#11-error-handling)

---

## 1. Overview

The contact form is the final conversion step on thomashadden.ai. It exists to start the right kind of conversation — not to funnel everyone into the same generic inbox. Enquiry type is captured upfront so Thomas can prioritise and respond appropriately, and so the auto-reply sets the right tone for each type of visitor.

### 1.1 Design Principles

- **Low friction** — name, email, enquiry type, message. Nothing unnecessary.
- **Context-aware** — readiness check results carry through where available
- **Personal** — auto-reply tone matches the enquiry type, not a generic acknowledgement
- **Reliable** — every submission is stored in Supabase and triggers an email notification, independent of each other

---

## 2. Contact Form

### 2.1 Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | Text | Yes | 2–100 characters |
| `email` | Email | Yes | Valid email format |
| `enquiry_type` | Select | Yes | Must match a valid enquiry type key |
| `subject` | Text | No | Max 200 characters |
| `message` | Textarea | Yes | 20–2000 characters |
| `honeypot` | Hidden text | No | Must be empty — spam protection |

### 2.2 Pre-filling

When a visitor arrives at the contact form via the readiness check result CTA, the following fields are pre-filled from their authenticated session:

- `name` — from `user_profiles.display_name`
- `email` — from `auth.users.email`
- `enquiry_type` — pre-selected as `business_enquiry`
- `subject` — pre-filled as "AI Readiness follow-up"

All pre-filled values are editable before submission.

---

## 3. Enquiry Types

The enquiry type dropdown is displayed prominently on the form. It sets the context for both the notification email Thomas receives and the auto-reply the visitor receives.

| Key | Label | Description |
|-----|-------|-------------|
| `business_enquiry` | AI in my business | Exploring AI adoption, practical use cases, business conversations |
| `research_collaboration` | Research collaboration | Academic, grant, or R&D collaboration enquiries |
| `technical_enquiry` | Technical enquiry | Specific technical questions, engineering or automation topics |
| `general` | General | Anything that doesn't fit the above |

Enquiry type is required. The form defaults to no selection — the visitor must actively choose. This is intentional: it prompts the visitor to think about why they are reaching out, which improves message quality.

---

## 4. Spam Protection

### 4.1 Honeypot Field

A hidden field named `website` is included in the form markup. It is invisible to human visitors but filled in by most bots:

```html
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />
```

If this field is non-empty on submission, the request is silently rejected — a success response is returned to the submitter (no indication of rejection) but nothing is stored and no notification is sent.

**Hardening note:** The field name `website` is a commonly known honeypot pattern. If bot evasion is observed post-launch: (1) rotate the field name to a less predictable value and update the frontend and backend in tandem; (2) add a timestamp-based check rejecting submissions completed in under 3 seconds; (3) escalate to reCAPTCHA v3 as described in §4.3.

### 4.2 Rate Limiting

As defined in `backend-api.md`, the contact submission endpoint is rate limited to 3 requests per hour per IP address. This provides a second layer of protection against automated submissions.

### 4.3 No CAPTCHA in V1

CAPTCHA is not used in V1. The honeypot and rate limiting are sufficient for a new site at low submission volume. If spam becomes an issue post-launch, reCAPTCHA v3 (invisible, no user interaction) is the recommended addition — it can be added without structural changes to the form.

---

## 5. Submission Handling

### 5.1 Flow

```
Visitor submits form
        ↓
Honeypot check — reject silently if filled
        ↓
Rate limit check — reject with 429 if exceeded
        ↓
Input validation — reject with 422 if invalid
        ↓
Write record to contact_submissions table
        ↓
Send notification email to thomas@ia-2.com
        ↓
Send auto-reply email to visitor
        ↓
Return success response to frontend
```

Steps 4 (Supabase write), 5 (notification), and 6 (auto-reply) are independent. If the notification email fails, the Supabase record is still written and the auto-reply still sends. If the auto-reply fails, the record and notification are unaffected. No single failure breaks the submission.

### 5.2 Success Response

```json
{
  "success": true,
  "data": {
    "submissionId": "sub_abc123",
    "message": "Thanks [name], Thomas will be in touch shortly."
  }
}
```

The success message is personalised with the submitter's first name where available.

---

## 6. Notification Email

Sent to `thomas@ia-2.com` on every valid submission.

### 6.1 Subject Line

```
[thomashadden.ai] {enquiry_type_label} from {name}
```

Examples:
- `[thomashadden.ai] AI in my business from Jane Smith`
- `[thomashadden.ai] Research collaboration from Dr. Paul McKenna`

### 6.2 Body

```
New contact form submission on thomashadden.ai

Name:         {name}
Email:        {email}
Enquiry type: {enquiry_type_label}
Subject:      {subject or "Not provided"}

Message:
{message}

---
{readiness_block if applicable}
Submitted: {timestamp}
IP (hashed): {ip_hash}
```

### 6.3 Readiness Block

If the submission originated from a readiness check result CTA (i.e. `source = 'readiness_check'`), the following block is appended above the timestamp:

```
AI Readiness Result:
  Category: {result_category_label}
  Score:    {result_score}/100
  Session:  {session_id}
```

This gives Thomas immediate context on the lead quality before he opens the message.

---

## 7. Auto-Reply Email

Sent to the visitor's email address on every valid submission. Tone and content vary by enquiry type.

### 7.1 Shared Elements

All auto-reply emails share:

- **From:** `Thomas Hadden <thomas@ia-2.com>`
- **Subject:** varies by enquiry type (see below)
- **Signature:** `— Thomas | thomashadden.ai`
- **Tone:** warm, direct, not corporate

### 7.2 Business Enquiry

**Subject:** Got your message — AI in your business

**Body:**
> Hi {first_name},
>
> Thanks for getting in touch. It's always good to hear from someone thinking seriously about where AI fits in their business.
>
> I'll take a read through what you've shared and come back to you shortly. If there's anything useful I can point you to in the meantime, the AI Readiness Check on the site is worth a look if you haven't already tried it.
>
> Talk soon.
>
> — Thomas | thomashadden.ai

---

### 7.3 Research Collaboration

**Subject:** Thanks for reaching out — research collaboration

**Body:**
> Hi {first_name},
>
> Thanks for getting in touch about collaboration. I'm always interested in connecting with people working on applied research in this space.
>
> I'll have a read through your message and get back to you. Looking forward to the conversation.
>
> — Thomas | thomashadden.ai

---

### 7.4 Technical Enquiry

**Subject:** Got your technical enquiry

**Body:**
> Hi {first_name},
>
> Thanks for reaching out. Technical questions are always welcome — I'll take a look at what you've sent and come back to you with something useful.
>
> — Thomas | thomashadden.ai

---

### 7.5 General

**Subject:** Thanks for getting in touch

**Body:**
> Hi {first_name},
>
> Thanks for the message — I'll get back to you shortly.
>
> — Thomas | thomashadden.ai

---

## 8. Readiness Check Integration

### 8.1 Source Tracking

All contact submissions include a `source` field:

| Value | Description |
|-------|-------------|
| `contact_page` | Submitted via the main Contact page |
| `readiness_check` | Submitted via the readiness result CTA |
| `llm` | Suggested by the LLM assistant |

### 8.2 Readiness Metadata

When `source = 'readiness_check'`, the submission record includes:

- `readiness_session_id` — linked to the completed readiness session
- `result_category` — the visitor's result category
- `result_score` — their normalised score

This data is stored in `contact_submissions` and surfaced in the notification email. It is not stored in `readiness_contact_leads` — that table is reserved for leads captured directly on the result screen before the visitor navigates to the contact form.

### 8.3 Pre-fill Behaviour

Pre-filled fields from the readiness check (name, email, enquiry type, subject) reduce friction at the final conversion step. All pre-filled values remain editable — the visitor is never locked into a value they didn't choose.

---

## 9. Data Storage

Submissions are stored in `public.contact_submissions` as defined in `backend-database.md` §7.3.

```sql
CREATE TABLE public.contact_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  enquiry_type    TEXT NOT NULL,
  subject         TEXT,
  message         TEXT NOT NULL,
  source          TEXT DEFAULT 'contact_page',
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

## 10. Environment Variables

| Variable | Description |
|----------|-------------|
| `CONTACT_NOTIFICATION_EMAIL` | Notification recipient — `thomas@ia-2.com` |
| `EMAIL_FROM_NAME` | Sender display name — `Thomas Hadden` |
| `EMAIL_FROM_ADDRESS` | Sender address — `thomas@ia-2.com` |
| `SMTP_HOST` | Transactional email host |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

SMTP configuration is shared with the auth magic link email service. The same transactional email provider (Resend or Postmark — confirmed at infrastructure setup) handles both.

---

## 11. Error Handling

| Scenario | Handling |
|----------|----------|
| Honeypot filled | Silently return success — no storage, no notification, no indication of rejection |
| Rate limit exceeded | Return 429, frontend shows "Too many submissions, please try again later" |
| Validation failure | Return 422 with field-level errors, frontend highlights affected fields |
| Supabase write fails | Log error, attempt email notification anyway, return 500 to frontend |
| Notification email fails | Log error, Supabase record already written — submission not lost |
| Auto-reply email fails | Log error, notification and Supabase record unaffected — submission not lost |
| Invalid enquiry type | Return 422 validation error |

---

*thomashadden.ai | Industrial Analytics & Automation | backend-contact.md v1.0*
