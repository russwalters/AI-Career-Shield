import { NextRequest } from 'next/server';
import { getAnthropicClient, SAGE_ASSESSMENT_PROMPT, SAGE_COACHING_PROMPT, ChatMessage } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequest {
  messages: ChatMessage[];
  mode: 'assessment' | 'coaching';
  context?: {
    userProfile?: {
      name?: string;
      targetCareer?: string;
      riskScore?: number;
      currentMilestone?: number;
      // Onboarding profile fields (for assessment mode)
      jobTitle?: string;
      yearsOfExperience?: number;
      currentSalary?: number;
    };
    memories?: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, mode, context } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Claude client - handle missing API key gracefully
    let client;
    try {
      client = getAnthropicClient();
    } catch (err) {
      console.error('Claude client error:', err);
      return new Response(
        JSON.stringify({ error: 'AI service not configured', details: err instanceof Error ? err.message : 'Unknown error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt based on mode
    let systemPrompt = mode === 'coaching' ? SAGE_COACHING_PROMPT : SAGE_ASSESSMENT_PROMPT;

    // Add context for coaching mode
    if (mode === 'coaching' && context) {
      systemPrompt += '\n\n## User Context\n\n';

      if (context.userProfile) {
        const { name, targetCareer, riskScore, currentMilestone } = context.userProfile;
        if (name) systemPrompt += `- Name: ${name}\n`;
        if (targetCareer) systemPrompt += `- Target Career: ${targetCareer}\n`;
        if (riskScore !== undefined) systemPrompt += `- Current Risk Score: ${riskScore}/100\n`;
        if (currentMilestone !== undefined) systemPrompt += `- Current Milestone: Week ${currentMilestone}\n`;
      }

      if (context.memories && context.memories.length > 0) {
        systemPrompt += '\n### Previous Insights\n';
        context.memories.forEach((memory, i) => {
          systemPrompt += `${i + 1}. ${memory}\n`;
        });
      }
    }

    // Add profile context for assessment mode (from onboarding)
    if (mode === 'assessment' && context?.userProfile) {
      const { jobTitle, yearsOfExperience, currentSalary } = context.userProfile;

      if (jobTitle || yearsOfExperience || currentSalary) {
        systemPrompt += '\n\n## Pre-Collected User Information\n\n';
        systemPrompt += 'The user has already provided some information during onboarding. DO NOT ask about these details again—acknowledge them briefly and move on to deeper questions about their specific tasks.\n\n';

        if (jobTitle) systemPrompt += `- Job Title: ${jobTitle}\n`;
        if (yearsOfExperience) systemPrompt += `- Years of Experience: ${yearsOfExperience}\n`;
        if (currentSalary) systemPrompt += `- Annual Salary: $${currentSalary.toLocaleString()}\n`;

        systemPrompt += '\nFocus your questions on:\n';
        systemPrompt += '- Specific day-to-day tasks and responsibilities\n';
        systemPrompt += '- Tools and technologies used\n';
        systemPrompt += '- Collaboration patterns and team dynamics\n';
        systemPrompt += '- What brought them to AI Career Shield today\n';
      }
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Create streaming response
    let stream;
    try {
      stream = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      });
    } catch (err) {
      console.error('Claude API error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Check for common API errors
      if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key', details: 'Check your ANTHROPIC_API_KEY' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        return new Response(
          JSON.stringify({ error: 'Rate limited', details: 'Too many requests, please wait' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorMessage }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                // Send as Server-Sent Events format
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                );
              }
            } else if (event.type === 'message_stop') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          // Send error through stream so client can handle it
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: 'Failed to process chat request', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
