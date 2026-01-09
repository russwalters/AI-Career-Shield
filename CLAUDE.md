# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: AI Career Shield

An AI-powered career coaching platform that helps users assess their career vulnerability to AI automation and provides personalized action plans for career transitions.

## Commands

```bash
cd app
npm run dev      # Start development server on localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router
- **UI:** Tailwind CSS + shadcn/ui components
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL + pgvector)
- **Auth:** Clerk (optional in prototype mode)
- **AI:** Claude API (Anthropic)
- **Data:** O*NET 30.1 database (in /data/onet/)

### Key Directories
```
/app/
├── scripts/                # Data import and utility scripts
│   └── import-onet.ts     # O*NET database import to Supabase
├── supabase/
│   └── migrations/        # Database schema migrations
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Landing page
│   │   ├── assess/        # Assessment chat flow
│   │   ├── results/       # Risk score results
│   │   ├── paths/         # Career path recommendations
│   │   ├── plan/          # 90-day action plan (Shield tier)
│   │   ├── coach/         # AI coaching chat (Shield tier)
│   │   ├── learn/         # Learning resources (Shield tier)
│   │   ├── sign-in/       # Clerk sign-in page
│   │   ├── sign-up/       # Clerk sign-up page
│   │   └── api/
│   │       └── chat/      # Claude API streaming chat endpoint
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── chat/          # Chat interface components
│   │   ├── results/       # Risk visualization components
│   │   ├── layout/        # Navigation, modals
│   │   └── providers/     # Context providers (Auth, etc.)
│   ├── data/              # Mock data for prototypes
│   └── lib/
│       ├── utils.ts       # Tailwind utilities
│       ├── supabase.ts    # Supabase client and types
│       └── claude.ts      # Claude API client and prompts
└── .env.local.example     # Environment variables template
```

### Data Flow
1. User completes conversational assessment → stored tasks/skills
2. Tasks mapped to O*NET occupations and work activities
3. AI exposure scoring applied to calculate risk
4. Career paths recommended based on skills match + lower risk
5. Shield tier unlocks action plan + coaching

## AI Coach Personality: "Sage"

- **Warm but direct** — friendly without being sycophantic
- **Confident expertise** — knows the data, shares it naturally
- **Gently challenging** — pushes users to think deeper
- **Grounded optimism** — realistic but encouraging
- Uses contractions, varied sentence length, natural conversational flow

See `/app/src/data/mock-assessment.ts` for full personality prompt.

## O*NET Database

Location: `/data/onet/db_30_1_text/`

Key files:
- `Occupation Data.txt` — Master occupation list
- `Alternate Titles.txt` — Job title variations
- `Task Statements.txt` — 19,000+ task descriptions
- `Skills.txt` / `Abilities.txt` — Worker requirements
- `Work Activities.txt` — Generalized work activities

Attribution required: "This product includes information from O*NET 30.1 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA."

## Setup

### 1. Environment Variables
```bash
cp app/.env.local.example app/.env.local
# Fill in your API keys
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`

See `SETUP.md` for detailed instructions on setting up each service.

### 2. Database Setup
```bash
# Run the migration in Supabase SQL editor
# See: app/supabase/migrations/001_initial_schema.sql
```

### 3. Import O*NET Data
```bash
cd app
npx tsx scripts/import-onet.ts
```

## Build Plan

See `/.claude/plans/warm-jingling-fog.md` for the full 6-phase build plan.
