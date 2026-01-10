-- Migration: Add onboarding fields to users table
-- Run this in Supabase SQL Editor

-- Add onboarding profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_salary INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN users.job_title IS 'User-provided job title during onboarding';
COMMENT ON COLUMN users.years_of_experience IS 'Years in current or related role';
COMMENT ON COLUMN users.current_salary IS 'Annual salary in USD (optional)';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when onboarding was completed (null = not completed)';

-- Add index for querying users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed_at) WHERE onboarding_completed_at IS NULL;
