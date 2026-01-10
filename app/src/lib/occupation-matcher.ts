/**
 * Occupation Matcher
 *
 * Matches user job titles to O*NET Standard Occupational Classification (SOC) codes.
 * Uses a multi-stage approach:
 *   1. Exact match on alternate_titles
 *   2. Fuzzy/partial match on alternate_titles
 *   3. Claude AI fallback for semantic matching
 */

import { getSupabaseAdmin } from './supabase';
import { getAnthropicClient } from './claude';

export interface OccupationMatch {
  socCode: string;
  title: string;
  description: string | null;
  matchType: 'exact' | 'partial' | 'ai_suggested';
  confidence: number; // 0.0 - 1.0
  alternateTitle?: string; // The title that matched, if different from canonical
}

export interface MatchResult {
  matches: OccupationMatch[];
  bestMatch: OccupationMatch | null;
  searchedTitle: string;
}

// Type definitions for Supabase query results
interface AltTitleRow { soc_code: string; title: string }
interface OccupationRow { soc_code: string; title: string; description: string | null }

/**
 * Search for exact matches in alternate_titles table
 */
async function searchExactMatch(jobTitle: string): Promise<OccupationMatch[]> {
  const supabase = getSupabaseAdmin();
  const normalizedTitle = jobTitle.toLowerCase().trim();

  // Search alternate_titles for exact match (case-insensitive)
   
  const { data, error } = await (supabase
    .from('alternate_titles') as any)
    .select('soc_code, title')
    .ilike('title', normalizedTitle)
    .limit(5) as { data: AltTitleRow[] | null; error: Error | null };

  if (error || !data || data.length === 0) {
    return [];
  }

  // Get occupation details for matches
  const socCodes = [...new Set(data.map(d => d.soc_code))];
   
  const { data: occupations } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description')
    .in('soc_code', socCodes) as { data: OccupationRow[] | null };

  const occMap = new Map(occupations?.map(o => [o.soc_code, o]) || []);

  return data.map(match => {
    const occupation = occMap.get(match.soc_code);
    return {
      socCode: match.soc_code,
      title: occupation?.title || match.soc_code,
      description: occupation?.description || null,
      matchType: 'exact' as const,
      confidence: 0.95,
      alternateTitle: match.title !== occupation?.title ? match.title : undefined,
    };
  });
}

/**
 * Search for partial/fuzzy matches in alternate_titles table
 */
async function searchPartialMatch(jobTitle: string): Promise<OccupationMatch[]> {
  const supabase = getSupabaseAdmin();
  const words = jobTitle.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) return [];

  // Build pattern for partial matching
  // Search for titles containing the main keywords
  const searchPattern = `%${words.join('%')}%`;

   
  const { data, error } = await (supabase
    .from('alternate_titles') as any)
    .select('soc_code, title')
    .ilike('title', searchPattern)
    .limit(10) as { data: AltTitleRow[] | null; error: Error | null };

  if (error || !data || data.length === 0) {
    // Try searching with just the longest word
    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
     
    const { data: fallbackData } = await (supabase
      .from('alternate_titles') as any)
      .select('soc_code, title')
      .ilike('title', `%${longestWord}%`)
      .limit(10) as { data: AltTitleRow[] | null };

    if (!fallbackData || fallbackData.length === 0) return [];

    return processPartialMatches(fallbackData, jobTitle, supabase);
  }

  return processPartialMatches(data, jobTitle, supabase);
}

async function processPartialMatches(
  data: Array<{ soc_code: string; title: string }>,
  originalTitle: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<OccupationMatch[]> {
  // Get unique SOC codes and fetch occupation details
  const socCodes = [...new Set(data.map(d => d.soc_code))];
   
  const { data: occupations } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description')
    .in('soc_code', socCodes) as { data: OccupationRow[] | null };

  const occMap = new Map(occupations?.map(o => [o.soc_code, o]) || []);

  // Calculate simple similarity score
  const normalizedOriginal = originalTitle.toLowerCase();

  return data.map(match => {
    const occupation = occMap.get(match.soc_code);
    const normalizedMatch = match.title.toLowerCase();

    // Simple word overlap scoring
    const originalWords = new Set(normalizedOriginal.split(/\s+/));
    const matchWords = normalizedMatch.split(/\s+/);
    const overlap = matchWords.filter(w => originalWords.has(w)).length;
    const confidence = Math.min(0.85, 0.5 + (overlap * 0.1));

    return {
      socCode: match.soc_code,
      title: occupation?.title || match.soc_code,
      description: occupation?.description || null,
      matchType: 'partial' as const,
      confidence,
      alternateTitle: match.title !== occupation?.title ? match.title : undefined,
    };
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * Use Claude to suggest best O*NET occupation for a job title
 */
async function aiSuggestOccupation(
  jobTitle: string,
  industry?: string
): Promise<OccupationMatch[]> {
  const supabase = getSupabaseAdmin();
  const client = getAnthropicClient();

  // Fetch a sample of occupations to give Claude context
   
  const { data: sampleOccupations } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description')
    .limit(100) as { data: OccupationRow[] | null };

  const occupationList = sampleOccupations
    ?.map(o => `${o.soc_code}: ${o.title}`)
    .join('\n') || '';

  const prompt = `You are an expert at matching job titles to O*NET Standard Occupational Classification (SOC) codes.

Given this job title${industry ? ` in the ${industry} industry` : ''}:
"${jobTitle}"

Here is a sample of O*NET occupations (there are 900+ total):
${occupationList}

Suggest the 3 most likely O*NET occupations for this job title. Consider:
1. The core responsibilities implied by the title
2. Industry context if provided
3. Common variations of the title

Return JSON only:
{
  "suggestions": [
    {"soc_code": "XX-XXXX.XX", "title": "Occupation Title", "confidence": 0.0-1.0, "reasoning": "Brief explanation"},
    ...
  ]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestions: Array<{
        soc_code: string;
        title: string;
        confidence: number;
        reasoning: string;
      }>;
    };

    // Verify suggested SOC codes exist in database
    const suggestedCodes = parsed.suggestions.map(s => s.soc_code);
     
    const { data: verifiedOccupations } = await (supabase
      .from('occupations') as any)
      .select('soc_code, title, description')
      .in('soc_code', suggestedCodes) as { data: OccupationRow[] | null };

    const verifiedMap = new Map(verifiedOccupations?.map(o => [o.soc_code, o]) || []);

    return parsed.suggestions
      .filter(s => verifiedMap.has(s.soc_code))
      .map(s => {
        const occ = verifiedMap.get(s.soc_code)!;
        return {
          socCode: s.soc_code,
          title: occ.title,
          description: occ.description,
          matchType: 'ai_suggested' as const,
          confidence: Math.min(0.9, s.confidence), // Cap AI confidence at 0.9
        };
      });
  } catch (error) {
    console.error('AI occupation suggestion failed:', error);
    return [];
  }
}

/**
 * Main function: Match a job title to O*NET occupations
 */
export async function matchOccupation(
  jobTitle: string,
  options?: {
    industry?: string;
    useAI?: boolean;
  }
): Promise<MatchResult> {
  const { industry, useAI = true } = options || {};

  // Stage 1: Exact match
  const exactMatches = await searchExactMatch(jobTitle);
  if (exactMatches.length > 0) {
    return {
      matches: exactMatches,
      bestMatch: exactMatches[0],
      searchedTitle: jobTitle,
    };
  }

  // Stage 2: Partial match
  const partialMatches = await searchPartialMatch(jobTitle);
  if (partialMatches.length > 0 && partialMatches[0].confidence >= 0.7) {
    return {
      matches: partialMatches,
      bestMatch: partialMatches[0],
      searchedTitle: jobTitle,
    };
  }

  // Stage 3: AI suggestion (if enabled)
  if (useAI) {
    const aiMatches = await aiSuggestOccupation(jobTitle, industry);
    if (aiMatches.length > 0) {
      // Combine with any partial matches found
      const allMatches = [...aiMatches, ...partialMatches]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      return {
        matches: allMatches,
        bestMatch: allMatches[0],
        searchedTitle: jobTitle,
      };
    }
  }

  // Return partial matches even if low confidence
  if (partialMatches.length > 0) {
    return {
      matches: partialMatches,
      bestMatch: partialMatches[0],
      searchedTitle: jobTitle,
    };
  }

  // No matches found
  return {
    matches: [],
    bestMatch: null,
    searchedTitle: jobTitle,
  };
}

/**
 * Get full occupation details by SOC code
 */
export async function getOccupationDetails(socCode: string): Promise<{
  occupation: {
    socCode: string;
    title: string;
    description: string | null;
    jobZone: number | null;
  } | null;
  tasks: Array<{
    taskId: string;
    statement: string;
    importance: number | null;
  }>;
  alternateTitles: string[];
}> {
  const supabase = getSupabaseAdmin();

  interface OccupationDetailRow {
    soc_code: string;
    title: string;
    description: string | null;
    job_zone: number | null;
  }

  interface TaskRow {
    task_id: string;
    statement: string;
    importance: number | null;
  }

  // Fetch occupation
   
  const { data: occupation } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description, job_zone')
    .eq('soc_code', socCode)
    .single() as { data: OccupationDetailRow | null };

  if (!occupation) {
    return { occupation: null, tasks: [], alternateTitles: [] };
  }

  // Fetch tasks
   
  const { data: tasks } = await (supabase
    .from('tasks') as any)
    .select('task_id, statement, importance')
    .eq('soc_code', socCode)
    .order('importance', { ascending: false })
    .limit(20) as { data: TaskRow[] | null };

  // Fetch alternate titles
   
  const { data: altTitles } = await (supabase
    .from('alternate_titles') as any)
    .select('title')
    .eq('soc_code', socCode)
    .limit(10) as { data: Array<{ title: string }> | null };

  return {
    occupation: {
      socCode: occupation.soc_code,
      title: occupation.title,
      description: occupation.description,
      jobZone: occupation.job_zone,
    },
    tasks: (tasks || []).map(t => ({
      taskId: t.task_id,
      statement: t.statement,
      importance: t.importance,
    })),
    alternateTitles: (altTitles || []).map(t => t.title),
  };
}
