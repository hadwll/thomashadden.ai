# thomashadden.ai — Backend Specification: Infrastructure

**Version:** 1.0  
**Date:** March 2026  
**Status:** Confidential  
**Prepared for:** Thomas Hadden — Industrial Analytics & Automation  
**Companion specs:** backend-api.md · backend-database.md · backend-llm.md · backend-rag.md

> **Note:** Markdown is the standard deliverable format for all project documentation unless otherwise specified.

---

## Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Domain & DNS](#2-domain--dns)
3. [Azure App Service](#3-azure-app-service)
4. [Azure AI Foundry](#4-azure-ai-foundry)
5. [Supabase Projects](#5-supabase-projects)
6. [Transactional Email: Resend](#6-transactional-email-resend)
7. [Analytics: Plausible](#7-analytics-plausible)
8. [CI/CD: GitHub Actions](#8-cicd-github-actions)
9. [Local Development Environment](#9-local-development-environment)
10. [Environment Variables](#10-environment-variables)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Cost Summary](#12-cost-summary)

---

## 1. Infrastructure Overview

### 1.1 Stack Summary

| Layer | Service | Purpose |
|-------|---------|---------|
| Domain & DNS | Cloudflare | Domain registration, DNS management, CDN |
| Frontend + API | Azure App Service (West Europe) | Next.js application and backend API |
| AI Models | Azure AI Foundry (West Europe) | GPT-4.5, GPT-4.5-mini, text-embedding-3-large |
| Database | Supabase (EU West) | PostgreSQL, pgvector, Auth, Storage |
| Transactional Email | Resend | Magic links, contact notifications, auto-replies |
| Analytics | Plausible (cloud) | Page views, traffic sources |
| Version Control | GitHub | Source code, CI/CD trigger |
| CI/CD | GitHub Actions | Automated deploy to Azure on push to main |

### 1.2 Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| Local (dev) | Active development and testing | Local VM, dev Supabase project, Azure AI Foundry |
| Production | Live site | Azure App Service, prod Supabase project, Azure AI Foundry |

There is no separate staging environment in V1. The local development environment serves this purpose. Production deployments are triggered by push to the `main` branch on GitHub.

### 1.3 Region

All cloud infrastructure is provisioned in **West Europe** (Azure region: `westeurope`, Supabase region: EU West). This ensures data residency within the EU, aligns with GDPR requirements, and minimises latency between services.

---

## 2. Domain & DNS

### 2.1 Domain

| Property | Value |
|----------|-------|
| Domain | `thomashadden.ai` |
| Registrar | Cloudflare Registrar |
| DNS provider | Cloudflare |

### 2.2 DNS Records

Once Azure App Service is provisioned, the following DNS records are configured in Cloudflare:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | `@` | Azure App Service default domain | Root domain → app |
| CNAME | `www` | Azure App Service default domain | www redirect |
| CNAME | `api` | Azure App Service default domain | API subdomain |
| TXT | `@` | Azure domain verification token | Azure custom domain verification |
| MX | `@` | Resend MX records | Transactional email sending |
| TXT | `@` | Resend SPF record | Email deliverability |
| CNAME | `resend._domainkey` | Resend DKIM record | Email deliverability |

### 2.3 Cloudflare Settings

| Setting | Value | Reason |
|---------|-------|--------|
| SSL/TLS mode | Full (strict) | End-to-end HTTPS |
| Always use HTTPS | On | Redirect all HTTP to HTTPS |
| Auto minify | On (JS, CSS, HTML) | Performance |
| Brotli compression | On | Performance |
| Bot fight mode | On | Basic bot protection (free tier) |

**Client IP trust policy:** All traffic reaches the application through Cloudflare. The authoritative client IP for rate limiting is the `CF-Connecting-IP` header set by Cloudflare. The application must **not** trust the `X-Forwarded-For` header directly, as it can be spoofed by the client. Rate limiting middleware should read `CF-Connecting-IP` as the primary source of the client IP address.

### 2.4 Email Forwarding

A Cloudflare Email Routing rule forwards `thomas@thomashadden.ai` to `thomas@ia-2.com`. This keeps site-facing communications on-brand without requiring a separate email hosting setup.

---

## 3. Azure App Service

### 3.1 Configuration

| Property | Value |
|----------|-------|
| Service | Azure App Service |
| Region | West Europe |
| Plan | Basic B1 (~£10–15/month) |
| Runtime | Node.js 20 LTS |
| Framework | Next.js |
| Deployment | GitHub Actions (zip deploy) |

The Basic B1 plan is sufficient for V1 traffic. It provides 1 core, 1.75GB RAM, and 10GB storage — more than adequate for a personal professional site at launch. Scaling to Standard S1 is straightforward if traffic grows.

### 3.2 Application Settings

All environment variables are configured as Application Settings in Azure App Service. They are injected as environment variables at runtime and never stored in the repository.

See section 10 for the full environment variable reference.

### 3.3 Custom Domain

The custom domain `thomashadden.ai` is added to the App Service via the Azure portal:

1. Add custom domain in App Service → Custom Domains
2. Copy the Azure verification TXT record
3. Add TXT record in Cloudflare DNS
4. Verify domain in Azure portal
5. Add SSL certificate via Azure App Service Managed Certificate (free)

### 3.4 Always On

The Always On setting is enabled on the App Service to prevent the application from going idle between requests. This is particularly important for the LLM endpoint — cold start latency on an idle instance would degrade the user experience significantly.

### 3.5 API Subdomain

The API is served from the same Next.js application under `/api/*` routes. No separate App Service instance is required for V1. If the API is later extracted to a standalone service, `api.thomashadden.ai` is already provisioned as a DNS record.

---

## 4. Azure AI Foundry

### 4.1 Overview

Azure AI Foundry hosts all AI model deployments. Three models are deployed:

| Model | Deployment Name | Use |
|-------|----------------|-----|
| GPT-4.5 | `gpt-4-5` | Primary LLM — response generation |
| GPT-4.5-mini | `gpt-4-5-mini` | Intent classifier — fast, cheap pre-classification |
| text-embedding-3-large | `text-embedding-3-large` | RAG embeddings — ingestion and query time |

### 4.2 Configuration

| Property | Value |
|----------|-------|
| Resource group | `thomashadden-ai-rg` |
| Region | West Europe |
| Pricing tier | Standard (pay-per-token) |

### 4.3 Model Configurability

Model deployment names are stored in environment variables — never hardcoded. To swap a model:

1. Deploy the new model in Azure AI Foundry
2. Update the relevant environment variable
3. Redeploy the application
4. No code changes required

This applies to all three models. See section 10 for the full variable reference.

### 4.4 Token Quotas

Token quotas are configured per deployment in Azure AI Foundry to act as a hard cost ceiling:

| Model | Tokens per minute (TPM) | Rationale |
|-------|------------------------|-----------|
| GPT-4.5 | 40,000 | Primary LLM — generous but bounded |
| GPT-4.5-mini | 80,000 | Classifier — high volume, very cheap |
| text-embedding-3-large | 120,000 | Embeddings — burst during re-ingestion |

These quotas can be adjusted in the Azure AI Foundry portal without code changes.

### 4.5 Daily Cost Cap

A daily spend limit is configured at the Azure subscription level as an additional safeguard. If the daily cap is reached:

- The LLM endpoint returns a graceful unavailability message
- All other site functionality continues normally
- Thomas receives an alert notification
- Cap resets at midnight UTC

---

## 5. Supabase Projects

### 5.1 Two-Project Setup

Two separate Supabase projects are maintained — one per environment. They are completely independent with no shared data.

| Project | Name | Purpose |
|---------|------|---------|
| Development | `thomashadden-dev` | Local development and testing |
| Production | `thomashadden-prod` | Live site |

### 5.2 Project Configuration

Both projects are configured identically in terms of schema, extensions, and RLS policies. The only differences are the data they contain and the environment variables that point to them.

| Setting | Value |
|---------|-------|
| Region | EU West |
| Plan | Pro (~$25/month per project) |
| Extensions | `uuid-ossp`, `pgvector`, `pg_trgm` |
| Backups | Daily automated (7-day retention on Pro) |

### 5.3 Schema Synchronisation

The Supabase CLI is used to keep both project schemas in sync:

```bash
# Apply migrations to development
supabase db push --project-ref <dev-project-ref>

# Apply migrations to production
supabase db push --project-ref <prod-project-ref>
```

All schema changes go through migrations in `/supabase/migrations/`. Direct schema edits in the Supabase dashboard are not permitted — all changes must be version controlled.

### 5.4 Supabase Auth Configuration

Both projects require the following Auth configuration:

- LinkedIn OAuth provider enabled — client ID and secret from LinkedIn Developer app
- Email provider enabled — magic link, connected to Resend SMTP
- Redirect URLs allowlisted:
  - Dev: `http://localhost:3000/*`
  - Prod: `https://thomashadden.ai/*`
- JWT expiry: 1 hour access token, 30 days refresh token

### 5.5 Storage

Supabase Storage is provisioned on both projects for profile avatar images. No other file storage is required in V1.

---

## 6. Transactional Email: Resend

### 6.1 Configuration

| Property | Value |
|----------|-------|
| Provider | Resend (resend.com) |
| Plan | Free tier (3,000 emails/month) |
| Sending domain | `thomashadden.ai` |
| From address | `noreply@thomashadden.ai` (magic links), `thomas@thomashadden.ai` (auto-replies) |

### 6.2 Domain Verification

Resend requires DNS records to be added in Cloudflare to verify the sending domain and ensure email deliverability:

- MX record for inbound routing
- SPF TXT record
- DKIM CNAME record (`resend._domainkey`)

These are listed in section 2.2.

### 6.3 Use Cases

| Use Case | From | Template |
|----------|------|---------|
| Magic link (auth) | `noreply@thomashadden.ai` | Defined in Supabase Auth dashboard |
| Contact notification | `noreply@thomashadden.ai` | Defined in application code |
| Contact auto-reply | `thomas@thomashadden.ai` | Defined in application code, varies by enquiry type |

### 6.4 Supabase SMTP Integration

Supabase Auth is configured to use Resend's SMTP for magic link delivery:

| Setting | Value |
|---------|-------|
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP user | `resend` |
| SMTP password | Resend API key |

---

## 7. Analytics: Plausible

### 7.1 Configuration

| Property | Value |
|----------|-------|
| Provider | Plausible Analytics (plausible.io) |
| Plan | Starter (~$9/month) |
| Domain | `thomashadden.ai` |
| Data residency | EU servers |

### 7.2 Installation

A single script tag in the Next.js `_document.tsx` or root layout:

```html
<script defer data-domain="thomashadden.ai" src="https://plausible.io/js/script.js"></script>
```

This is the only change required. No backend integration needed.

### 7.3 Data Export & Portability

Plausible data is exportable as CSV at any time from the dashboard. Export data before cancelling or switching providers — historical data does not migrate automatically to other tools. See `backend-analytics.md` for full analytics specification.

---

## 8. CI/CD: GitHub Actions

### 8.1 Repository Structure

```
/
├── app/                  # Next.js app directory
├── content/
│   └── rag/              # RAG markdown source files
├── supabase/
│   ├── migrations/       # Database migrations
│   └── seed.sql          # Seed data
├── public/               # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions workflow
├── .env.local            # Local dev environment variables (gitignored)
└── .env.example          # Environment variable reference (committed, no values)
```

### 8.2 Deployment Workflow

Push to `main` branch triggers the following pipeline:

```
Push to main
      ↓
GitHub Actions triggered
      ↓
Install dependencies (npm ci)
      ↓
Run build (next build)
      ↓
Run database migrations (supabase db push --prod)
      ↓
Deploy to Azure App Service (zip deploy)
      ↓
Trigger RAG re-ingestion (POST /rag/ingest)
      ↓
Health check (GET /health)
      ↓
Deploy complete
```

### 8.3 GitHub Actions Workflow File

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Run database migrations
        run: npx supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_APP_NAME }}
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: .

      - name: Trigger RAG re-ingestion
        run: |
          curl -X POST https://thomashadden.ai/api/rag/ingest \
            -H "X-Admin-Key: ${{ secrets.ADMIN_API_KEY }}"

      - name: Health check
        run: |
          curl --fail https://thomashadden.ai/api/health
```

### 8.4 GitHub Secrets

The following secrets are configured in the GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `AZURE_APP_NAME` | Azure App Service name |
| `AZURE_PUBLISH_PROFILE` | Azure publish profile XML |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token |
| `SUPABASE_PROJECT_REF` | Production Supabase project reference |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production Supabase anon key |
| `ADMIN_API_KEY` | Internal admin API key for RAG ingestion trigger |

All other environment variables are configured directly in Azure App Service Application Settings — not in GitHub Secrets.

---

## 9. Local Development Environment

### 9.1 Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime |
| npm | 10+ | Package management |
| Supabase CLI | Latest | Database migrations, local dev |
| Git | Latest | Version control |

### 9.2 Setup

```bash
# Clone the repository
git clone https://github.com/<repo>/thomashadden-ai.git
cd thomashadden-ai

# Install dependencies
npm install

# Copy environment variable template
cp .env.example .env.local

# Fill in .env.local with dev Supabase project values
# and Azure AI Foundry credentials

# Apply database migrations to dev Supabase project
npx supabase db push --project-ref <dev-project-ref>

# Run seed data
npx supabase db reset --project-ref <dev-project-ref>

# Start development server
npm run dev
```

### 9.3 Local Environment Variables

The `.env.local` file is gitignored and never committed. It contains dev Supabase credentials, Azure AI Foundry keys, and Resend keys. The `.env.example` file is committed with all variable names but no values — it serves as the canonical reference for required configuration.

### 9.4 RAG Ingestion in Development

RAG re-ingestion can be triggered manually in development:

```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "X-Admin-Key: <local-admin-key>"
```

This runs the full ingestion pipeline against the dev Supabase project using the Azure AI Foundry embedding model.

---

## 10. Environment Variables

Complete reference for all environment variables across both environments. Production values are stored in Azure App Service Application Settings. Development values are stored in `.env.local`.

### 10.1 Supabase

| Variable | Client-safe | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key — server only |
| `DATABASE_URL` | No | Direct PostgreSQL connection string |

### 10.2 Azure AI Foundry

| Variable | Client-safe | Description |
|----------|-------------|-------------|
| `AZURE_OPENAI_ENDPOINT` | No | Azure AI Foundry endpoint URL |
| `AZURE_OPENAI_API_KEY` | No | Azure AI Foundry API key |
| `AZURE_LLM_DEPLOYMENT` | No | Primary LLM deployment name |
| `AZURE_CLASSIFIER_DEPLOYMENT` | No | Intent classifier deployment name |
| `AZURE_EMBEDDING_DEPLOYMENT` | No | Embedding model deployment name |

### 10.3 Auth

| Variable | Client-safe | Description |
|----------|-------------|-------------|
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth app client secret |
| `AUTH_REDIRECT_URL` | No | Post-auth redirect URL |

### 10.4 Email

| Variable | Client-safe | Description |
|----------|-------------|-------------|
| `SMTP_HOST` | No | `smtp.resend.com` |
| `SMTP_PORT` | No | `465` |
| `SMTP_USER` | No | `resend` |
| `SMTP_PASS` | No | Resend API key |
| `EMAIL_FROM` | No | `noreply@thomashadden.ai` |
| `CONTACT_NOTIFICATION_EMAIL` | No | `thomas@ia-2.com` |

### 10.5 Application

| Variable | Client-safe | Description |
|----------|-------------|-------------|
| `ADMIN_API_KEY` | No | Internal key for admin endpoints |
| `EMBEDDING_DIMENSIONS` | No | Vector dimensions — `3072` |
| `RAG_MATCH_THRESHOLD` | No | Cosine similarity threshold — `0.75` |
| `RAG_MATCH_COUNT` | No | Max RAG chunks returned — `5` |
| `READINESS_SESSION_EXPIRY_HOURS` | No | Session stale threshold — `24` |
| `LLM_DAILY_TOKEN_CAP` | No | Daily token budget hard limit |

---

## 11. Monitoring & Alerting

### 11.1 Azure App Service Monitoring

Azure App Service provides built-in monitoring via Azure Monitor:

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| HTTP 5xx errors | > 5 in 5 minutes | Email alert to `thomas@ia-2.com` |
| Response time | > 3s average over 5 minutes | Email alert |
| CPU usage | > 80% sustained | Email alert |
| Memory usage | > 85% sustained | Email alert |

Alerts are configured in the Azure portal under the App Service → Alerts blade.

### 11.2 Supabase Monitoring

Supabase Pro plan includes basic monitoring via the Supabase dashboard:

- Database connection count
- Query performance
- Storage usage
- Auth event logs

No additional alerting is configured in V1.

### 11.3 LLM Cost Monitoring

Azure AI Foundry provides per-deployment token usage metrics. A monthly budget alert is configured at the Azure subscription level to notify Thomas if AI spend exceeds a defined threshold. This is separate from the per-request token cap defined in `backend-llm.md`.

### 11.4 Uptime Monitoring

No dedicated uptime monitoring service is used in V1. The GitHub Actions health check on each deploy provides a basic liveness check. A free uptime monitor (e.g. UptimeRobot free tier) can be added post-launch with no infrastructure changes required.

---

## 12. Cost Summary

Estimated monthly running costs for V1 in production:

| Service | Plan | Estimated Cost |
|---------|------|---------------|
| Azure App Service | Basic B1 | ~£12/month |
| Azure AI Foundry | Pay-per-token | ~£10–30/month (traffic dependent) |
| Supabase (prod) | Pro | ~$25/month |
| Supabase (dev) | Pro | ~$25/month |
| Resend | Free tier | £0/month |
| Plausible | Starter | ~$9/month |
| Cloudflare | Free tier | £0/month |
| GitHub | Free tier | £0/month |
| **Total** | | **~£70–90/month** |

Azure AI Foundry cost is the most variable — it scales directly with LLM usage. At low traffic (< 500 queries/month) the AI cost will be minimal. The daily token cap defined in `backend-llm.md` §13.2 prevents runaway spend.

The dev Supabase project can be downgraded to the free tier if cost is a concern — the free tier is sufficient for local development as long as the database size stays under 500MB.

---

*thomashadden.ai | Industrial Analytics & Automation | backend-infrastructure.md v1.0*
