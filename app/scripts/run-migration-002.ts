/**
 * Run migration 002: Add onboarding fields to users table
 *
 * Usage: npx tsx scripts/run-migration-002.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from the app directory
config({ path: resolve(__dirname, '../.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration: 002_onboarding_fields');
  console.log('Adding columns to users table...\n');

  // Check if columns already exist by trying to select them
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('job_title')
    .limit(1);

  if (!testError) {
    console.log('✓ Columns already exist - migration already applied');
    return;
  }

  // If we get here, columns don't exist - but we can't run DDL via the client
  // We need to tell the user to run it manually
  console.log('The migration needs to be run in Supabase SQL Editor.');
  console.log('\nPlease run the following SQL:\n');
  console.log('----------------------------------------');
  console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_salary INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
  `.trim());
  console.log('----------------------------------------\n');
  console.log('Go to: https://supabase.com/dashboard/project/gzsioshnbepprvargpvt/sql/new');
}

runMigration().catch(console.error);
