import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/assess(.*)', // Assessment is available to everyone
  '/results(.*)', // Results page (shows upgrade prompt for full features)
  '/paths(.*)', // Career paths page
  '/api/chat(.*)', // Chat API for assessment
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
  if (isShieldRoute(req)) {
    // Get subscription tier from session claims
    // This requires configuring session claims in Clerk dashboard
    const subscriptionTier = sessionClaims?.subscription_tier as string | undefined;

    if (subscriptionTier !== 'shield') {
      // Redirect to paths page with upgrade prompt
      const upgradeUrl = new URL('/paths', req.url);
      upgradeUrl.searchParams.set('upgrade', 'required');
      return NextResponse.redirect(upgradeUrl);
    }
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
