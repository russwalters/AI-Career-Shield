/**
 * Coaching API
 *
 * Provides AI career coaching with memory and context.
 * Shield tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnthropicClient, SAGE_COACHING_PROMPT, ChatMessage } from '@/lib/claude';
import {
  buildCoachingContext,
  saveConversation,
  processCoachingSession,
  CoachingContext,
  ConversationMessage,
} from '@/lib/memory-manager';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface CoachRequest {
  messages: ChatMessage[];
  conversationId?: string;
  endSession?: boolean; // Signal to process and store insights
}

/**
 * Build the system prompt with user context
 */
function buildSystemPrompt(context: CoachingContext): string {
  const { userProfile, recentConversations, relevantMemories, currentGoals } = context;

  let contextSection = '';

  // Add assessment context
  if (userProfile.currentAssessment) {
    const assessment = userProfile.currentAssessment;
    contextSection += `
## User's Current Situation
- Job Title: ${assessment.jobTitle}
- Matched Occupation: ${assessment.occupation || 'Not matched'}
- AI Risk Score: ${assessment.riskScore}/100
- Assessment Date: ${new Date(assessment.createdAt).toLocaleDateString()}
`;
  }

  // Add goals
  if (currentGoals.length > 0) {
    contextSection += `
## User's Goals
${currentGoals.map(g => `- ${g}`).join('\n')}
`;
  }

  // Add relevant memories/insights
  const insights = relevantMemories.filter(m => m.memoryType === 'insight');
  if (insights.length > 0) {
    contextSection += `
## Key Insights from Previous Sessions
${insights.slice(0, 5).map(m => `- ${m.content}`).join('\n')}
`;
  }

  // Add progress notes
  const progress = relevantMemories.filter(m => m.memoryType === 'progress');
  if (progress.length > 0) {
    contextSection += `
## Recent Progress
${progress.slice(0, 3).map(m => `- ${m.content}`).join('\n')}
`;
  }

  // Add recent conversation summaries
  const summaries = recentConversations
    .filter(c => c.summary)
    .slice(0, 2);
  if (summaries.length > 0) {
    contextSection += `
## Recent Session Summaries
${summaries.map(c => `- ${c.summary}`).join('\n')}
`;
  }

  return `${SAGE_COACHING_PROMPT}

${contextSection ? `\n---\nCONTEXT ABOUT THIS USER:\n${contextSection}` : ''}

Remember: You have history with this user. Reference their goals, progress, and previous discussions naturally. Be their consistent, supportive career coach.`;
}

/**
 * POST /api/coach
 *
 * Stream a coaching response with full context
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CoachRequest = await req.json();
    const { messages, conversationId, endSession } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages required' },
        { status: 400 }
      );
    }

    // Build coaching context
    const context = await buildCoachingContext(clerkUserId);

    if (!context) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check subscription tier - bypassed for testing, all users get Shield access
    // TODO: Re-enable when Stripe integration is complete
    // if (context.userProfile.subscriptionTier !== 'shield') {
    //   return NextResponse.json(
    //     { error: 'Shield subscription required for coaching' },
    //     { status: 403 }
    //   );
    // }

    // If ending session, process insights and return
    if (endSession && conversationId) {
      const conversationMessages: ConversationMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      await processCoachingSession(
        context.userProfile.id,
        conversationId,
        conversationMessages
      );

      return NextResponse.json({
        success: true,
        message: 'Session processed and insights stored',
      });
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Create streaming response
    const client = getAnthropicClient();

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Save conversation (create or update)
    const conversationMessages: ConversationMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: new Date().toISOString(),
    }));

    const savedConversationId = await saveConversation(
      context.userProfile.id,
      conversationId || null,
      conversationMessages
    );

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ conversationId: savedConversationId })}\n\n`)
          );

          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                );
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Coaching error:', error);

    return NextResponse.json(
      { error: 'Failed to process coaching request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coach/context
 *
 * Get user's coaching context (for debugging/display)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const context = await buildCoachingContext(clerkUserId);

    if (!context) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      context: {
        hasAssessment: !!context.userProfile.currentAssessment,
        riskScore: context.userProfile.currentAssessment?.riskScore,
        conversationCount: context.recentConversations.length,
        memoryCount: context.relevantMemories.length,
        goals: context.currentGoals,
      },
    });
  } catch (error) {
    console.error('Context retrieval error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve context' },
      { status: 500 }
    );
  }
}
