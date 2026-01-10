/**
 * Email Service
 *
 * Send transactional emails using Resend.
 */

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'AI Career Shield <noreply@aicareershield.com>';

// Initialize Resend client
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn('Email not configured (RESEND_API_KEY missing)');
    return false;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';

  return sendEmail({
    to: email,
    subject: 'Welcome to AI Career Shield',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">AI Career Shield</h1>
  </div>

  <h2 style="color: #0f172a;">Hey ${firstName}!</h2>

  <p>Welcome to AI Career Shield. You've taken an important first step in understanding how AI might affect your career.</p>

  <p>Here's what you can do next:</p>

  <ul style="padding-left: 20px;">
    <li><strong>Take your assessment</strong> — Our AI-powered assessment analyzes your specific role and tasks</li>
    <li><strong>View your results</strong> — See your AI exposure score and what it means</li>
    <li><strong>Explore career paths</strong> — Discover roles that leverage your skills with lower AI risk</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/assess"
       style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Start Your Assessment
    </a>
  </div>

  <p style="color: #64748b; font-size: 14px;">
    Questions? Just reply to this email — we're here to help.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    AI Career Shield — Navigate your career with confidence
  </p>
</body>
</html>
    `,
    text: `Hey ${firstName}!

Welcome to AI Career Shield. You've taken an important first step in understanding how AI might affect your career.

Here's what you can do next:

1. Take your assessment — Our AI-powered assessment analyzes your specific role and tasks
2. View your results — See your AI exposure score and what it means
3. Explore career paths — Discover roles that leverage your skills with lower AI risk

Start your assessment: ${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/assess

Questions? Just reply to this email — we're here to help.

AI Career Shield — Navigate your career with confidence`,
  });
}

/**
 * Send assessment complete email with summary
 */
export async function sendAssessmentCompleteEmail(
  email: string,
  name: string | undefined,
  riskScore: number,
  occupation: string
): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';
  const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Moderate' : 'Low';
  const riskColor = riskScore >= 70 ? '#dc2626' : riskScore >= 40 ? '#f59e0b' : '#16a34a';

  return sendEmail({
    to: email,
    subject: `Your AI Career Risk Assessment Results — ${riskLevel} Exposure`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">AI Career Shield</h1>
  </div>

  <h2 style="color: #0f172a;">Hey ${firstName}, your results are ready!</h2>

  <p>We've analyzed your role as <strong>${occupation}</strong> and here's what we found:</p>

  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Your AI Exposure Score</p>
    <div style="font-size: 48px; font-weight: bold; color: ${riskColor};">${riskScore}</div>
    <p style="margin: 10px 0 0 0; font-weight: 600; color: ${riskColor};">${riskLevel} Exposure</p>
  </div>

  <p>This score reflects how much of your current work could potentially be automated by AI tools. But remember — this isn't destiny, it's a starting point.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/results"
       style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      View Full Results
    </a>
  </div>

  <p>Your full results include:</p>
  <ul style="padding-left: 20px;">
    <li>Breakdown of which tasks are most/least exposed</li>
    <li>Skills that protect you from automation</li>
    <li>Recommended career paths with lower AI exposure</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    AI Career Shield — Navigate your career with confidence
  </p>
</body>
</html>
    `,
  });
}

/**
 * Send Shield subscription confirmation
 */
export async function sendSubscriptionConfirmationEmail(
  email: string,
  name?: string
): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';

  return sendEmail({
    to: email,
    subject: 'Welcome to AI Career Shield — Your Shield is Active!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">AI Career Shield</h1>
    <p style="color: #2563eb; font-weight: 600; margin: 10px 0 0 0;">Shield Plan Active</p>
  </div>

  <h2 style="color: #0f172a;">Hey ${firstName}, you're all set!</h2>

  <p>Your Shield subscription is now active. Here's what you've unlocked:</p>

  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <ul style="padding-left: 20px; margin: 0;">
      <li style="margin-bottom: 10px;"><strong>AI Career Coach</strong> — Get personalized guidance from Sage, your AI coach who remembers your goals and progress</li>
      <li style="margin-bottom: 10px;"><strong>90-Day Action Plan</strong> — A customized roadmap for your career transition</li>
      <li style="margin-bottom: 10px;"><strong>Learning Resources</strong> — Curated resources matched to your skill gaps</li>
      <li><strong>Weekly Check-ins</strong> — Stay on track with personalized reminders</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/coach"
       style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Start Coaching Session
    </a>
  </div>

  <p style="color: #64748b; font-size: 14px;">
    Need to manage your subscription? Visit your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/plan" style="color: #2563eb;">Plan page</a> anytime.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    AI Career Shield — Navigate your career with confidence
  </p>
</body>
</html>
    `,
  });
}

/**
 * Send weekly check-in email
 */
export async function sendWeeklyCheckInEmail(
  email: string,
  name: string | undefined,
  targetCareer: string,
  progress: number,
  currentMilestone?: string
): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';

  return sendEmail({
    to: email,
    subject: `Weekly Check-in: ${progress}% toward ${targetCareer}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">AI Career Shield</h1>
  </div>

  <h2 style="color: #0f172a;">Hey ${firstName}, time for your weekly check-in!</h2>

  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Progress toward ${targetCareer}</p>
    <div style="background: #e2e8f0; border-radius: 8px; height: 12px; overflow: hidden;">
      <div style="background: #2563eb; height: 100%; width: ${progress}%;"></div>
    </div>
    <p style="margin: 10px 0 0 0; font-weight: 600; color: #0f172a;">${progress}% Complete</p>
  </div>

  ${currentMilestone ? `
  <p><strong>Current focus:</strong> ${currentMilestone}</p>
  ` : ''}

  <p>Take a few minutes to:</p>
  <ul style="padding-left: 20px;">
    <li>Update your progress on completed tasks</li>
    <li>Chat with Sage about any blockers</li>
    <li>Plan your focus for this week</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/coach"
       style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Check In with Sage
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    AI Career Shield — Navigate your career with confidence<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aicareershield.com'}/settings" style="color: #94a3b8;">Manage email preferences</a>
  </p>
</body>
</html>
    `,
  });
}
