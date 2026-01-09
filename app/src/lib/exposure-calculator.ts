/**
 * AI Exposure Calculator
 *
 * Calculates AI automation exposure scores for users based on their
 * task descriptions mapped to Detailed Work Activities (DWAs).
 *
 * Scoring methodology:
 *   - 0-30: Low exposure (significant human elements required)
 *   - 31-60: Medium exposure (AI assists but humans essential)
 *   - 61-100: High exposure (AI can perform most/all)
 */

import { getSupabaseAdmin } from './supabase';

export interface TaskMapping {
  description: string;
  timePercent: number;
  dwaIds: string[];
  confidence: number;
}

export interface ExposureScore {
  /** Overall risk score 0-100 */
  riskScore: number;

  /** Confidence range accounting for mapping uncertainty */
  confidenceRange: {
    low: number;
    high: number;
  };

  /** Scenario scores for different AI adoption speeds */
  scenarioScores: {
    /** Conservative AI adoption scenario */
    slow: number;
    /** Aggressive AI adoption scenario */
    rapid: number;
  };

  /** Breakdown of tasks by exposure level */
  taskBreakdown: {
    high: number; // percentage
    medium: number;
    low: number;
  };

  /** Individual task scores */
  taskScores: TaskExposureScore[];

  /** Skills that provide protection from automation */
  protectedSkills: string[];

  /** Skills that are highly automatable */
  vulnerableSkills: string[];
}

export interface TaskExposureScore {
  description: string;
  timePercent: number;
  exposureScore: number;
  category: 'low' | 'medium' | 'high';
  topDwas: Array<{
    dwaId: string;
    title: string;
    score: number;
  }>;
}

export interface DWAExposure {
  dwa_id: string;
  dwa_title: string;
  exposure_score: number;
  confidence: number | null;
  rationale: string | null;
}

/**
 * Categorize a score into low/medium/high
 */
function categorizeScore(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

/**
 * Fetch DWA exposure scores from the database
 */
export async function getDWAExposures(dwaIds: string[]): Promise<Map<string, DWAExposure>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('dwa_ai_exposure')
    .select(`
      dwa_id,
      exposure_score,
      confidence,
      rationale
    `)
    .in('dwa_id', dwaIds);

  if (error) {
    console.error('Failed to fetch DWA exposures:', error);
    return new Map();
  }

  // Also fetch DWA titles
  const { data: dwaData } = await supabase
    .from('detailed_work_activities')
    .select('dwa_id, dwa_title')
    .in('dwa_id', dwaIds);

  const titleMap = new Map(dwaData?.map(d => [d.dwa_id, d.dwa_title]) || []);

  const result = new Map<string, DWAExposure>();
  for (const row of data || []) {
    result.set(row.dwa_id, {
      dwa_id: row.dwa_id,
      dwa_title: titleMap.get(row.dwa_id) || '',
      exposure_score: row.exposure_score,
      confidence: row.confidence,
      rationale: row.rationale,
    });
  }

  return result;
}

/**
 * Calculate exposure score for a single task based on its mapped DWAs
 */
function calculateTaskExposure(
  taskDescription: string,
  timePercent: number,
  dwaIds: string[],
  mappingConfidence: number,
  dwaExposures: Map<string, DWAExposure>
): TaskExposureScore {
  if (dwaIds.length === 0) {
    // No DWA mapping - assume medium exposure with low confidence
    return {
      description: taskDescription,
      timePercent,
      exposureScore: 50,
      category: 'medium',
      topDwas: [],
    };
  }

  // Get scores for all mapped DWAs
  const dwaScores: Array<{ dwaId: string; title: string; score: number }> = [];

  for (const dwaId of dwaIds) {
    const exposure = dwaExposures.get(dwaId);
    if (exposure) {
      dwaScores.push({
        dwaId,
        title: exposure.dwa_title,
        score: exposure.exposure_score,
      });
    }
  }

  if (dwaScores.length === 0) {
    // DWAs not scored yet - assume medium
    return {
      description: taskDescription,
      timePercent,
      exposureScore: 50,
      category: 'medium',
      topDwas: [],
    };
  }

  // Calculate weighted average (equal weight for now)
  const avgScore = dwaScores.reduce((sum, d) => sum + d.score, 0) / dwaScores.length;

  // Adjust score based on mapping confidence
  // Lower confidence pulls toward 50 (uncertain)
  const adjustedScore = avgScore * mappingConfidence + 50 * (1 - mappingConfidence);

  // Sort DWAs by score descending for display
  dwaScores.sort((a, b) => b.score - a.score);

  return {
    description: taskDescription,
    timePercent,
    exposureScore: Math.round(adjustedScore),
    category: categorizeScore(adjustedScore),
    topDwas: dwaScores.slice(0, 3), // Top 3 most relevant DWAs
  };
}

/**
 * Calculate scenario scores based on different AI adoption assumptions
 */
function calculateScenarioScores(
  taskScores: TaskExposureScore[],
  baseScore: number
): { slow: number; rapid: number } {
  // Slow scenario: Only high-exposure tasks get automated
  // Weight high-exposure tasks more, others less
  let slowScore = 0;
  let rapidScore = 0;
  let totalWeight = 0;

  for (const task of taskScores) {
    const weight = task.timePercent / 100;
    totalWeight += weight;

    // Slow scenario: Dampen medium/low exposure
    const slowFactor =
      task.category === 'high' ? 1.0 :
      task.category === 'medium' ? 0.6 : 0.3;
    slowScore += task.exposureScore * slowFactor * weight;

    // Rapid scenario: Boost all scores
    const rapidFactor =
      task.category === 'high' ? 1.2 :
      task.category === 'medium' ? 1.1 : 1.0;
    rapidScore += Math.min(100, task.exposureScore * rapidFactor) * weight;
  }

  if (totalWeight > 0) {
    slowScore /= totalWeight;
    rapidScore /= totalWeight;
  }

  return {
    slow: Math.round(Math.max(0, slowScore - 10)), // Slow is more optimistic
    rapid: Math.round(Math.min(100, rapidScore + 10)), // Rapid is more pessimistic
  };
}

/**
 * Calculate confidence range based on mapping uncertainties
 */
function calculateConfidenceRange(
  taskScores: TaskExposureScore[],
  taskMappings: TaskMapping[],
  baseScore: number
): { low: number; high: number } {
  // Calculate standard deviation of scores weighted by time
  let variance = 0;
  let totalWeight = 0;
  let avgConfidence = 0;

  for (let i = 0; i < taskScores.length; i++) {
    const task = taskScores[i];
    const mapping = taskMappings[i];
    const weight = task.timePercent / 100;

    variance += Math.pow(task.exposureScore - baseScore, 2) * weight;
    avgConfidence += (mapping?.confidence || 0.5) * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    variance /= totalWeight;
    avgConfidence /= totalWeight;
  }

  const stdDev = Math.sqrt(variance);

  // Confidence range widens with:
  // 1. Higher variance in task scores
  // 2. Lower mapping confidence
  const confidenceFactor = 1 + (1 - avgConfidence);
  const range = stdDev * confidenceFactor;

  return {
    low: Math.max(0, Math.round(baseScore - range - 5)),
    high: Math.min(100, Math.round(baseScore + range + 5)),
  };
}

/**
 * Identify protected and vulnerable skills based on task exposure
 */
function identifySkillCategories(
  taskScores: TaskExposureScore[]
): { protected: string[]; vulnerable: string[] } {
  const protectedSkills: string[] = [];
  const vulnerableSkills: string[] = [];

  // Analyze task descriptions and DWAs for skill patterns
  const skillPatterns = {
    protected: [
      { pattern: /leadership|manage|supervise|mentor/i, skill: 'Leadership & Management' },
      { pattern: /negotiate|persuade|influence/i, skill: 'Negotiation & Persuasion' },
      { pattern: /creative|design|innovate/i, skill: 'Creative Problem Solving' },
      { pattern: /empathy|emotional|counsel|support/i, skill: 'Emotional Intelligence' },
      { pattern: /strategic|strategy|planning/i, skill: 'Strategic Thinking' },
      { pattern: /relationship|client|stakeholder/i, skill: 'Relationship Building' },
      { pattern: /complex.*decision|judgment|ethics/i, skill: 'Complex Decision Making' },
      { pattern: /physical|hands-on|manual/i, skill: 'Physical/Manual Skills' },
    ],
    vulnerable: [
      { pattern: /data.*entry|typing|input/i, skill: 'Data Entry' },
      { pattern: /schedule|calendar|appointment/i, skill: 'Scheduling & Coordination' },
      { pattern: /research|gather.*information|search/i, skill: 'Information Research' },
      { pattern: /report|document|summarize/i, skill: 'Report Generation' },
      { pattern: /routine|repetitive|standard/i, skill: 'Routine Processing' },
      { pattern: /calculate|compute|analysis/i, skill: 'Data Analysis' },
      { pattern: /translate|transcribe/i, skill: 'Translation & Transcription' },
      { pattern: /sort|organize|file|categorize/i, skill: 'Information Organization' },
    ],
  };

  for (const task of taskScores) {
    const textToSearch = `${task.description} ${task.topDwas.map(d => d.title).join(' ')}`;

    if (task.category === 'low') {
      // Look for protected skills in low-exposure tasks
      for (const { pattern, skill } of skillPatterns.protected) {
        if (pattern.test(textToSearch) && !protectedSkills.includes(skill)) {
          protectedSkills.push(skill);
        }
      }
    } else if (task.category === 'high') {
      // Look for vulnerable skills in high-exposure tasks
      for (const { pattern, skill } of skillPatterns.vulnerable) {
        if (pattern.test(textToSearch) && !vulnerableSkills.includes(skill)) {
          vulnerableSkills.push(skill);
        }
      }
    }
  }

  return {
    protected: protectedSkills.slice(0, 5), // Top 5
    vulnerable: vulnerableSkills.slice(0, 5),
  };
}

/**
 * Main function: Calculate full exposure analysis for a user's task mappings
 */
export async function calculateExposure(
  taskMappings: TaskMapping[]
): Promise<ExposureScore> {
  // Collect all unique DWA IDs
  const allDwaIds = new Set<string>();
  for (const mapping of taskMappings) {
    for (const dwaId of mapping.dwaIds) {
      allDwaIds.add(dwaId);
    }
  }

  // Fetch DWA exposure scores
  const dwaExposures = await getDWAExposures(Array.from(allDwaIds));

  // Calculate individual task scores
  const taskScores: TaskExposureScore[] = taskMappings.map(mapping =>
    calculateTaskExposure(
      mapping.description,
      mapping.timePercent,
      mapping.dwaIds,
      mapping.confidence,
      dwaExposures
    )
  );

  // Calculate overall risk score (time-weighted average)
  let totalWeight = 0;
  let weightedSum = 0;

  for (const task of taskScores) {
    const weight = task.timePercent / 100;
    weightedSum += task.exposureScore * weight;
    totalWeight += weight;
  }

  const riskScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 50; // Default to medium if no tasks

  // Calculate task breakdown percentages
  let highPercent = 0;
  let mediumPercent = 0;
  let lowPercent = 0;

  for (const task of taskScores) {
    switch (task.category) {
      case 'high':
        highPercent += task.timePercent;
        break;
      case 'medium':
        mediumPercent += task.timePercent;
        break;
      case 'low':
        lowPercent += task.timePercent;
        break;
    }
  }

  // Normalize if needed
  const totalPercent = highPercent + mediumPercent + lowPercent;
  if (totalPercent > 0 && totalPercent !== 100) {
    const factor = 100 / totalPercent;
    highPercent = Math.round(highPercent * factor);
    mediumPercent = Math.round(mediumPercent * factor);
    lowPercent = 100 - highPercent - mediumPercent; // Ensure they sum to 100
  }

  // Calculate other metrics
  const scenarioScores = calculateScenarioScores(taskScores, riskScore);
  const confidenceRange = calculateConfidenceRange(taskScores, taskMappings, riskScore);
  const { protected: protectedSkills, vulnerable: vulnerableSkills } =
    identifySkillCategories(taskScores);

  return {
    riskScore,
    confidenceRange,
    scenarioScores,
    taskBreakdown: {
      high: highPercent,
      medium: mediumPercent,
      low: lowPercent,
    },
    taskScores,
    protectedSkills,
    vulnerableSkills,
  };
}

/**
 * Get the exposure score for a specific occupation by SOC code
 */
export async function getOccupationExposure(socCode: string): Promise<ExposureScore | null> {
  const supabase = getSupabaseAdmin();

  // Use the database function to calculate occupation risk
  const { data, error } = await supabase.rpc('calculate_occupation_risk', {
    p_soc_code: socCode,
  });

  if (error || !data || data.length === 0) {
    console.error('Failed to calculate occupation risk:', error);
    return null;
  }

  const result = data[0];

  return {
    riskScore: result.risk_score,
    confidenceRange: {
      low: Math.max(0, result.risk_score - 8),
      high: Math.min(100, result.risk_score + 8),
    },
    scenarioScores: {
      slow: Math.max(0, result.risk_score - 12),
      rapid: Math.min(100, result.risk_score + 15),
    },
    taskBreakdown: {
      high: result.high_exposure_pct,
      medium: result.medium_exposure_pct,
      low: result.low_exposure_pct,
    },
    taskScores: [], // Not available from aggregate function
    protectedSkills: [],
    vulnerableSkills: [],
  };
}

/**
 * Compare two occupations for career transition planning
 */
export async function compareOccupations(
  currentSocCode: string,
  targetSocCode: string
): Promise<{
  currentExposure: ExposureScore | null;
  targetExposure: ExposureScore | null;
  riskReduction: number;
  transitionViability: 'low' | 'medium' | 'high';
}> {
  const [currentExposure, targetExposure] = await Promise.all([
    getOccupationExposure(currentSocCode),
    getOccupationExposure(targetSocCode),
  ]);

  const riskReduction =
    currentExposure && targetExposure
      ? currentExposure.riskScore - targetExposure.riskScore
      : 0;

  // Viability based on risk reduction magnitude
  const transitionViability: 'low' | 'medium' | 'high' =
    riskReduction >= 20 ? 'high' :
    riskReduction >= 10 ? 'medium' : 'low';

  return {
    currentExposure,
    targetExposure,
    riskReduction,
    transitionViability,
  };
}
