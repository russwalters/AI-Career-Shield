/**
 * Billing Portal API
 *
 * Creates Stripe billing portal sessions for subscription management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createPortalSession } from '@/lib/stripe';

export const runtime = 'nodejs';

interface UserRow {
  id: string;
  stripe_customer_id: string | null;
}

/**
 * POST /api/billing
 *
 * Create a Stripe billing portal session
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

    const supabase = getSupabaseAdmin();

    // Get user with Stripe customer ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user } = await (supabase.from('users') as any)
      .select('id, stripe_customer_id')
      .eq('clerk_id', clerkUserId)
      .single() as { data: UserRow | null };

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get return URL
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Create portal session
    const session = await createPortalSession({
      customerId: user.stripe_customer_id,
      returnUrl: `${origin}/plan`,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Billing portal error:', error);

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
