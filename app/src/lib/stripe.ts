/**
 * Stripe Client
 *
 * Server-side Stripe configuration and helpers.
 */

import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Only create Stripe client if configured
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

/**
 * Get Stripe client or throw if not configured
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

// Product/Price IDs (set these in your Stripe dashboard)
export const STRIPE_PRICES = {
  SHIELD_MONTHLY: process.env.STRIPE_PRICE_SHIELD_MONTHLY || '',
  SHIELD_ANNUAL: process.env.STRIPE_PRICE_SHIELD_ANNUAL || '',
};

// Subscription tier mapping
export type SubscriptionTier = 'free' | 'shield';

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (
    priceId === STRIPE_PRICES.SHIELD_MONTHLY ||
    priceId === STRIPE_PRICES.SHIELD_ANNUAL
  ) {
    return 'shield';
  }
  return 'free';
}

/**
 * Create a checkout session for Shield subscription
 */
export async function createCheckoutSession(options: {
  userId: string;
  clerkId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { userId, clerkId, email, priceId, successUrl, cancelUrl } = options;
  const stripeClient = getStripe();

  return stripeClient.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      clerkId,
    },
    subscription_data: {
      metadata: {
        userId,
        clerkId,
      },
    },
    allow_promotion_codes: true,
  });
}

/**
 * Create a customer portal session for subscription management
 */
export async function createPortalSession(options: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripeClient = getStripe();
  return stripeClient.billingPortal.sessions.create({
    customer: options.customerId,
    return_url: options.returnUrl,
  });
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(
  email: string
): Promise<Stripe.Customer | null> {
  const stripeClient = getStripe();
  const customers = await stripeClient.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] || null;
}

/**
 * Get active subscription for a customer
 */
export async function getActiveSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const stripeClient = getStripe();
  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data[0] || null;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();
  if (immediately) {
    return stripeClient.subscriptions.cancel(subscriptionId);
  }

  // Cancel at period end
  return stripeClient.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
