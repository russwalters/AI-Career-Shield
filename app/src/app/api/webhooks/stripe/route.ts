/**
 * Stripe Webhook Handler
 *
 * Processes Stripe subscription events to update user tiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripe, getTierFromPriceId } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Disable body parsing, we need raw body for signature verification
export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Update user subscription tier in database
 */
async function updateUserTier(
  clerkId: string,
  tier: 'free' | 'shield',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {
    subscription_tier: tier,
    updated_at: new Date().toISOString(),
  };

  if (stripeCustomerId) {
    updateData.stripe_customer_id = stripeCustomerId;
  }

  if (stripeSubscriptionId) {
    updateData.stripe_subscription_id = stripeSubscriptionId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('users') as any)
    .update(updateData)
    .eq('clerk_id', clerkId);
}

/**
 * POST /api/webhooks/stripe
 *
 * Handle Stripe webhook events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get Stripe client
    let stripeClient;
    try {
      stripeClient = getStripe();
    } catch {
      console.error('Stripe not configured');
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Processing Stripe event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription' && session.subscription) {
          const clerkId = session.metadata?.clerkId;

          if (clerkId) {
            // Get subscription details
            const subscription = await stripeClient.subscriptions.retrieve(
              session.subscription as string
            );

            const priceId = subscription.items.data[0]?.price.id;
            const tier = priceId ? getTierFromPriceId(priceId) : 'shield';

            await updateUserTier(
              clerkId,
              tier,
              session.customer as string,
              subscription.id
            );

            console.log(`User ${clerkId} upgraded to ${tier}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkId = subscription.metadata?.clerkId;

        if (clerkId) {
          // Check if subscription is still active
          if (subscription.status === 'active') {
            const priceId = subscription.items.data[0]?.price.id;
            const tier = priceId ? getTierFromPriceId(priceId) : 'shield';

            await updateUserTier(clerkId, tier);
            console.log(`User ${clerkId} subscription updated to ${tier}`);
          } else if (
            subscription.status === 'canceled' ||
            subscription.status === 'unpaid'
          ) {
            await updateUserTier(clerkId, 'free');
            console.log(`User ${clerkId} subscription ended`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkId = subscription.metadata?.clerkId;

        if (clerkId) {
          await updateUserTier(clerkId, 'free');
          console.log(`User ${clerkId} subscription deleted`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Invoice type varies by Stripe version - use generic access
        const invoice = event.data.object as unknown as { subscription?: string };
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          try {
            const subscription =
              await stripeClient.subscriptions.retrieve(subscriptionId);
            const clerkId = subscription.metadata?.clerkId;

            if (clerkId) {
              // Could send email notification here
              console.log(`Payment failed for user ${clerkId}`);
            }
          } catch (err) {
            console.error('Failed to retrieve subscription:', err);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
