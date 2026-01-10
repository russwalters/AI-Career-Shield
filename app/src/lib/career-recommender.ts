/**
 * Career Recommender
 *
 * Recommends alternative career paths based on:
 * 1. Skills overlap with current occupation
 * 2. Lower AI exposure risk
 * 3. Job growth outlook
 */

import { getSupabaseAdmin } from './supabase';
import { getOccupationExposure, ExposureScore } from './exposure-calculator';

export interface CareerRecommendation {
  socCode: string;
  title: string;
  riskScore: number;
  riskReduction: number; // How much lower than current
  skillsMatch: number; // 0-100 percentage
  growthOutlook: 'High' | 'Moderate' | 'Low';
  description: string;
  skillsToLearn: string[];
  currentSkillsApplicable: string[];
  salaryRange: string;
}

export interface RecommendationResult {
  recommendations: CareerRecommendation[];
  currentRiskScore: number;
  currentOccupation: string;
}

// Type definitions for Supabase queries
interface SkillRow {
  element_id: string;
  element_name: string;
  value: number;
}

interface OccupationRow {
  soc_code: string;
  title: string;
  description: string | null;
  job_zone: number | null;
}

/**
 * Get skills for an occupation from O*NET
 */
async function getOccupationSkills(socCode: string): Promise<Map<string, { name: string; value: number }>> {
  const supabase = getSupabaseAdmin();

   
  const { data: skills } = await (supabase
    .from('skills') as any)
    .select('element_id, element_name, value')
    .eq('soc_code', socCode)
    .eq('scale_id', 'LV') // Level scale
    .order('value', { ascending: false }) as { data: SkillRow[] | null };

  const skillMap = new Map<string, { name: string; value: number }>();
  if (skills) {
    for (const skill of skills) {
      skillMap.set(skill.element_id, {
        name: skill.element_name,
        value: skill.value,
      });
    }
  }

  return skillMap;
}

/**
 * Calculate skills match percentage between two occupations
 */
function calculateSkillsMatch(
  currentSkills: Map<string, { name: string; value: number }>,
  targetSkills: Map<string, { name: string; value: number }>
): { matchPercent: number; overlapping: string[]; toLearn: string[] } {
  if (currentSkills.size === 0 || targetSkills.size === 0) {
    return { matchPercent: 50, overlapping: [], toLearn: [] }; // Default if no data
  }

  const overlapping: string[] = [];
  const toLearn: string[] = [];
  let totalMatchScore = 0;
  let totalPossible = 0;

  // Check each skill required for target occupation
  for (const [elementId, targetSkill] of targetSkills) {
    const currentSkill = currentSkills.get(elementId);
    totalPossible += targetSkill.value;

    if (currentSkill) {
      // Skill exists in current occupation
      // Match is proportional to how close current level is to target
      const matchRatio = Math.min(currentSkill.value / targetSkill.value, 1);
      totalMatchScore += targetSkill.value * matchRatio;

      if (matchRatio >= 0.7) {
        overlapping.push(targetSkill.name);
      } else if (targetSkill.value >= 3) {
        // Need to improve this skill
        toLearn.push(targetSkill.name);
      }
    } else if (targetSkill.value >= 3) {
      // Important skill not in current role
      toLearn.push(targetSkill.name);
    }
  }

  const matchPercent = totalPossible > 0
    ? Math.round((totalMatchScore / totalPossible) * 100)
    : 50;

  return {
    matchPercent,
    overlapping: overlapping.slice(0, 5),
    toLearn: toLearn.slice(0, 5),
  };
}

/**
 * Get growth outlook based on job zone (proxy for now)
 * In production, this would use BLS employment projections
 */
function getGrowthOutlook(jobZone: number | null): 'High' | 'Moderate' | 'Low' {
  // Job zones 4-5 tend to have better growth
  if (!jobZone) return 'Moderate';
  if (jobZone >= 4) return 'High';
  if (jobZone >= 3) return 'Moderate';
  return 'Low';
}

/**
 * Get salary range based on job zone (simplified)
 * In production, this would use BLS wage data
 */
function getSalaryRange(jobZone: number | null): string {
  if (!jobZone) return 'Varies';
  if (jobZone >= 5) return '$80,000 - $150,000+';
  if (jobZone >= 4) return '$55,000 - $100,000';
  if (jobZone >= 3) return '$40,000 - $70,000';
  if (jobZone >= 2) return '$30,000 - $50,000';
  return '$25,000 - $40,000';
}

/**
 * Find occupations with lower AI exposure
 */
async function findLowerRiskOccupations(
  currentRiskScore: number,
  limit: number = 50
): Promise<OccupationRow[]> {
  const supabase = getSupabaseAdmin();

  // Get a diverse set of occupations
  // In production, we'd have pre-calculated risk scores for all occupations
  // For now, we'll get occupations across different job zones

   
  const { data: occupations } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description, job_zone')
    .gte('job_zone', 3) // Focus on mid-to-high skill roles
    .limit(limit) as { data: OccupationRow[] | null };

  return occupations || [];
}

/**
 * Main recommendation function
 */
export async function getCareerRecommendations(
  currentSocCode: string,
  options?: {
    minSkillsMatch?: number;
    maxRiskScore?: number;
    limit?: number;
  }
): Promise<RecommendationResult> {
  const {
    minSkillsMatch = 40,
    maxRiskScore = 70,
    limit = 5,
  } = options || {};

  const supabase = getSupabaseAdmin();

  // Get current occupation details
   
  const { data: currentOcc } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description, job_zone')
    .eq('soc_code', currentSocCode)
    .single() as { data: OccupationRow | null };

  if (!currentOcc) {
    return {
      recommendations: [],
      currentRiskScore: 50,
      currentOccupation: 'Unknown',
    };
  }

  // Get current occupation's skills
  const currentSkills = await getOccupationSkills(currentSocCode);

  // Calculate current risk score
  let currentRiskResult: ExposureScore;
  try {
    const result = await getOccupationExposure(currentSocCode);
    if (result) {
      currentRiskResult = result;
    } else {
      throw new Error('No exposure data');
    }
  } catch {
    // Fallback if no DWA scores available yet
    currentRiskResult = {
      riskScore: 50,
      taskBreakdown: { high: 33, medium: 34, low: 33 },
      scenarioScores: { slow: 40, rapid: 60 },
      confidenceRange: { low: 40, high: 60 },
      taskScores: [],
      protectedSkills: [],
      vulnerableSkills: [],
    };
  }

  // Find candidate occupations
  const candidates = await findLowerRiskOccupations(currentRiskResult.riskScore);

  // Score each candidate
  const scoredCandidates: CareerRecommendation[] = [];

  for (const candidate of candidates) {
    if (candidate.soc_code === currentSocCode) continue;

    // Get candidate's skills
    const targetSkills = await getOccupationSkills(candidate.soc_code);

    // Calculate skills match
    const skillsAnalysis = calculateSkillsMatch(currentSkills, targetSkills);

    if (skillsAnalysis.matchPercent < minSkillsMatch) continue;

    // Calculate risk score for candidate
    let candidateRisk: ExposureScore;
    try {
      const result = await getOccupationExposure(candidate.soc_code);
      if (result) {
        candidateRisk = result;
      } else {
        throw new Error('No exposure data');
      }
    } catch {
      // Estimate based on job zone
      const baseRisk = candidate.job_zone
        ? 70 - (candidate.job_zone * 8)
        : 50;
      candidateRisk = {
        riskScore: baseRisk,
        taskBreakdown: { high: 30, medium: 40, low: 30 },
        scenarioScores: { slow: baseRisk - 10, rapid: baseRisk + 10 },
        confidenceRange: { low: baseRisk - 10, high: baseRisk + 10 },
        taskScores: [],
        protectedSkills: [],
        vulnerableSkills: [],
      };
    }

    if (candidateRisk.riskScore > maxRiskScore) continue;
    if (candidateRisk.riskScore >= currentRiskResult.riskScore) continue;

    const recommendation: CareerRecommendation = {
      socCode: candidate.soc_code,
      title: candidate.title,
      riskScore: candidateRisk.riskScore,
      riskReduction: currentRiskResult.riskScore - candidateRisk.riskScore,
      skillsMatch: skillsAnalysis.matchPercent,
      growthOutlook: getGrowthOutlook(candidate.job_zone),
      description: candidate.description || `Transition to ${candidate.title} for lower AI exposure.`,
      skillsToLearn: skillsAnalysis.toLearn,
      currentSkillsApplicable: skillsAnalysis.overlapping,
      salaryRange: getSalaryRange(candidate.job_zone),
    };

    scoredCandidates.push(recommendation);
  }

  // Sort by combination of risk reduction and skills match
  scoredCandidates.sort((a, b) => {
    // Weighted score: 60% risk reduction, 40% skills match
    const scoreA = (a.riskReduction * 0.6) + (a.skillsMatch * 0.4);
    const scoreB = (b.riskReduction * 0.6) + (b.skillsMatch * 0.4);
    return scoreB - scoreA;
  });

  return {
    recommendations: scoredCandidates.slice(0, limit),
    currentRiskScore: currentRiskResult.riskScore,
    currentOccupation: currentOcc.title,
  };
}

/**
 * Get quick recommendations without full risk calculation
 * Used when DWA scores aren't available yet
 */
export async function getQuickRecommendations(
  currentSocCode: string,
  currentRiskScore: number,
  limit: number = 3
): Promise<CareerRecommendation[]> {
  const supabase = getSupabaseAdmin();

  // Get current occupation's skills
  const currentSkills = await getOccupationSkills(currentSocCode);

  // Get occupations in higher job zones (generally lower AI exposure)
   
  const { data: candidates } = await (supabase
    .from('occupations') as any)
    .select('soc_code, title, description, job_zone')
    .gte('job_zone', 4)
    .neq('soc_code', currentSocCode)
    .limit(30) as { data: OccupationRow[] | null };

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const recommendations: CareerRecommendation[] = [];

  for (const candidate of candidates) {
    const targetSkills = await getOccupationSkills(candidate.soc_code);
    const skillsAnalysis = calculateSkillsMatch(currentSkills, targetSkills);

    if (skillsAnalysis.matchPercent < 40) continue;

    // Estimate risk based on job zone
    const estimatedRisk = candidate.job_zone
      ? Math.max(20, 70 - (candidate.job_zone * 10))
      : 45;

    if (estimatedRisk >= currentRiskScore) continue;

    recommendations.push({
      socCode: candidate.soc_code,
      title: candidate.title,
      riskScore: estimatedRisk,
      riskReduction: currentRiskScore - estimatedRisk,
      skillsMatch: skillsAnalysis.matchPercent,
      growthOutlook: getGrowthOutlook(candidate.job_zone),
      description: candidate.description || `Career path with lower AI exposure.`,
      skillsToLearn: skillsAnalysis.toLearn,
      currentSkillsApplicable: skillsAnalysis.overlapping,
      salaryRange: getSalaryRange(candidate.job_zone),
    });

    if (recommendations.length >= limit * 3) break;
  }

  // Sort and return top recommendations
  recommendations.sort((a, b) => {
    const scoreA = (a.riskReduction * 0.6) + (a.skillsMatch * 0.4);
    const scoreB = (b.riskReduction * 0.6) + (b.skillsMatch * 0.4);
    return scoreB - scoreA;
  });

  return recommendations.slice(0, limit);
}
