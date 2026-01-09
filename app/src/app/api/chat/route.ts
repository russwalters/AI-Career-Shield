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

    const client = getAnthropicClient();

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

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Create streaming response
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

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
          controller.error(error);
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
