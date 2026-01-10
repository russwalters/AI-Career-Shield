/**
 * Action Plan API
 *
 * Generate, retrieve, and update action plans.
 * Shield tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  generateActionPlan,
  saveActionPlan,
  getActionPlan,
  updateTaskCompletion,
  calculatePlanProgress,
} from '@/lib/plan-generator';
import { getQuickRecommendations } from '@/lib/career-recommender';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Type for user row
interface UserRow {
  id: string;
  subscription_tier: string;
}

// Type for assessment row
interface AssessmentRow {
  id: string;
  job_title_input: string;
  matched_soc_code: string | null;
  risk_score: number;
  protected_skills: string[] | null;
  vulnerable_skills: string[] | null;
  occupations: { title: string } | null;
}

/**
 * POST /api/plan
 *
 * Generate a new action plan
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { targetSocCode } = body;

    const supabase = getSupabaseAdmin();

    // Get or create user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: user } = await (supabase.from('users') as any)
      .select('id, subscription_tier')
      .eq('clerk_id', clerkUserId)
      .single() as { data: UserRow | null };

    if (!user) {
      // Create user with shield tier for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error: createError } = await (supabase.from('users') as any)
        .insert({ clerk_id: clerkUserId, subscription_tier: 'shield' })
        .select('id, subscription_tier')
        .single() as { data: UserRow | null; error: Error | null };

      if (createError || !newUser) {
        console.error('Failed to create user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      user = newUser;
    }

    // Check subscription
    if (user.subscription_tier !== 'shield') {
      return NextResponse.json(
        { error: 'Shield subscription required' },
        { status: 403 }
      );
    }

    // Get latest assessment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessment } = await (supabase.from('assessments') as any)
      .select(`
        id,
        job_title_input,
        matched_soc_code,
        risk_score,
        protected_skills,
        vulnerable_skills,
        occupations:matched_soc_code (title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: AssessmentRow | null };

    if (!assessment) {
      return NextResponse.json(
        { error: 'No assessment found. Complete an assessment first.' },
        { status: 400 }
      );
    }

    // Get target career recommendation
    let targetCareer;
    if (targetSocCode && assessment.matched_soc_code) {
      // Get specific recommendation
      const recommendations = await getQuickRecommendations(
        assessment.matched_soc_code,
        assessment.risk_score,
        10
      );
      targetCareer = recommendations.find(r => r.socCode === targetSocCode);
    }

    if (!targetCareer && assessment.matched_soc_code) {
      // Get best recommendation
      const recommendations = await getQuickRecommendations(
        assessment.matched_soc_code,
        assessment.risk_score,
        1
      );
      targetCareer = recommendations[0];
    }

    if (!targetCareer) {
      return NextResponse.json(
        { error: 'Could not find suitable career recommendation' },
        { status: 400 }
      );
    }

    // Generate plan
    const plan = await generateActionPlan(
      user.id,
      assessment.id,
      {
        id: assessment.id,
        jobTitle: assessment.job_title_input,
        occupation: assessment.occupations?.title || null,
        riskScore: assessment.risk_score,
        protectedSkills: assessment.protected_skills || [],
        vulnerableSkills: assessment.vulnerable_skills || [],
      },
      targetCareer
    );

    // Save plan
    const planId = await saveActionPlan(plan);

    return NextResponse.json({
      success: true,
      planId,
      plan: {
        ...plan,
        id: planId,
        progress: 0,
      },
    });
  } catch (error) {
    console.error('Plan generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate action plan' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/plan
 *
 * Get user's current action plan
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get or create user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: user } = await (supabase.from('users') as any)
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single() as { data: { id: string } | null };

    if (!user) {
      // Create user with shield tier for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser } = await (supabase.from('users') as any)
        .insert({ clerk_id: clerkUserId, subscription_tier: 'shield' })
        .select('id')
        .single() as { data: { id: string } | null };
      user = newUser;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to get or create user' },
        { status: 500 }
      );
    }

    const plan = await getActionPlan(user.id);

    if (!plan) {
      return NextResponse.json({
        success: true,
        plan: null,
      });
    }

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        progress: calculatePlanProgress(plan.milestones),
      },
    });
  } catch (error) {
    console.error('Plan retrieval error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve action plan' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plan
 *
 * Update task completion status
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, milestoneWeek, taskIndex, completed } = body;

    if (!planId || milestoneWeek === undefined || taskIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await updateTaskCompletion(planId, milestoneWeek, taskIndex, completed);

    // Get updated plan for progress calculation
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user } = await (supabase.from('users') as any)
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single() as { data: { id: string } | null };

    if (user) {
      const plan = await getActionPlan(user.id);
      if (plan) {
        return NextResponse.json({
          success: true,
          progress: calculatePlanProgress(plan.milestones),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Plan update error:', error);

    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
