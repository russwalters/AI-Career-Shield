/**
 * Memory Manager
 *
 * Manages three layers of memory for the AI coaching system:
 * 1. User Profile - structured data (assessments, goals, progress)
 * 2. Session Memory - current conversation transcript
 * 3. Long-Term Memory - key insights stored as embeddings for retrieval
 */

import { getSupabaseAdmin } from './supabase';
import { getAnthropicClient } from './claude';

// Types for memory system
export interface UserProfile {
  id: string;
  clerkId: string;
  email: string | null;
  subscriptionTier: 'free' | 'shield';
  createdAt: string;
  // From latest assessment
  currentAssessment?: {
    id: string;
    jobTitle: string;
    occupation: string | null;
    riskScore: number;
    createdAt: string;
  };
  // User-set goals
  goals?: string[];
  // Preferences learned over time
  preferences?: Record<string, string>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  type: 'assessment' | 'coaching';
  messages: ConversationMessage[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  memoryType: 'insight' | 'goal' | 'progress' | 'preference';
  createdAt: string;
}

export interface CoachingContext {
  userProfile: UserProfile;
  recentConversations: Conversation[];
  relevantMemories: Memory[];
  currentGoals: string[];
}

// Type definitions for Supabase queries
interface UserRow {
  id: string;
  clerk_id: string;
  email: string | null;
  subscription_tier: string;
  created_at: string;
}

interface AssessmentRow {
  id: string;
  job_title_input: string;
  matched_soc_code: string | null;
  risk_score: number;
  created_at: string;
  occupations: { title: string } | null;
}

interface ConversationRow {
  id: string;
  user_id: string;
  conversation_type: string;
  messages: ConversationMessage[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryRow {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  created_at: string;
}

/**
 * Get or create a user profile
 */
export async function getUserProfile(clerkId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();

  // Get user
   
  const { data: user, error: userError } = await (supabase
    .from('users') as any)
    .select('*')
    .eq('clerk_id', clerkId)
    .single() as { data: UserRow | null; error: Error | null };

  if (userError || !user) {
    return null;
  }

  // Get latest assessment
   
  const { data: assessment } = await (supabase
    .from('assessments') as any)
    .select(`
      id,
      job_title_input,
      matched_soc_code,
      risk_score,
      created_at,
      occupations:matched_soc_code (title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: AssessmentRow | null };

  return {
    id: user.id,
    clerkId: user.clerk_id,
    email: user.email,
    subscriptionTier: (user.subscription_tier as 'free' | 'shield') || 'free',
    createdAt: user.created_at,
    currentAssessment: assessment ? {
      id: assessment.id,
      jobTitle: assessment.job_title_input,
      occupation: assessment.occupations?.title || null,
      riskScore: assessment.risk_score,
      createdAt: assessment.created_at,
    } : undefined,
  };
}

/**
 * Get recent conversations for context
 */
export async function getRecentConversations(
  userId: string,
  limit: number = 3
): Promise<Conversation[]> {
  const supabase = getSupabaseAdmin();

   
  const { data: conversations } = await (supabase
    .from('conversations') as any)
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_type', 'coaching')
    .order('updated_at', { ascending: false })
    .limit(limit) as { data: ConversationRow[] | null };

  if (!conversations) return [];

  return conversations.map(c => ({
    id: c.id,
    userId: c.user_id,
    type: c.conversation_type as 'assessment' | 'coaching',
    messages: c.messages || [],
    summary: c.summary || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

/**
 * Save or update a conversation
 */
export async function saveConversation(
  userId: string,
  conversationId: string | null,
  messages: ConversationMessage[],
  type: 'assessment' | 'coaching' = 'coaching'
): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (conversationId) {
    // Update existing conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('conversations') as any)
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return conversationId;
  } else {
    // Create new conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('conversations') as any)
      .insert({
        user_id: userId,
        conversation_type: type,
        messages,
      })
      .select('id')
      .single() as { data: { id: string } | null };

    return data?.id || '';
  }
}

/**
 * Extract key insights from a conversation using Claude
 */
export async function extractInsights(
  messages: ConversationMessage[]
): Promise<string[]> {
  const client = getAnthropicClient();

  const transcript = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract 2-4 key insights from this coaching conversation that would be valuable to remember for future sessions. Focus on:
- Goals or aspirations mentioned
- Progress or achievements discussed
- Challenges or concerns raised
- Preferences or learning styles noted

Return as a JSON array of strings, each insight in 1-2 sentences.

Conversation:
${transcript}

Return only valid JSON array, no other text.`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const match = content.text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    return JSON.parse(match[0]) as string[];
  } catch (error) {
    console.error('Failed to extract insights:', error);
    return [];
  }
}

/**
 * Store a memory (insight) for later retrieval
 */
export async function storeMemory(
  userId: string,
  content: string,
  memoryType: 'insight' | 'goal' | 'progress' | 'preference' = 'insight'
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // For now, store without embeddings
  // TODO: Add embedding generation for semantic search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('user_memory') as any).insert({
    user_id: userId,
    content,
    memory_type: memoryType,
  });
}

/**
 * Retrieve relevant memories for context
 * TODO: Use embeddings for semantic search when available
 */
export async function getRelevantMemories(
  userId: string,
  limit: number = 10
): Promise<Memory[]> {
  const supabase = getSupabaseAdmin();

  // For now, get most recent memories
  // TODO: Implement semantic search with pgvector
   
  const { data: memories } = await (supabase
    .from('user_memory') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: MemoryRow[] | null };

  if (!memories) return [];

  return memories.map(m => ({
    id: m.id,
    userId: m.user_id,
    content: m.content,
    memoryType: m.memory_type as Memory['memoryType'],
    createdAt: m.created_at,
  }));
}

/**
 * Generate a conversation summary for long-term storage
 */
export async function generateConversationSummary(
  messages: ConversationMessage[]
): Promise<string> {
  const client = getAnthropicClient();

  const transcript = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Summarize this coaching conversation in 2-3 sentences, focusing on the main topics discussed and any action items or commitments made.

Conversation:
${transcript}`,
      }],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return '';
  }
}

/**
 * Build full coaching context for a session
 */
export async function buildCoachingContext(clerkId: string): Promise<CoachingContext | null> {
  const userProfile = await getUserProfile(clerkId);
  if (!userProfile) return null;

  const [recentConversations, relevantMemories] = await Promise.all([
    getRecentConversations(userProfile.id, 3),
    getRelevantMemories(userProfile.id, 10),
  ]);

  // Extract goals from memories
  const currentGoals = relevantMemories
    .filter(m => m.memoryType === 'goal')
    .map(m => m.content);

  return {
    userProfile,
    recentConversations,
    relevantMemories,
    currentGoals,
  };
}

/**
 * Process end of coaching session - extract and store insights
 */
export async function processCoachingSession(
  userId: string,
  conversationId: string,
  messages: ConversationMessage[]
): Promise<void> {
  // Extract insights from the conversation
  const insights = await extractInsights(messages);

  // Store each insight as a memory
  for (const insight of insights) {
    // Determine memory type based on content
    let memoryType: Memory['memoryType'] = 'insight';
    const lowerInsight = insight.toLowerCase();

    if (lowerInsight.includes('goal') || lowerInsight.includes('want to') || lowerInsight.includes('plan to')) {
      memoryType = 'goal';
    } else if (lowerInsight.includes('completed') || lowerInsight.includes('achieved') || lowerInsight.includes('finished')) {
      memoryType = 'progress';
    } else if (lowerInsight.includes('prefer') || lowerInsight.includes('like to') || lowerInsight.includes('style')) {
      memoryType = 'preference';
    }

    await storeMemory(userId, insight, memoryType);
  }

  // Generate and save conversation summary
  const summary = await generateConversationSummary(messages);

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('conversations') as any)
    .update({ summary })
    .eq('id', conversationId);
}
