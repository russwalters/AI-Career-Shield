import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes (no auth required)
// Note: API routes handle their own auth and return JSON errors
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Note: /assess now requires auth - users must sign up first
  '/results(.*)', // Results page (shows upgrade prompt for full features)
  '/paths(.*)', // Career paths page
  '/api/chat(.*)', // Chat API for assessment
  '/api/assessment(.*)', // Assessment processing API
  '/api/onboarding(.*)', // Onboarding API (auth checked internally)
  '/api/plan(.*)', // Plan API (auth checked internally)
  '/api/coach(.*)', // Coach API (auth checked internally)
  '/api/checkout(.*)', // Checkout API (auth checked internally, returns JSON)
  '/api/billing(.*)', // Billing API (auth checked internally, returns JSON)
  '/api/webhooks(.*)', // Webhooks (signature verified internally)
]);

// Define Shield-tier only routes
const isShieldRoute = createRouteMatcher([
  '/coach(.*)',
  '/plan(.*)',
  '/learn(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check Shield tier for protected routes
  // TODO: For production, configure Clerk session claims to include subscription_tier
  // or check Supabase directly. For now, allowing all authenticated users.
  if (isShieldRoute(req)) {
    // For testing: allow all authenticated users to access Shield routes
    // The page-level components will check Supabase for actual tier
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    // Skip tier check for now - let authenticated users through
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
