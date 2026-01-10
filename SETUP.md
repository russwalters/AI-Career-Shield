# AI Career Shield - Production Setup Guide

This guide walks through setting up all external services needed to run AI Career Shield in production.

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Clerk Authentication Setup](#2-clerk-authentication-setup)
3. [Anthropic (Claude) API Setup](#3-anthropic-claude-api-setup)
4. [Environment Variables](#4-environment-variables)
5. [Database Migration](#5-database-migration)
6. [O*NET Data Import](#6-onet-data-import)
7. [Verification Checklist](#7-verification-checklist)

---

## 1. Supabase Setup

Supabase provides our PostgreSQL database with pgvector for embeddings.

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create account)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `ai-career-shield` (or your preference)
   - **Database Password:** Generate a strong password and **save it securely**
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Free tier works for development
4. Click **"Create new project"** and wait for provisioning (~2 minutes)

### 1.2 Get API Keys

Once your project is ready:

1. Go to **Settings** → **API** (in left sidebar)
2. Copy these values to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon/public key]
SUPABASE_SERVICE_ROLE_KEY=[service_role key - keep secret!]
```

⚠️ **Important:** The `service_role` key bypasses Row Level Security. Never expose it client-side.

### 1.3 Enable Required Extensions

1. Go to **Database** → **Extensions** (in left sidebar)
2. Search for and enable:
   - `uuid-ossp` (for UUID generation)
   - `vector` (for embeddings - pgvector)
   - `pg_trgm` (for fuzzy text search)

### 1.4 Configure Authentication

Since we're using Clerk for auth (not Supabase Auth):

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, you can disable email/password if desired (we use Clerk)
3. The RLS policies in our schema use JWT claims from Clerk

---

## 2. Clerk Authentication Setup

Clerk handles user authentication, sessions, and user management.

### 2.1 Create Application

1. Go to [clerk.com](https://clerk.com) and sign in (or create account)
2. Click **"Add application"**
3. Fill in:
   - **Application name:** `AI Career Shield`
   - **Sign-in options:** Select your preferences (Email, Google, etc.)
4. Click **"Create application"**

### 2.2 Get API Keys

1. In your Clerk dashboard, go to **API Keys**
2. Copy these values to your `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[...]
CLERK_SECRET_KEY=sk_test_[...]
```

### 2.3 Configure Sign-in/Sign-up

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Configure which identifiers users can sign in with
3. Go to **Social Connections** to enable OAuth providers (Google, GitHub, etc.)

### 2.4 Configure Session Claims (For Subscription Tier)

To pass subscription tier to the middleware:

1. Go to **Sessions** → **Customize session token**
2. Add custom claims:

```json
{
  "subscription_tier": "{{user.public_metadata.subscription_tier}}",
  "user_id": "{{user.id}}"
}
```

This allows our middleware to check subscription tier from the JWT.

### 2.5 Configure Redirect URLs

1. Go to **Paths**
2. Set:
   - **Sign-in URL:** `/sign-in`
   - **Sign-up URL:** `/sign-up`
   - **After sign-in URL:** `/results` (or `/assess` for new users)
   - **After sign-up URL:** `/assess`

### 2.6 Add Webhook for User Sync (Optional but Recommended)

To sync Clerk users to Supabase:

1. Go to **Webhooks**
2. Click **"Add Endpoint"**
3. Set URL: `https://your-domain.com/api/webhooks/clerk`
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the **Signing Secret** to `.env.local`:

```
CLERK_WEBHOOK_SECRET=whsec_[...]
```

---

## 3. Anthropic (Claude) API Setup

Claude powers our AI coach "Sage" and assessment conversations.

### 3.1 Get API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create account
3. Go to **API Keys**
4. Click **"Create Key"**
5. Copy the key to your `.env.local`

```
ANTHROPIC_API_KEY=sk-ant-[...]
```

### 3.2 Usage Limits

- Check your usage tier and rate limits
- For production, consider requesting higher limits
- Monitor usage in the Anthropic console

---

## 4. Environment Variables

Create your `.env.local` file in the `/app` directory:

```bash
cd app
cp .env.local.example .env.local
```

Fill in all values:

```env
# Supabase (from step 1.2)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (from step 2.2)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/results
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/assess

# Anthropic (from step 3.1)
ANTHROPIC_API_KEY=sk-ant-...

# App URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Database Migration

Run the database schema in Supabase:

### 5.1 Open SQL Editor

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**

### 5.2 Run Migration

1. Copy the contents of `app/supabase/migrations/001_initial_schema.sql`
2. Paste into the SQL Editor
3. Click **"Run"**

You should see "Success. No rows returned" for each statement.

### 5.3 Verify Tables

Go to **Table Editor** and confirm these tables exist:
- `occupations`
- `alternate_titles`
- `tasks`
- `skills`
- `work_activities`
- `detailed_work_activities`
- `task_dwa_links`
- `dwa_ai_exposure`
- `gwa_ai_exposure`
- `users`
- `assessments`
- `career_recommendations`
- `conversations`
- `user_memory`
- `action_plans`
- `learning_progress`

---

## 6. O*NET Data Import

Import the O*NET occupational database into Supabase.

### 6.1 Verify Data Files

Ensure O*NET data exists at `/data/onet/db_30_1_text/`:
- `Occupation Data.txt`
- `Alternate Titles.txt`
- `Task Statements.txt`
- `Skills.txt`
- `Work Activities.txt`
- `DWA Reference.txt`
- `Tasks to DWAs.txt`
- `Job Zones.txt`
- `Task Ratings.txt`

### 6.2 Run Import Script

```bash
cd app
npx tsx scripts/import-onet.ts
```

Expected output:
```
============================================================
O*NET Database Import
============================================================
Data path: /path/to/data/onet/db_30_1_text
Supabase URL: https://[project].supabase.co

Importing occupations...
  Inserted 923/923 rows
  Total occupations: 923

Importing alternate titles...
  Inserted 58000+/58000+ rows
  Total alternate titles: 58XXX

[... continues for each table ...]

============================================================
Import complete in XXXs
============================================================
```

### 6.3 Verify Import

In Supabase Table Editor, check row counts:
- `occupations`: ~923 rows
- `alternate_titles`: ~58,000 rows
- `tasks`: ~19,000 rows
- `detailed_work_activities`: ~2,000 rows
- `task_dwa_links`: ~30,000+ rows

---

## 7. Verification Checklist

Run through this checklist to confirm everything is working:

### Environment
- [ ] `.env.local` file created with all values filled in
- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts without errors

### Supabase
- [ ] Project created and running
- [ ] Extensions enabled (uuid-ossp, vector, pg_trgm)
- [ ] All tables created via migration
- [ ] O*NET data imported successfully
- [ ] Can query data in Table Editor

### Clerk
- [ ] Application created
- [ ] API keys added to `.env.local`
- [ ] Sign-in page loads at `/sign-in`
- [ ] Can create a test account
- [ ] Can sign in successfully
- [ ] Session claims configured (for subscription tier)

### Claude API
- [ ] API key added to `.env.local`
- [ ] Can make test request (try the assessment flow)

### Full Flow Test
- [ ] Landing page loads (`/`)
- [ ] Can start assessment (`/assess`)
- [ ] Chat interface works (mock or real Claude)
- [ ] Can view results (`/results`)
- [ ] Can view career paths (`/paths`)
- [ ] Shield routes protected (`/coach`, `/plan`, `/learn`)

---

## Troubleshooting

### "Missing publishableKey" Error
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
- Restart the dev server after adding env vars

### Database Connection Errors
- Check Supabase project is not paused (free tier pauses after inactivity)
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check API keys are from the correct project

### Import Script Fails
- Ensure O*NET files are in `/data/onet/db_30_1_text/`
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (needed for bulk inserts)
- Run migration before import

### Auth Redirect Loops
- Clear browser cookies
- Check Clerk redirect URLs are configured correctly
- Verify middleware matcher patterns

---

## Next Steps

After completing setup:

1. **Phase 2:** Run the DWA scoring script to generate AI exposure scores
2. **Phase 3:** Test the full assessment flow with real Claude API
3. **Phase 4:** Verify risk calculations and career recommendations
4. **Phase 5:** Set up Stripe for Shield tier payments (when ready)

See `docs/BUILD_PLAN.md` for the full development roadmap.
