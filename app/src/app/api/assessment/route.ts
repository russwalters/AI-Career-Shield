/**
 * Assessment API
 *
 * Processes assessment data from the conversation:
 * 1. Extracts structured data from conversation
 * 2. Matches job title to O*NET occupation
 * 3. Maps user tasks to DWAs
 * 4. Calculates AI exposure score
 * 5. Saves assessment to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAnthropicClient, ASSESSMENT_EXTRACTION_PROMPT, ChatMessage } from '@/lib/claude';
import { matchOccupation } from '@/lib/occupation-matcher';
import { mapUserTasks, toExposureFormat } from '@/lib/task-mapper';
import { calculateExposure, TaskMapping } from '@/lib/exposure-calculator';
import { getQuickRecommendations, CareerRecommendation } from '@/lib/career-recommender';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ExtractedAssessment {
  job_title: string;
  industry: string | null;
  company_size: string | null;
  tasks: Array<{ description: string; time_percent: number }>;
  tools: string[];
  collaboration_percent: number;
  concerns: string | null;
  confidence: number;
}

interface AssessmentRequest {
  messages: ChatMessage[];
  userId?: string; // Optional - will use Clerk auth if not provided
}

/**
 * Extract structured data from conversation using Claude
 */
async function extractAssessmentData(messages: ChatMessage[]): Promise<ExtractedAssessment | null> {
  const client = getAnthropicClient();

  // Build conversation transcript
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Sage'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${ASSESSMENT_EXTRACTION_PROMPT}\n\nConversation transcript:\n${transcript}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as ExtractedAssessment;
  } catch (error) {
    console.error('Assessment extraction failed:', error);
    return null;
  }
}

/**
 * POST /api/assessment
 *
 * Process a completed assessment conversation
 */
export async function POST(req: NextRequest) {
  try {
    const body: AssessmentRequest = await req.json();
    const { messages } = body;

    if (!messages || messages.length < 4) {
      return NextResponse.json(
        { error: 'Insufficient conversation data' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { userId: clerkUserId } = await auth();

    // Step 1: Extract structured data from conversation
    console.log('Extracting assessment data...');
    const extracted = await extractAssessmentData(messages);

    if (!extracted) {
      return NextResponse.json(
        { error: 'Could not extract assessment data from conversation' },
        { status: 400 }
      );
    }

    // Check for onboarding profile data to supplement extraction
    const supabase = getSupabaseAdmin();
    let onboardingJobTitle: string | null = null;

    if (clerkUserId) {
      const { data: userData } = await supabase
        .from('users')
        .select('job_title')
        .eq('clerk_id', clerkUserId)
        .single() as { data: { job_title: string | null } | null };

      if (userData?.job_title) {
        onboardingJobTitle = userData.job_title;
      }
    }

    // Use onboarding job title if extraction failed or returned a generic title
    const genericTitles = ['unknown', 'not specified', 'employee', 'worker', 'professional'];
    if (!extracted.job_title || genericTitles.includes(extracted.job_title.toLowerCase())) {
      if (onboardingJobTitle) {
        extracted.job_title = onboardingJobTitle;
      } else {
        return NextResponse.json(
          { error: 'Could not determine job title from conversation' },
          { status: 400 }
        );
      }
    }

    // Step 2: Match job title to O*NET occupation
    console.log('Matching occupation...');
    const occupationResult = await matchOccupation(extracted.job_title, {
      industry: extracted.industry || undefined,
    });

    const matchedOccupation = occupationResult.bestMatch;

    // Step 3: Map user tasks to DWAs
    console.log('Mapping tasks to DWAs...');
    const userTasks = extracted.tasks.map(t => ({
      description: t.description,
      timePercent: t.time_percent,
    }));

    const taskMappingResult = await mapUserTasks(userTasks, {
      socCode: matchedOccupation?.socCode,
      occupationTitle: matchedOccupation?.title,
    });

    // Step 4: Calculate exposure score
    console.log('Calculating exposure score...');
    const taskMappingsForExposure: TaskMapping[] = toExposureFormat(taskMappingResult.mappings);
    const exposureResult = await calculateExposure(taskMappingsForExposure);

    // Step 5: Get career recommendations
    console.log('Generating career recommendations...');
    let careerRecommendations: CareerRecommendation[] = [];
    if (matchedOccupation?.socCode) {
      try {
        careerRecommendations = await getQuickRecommendations(
          matchedOccupation.socCode,
          exposureResult.riskScore,
          3 // Top 3 recommendations
        );
      } catch (error) {
        console.error('Failed to get career recommendations:', error);
        // Continue without recommendations
      }
    }

    // Step 6: Save to database (if user is authenticated)
    let assessmentId: string | null = null;

    if (clerkUserId) {
      // Get or create user in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUserId)
        .single() as unknown as { data: { id: string } | null };

      let dbUserId = existingUser?.id;

      if (!dbUserId) {
        // Create user - use any cast to bypass strict typing
        // NOTE: Setting subscription_tier to 'shield' for testing. Remove for production.
         
        const { data: newUser, error: userError } = await (supabase
          .from('users') as any)
          .insert({ clerk_id: clerkUserId, subscription_tier: 'shield' })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null };

        if (userError) {
          console.error('Failed to create user:', userError);
        } else {
          dbUserId = newUser?.id;
        }
      }

      if (dbUserId) {
        // Save assessment - use any cast to bypass strict typing
         
        const { data: assessment, error: assessmentError } = await (supabase
          .from('assessments') as any)
          .insert({
            user_id: dbUserId,
            matched_soc_code: matchedOccupation?.socCode || null,
            job_title_input: extracted.job_title,
            industry: extracted.industry,
            company_size: extracted.company_size,
            tasks_described: extracted.tasks,
            tools_used: extracted.tools,
            collaboration_percent: extracted.collaboration_percent,
            task_mappings: taskMappingsForExposure,
            risk_score: exposureResult.riskScore,
            confidence_range: exposureResult.confidenceRange,
            scenario_scores: exposureResult.scenarioScores,
            task_breakdown: exposureResult.taskBreakdown,
            protected_skills: exposureResult.protectedSkills,
            vulnerable_skills: exposureResult.vulnerableSkills,
            concerns: extracted.concerns,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null };

        if (assessmentError) {
          console.error('Failed to save assessment:', assessmentError);
        } else {
          assessmentId = assessment?.id || null;
        }

        // Save conversation
        if (assessmentId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('conversations') as any).insert({
            user_id: dbUserId,
            conversation_type: 'assessment',
            messages: messages,
            assessment_id: assessmentId,
          });
        }
      }
    }

    // Return the full assessment result
    return NextResponse.json({
      success: true,
      assessmentId,
      assessment: {
        jobTitle: extracted.job_title,
        industry: extracted.industry,
        companySize: extracted.company_size,
        matchedOccupation: matchedOccupation
          ? {
              socCode: matchedOccupation.socCode,
              title: matchedOccupation.title,
              matchType: matchedOccupation.matchType,
              confidence: matchedOccupation.confidence,
            }
          : null,
        tasks: extracted.tasks,
        tools: extracted.tools,
        collaborationPercent: extracted.collaboration_percent,
        concerns: extracted.concerns,
      },
      exposure: {
        riskScore: exposureResult.riskScore,
        confidenceRange: exposureResult.confidenceRange,
        scenarioScores: exposureResult.scenarioScores,
        taskBreakdown: exposureResult.taskBreakdown,
        taskScores: exposureResult.taskScores,
        protectedSkills: exposureResult.protectedSkills,
        vulnerableSkills: exposureResult.vulnerableSkills,
      },
      careerRecommendations: careerRecommendations.map(rec => ({
        socCode: rec.socCode,
        title: rec.title,
        riskScore: rec.riskScore,
        riskReduction: rec.riskReduction,
        skillsMatch: rec.skillsMatch,
        growthOutlook: rec.growthOutlook,
        description: rec.description,
        skillsToLearn: rec.skillsToLearn,
        currentSkillsApplicable: rec.currentSkillsApplicable,
        salaryRange: rec.salaryRange,
      })),
    });
  } catch (error) {
    console.error('Assessment processing error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to process assessment', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessment?id=xxx
 *
 * Retrieve a saved assessment by ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('id');

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    interface AssessmentRow {
      id: string;
      job_title_input: string;
      industry: string | null;
      company_size: string | null;
      matched_soc_code: string | null;
      tasks_described: Array<{ description: string; time_percent: number }> | null;
      tools_used: string[] | null;
      collaboration_percent: number | null;
      concerns: string | null;
      risk_score: number | null;
      confidence_range: { low: number; high: number } | null;
      scenario_scores: { slow: number; rapid: number } | null;
      task_breakdown: { high: number; medium: number; low: number } | null;
      protected_skills: string[] | null;
      vulnerable_skills: string[] | null;
      created_at: string;
      occupations: { title: string; description: string | null } | null;
    }

     
    const { data: assessment, error } = await (supabase
      .from('assessments') as any)
      .select(`
        *,
        occupations:matched_soc_code (
          title,
          description
        )
      `)
      .eq('id', assessmentId)
      .single() as { data: AssessmentRow | null; error: Error | null };

    if (error || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        jobTitle: assessment.job_title_input,
        industry: assessment.industry,
        companySize: assessment.company_size,
        matchedOccupation: assessment.matched_soc_code
          ? {
              socCode: assessment.matched_soc_code,
              title: assessment.occupations?.title,
            }
          : null,
        tasks: assessment.tasks_described,
        tools: assessment.tools_used,
        collaborationPercent: assessment.collaboration_percent,
        concerns: assessment.concerns,
        exposure: {
          riskScore: assessment.risk_score,
          confidenceRange: assessment.confidence_range,
          scenarioScores: assessment.scenario_scores,
          taskBreakdown: assessment.task_breakdown,
          protectedSkills: assessment.protected_skills,
          vulnerableSkills: assessment.vulnerable_skills,
        },
        createdAt: assessment.created_at,
      },
    });
  } catch (error) {
    console.error('Assessment retrieval error:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve assessment' },
      { status: 500 }
    );
  }
}
