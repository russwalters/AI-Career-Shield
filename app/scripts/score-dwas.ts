/**
 * DWA AI Exposure Scoring Script
 *
 * Scores all Detailed Work Activities (DWAs) for AI automation exposure using Claude.
 * Each DWA is evaluated on a 0-100 scale:
 *   - 0-30: Low exposure (significant human elements required)
 *   - 31-60: Medium exposure (AI assists but humans essential)
 *   - 61-100: High exposure (AI can perform most/all)
 *
 * Usage:
 *   npx tsx scripts/score-dwas.ts [--resume] [--batch-size=N] [--dry-run]
 *
 * Options:
 *   --resume      Resume from last scored DWA (default: true if scores exist)
 *   --batch-size  Number of DWAs per batch (default: 10)
 *   --dry-run     Show what would be scored without calling API
 *
 * Requires:
 *   - ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - DWAs imported via import-onet.ts
 *
 * Cost estimate: ~$20-40 for all 2,087 DWAs
 * Time estimate: 2-4 hours (rate limited)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Configuration
const DEFAULT_BATCH_SIZE = 10;
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between API calls
const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface DWA {
  dwa_id: string;
  dwa_title: string;
  gwa_id: string | null;
}

interface ScoringResult {
  dwa_id: string;
  exposure_score: number;
  confidence: number;
  rationale: string;
}

// Scoring prompt template
const SCORING_PROMPT = `You are an expert in AI capabilities and workplace automation. Your task is to evaluate how susceptible a specific work activity is to AI automation.

Evaluate the following Detailed Work Activity (DWA) for AI automation exposure:

**DWA:** {DWA_TITLE}

Consider these factors:
1. **Current AI capabilities** - Can existing AI systems perform this task?
2. **Physical requirements** - Does it require physical presence or manipulation?
3. **Human judgment** - Does it require complex ethical, creative, or contextual judgment?
4. **Interpersonal elements** - Does it involve emotional intelligence, persuasion, or relationship building?
5. **Variability** - Is the task routine/predictable or highly variable?
6. **Accountability** - Are there legal/regulatory requirements for human oversight?

Scoring scale:
- **0-30 (Low exposure):** Significant human elements required. AI cannot meaningfully replace the activity.
- **31-60 (Medium exposure):** AI can assist substantially but humans remain essential for quality/completion.
- **61-100 (High exposure):** AI can perform most or all aspects with minimal human oversight.

Respond with ONLY a JSON object in this exact format:
{
  "score": <number 0-100>,
  "confidence": <number 0.0-1.0>,
  "rationale": "<2-3 sentence explanation>"
}`;

// Parse command line arguments
function parseArgs(): { resume: boolean; batchSize: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let resume = true; // Default to resume
  let batchSize = DEFAULT_BATCH_SIZE;
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--no-resume') {
      resume = false;
    } else if (arg === '--resume') {
      resume = true;
    } else if (arg.startsWith('--batch-size=')) {
      batchSize = parseInt(arg.split('=')[1]) || DEFAULT_BATCH_SIZE;
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { resume, batchSize, dryRun };
}

// Fetch all DWAs that need scoring
async function fetchUnscoredDWAs(resume: boolean): Promise<DWA[]> {
  if (resume) {
    // Get DWAs that haven't been scored yet
    const { data, error } = await supabase
      .from('detailed_work_activities')
      .select('dwa_id, dwa_title, gwa_id')
      .not('dwa_id', 'in', supabase.from('dwa_ai_exposure').select('dwa_id'))
      .order('dwa_id');

    // Supabase doesn't support NOT IN subquery directly, so we'll do it differently
    const { data: allDwas, error: dwaError } = await supabase
      .from('detailed_work_activities')
      .select('dwa_id, dwa_title, gwa_id')
      .order('dwa_id');

    if (dwaError) {
      throw new Error(`Failed to fetch DWAs: ${dwaError.message}`);
    }

    const { data: scoredDwas, error: scoredError } = await supabase
      .from('dwa_ai_exposure')
      .select('dwa_id');

    if (scoredError) {
      throw new Error(`Failed to fetch scored DWAs: ${scoredError.message}`);
    }

    const scoredSet = new Set(scoredDwas?.map(d => d.dwa_id) || []);
    return (allDwas || []).filter(dwa => !scoredSet.has(dwa.dwa_id));
  } else {
    // Get all DWAs
    const { data, error } = await supabase
      .from('detailed_work_activities')
      .select('dwa_id, dwa_title, gwa_id')
      .order('dwa_id');

    if (error) {
      throw new Error(`Failed to fetch DWAs: ${error.message}`);
    }

    return data || [];
  }
}

// Score a single DWA using Claude
async function scoreDWA(dwa: DWA, retryCount = 0): Promise<ScoringResult | null> {
  const prompt = SCORING_PROMPT.replace('{DWA_TITLE}', dwa.dwa_title);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate result
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error(`Invalid score: ${result.score}`);
    }

    return {
      dwa_id: dwa.dwa_id,
      exposure_score: Math.round(result.score),
      confidence: Math.min(1, Math.max(0, result.confidence || 0.8)),
      rationale: result.rationale || '',
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`  Retry ${retryCount + 1}/${MAX_RETRIES} for ${dwa.dwa_id}...`);
      await sleep(RETRY_DELAY_MS);
      return scoreDWA(dwa, retryCount + 1);
    }
    console.error(`  Failed to score ${dwa.dwa_id}: ${error}`);
    return null;
  }
}

// Save scoring result to database
async function saveScore(result: ScoringResult): Promise<boolean> {
  const { error } = await supabase.from('dwa_ai_exposure').upsert({
    dwa_id: result.dwa_id,
    exposure_score: result.exposure_score,
    confidence: result.confidence,
    rationale: result.rationale,
    model_version: MODEL,
  });

  if (error) {
    console.error(`  Failed to save score for ${result.dwa_id}: ${error.message}`);
    return false;
  }

  return true;
}

// Utility sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format time elapsed
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Main function
async function main() {
  const { resume, batchSize, dryRun } = parseArgs();

  console.log('='.repeat(60));
  console.log('DWA AI Exposure Scoring');
  console.log('='.repeat(60));
  console.log(`Model: ${MODEL}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Resume mode: ${resume}`);
  console.log(`Dry run: ${dryRun}`);

  // Fetch DWAs to score
  console.log('\nFetching DWAs...');
  const dwas = await fetchUnscoredDWAs(resume);
  console.log(`Found ${dwas.length} DWAs to score`);

  if (dwas.length === 0) {
    console.log('\nAll DWAs have been scored!');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would score the following DWAs:');
    dwas.slice(0, 20).forEach(dwa => {
      console.log(`  - ${dwa.dwa_id}: ${dwa.dwa_title.substring(0, 60)}...`);
    });
    if (dwas.length > 20) {
      console.log(`  ... and ${dwas.length - 20} more`);
    }
    return;
  }

  // Estimate time and cost
  const estimatedMinutes = Math.ceil((dwas.length * (RATE_LIMIT_DELAY_MS + 2000)) / 60000);
  const estimatedCost = (dwas.length * 0.015).toFixed(2); // ~$0.015 per DWA
  console.log(`\nEstimated time: ${estimatedMinutes} minutes`);
  console.log(`Estimated cost: $${estimatedCost}`);

  // Scoring loop
  const startTime = Date.now();
  let scored = 0;
  let failed = 0;
  let lowCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  console.log('\nStarting scoring...\n');

  for (let i = 0; i < dwas.length; i++) {
    const dwa = dwas[i];
    const progress = `[${i + 1}/${dwas.length}]`;

    process.stdout.write(`${progress} Scoring: ${dwa.dwa_title.substring(0, 50)}...`);

    const result = await scoreDWA(dwa);

    if (result) {
      const saved = await saveScore(result);
      if (saved) {
        scored++;

        // Track distribution
        if (result.exposure_score <= 30) lowCount++;
        else if (result.exposure_score <= 60) mediumCount++;
        else highCount++;

        const category =
          result.exposure_score <= 30 ? 'LOW' :
          result.exposure_score <= 60 ? 'MED' : 'HIGH';
        console.log(` ${result.exposure_score} (${category})`);
      } else {
        failed++;
        console.log(' SAVE FAILED');
      }
    } else {
      failed++;
      console.log(' FAILED');
    }

    // Rate limiting (skip on last iteration)
    if (i < dwas.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    // Progress summary every 50 items
    if ((i + 1) % 50 === 0) {
      const elapsed = Date.now() - startTime;
      const rate = (i + 1) / (elapsed / 1000 / 60);
      const remaining = dwas.length - i - 1;
      const eta = remaining / rate;

      console.log('\n--- Progress ---');
      console.log(`Scored: ${scored}, Failed: ${failed}`);
      console.log(`Distribution: Low=${lowCount}, Medium=${mediumCount}, High=${highCount}`);
      console.log(`Rate: ${rate.toFixed(1)} DWAs/min, ETA: ${eta.toFixed(0)} min`);
      console.log('----------------\n');
    }
  }

  // Final summary
  const totalTime = Date.now() - startTime;
  console.log('\n' + '='.repeat(60));
  console.log('Scoring Complete');
  console.log('='.repeat(60));
  console.log(`Total time: ${formatTime(totalTime)}`);
  console.log(`Scored: ${scored}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nScore distribution:`);
  console.log(`  Low (0-30):    ${lowCount} (${((lowCount / scored) * 100).toFixed(1)}%)`);
  console.log(`  Medium (31-60): ${mediumCount} (${((mediumCount / scored) * 100).toFixed(1)}%)`);
  console.log(`  High (61-100):  ${highCount} (${((highCount / scored) * 100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log(`\nNote: ${failed} DWAs failed to score. Re-run with --resume to retry.`);
  }
}

main().catch(console.error);
