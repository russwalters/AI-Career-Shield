/**
 * O*NET Database Import Script
 *
 * Imports O*NET 30.1 data from tab-delimited files into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-onet.ts
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - O*NET data files in ../data/onet/db_30_1_text/
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ONET_DATA_PATH = path.join(__dirname, '../../data/onet/db_30_1_text');

// Helper to parse tab-delimited files
async function parseTabFile<T>(
  filename: string,
  transform: (row: Record<string, string>) => T | null
): Promise<T[]> {
  const filepath = path.join(ONET_DATA_PATH, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return [];
  }

  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const results: T[] = [];
  let headers: string[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const fields = line.split('\t');

    if (lineNum === 1) {
      // First line is headers
      headers = fields.map(h => h.trim());
      continue;
    }

    // Create row object
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = fields[i]?.trim() || '';
    });

    const transformed = transform(row);
    if (transformed) {
      results.push(transformed);
    }
  }

  return results;
}

// Batch insert helper
async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  data: T[],
  batchSize: number = 500
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      console.error(`Error inserting batch into ${table}:`, error.message);
      // Continue with next batch
    } else {
      inserted += batch.length;
    }

    // Progress indicator
    process.stdout.write(`\r  Inserted ${inserted}/${data.length} rows`);
  }

  console.log(); // New line after progress
  return inserted;
}

// Import functions for each table
async function importOccupations() {
  console.log('\nImporting occupations...');

  const data = await parseTabFile('Occupation Data.txt', (row) => ({
    soc_code: row['O*NET-SOC Code'],
    title: row['Title'],
    description: row['Description'] || null,
  }));

  // Get job zones separately
  const jobZones = await parseTabFile('Job Zones.txt', (row) => ({
    soc_code: row['O*NET-SOC Code'],
    job_zone: parseInt(row['Job Zone']) || null,
  }));

  const jobZoneMap = new Map(jobZones.map(jz => [jz.soc_code, jz.job_zone]));

  const occupations = data.map(occ => ({
    ...occ,
    job_zone: jobZoneMap.get(occ.soc_code) || null,
  }));

  const count = await batchInsert('occupations', occupations);
  console.log(`  Total occupations: ${count}`);
  return count;
}

async function importAlternateTitles() {
  console.log('\nImporting alternate titles...');

  const data = await parseTabFile('Alternate Titles.txt', (row) => ({
    soc_code: row['O*NET-SOC Code'],
    title: row['Alternate Title'],
    short_title: row['Short Title'] === 'n/a' ? null : row['Short Title'],
  }));

  const count = await batchInsert('alternate_titles', data);
  console.log(`  Total alternate titles: ${count}`);
  return count;
}

async function importTasks() {
  console.log('\nImporting task statements...');

  // Get task ratings for importance/relevance
  const ratings = await parseTabFile('Task Ratings.txt', (row) => {
    if (row['Scale ID'] !== 'IM') return null; // Only get importance scale
    return {
      task_id: row['Task ID'],
      importance: parseFloat(row['Data Value']) || null,
    };
  });

  const importanceMap = new Map(ratings.filter(r => r).map(r => [r!.task_id, r!.importance]));

  const data = await parseTabFile('Task Statements.txt', (row) => ({
    task_id: row['Task ID'],
    soc_code: row['O*NET-SOC Code'],
    statement: row['Task'],
    task_type: row['Task Type'] || null,
    importance: importanceMap.get(row['Task ID']) || null,
  }));

  const count = await batchInsert('tasks', data);
  console.log(`  Total tasks: ${count}`);
  return count;
}

async function importSkills() {
  console.log('\nImporting skills...');

  const data = await parseTabFile('Skills.txt', (row) => {
    // Only import importance (IM) and level (LV) scales
    if (row['Scale ID'] !== 'IM' && row['Scale ID'] !== 'LV') return null;

    return {
      soc_code: row['O*NET-SOC Code'],
      element_id: row['Element ID'],
      element_name: row['Element Name'],
      scale_id: row['Scale ID'],
      value: parseFloat(row['Data Value']) || null,
    };
  });

  const count = await batchInsert('skills', data);
  console.log(`  Total skill records: ${count}`);
  return count;
}

async function importWorkActivities() {
  console.log('\nImporting work activities...');

  const data = await parseTabFile('Work Activities.txt', (row) => {
    // Only import importance (IM) and level (LV) scales
    if (row['Scale ID'] !== 'IM' && row['Scale ID'] !== 'LV') return null;

    return {
      soc_code: row['O*NET-SOC Code'],
      element_id: row['Element ID'],
      element_name: row['Element Name'],
      scale_id: row['Scale ID'],
      value: parseFloat(row['Data Value']) || null,
    };
  });

  const count = await batchInsert('work_activities', data);
  console.log(`  Total work activity records: ${count}`);
  return count;
}

async function importDetailedWorkActivities() {
  console.log('\nImporting detailed work activities (DWAs)...');

  const data = await parseTabFile('DWA Reference.txt', (row) => ({
    dwa_id: row['DWA ID'],
    dwa_title: row['DWA Title'],
    iwa_id: row['IWA ID'] || null,
    gwa_id: row['Element ID'] || null, // GWA is the Element ID prefix
  }));

  const count = await batchInsert('detailed_work_activities', data);
  console.log(`  Total DWAs: ${count}`);
  return count;
}

async function importTaskDwaLinks() {
  console.log('\nImporting task-to-DWA links...');

  const data = await parseTabFile('Tasks to DWAs.txt', (row) => ({
    task_id: row['Task ID'],
    dwa_id: row['DWA ID'],
  }));

  const count = await batchInsert('task_dwa_links', data);
  console.log(`  Total task-DWA links: ${count}`);
  return count;
}

// Main import function
async function main() {
  console.log('='.repeat(60));
  console.log('O*NET Database Import');
  console.log('='.repeat(60));
  console.log(`Data path: ${ONET_DATA_PATH}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  // Check if data directory exists
  if (!fs.existsSync(ONET_DATA_PATH)) {
    console.error(`\nError: O*NET data directory not found at ${ONET_DATA_PATH}`);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // Import in order (respecting foreign key constraints)
    await importOccupations();
    await importAlternateTitles();
    await importTasks();
    await importSkills();
    await importWorkActivities();
    await importDetailedWorkActivities();
    await importTaskDwaLinks();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log(`Import complete in ${elapsed}s`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }
}

main();
