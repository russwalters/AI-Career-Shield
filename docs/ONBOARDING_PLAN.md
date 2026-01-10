# Onboarding Flow Redesign Plan

## Summary

Add a new `/onboarding` page after Clerk sign-up to capture user profile information before the assessment. This data personalizes the AI conversation and improves career recommendations.

**New flow:**
```
/ → /sign-up (Clerk) → /onboarding (new) → /assess → /results
```

## User Requirements

1. Require sign-up before assessment (no guest access)
2. Collect optional profile fields: job title, years of experience, current salary
3. Profile data influences assessment - if job title provided, Sage skips asking and digs deeper on tasks

---

## Implementation Steps

### Step 1: Database Schema Migration

**Create:** `app/supabase/migrations/002_onboarding_fields.sql`

```sql
ALTER TABLE users ADD COLUMN job_title TEXT;
ALTER TABLE users ADD COLUMN years_of_experience INTEGER;
ALTER TABLE users ADD COLUMN current_salary INTEGER;
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;
```

Run in Supabase SQL Editor after creating.

---

### Step 2: Update TypeScript Types

**Modify:** `app/src/lib/supabase.ts`

Add new fields to the `users` Row type:
- `job_title: string | null`
- `years_of_experience: number | null`
- `current_salary: number | null`
- `onboarding_completed_at: string | null`

---

### Step 3: Create Onboarding API

**Create:** `app/src/app/api/onboarding/route.ts`

- `POST` - Save onboarding data (job_title, years_of_experience, current_salary)
- `GET` - Check onboarding status and retrieve profile

Creates user in DB if doesn't exist, updates if does.

---

### Step 4: Create Onboarding Page

**Create:** `app/src/app/onboarding/page.tsx`

Form with:
- Job title input (placeholder: "e.g., Marketing Manager, Software Engineer")
- Years of experience input (number)
- Current salary input (number, formatted)
- "Continue to Assessment" button
- "Skip for Now" button

Stores profile in sessionStorage for assessment to use immediately.

---

### Step 5: Update Middleware

**Modify:** `app/src/middleware.ts`

Changes:
1. Remove `/assess` from public routes (require auth)
2. Add `/onboarding` to auth-only routes
3. Keep `/api/chat` and `/api/assessment` public for the assessment flow

---

### Step 6: Update Environment Config

**Modify:** `app/.env.local`

```
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

(Change from `/assess` to `/onboarding`)

---

### Step 7: Update Assessment Page

**Modify:** `app/src/app/assess/page.tsx`

1. Load profile from sessionStorage on mount
2. Generate personalized initial greeting:
   - If job title provided: "Hey there! I see you're a {job_title}. Let's dig into your specific tasks..."
   - If no job title: Original greeting asking about job

3. Pass profile context to chat API calls

---

### Step 8: Update Chat API

**Modify:** `app/src/app/api/chat/route.ts`

Add profile context to system prompt when in assessment mode:
```
## Pre-Collected User Information
- Job Title: {jobTitle}
- Years of Experience: {years}
- Annual Salary: ${salary}

DO NOT ask about these details again. Focus on specific tasks and responsibilities.
```

---

### Step 9: Update Claude Prompts

**Modify:** `app/src/lib/claude.ts`

Add `getAssessmentPrompt(context)` function that returns a modified prompt when user has pre-provided job title. Tells Sage to skip basic questions and go deeper.

---

### Step 10: Update Assessment API

**Modify:** `app/src/app/api/assessment/route.ts`

When saving assessment, use onboarding `job_title` if Claude extraction failed or was generic.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/migrations/002_onboarding_fields.sql` | Create |
| `src/lib/supabase.ts` | Modify |
| `src/app/api/onboarding/route.ts` | Create |
| `src/app/onboarding/page.tsx` | Create |
| `src/middleware.ts` | Modify |
| `.env.local` | Modify |
| `src/app/assess/page.tsx` | Modify |
| `src/app/api/chat/route.ts` | Modify |
| `src/lib/claude.ts` | Modify |
| `src/app/api/assessment/route.ts` | Modify |

---

## Data Flow

```
1. User signs up (Clerk)
   ↓
2. Redirected to /onboarding
   ↓
3. Fills optional fields → POST /api/onboarding → Saved to users table
   ↓
4. Profile stored in sessionStorage
   ↓
5. Redirected to /assess
   ↓
6. Assessment page reads sessionStorage, personalizes greeting
   ↓
7. Chat API includes profile in Claude system prompt
   ↓
8. Sage skips redundant questions, focuses on tasks
   ↓
9. Assessment saved with profile-enhanced data
```

---

## Verification

After implementation:

1. **Sign-up flow:** Create new account → should redirect to `/onboarding`
2. **Onboarding form:** Fill fields → should save and redirect to `/assess`
3. **Skip flow:** Click "Skip" → should still redirect to `/assess`
4. **Personalized greeting:** If job title provided, Sage should acknowledge it
5. **Auth protection:** Try accessing `/assess` logged out → should redirect to sign-in
6. **Database:** Check `users` table has new columns populated
