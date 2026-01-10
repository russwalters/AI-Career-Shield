/**
 * Plan Generator
 *
 * Generates personalized 90-day action plans for career transitions
 * based on assessment results and target career paths.
 */

import { getSupabaseAdmin } from './supabase';
import { getAnthropicClient } from './claude';
import { CareerRecommendation } from './career-recommender';

export interface Milestone {
  week: number;
  title: string;
  description: string;
  tasks: MilestoneTask[];
  successCriteria: string;
}

export interface MilestoneTask {
  title: string;
  description: string;
  estimatedHours: number;
  resourceUrl?: string;
  resourceType?: 'video' | 'course' | 'article' | 'practice' | 'networking';
  completed: boolean;
}

export interface ActionPlan {
  id?: string;
  userId: string;
  assessmentId: string;
  targetCareer: string;
  targetSocCode: string;
  currentRiskScore: number;
  targetRiskScore: number;
  skillsToLearn: string[];
  milestones: Milestone[];
  createdAt?: string;
  updatedAt?: string;
}

interface AssessmentData {
  id: string;
  jobTitle: string;
  occupation: string | null;
  riskScore: number;
  protectedSkills: string[];
  vulnerableSkills: string[];
}

// Type for Supabase queries
interface ActionPlanRow {
  id: string;
  user_id: string;
  assessment_id: string;
  target_career: string;
  target_soc_code: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

/**
 * Generate a 90-day action plan using Claude
 */
export async function generateActionPlan(
  userId: string,
  assessmentId: string,
  assessment: AssessmentData,
  targetCareer: CareerRecommendation
): Promise<ActionPlan> {
  const client = getAnthropicClient();

  const prompt = `You are a career transition expert. Create a detailed 90-day action plan for this career transition.

## Current Situation
- Current Role: ${assessment.jobTitle} (${assessment.occupation || 'General'})
- AI Risk Score: ${assessment.riskScore}/100
- Protected Skills: ${assessment.protectedSkills.join(', ') || 'Not assessed'}
- Vulnerable Skills: ${assessment.vulnerableSkills.join(', ') || 'Not assessed'}

## Target Career
- Target Role: ${targetCareer.title}
- Target Risk Score: ${targetCareer.riskScore}/100
- Risk Reduction: ${targetCareer.riskReduction} points
- Skills Match: ${targetCareer.skillsMatch}%
- Skills to Learn: ${targetCareer.skillsToLearn.join(', ')}
- Applicable Current Skills: ${targetCareer.currentSkillsApplicable.join(', ')}

## Requirements
Create a 90-day plan with 6 two-week milestones. Each milestone should have:
- 3-4 specific, actionable tasks
- A mix of learning, networking, and practical application
- Realistic time estimates (assume 5-10 hours/week available)
- Free resources where possible (YouTube, free courses, documentation, community events)

Return ONLY valid JSON in this exact format:
{
  "milestones": [
    {
      "week": 2,
      "title": "Foundation Building",
      "description": "Brief description of this phase",
      "tasks": [
        {
          "title": "Task title",
          "description": "What to do and why",
          "estimatedHours": 3,
          "resourceUrl": "https://...",
          "resourceType": "course"
        }
      ],
      "successCriteria": "How to know this milestone is complete"
    }
  ]
}

Milestone weeks should be: 2, 4, 6, 8, 10, 12
Resource types: video, course, article, practice, networking
Make tasks specific and actionable, not generic advice.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as { milestones: Milestone[] };

    // Ensure all tasks have completed: false
    const milestones = parsed.milestones.map(m => ({
      ...m,
      tasks: m.tasks.map(t => ({ ...t, completed: false })),
    }));

    return {
      userId,
      assessmentId,
      targetCareer: targetCareer.title,
      targetSocCode: targetCareer.socCode,
      currentRiskScore: assessment.riskScore,
      targetRiskScore: targetCareer.riskScore,
      skillsToLearn: targetCareer.skillsToLearn,
      milestones,
    };
  } catch (error) {
    console.error('Plan generation failed:', error);

    // Return a fallback plan structure
    return generateFallbackPlan(userId, assessmentId, assessment, targetCareer);
  }
}

/**
 * Generate a basic fallback plan if AI generation fails
 */
function generateFallbackPlan(
  userId: string,
  assessmentId: string,
  assessment: AssessmentData,
  targetCareer: CareerRecommendation
): ActionPlan {
  const skillsToLearn = targetCareer.skillsToLearn;

  const milestones: Milestone[] = [
    {
      week: 2,
      title: 'Research & Assessment',
      description: 'Understand the target role and identify specific skill gaps',
      tasks: [
        {
          title: 'Research target role requirements',
          description: `Study job postings for ${targetCareer.title} positions to understand common requirements`,
          estimatedHours: 3,
          resourceType: 'article',
          completed: false,
        },
        {
          title: 'Self-assessment of current skills',
          description: 'Document your current proficiency in each required skill area',
          estimatedHours: 2,
          resourceType: 'practice',
          completed: false,
        },
        {
          title: 'Create learning roadmap',
          description: 'Prioritize skills to learn based on gap analysis',
          estimatedHours: 2,
          resourceType: 'practice',
          completed: false,
        },
      ],
      successCriteria: 'Clear understanding of skill gaps and prioritized learning plan',
    },
    {
      week: 4,
      title: 'Foundation Skills',
      description: `Begin learning: ${skillsToLearn[0] || 'core skills'}`,
      tasks: [
        {
          title: `Start learning ${skillsToLearn[0] || 'primary skill'}`,
          description: 'Complete introductory course or tutorial',
          estimatedHours: 8,
          resourceType: 'course',
          completed: false,
        },
        {
          title: 'Practice with small projects',
          description: 'Apply new knowledge in low-stakes practice scenarios',
          estimatedHours: 4,
          resourceType: 'practice',
          completed: false,
        },
        {
          title: 'Join relevant community',
          description: 'Find and join online communities related to target role',
          estimatedHours: 2,
          resourceType: 'networking',
          completed: false,
        },
      ],
      successCriteria: 'Completed introductory learning and joined community',
    },
    {
      week: 6,
      title: 'Skill Development',
      description: `Deepen skills: ${skillsToLearn[1] || 'secondary skills'}`,
      tasks: [
        {
          title: `Learn ${skillsToLearn[1] || 'secondary skill'}`,
          description: 'Complete intermediate-level learning',
          estimatedHours: 8,
          resourceType: 'course',
          completed: false,
        },
        {
          title: 'Build portfolio project',
          description: 'Create a project demonstrating new skills',
          estimatedHours: 6,
          resourceType: 'practice',
          completed: false,
        },
      ],
      successCriteria: 'Portfolio project completed demonstrating new skills',
    },
    {
      week: 8,
      title: 'Networking & Visibility',
      description: 'Build connections in target field',
      tasks: [
        {
          title: 'Update LinkedIn profile',
          description: 'Reflect new skills and career direction',
          estimatedHours: 2,
          resourceType: 'practice',
          completed: false,
        },
        {
          title: 'Informational interviews',
          description: 'Connect with 2-3 people in target role',
          estimatedHours: 4,
          resourceType: 'networking',
          completed: false,
        },
        {
          title: 'Attend virtual event',
          description: 'Participate in industry webinar or meetup',
          estimatedHours: 2,
          resourceType: 'networking',
          completed: false,
        },
      ],
      successCriteria: 'Expanded network with 3+ new connections in target field',
    },
    {
      week: 10,
      title: 'Advanced Application',
      description: 'Apply skills in real-world contexts',
      tasks: [
        {
          title: `Advanced ${skillsToLearn[2] || 'skill'} development`,
          description: 'Complete advanced tutorials or certifications',
          estimatedHours: 8,
          resourceType: 'course',
          completed: false,
        },
        {
          title: 'Contribute to open project',
          description: 'Volunteer skills or contribute to open source',
          estimatedHours: 4,
          resourceType: 'practice',
          completed: false,
        },
      ],
      successCriteria: 'Demonstrable advanced skills and real-world contributions',
    },
    {
      week: 12,
      title: 'Transition Preparation',
      description: 'Prepare for career move',
      tasks: [
        {
          title: 'Update resume',
          description: 'Highlight new skills and projects',
          estimatedHours: 3,
          resourceType: 'practice',
          completed: false,
        },
        {
          title: 'Practice interviewing',
          description: 'Mock interviews focusing on new skills',
          estimatedHours: 3,
          resourceType: 'practice',
          completed: false,
        },
        {
          title: 'Apply to target positions',
          description: 'Submit applications to 3-5 relevant positions',
          estimatedHours: 4,
          resourceType: 'practice',
          completed: false,
        },
      ],
      successCriteria: 'Applications submitted and interview-ready',
    },
  ];

  return {
    userId,
    assessmentId,
    targetCareer: targetCareer.title,
    targetSocCode: targetCareer.socCode,
    currentRiskScore: assessment.riskScore,
    targetRiskScore: targetCareer.riskScore,
    skillsToLearn,
    milestones,
  };
}

/**
 * Save an action plan to the database
 */
export async function saveActionPlan(plan: ActionPlan): Promise<string> {
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('action_plans') as any)
    .insert({
      user_id: plan.userId,
      assessment_id: plan.assessmentId,
      target_career: plan.targetCareer,
      target_soc_code: plan.targetSocCode,
      milestones: plan.milestones,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: Error | null };

  if (error) {
    console.error('Failed to save action plan:', error);
    throw error;
  }

  return data?.id || '';
}

/**
 * Get a user's action plan
 */
export async function getActionPlan(userId: string): Promise<ActionPlan | null> {
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('action_plans') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: ActionPlanRow | null; error: Error | null };

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    assessmentId: data.assessment_id,
    targetCareer: data.target_career,
    targetSocCode: data.target_soc_code,
    currentRiskScore: 0, // Not stored, would need to fetch from assessment
    targetRiskScore: 0,
    skillsToLearn: [],
    milestones: data.milestones,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update task completion status
 */
export async function updateTaskCompletion(
  planId: string,
  milestoneWeek: number,
  taskIndex: number,
  completed: boolean
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get current plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan } = await (supabase.from('action_plans') as any)
    .select('milestones')
    .eq('id', planId)
    .single() as { data: { milestones: Milestone[] } | null };

  if (!plan) return;

  // Update the specific task
  const milestones = plan.milestones.map(m => {
    if (m.week === milestoneWeek) {
      return {
        ...m,
        tasks: m.tasks.map((t, i) =>
          i === taskIndex ? { ...t, completed } : t
        ),
      };
    }
    return m;
  });

  // Save updated milestones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('action_plans') as any)
    .update({
      milestones,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);
}

/**
 * Calculate plan progress percentage
 */
export function calculatePlanProgress(milestones: Milestone[]): number {
  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = milestones.reduce(
    (sum, m) => sum + m.tasks.filter(t => t.completed).length,
    0
  );

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

/**
 * Get current milestone based on plan start date
 */
export function getCurrentMilestone(
  milestones: Milestone[],
  planStartDate: string
): Milestone | null {
  const startDate = new Date(planStartDate);
  const now = new Date();
  const weeksSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  // Find the milestone for the current week
  return milestones.find(m => m.week >= weeksSinceStart && m.week < weeksSinceStart + 2) || null;
}
