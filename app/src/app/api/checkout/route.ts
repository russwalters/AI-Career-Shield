/**
 * Checkout API
 *
 * Creates Stripe checkout sessions for Shield subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createCheckoutSession, STRIPE_PRICES } from '@/lib/stripe';

export const runtime = 'nodejs';

interface CheckoutRequest {
  priceType: 'monthly' | 'annual';
}

/**
 * POST /api/checkout
 *
 * Create a Stripe checkout session
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

    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }

    const email = user.emailAddresses[0].emailAddress;

    const body: CheckoutRequest = await req.json();
    const { priceType } = body;

    // Get price ID
    const priceId =
      priceType === 'annual'
        ? STRIPE_PRICES.SHIELD_ANNUAL
        : STRIPE_PRICES.SHIELD_MONTHLY;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe prices not configured' },
        { status: 500 }
      );
    }

    // Get or create user in database
    const supabase = getSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: dbUser } = await (supabase.from('users') as any)
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single() as { data: { id: string } | null };

    if (!dbUser) {
      // Create user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser } = await (supabase.from('users') as any)
        .insert({
          clerk_id: clerkUserId,
          email,
        })
        .select('id')
        .single() as { data: { id: string } | null };

      dbUser = newUser;
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Get base URL
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Create checkout session
    const session = await createCheckoutSession({
      userId: dbUser.id,
      clerkId: clerkUserId,
      email,
      priceId,
      successUrl: `${origin}/plan?checkout=success`,
      cancelUrl: `${origin}/results?checkout=canceled`,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
