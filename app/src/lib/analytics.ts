/**
 * Analytics
 *
 * Simple analytics tracking abstraction.
 * Supports PostHog or can be extended for other providers.
 */

// Analytics provider configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Event names for consistency
export const ANALYTICS_EVENTS = {
  // Assessment flow
  ASSESSMENT_STARTED: 'assessment_started',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  ASSESSMENT_ABANDONED: 'assessment_abandoned',

  // Results
  RESULTS_VIEWED: 'results_viewed',
  CAREER_PATH_CLICKED: 'career_path_clicked',
  SKILLS_SECTION_VIEWED: 'skills_section_viewed',

  // Upgrade
  UPGRADE_MODAL_SHOWN: 'upgrade_modal_shown',
  UPGRADE_CLICKED: 'upgrade_clicked',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',

  // Shield features
  COACHING_SESSION_STARTED: 'coaching_session_started',
  COACHING_MESSAGE_SENT: 'coaching_message_sent',
  ACTION_PLAN_GENERATED: 'action_plan_generated',
  TASK_COMPLETED: 'task_completed',

  // General
  PAGE_VIEW: 'page_view',
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track an analytics event
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: EventProperties
): void {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, properties);
  }

  // PostHog tracking (client-side)
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    // PostHog is loaded via script tag in layout
    const posthog = (window as unknown as { posthog?: { capture: (event: string, props?: EventProperties) => void } }).posthog;
    if (posthog) {
      posthog.capture(event, properties);
    }
  }
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  traits?: {
    email?: string;
    name?: string;
    subscriptionTier?: string;
    riskScore?: number;
    [key: string]: string | number | boolean | null | undefined;
  }
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Identify', userId, traits);
  }

  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    const posthog = (window as unknown as { posthog?: { identify: (id: string, props?: EventProperties) => void } }).posthog;
    if (posthog) {
      posthog.identify(userId, traits);
    }
  }
}

/**
 * Reset analytics (on sign out)
 */
export function resetAnalytics(): void {
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    const posthog = (window as unknown as { posthog?: { reset: () => void } }).posthog;
    if (posthog) {
      posthog.reset();
    }
  }
}

/**
 * Server-side event tracking
 * For tracking events that happen on the server (webhooks, API routes)
 */
export async function trackServerEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: EventProperties
): Promise<void> {
  if (!POSTHOG_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'server',
        },
      }),
    });
  } catch (error) {
    console.error('Failed to track server event:', error);
  }
}

/**
 * PostHog script for client-side initialization
 * Add this to your layout.tsx
 */
export function getPostHogScript(): string {
  if (!POSTHOG_KEY) return '';

  return `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}',{api_host:'${POSTHOG_HOST}'})
  `;
}
