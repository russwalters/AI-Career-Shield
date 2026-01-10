# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: AI Career Shield

An AI-powered career coaching platform that helps users assess their career vulnerability to AI automation and provides personalized action plans for career transitions.

## Commands

All commands run from `/app` directory:

```bash
cd app
npm run dev      # Start development server on localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server

# Scripts (run with npx tsx)
npx tsx scripts/import-onet.ts         # Import O*NET data to Supabase
npx tsx scripts/score-dwas.ts          # Score DWAs for AI exposure
npx tsx scripts/aggregate-gwa-scores.ts # Calculate GWA aggregate scores
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router
- **UI:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (PostgreSQL + pgvector for embeddings)
- **Auth:** Clerk
- **AI:** Claude API (Anthropic)
- **Payments:** Stripe
- **Email:** Resend
- **Data:** O*NET 30.1 database

### Route Structure

**Pages (`app/src/app/`):**
- `/` — Landing page
- `/assess` — Conversational AI assessment
- `/results` — Risk score and analysis
- `/paths` — Career recommendations
- `/coach` — Shield tier: AI coaching with memory
- `/plan` — Shield tier: Action plans
- `/learn` — Shield tier: Learning resources

**API Routes (`app/src/app/api/`):**
- `/api/chat` — Assessment chat endpoint
- `/api/coach` — Coaching chat with memory
- `/api/assessment` — Extract assessment data
- `/api/plan` — Generate action plans
- `/api/checkout` — Stripe checkout session
- `/api/billing` — Billing portal
- `/api/webhooks/stripe` — Stripe webhook handler

### Route Protection

Defined in `app/src/middleware.ts`:
- **Public:** `/`, `/sign-in`, `/sign-up`, `/assess`, `/results`, `/paths`, `/api/chat`
- **Shield tier only:** `/coach`, `/plan`, `/learn` (requires `subscription_tier: 'shield'` in Clerk session claims)

### Data Flow
1. User completes conversational assessment → tasks/skills extracted
2. Tasks mapped to O*NET occupations and Detailed Work Activities (DWAs)
3. AI exposure scoring applied via pre-scored DWA table
4. Career paths recommended based on skills match + lower risk
5. Shield tier unlocks action plan + coaching with memory

### Key Libraries

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Typed Supabase client with database schema |
| `lib/claude.ts` | Claude API client with Sage personality prompts |
| `lib/occupation-matcher.ts` | Job title → O*NET occupation matching |
| `lib/task-mapper.ts` | Task → DWA mapping |
| `lib/exposure-calculator.ts` | Calculate AI exposure scores |
| `lib/career-recommender.ts` | Generate career recommendations |
| `lib/memory-manager.ts` | Coaching conversation memory (pgvector) |
| `lib/plan-generator.ts` | Action plan generation |
| `lib/stripe.ts` | Stripe client configuration |

## AI Coach Personality: "Sage"

When generating Sage responses (assessment or coaching), follow these characteristics:
- **Warm but direct** — friendly without being sycophantic
- **Confident expertise** — knows the data, shares it naturally
- **Gently challenging** — pushes users to think deeper
- **Grounded optimism** — realistic but encouraging

Avoid: overly formal language, toxic positivity, robotic bullet points, condescension.

Full prompts in `app/src/lib/claude.ts`.

## O*NET Database

Location: `/data/onet/db_30_1_text/` (tab-delimited files)

Key tables after import:
- `occupations` — 923 SOC codes
- `alternate_titles` — ~58K job title variations
- `tasks` — ~19K task statements
- `detailed_work_activities` — 2,087 DWAs (our scoring unit)
- `task_dwa_links` — Maps tasks to DWAs

**Attribution required in UI:** "This product includes information from O*NET 30.1 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license."

## Setup

See `SETUP.md` for detailed external service configuration.

Quick start:
```bash
cp app/.env.local.example app/.env.local
# Fill in: Supabase, Clerk, and Anthropic API keys
```

## Build Plan

See `docs/BUILD_PLAN.md` for the 6-phase development roadmap with checkboxes for completed work.
