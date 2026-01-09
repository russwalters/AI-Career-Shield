/**
 * GWA Score Aggregation Script
 *
 * Aggregates DWA (Detailed Work Activity) scores into their parent
 * GWA (Generalized Work Activity) categories. O*NET has 41 GWAs
 * that group related detailed work activities.
 *
 * Usage:
 *   npx tsx scripts/aggregate-gwa-scores.ts
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - DWA scores populated via score-dwas.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// GWA Element IDs and their names (from O*NET Content Model)
// These are the 41 Generalized Work Activities
const GWA_NAMES: Record<string, string> = {
  '4.A.1.a.1': 'Getting Information',
  '4.A.1.a.2': 'Monitor Processes, Materials, or Surroundings',
  '4.A.1.b.1': 'Identifying Objects, Actions, and Events',
  '4.A.1.b.2': 'Inspecting Equipment, Structures, or Materials',
  '4.A.1.b.3': 'Estimating the Quantifiable Characteristics of Products, Events, or Information',
  '4.A.2.a.1': 'Judging the Qualities of Objects, Services, or People',
  '4.A.2.a.2': 'Processing Information',
  '4.A.2.a.3': 'Evaluating Information to Determine Compliance with Standards',
  '4.A.2.a.4': 'Analyzing Data or Information',
  '4.A.2.b.1': 'Making Decisions and Solving Problems',
  '4.A.2.b.2': 'Thinking Creatively',
  '4.A.2.b.3': 'Updating and Using Relevant Knowledge',
  '4.A.2.b.4': 'Developing Objectives and Strategies',
  '4.A.2.b.5': 'Scheduling Work and Activities',
  '4.A.2.b.6': 'Organizing, Planning, and Prioritizing Work',
  '4.A.3.a.1': 'Performing General Physical Activities',
  '4.A.3.a.2': 'Handling and Moving Objects',
  '4.A.3.a.3': 'Controlling Machines and Processes',
  '4.A.3.a.4': 'Operating Vehicles, Mechanized Devices, or Equipment',
  '4.A.3.b.1': 'Interacting With Computers',
  '4.A.3.b.2': 'Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment',
  '4.A.3.b.4': 'Repairing and Maintaining Mechanical Equipment',
  '4.A.3.b.5': 'Repairing and Maintaining Electronic Equipment',
  '4.A.3.b.6': 'Documenting/Recording Information',
  '4.A.4.a.1': 'Interpreting the Meaning of Information for Others',
  '4.A.4.a.2': 'Communicating with Supervisors, Peers, or Subordinates',
  '4.A.4.a.3': 'Communicating with People Outside the Organization',
  '4.A.4.a.4': 'Establishing and Maintaining Interpersonal Relationships',
  '4.A.4.a.5': 'Assisting and Caring for Others',
  '4.A.4.a.6': 'Selling or Influencing Others',
  '4.A.4.a.7': 'Resolving Conflicts and Negotiating with Others',
  '4.A.4.a.8': 'Performing for or Working Directly with the Public',
  '4.A.4.b.1': 'Coordinating the Work and Activities of Others',
  '4.A.4.b.2': 'Developing and Building Teams',
  '4.A.4.b.3': 'Training and Teaching Others',
  '4.A.4.b.4': 'Guiding, Directing, and Motivating Subordinates',
  '4.A.4.b.5': 'Coaching and Developing Others',
  '4.A.4.b.6': 'Provide Consultation and Advice to Others',
  '4.A.4.c.1': 'Performing Administrative Activities',
  '4.A.4.c.2': 'Staffing Organizational Units',
  '4.A.4.c.3': 'Monitoring and Controlling Resources',
};

interface GWAAggregation {
  gwa_id: string;
  gwa_name: string;
  exposure_score: number;
  category: 'low' | 'medium' | 'high';
  dwa_count: number;
  min_score: number;
  max_score: number;
  std_dev: number;
}

function categorizeScore(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

async function fetchScoredDWAs(): Promise<Array<{
  dwa_id: string;
  gwa_id: string | null;
  exposure_score: number;
}>> {
  // Join DWAs with their scores
  const { data: dwas, error: dwaError } = await supabase
    .from('detailed_work_activities')
    .select('dwa_id, gwa_id');

  if (dwaError) {
    throw new Error(`Failed to fetch DWAs: ${dwaError.message}`);
  }

  const { data: scores, error: scoreError } = await supabase
    .from('dwa_ai_exposure')
    .select('dwa_id, exposure_score');

  if (scoreError) {
    throw new Error(`Failed to fetch scores: ${scoreError.message}`);
  }

  const scoreMap = new Map(scores?.map(s => [s.dwa_id, s.exposure_score]) || []);

  return (dwas || [])
    .filter(dwa => scoreMap.has(dwa.dwa_id))
    .map(dwa => ({
      dwa_id: dwa.dwa_id,
      gwa_id: dwa.gwa_id,
      exposure_score: scoreMap.get(dwa.dwa_id)!,
    }));
}

function aggregateByGWA(
  scoredDwas: Array<{ dwa_id: string; gwa_id: string | null; exposure_score: number }>
): GWAAggregation[] {
  // Group DWAs by GWA
  const gwaGroups = new Map<string, number[]>();

  for (const dwa of scoredDwas) {
    if (!dwa.gwa_id) continue;

    // Extract base GWA ID (e.g., "4.A.1.a.1" from "4.A.1.a.1.I.A" format)
    // GWA IDs in DWA Reference might be full IWA IDs; we need the parent GWA
    const gwaId = extractGwaId(dwa.gwa_id);
    if (!gwaId) continue;

    if (!gwaGroups.has(gwaId)) {
      gwaGroups.set(gwaId, []);
    }
    gwaGroups.get(gwaId)!.push(dwa.exposure_score);
  }

  // Calculate aggregates for each GWA
  const aggregations: GWAAggregation[] = [];

  for (const [gwaId, scores] of gwaGroups) {
    if (scores.length === 0) continue;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    aggregations.push({
      gwa_id: gwaId,
      gwa_name: GWA_NAMES[gwaId] || `Unknown GWA (${gwaId})`,
      exposure_score: Math.round(mean),
      category: categorizeScore(mean),
      dwa_count: scores.length,
      min_score: Math.min(...scores),
      max_score: Math.max(...scores),
      std_dev: Math.round(stdDev * 10) / 10,
    });
  }

  // Sort by exposure score descending
  aggregations.sort((a, b) => b.exposure_score - a.exposure_score);

  return aggregations;
}

/**
 * Extract the GWA ID from a full element ID
 * O*NET element IDs have format like "4.A.1.a.1" (GWA) or "4.A.1.a.1.I.A" (IWA/DWA)
 */
function extractGwaId(elementId: string): string | null {
  // GWA IDs match pattern like "4.A.1.a.1" (5 parts with dots)
  const parts = elementId.split('.');

  // If we have exactly 5 parts, it's already a GWA ID
  if (parts.length === 5) {
    return elementId;
  }

  // If we have more parts, take the first 5
  if (parts.length > 5) {
    return parts.slice(0, 5).join('.');
  }

  // Less than 5 parts - might be a different format
  // Try to find matching GWA
  for (const gwaId of Object.keys(GWA_NAMES)) {
    if (elementId.startsWith(gwaId)) {
      return gwaId;
    }
  }

  return null;
}

async function saveAggregations(aggregations: GWAAggregation[]): Promise<number> {
  // Clear existing aggregations
  const { error: deleteError } = await supabase
    .from('gwa_ai_exposure')
    .delete()
    .neq('gwa_id', ''); // Delete all

  if (deleteError) {
    console.error('Warning: Could not clear existing aggregations:', deleteError.message);
  }

  // Insert new aggregations
  const records = aggregations.map(agg => ({
    gwa_id: agg.gwa_id,
    gwa_name: agg.gwa_name,
    exposure_score: agg.exposure_score,
    category: agg.category,
  }));

  const { error: insertError } = await supabase
    .from('gwa_ai_exposure')
    .insert(records);

  if (insertError) {
    throw new Error(`Failed to save aggregations: ${insertError.message}`);
  }

  return records.length;
}

async function main() {
  console.log('='.repeat(60));
  console.log('GWA Score Aggregation');
  console.log('='.repeat(60));

  // Fetch scored DWAs
  console.log('\nFetching scored DWAs...');
  const scoredDwas = await fetchScoredDWAs();
  console.log(`Found ${scoredDwas.length} scored DWAs`);

  if (scoredDwas.length === 0) {
    console.error('\nNo scored DWAs found. Run score-dwas.ts first.');
    process.exit(1);
  }

  // Aggregate by GWA
  console.log('\nAggregating by GWA...');
  const aggregations = aggregateByGWA(scoredDwas);
  console.log(`Aggregated into ${aggregations.length} GWA categories`);

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('GWA Exposure Scores (sorted by exposure)');
  console.log('='.repeat(60));
  console.log('\n%-6s %-50s %5s %7s', 'SCORE', 'GWA NAME', 'DWAs', 'CATEGORY');
  console.log('-'.repeat(72));

  for (const agg of aggregations) {
    const categoryLabel =
      agg.category === 'high' ? 'HIGH' :
      agg.category === 'medium' ? 'MED' : 'LOW';

    console.log(
      `  ${agg.exposure_score.toString().padStart(2)}    ${agg.gwa_name.substring(0, 48).padEnd(50)} ${agg.dwa_count.toString().padStart(4)}   ${categoryLabel}`
    );
  }

  // Summary statistics
  const lowCount = aggregations.filter(a => a.category === 'low').length;
  const medCount = aggregations.filter(a => a.category === 'medium').length;
  const highCount = aggregations.filter(a => a.category === 'high').length;

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total GWA categories: ${aggregations.length}`);
  console.log(`  Low exposure (0-30):    ${lowCount} (${((lowCount / aggregations.length) * 100).toFixed(1)}%)`);
  console.log(`  Medium exposure (31-60): ${medCount} (${((medCount / aggregations.length) * 100).toFixed(1)}%)`);
  console.log(`  High exposure (61-100):  ${highCount} (${((highCount / aggregations.length) * 100).toFixed(1)}%)`);

  // Save to database
  console.log('\nSaving to database...');
  const savedCount = await saveAggregations(aggregations);
  console.log(`Saved ${savedCount} GWA aggregations`);

  // Display top/bottom 5
  console.log('\n' + '='.repeat(60));
  console.log('Most Exposed GWAs (Highest AI Automation Risk)');
  console.log('='.repeat(60));
  aggregations.slice(0, 5).forEach((agg, i) => {
    console.log(`${i + 1}. ${agg.gwa_name} (${agg.exposure_score})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('Most Protected GWAs (Lowest AI Automation Risk)');
  console.log('='.repeat(60));
  aggregations.slice(-5).reverse().forEach((agg, i) => {
    console.log(`${i + 1}. ${agg.gwa_name} (${agg.exposure_score})`);
  });

  console.log('\nAggregation complete!');
}

main().catch(console.error);
