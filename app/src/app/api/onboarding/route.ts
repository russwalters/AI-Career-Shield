/**
 * Onboarding API
 *
 * POST: Save onboarding data for authenticated user
 * GET: Retrieve onboarding status and profile for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface OnboardingData {
  jobTitle?: string;
  yearsOfExperience?: number;
  currentSalary?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: OnboardingData = await req.json();
    const { jobTitle, yearsOfExperience, currentSalary } = body;

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single() as { data: { id: string } | null };

    if (!existingUser) {
      // Create new user with onboarding data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error } = await (supabase
        .from('users') as any)
        .insert({
          clerk_id: clerkUserId,
          subscription_tier: 'free',
          subscription_status: 'active',
          job_title: jobTitle || null,
          years_of_experience: yearsOfExperience || null,
          current_salary: currentSalary || null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .select('id')
        .single() as { data: { id: string } | null; error: Error | null };

      if (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json(
          { error: 'Failed to save onboarding data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        userId: newUser?.id,
        message: 'User created with onboarding data'
      });
    }

    // Update existing user with onboarding data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({
        job_title: jobTitle || null,
        years_of_experience: yearsOfExperience || null,
        current_salary: currentSalary || null,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('clerk_id', clerkUserId);

    if (updateError) {
      console.error('Failed to update user:', updateError);
      return NextResponse.json(
        { error: 'Failed to save onboarding data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: existingUser.id,
      message: 'Onboarding data saved'
    });
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500 }
    );
  }
}

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

    interface OnboardingUser {
      id: string;
      job_title: string | null;
      years_of_experience: number | null;
      current_salary: number | null;
      onboarding_completed_at: string | null;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, job_title, years_of_experience, current_salary, onboarding_completed_at')
      .eq('clerk_id', clerkUserId)
      .single() as { data: OnboardingUser | null };

    return NextResponse.json({
      success: true,
      onboardingCompleted: !!user?.onboarding_completed_at,
      profile: user ? {
        jobTitle: user.job_title,
        yearsOfExperience: user.years_of_experience,
        currentSalary: user.current_salary,
      } : null,
    });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}
