# AI Career Shield - Full Product Build Plan

## Overview

Transform the working prototype into a production-ready MVP with real AI-powered assessment, comprehensive exposure scoring, and dynamic coaching. Target: 8+ weeks to launch-ready.

**Key Decisions:**
- Timeline: 8+ weeks (thorough, ready for paying customers)
- AI Scoring: Comprehensive — score all 2,000+ Detailed Work Activities upfront
- Hosting: Supabase Cloud (managed)
- Learning Resources: AI-generated recommendations via Claude

---

## Phase 1: Foundation (Week 1-2)

### Status: IN PROGRESS

### What Claude Builds:
- [x] Database schema migration (`app/supabase/migrations/001_initial_schema.sql`)
- [x] O*NET import script (`app/scripts/import-onet.ts`)
- [x] Supabase client library (`app/src/lib/supabase.ts`)
- [x] Claude API client (`app/src/lib/claude.ts`)
- [x] Chat API route (`app/src/app/api/chat/route.ts`)
- [x] Clerk middleware (`app/src/middleware.ts`)
- [x] Auth pages (`app/src/app/sign-in`, `app/src/app/sign-up`)
- [x] Environment template (`app/.env.local.example`)

### What You Do (Manual Steps):

#### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Create account/Sign in
2. Click **"New Project"**
3. Configure:
   - Name: `ai-career-shield`
   - Password: Generate and save securely
   - Region: Choose closest to users
4. Wait for provisioning (~2 min)
5. Go to **Settings → API** and copy keys to `.env.local`

#### 1.2 Enable Supabase Extensions
In Supabase dashboard:
1. Go to **Database → Extensions**
2. Enable: `uuid-ossp`, `vector`, `pg_trgm`

#### 1.3 Run Database Migration
1. Go to **SQL Editor** in Supabase
2. Copy contents of `app/supabase/migrations/001_initial_schema.sql`
3. Paste and click **Run**
4. Verify tables in **Table Editor**

#### 1.4 Create Clerk Application
1. Go to [clerk.com](https://clerk.com) → Create account/Sign in
2. Click **"Add application"**
3. Name: `AI Career Shield`
4. Configure sign-in options (Email, Google, etc.)
5. Copy API keys to `.env.local`

#### 1.5 Configure Clerk Session Claims
1. In Clerk dashboard → **Sessions → Customize session token**
2. Add:
```json
{
  "subscription_tier": "{{user.public_metadata.subscription_tier}}",
  "user_id": "{{user.id}}"
}
```

#### 1.6 Set Up Environment
```bash
cd app
cp .env.local.example .env.local
# Fill in all values from Supabase and Clerk
```

#### 1.7 Import O*NET Data
```bash
cd app
npx tsx scripts/import-onet.ts
```

### Verification Checklist:
- [ ] Supabase project created and running
- [ ] All database extensions enabled
- [ ] Database migration completed (16 tables created)
- [ ] Clerk application created
- [ ] Session claims configured
- [ ] `.env.local` filled with all keys
- [ ] O*NET data imported successfully
- [ ] `npm run build` passes
- [ ] `npm run dev` starts without errors
- [ ] Sign-in page loads at `/sign-in`

---

## Phase 2: AI Exposure Scoring Engine (Week 2-3)

### Status: IN PROGRESS

### What Claude Builds:
- [x] DWA scoring script (`app/scripts/score-dwas.ts`)
- [x] Exposure calculator (`app/src/lib/exposure-calculator.ts`)
- [x] GWA aggregation logic (`app/scripts/aggregate-gwa-scores.ts`)

### What You Do:

#### 2.1 Run DWA Scoring
```bash
cd app
npx tsx scripts/score-dwas.ts
```
This will:
- Process all 2,000+ Detailed Work Activities through Claude
- Store AI exposure scores in `dwa_ai_exposure` table
- Takes ~2-4 hours (rate limited to avoid API throttling)
- Cost: Approximately $20-40 in Claude API credits

#### 2.2 Review Outliers
1. In Supabase, query extreme scores:
```sql
SELECT * FROM dwa_ai_exposure
WHERE exposure_score < 10 OR exposure_score > 90
ORDER BY exposure_score;
```
2. Manually review and adjust if needed

#### 2.3 Calculate GWA Aggregates
```bash
npx tsx scripts/aggregate-gwa-scores.ts
```

### Scoring Methodology:
- 0-30: Low exposure (significant human elements required)
- 31-60: Medium exposure (AI assists but humans essential)
- 61-100: High exposure (AI can perform most/all)

### Verification Checklist:
- [ ] All 2,087 DWAs have exposure scores
- [ ] Scores stored in `dwa_ai_exposure` table
- [ ] GWA aggregate scores calculated (41 categories)
- [ ] Spot-check 20 random DWAs for reasonable scores

---

## Phase 3: Assessment Flow (Week 3-4)

### What Claude Builds:
- [ ] Job title → Occupation matcher (`app/src/lib/occupation-matcher.ts`)
- [ ] Task → DWA mapper (`app/src/lib/task-mapper.ts`)
- [ ] Assessment extraction API (`app/src/app/api/assessment/route.ts`)
- [ ] Update assess page to use real Claude API

### What You Do:

#### 3.1 Test Assessment Flow
1. Start dev server: `npm run dev`
2. Go through full assessment flow
3. Verify Claude responses are natural (Sage personality)
4. Check data extraction at end of assessment

#### 3.2 Verify Job Matching
Test with various job titles:
- Common titles (Software Engineer, Marketing Manager)
- Uncommon titles (Growth Hacker, DevOps Engineer)
- Verify O*NET matches are reasonable

### Verification Checklist:
- [ ] Assessment chat uses real Claude API
- [ ] Sage personality is consistent
- [ ] Job titles match to correct O*NET occupations
- [ ] User tasks extracted correctly from conversation
- [ ] Tasks map to appropriate DWAs

---

## Phase 4: Results & Recommendations (Week 4-5)

### What Claude Builds:
- [ ] Risk calculator (`app/src/lib/risk-calculator.ts`)
- [ ] Career recommender (`app/src/lib/career-recommender.ts`)
- [ ] Update results page to show real data
- [ ] Update paths page with real recommendations

### What You Do:

#### 4.1 Test Risk Calculations
1. Complete assessment with known job (e.g., "Data Entry Clerk")
2. Verify risk score aligns with expectations
3. Check confidence ranges are reasonable
4. Verify scenario scores (slow vs rapid AI)

#### 4.2 Test Career Recommendations
1. Complete assessment
2. Verify recommended careers:
   - Have lower AI exposure
   - Have high skill overlap
   - Are realistic transitions

### Verification Checklist:
- [ ] Risk scores calculate correctly from DWA mappings
- [ ] Confidence ranges reflect mapping uncertainty
- [ ] Scenario scores show reasonable spread
- [ ] Task breakdown percentages sum to 100%
- [ ] Career recommendations are relevant
- [ ] Skills gap analysis is accurate

---

## Phase 5: Shield Tier - Coaching & Plans (Week 5-7)

### What Claude Builds:
- [ ] Memory manager (`app/src/lib/memory-manager.ts`)
- [ ] Plan generator (`app/src/lib/plan-generator.ts`)
- [ ] Update coach page with real memory
- [ ] Update plan page with generated plans
- [ ] Clerk webhook for user sync (`app/src/app/api/webhooks/clerk/route.ts`)

### What You Do:

#### 5.1 Set Up Clerk Webhook
1. In Clerk dashboard → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `.env.local`

#### 5.2 Test User Sync
1. Create new account via sign-up
2. Verify user appears in Supabase `users` table
3. Check `clerk_id` matches

#### 5.3 Test Shield Features (Manual Upgrade)
1. In Supabase, update a test user:
```sql
UPDATE users
SET subscription_tier = 'shield'
WHERE email = 'your-test-email@example.com';
```
2. In Clerk, set user metadata:
   - Go to Users → Select user → Metadata
   - Add public metadata: `{"subscription_tier": "shield"}`
3. Test coach, plan, and learn pages

#### 5.4 Test Memory Persistence
1. Have coaching conversation
2. Close browser, sign in again
3. Start new coaching session
4. Verify Sage remembers previous context

### Verification Checklist:
- [ ] Clerk webhook syncs users to Supabase
- [ ] Shield routes properly protected
- [ ] Coaching chat has memory across sessions
- [ ] Action plans generate for Shield users
- [ ] Plans have realistic milestones and tasks
- [ ] Learning recommendations are relevant

---

## Phase 6: Polish & Launch Prep (Week 7-8+)

### What Claude Builds:
- [ ] Stripe integration (`app/src/app/api/webhooks/stripe/route.ts`)
- [ ] Checkout flow
- [ ] Email templates (Resend)
- [ ] PWA enhancements
- [ ] Error boundaries and fallbacks
- [ ] Analytics integration

### What You Do:

#### 6.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com) → Create account
2. Create products:
   - Shield Monthly: $29/month
   - Shield Annual: $249/year
3. Copy API keys to `.env.local`
4. Set up webhook endpoint

#### 6.2 Configure Email (Resend)
1. Go to [resend.com](https://resend.com) → Create account
2. Verify domain
3. Copy API key to `.env.local`

#### 6.3 Set Up Analytics (PostHog)
1. Go to [posthog.com](https://posthog.com) → Create account
2. Create project
3. Copy keys to `.env.local`

#### 6.4 Deploy to Vercel
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

#### 6.5 Domain Setup
1. Purchase domain
2. Configure DNS in Vercel
3. Enable SSL (automatic)

### Verification Checklist:
- [ ] Stripe test payments work
- [ ] Subscription upgrades work
- [ ] Webhook updates user tier
- [ ] Welcome email sends on signup
- [ ] Weekly check-in emails configured
- [ ] Analytics tracking events
- [ ] PWA installable on mobile
- [ ] Error handling graceful
- [ ] Production deployment live

---

## Cost Estimates

### One-Time:
- DWA Scoring: ~$20-40 (Claude API)
- Domain: ~$12-15/year

### Monthly (at launch):
- Supabase: Free tier (upgrade as needed)
- Clerk: Free up to 10K MAU
- Vercel: Free tier (upgrade as needed)
- Claude API: ~$50-200/month (depends on usage)
- Resend: Free up to 3K emails/month
- PostHog: Free up to 1M events/month

### At Scale:
- Supabase Pro: $25/month
- Clerk Pro: $25/month + usage
- Vercel Pro: $20/month
- Claude API: Variable
- Resend: $20/month
- PostHog: Free or $0/month (generous free tier)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude API costs high | Cache common queries, batch DWA scoring, monitor usage |
| DWA scoring takes too long | Parallelize, run overnight, can batch over multiple days |
| Job matching accuracy poor | Allow user to confirm/correct match, improve over time |
| Memory retrieval slow | Limit to top-K memories, optimize pgvector indexes |
| Clerk/Supabase outage | Graceful error handling, status page monitoring |

---

## Launch Checklist

### Technical:
- [ ] All features working end-to-end
- [ ] Error handling for all failure modes
- [ ] Mobile responsive on all pages
- [ ] Performance acceptable (<3s page loads)
- [ ] Security review completed

### Legal:
- [ ] Privacy policy published
- [ ] Terms of Service published
- [ ] O*NET attribution displayed
- [ ] Cookie consent if needed

### Business:
- [ ] Stripe live mode enabled
- [ ] Domain configured with SSL
- [ ] Analytics tracking verified
- [ ] Monitoring/alerting set up
- [ ] Backup strategy for Supabase
- [ ] Support email configured

---

## Files Reference

### Scripts (run manually):
```
app/scripts/
├── import-onet.ts         # Import O*NET data
├── score-dwas.ts          # Score all DWAs (Phase 2)
└── aggregate-gwa-scores.ts # Calculate GWA aggregates (Phase 2)
```

### Migrations (run in Supabase SQL Editor):
```
app/supabase/migrations/
└── 001_initial_schema.sql  # Full database schema
```

### Environment:
```
app/.env.local.example      # Template - copy to .env.local
```

### Documentation:
```
SETUP.md                    # Step-by-step setup guide
docs/BUILD_PLAN.md          # This file
CLAUDE.md                   # Claude Code reference
```
