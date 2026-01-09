-- AI Career Shield Database Schema
-- Migration: 001_initial_schema
-- Description: Initial database setup with O*NET data tables, user data, and AI exposure scoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- O*NET REFERENCE DATA
-- =====================================================

-- Master occupation list (from O*NET 30.1)
CREATE TABLE occupations (
  soc_code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  job_zone INTEGER CHECK (job_zone BETWEEN 1 AND 5)
);

COMMENT ON TABLE occupations IS 'O*NET occupation codes and titles';
COMMENT ON COLUMN occupations.soc_code IS 'Standard Occupational Classification code (e.g., 11-1011.00)';
COMMENT ON COLUMN occupations.job_zone IS 'Job Zone 1-5 indicating preparation level needed';

-- Alternate job titles for occupation matching
CREATE TABLE alternate_titles (
  id SERIAL PRIMARY KEY,
  soc_code TEXT NOT NULL REFERENCES occupations(soc_code) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_title TEXT
);

CREATE INDEX idx_alternate_titles_soc ON alternate_titles(soc_code);
CREATE INDEX idx_alternate_titles_lower ON alternate_titles(LOWER(title));
CREATE INDEX idx_alternate_titles_title_trgm ON alternate_titles USING gin (title gin_trgm_ops);

COMMENT ON TABLE alternate_titles IS 'Alternative job titles mapping to O*NET occupations';

-- Task statements for each occupation
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  soc_code TEXT NOT NULL REFERENCES occupations(soc_code) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  task_type TEXT, -- 'Core' or 'Supplemental'
  importance DECIMAL
);

CREATE INDEX idx_tasks_soc ON tasks(soc_code);

COMMENT ON TABLE tasks IS 'Specific work tasks performed in each occupation';
COMMENT ON COLUMN tasks.task_type IS 'Core tasks are essential; Supplemental tasks may vary';

-- Skills for each occupation (importance and level ratings)
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  soc_code TEXT NOT NULL REFERENCES occupations(soc_code) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  element_name TEXT NOT NULL,
  scale_id TEXT NOT NULL, -- 'IM' (importance) or 'LV' (level)
  value DECIMAL
);

CREATE INDEX idx_skills_soc ON skills(soc_code);
CREATE INDEX idx_skills_element ON skills(element_id);

COMMENT ON TABLE skills IS 'Skills required for each occupation with importance/level ratings';

-- Generalized Work Activities (GWAs) for each occupation
CREATE TABLE work_activities (
  id SERIAL PRIMARY KEY,
  soc_code TEXT NOT NULL REFERENCES occupations(soc_code) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  element_name TEXT NOT NULL,
  scale_id TEXT NOT NULL,
  value DECIMAL
);

CREATE INDEX idx_work_activities_soc ON work_activities(soc_code);
CREATE INDEX idx_work_activities_element ON work_activities(element_id);

COMMENT ON TABLE work_activities IS 'Generalized work activities (41 categories) for each occupation';

-- Detailed Work Activities (DWAs) - the granular task breakdown
CREATE TABLE detailed_work_activities (
  dwa_id TEXT PRIMARY KEY,
  dwa_title TEXT NOT NULL,
  iwa_id TEXT, -- Intermediate Work Activity
  gwa_id TEXT  -- Generalized Work Activity (parent)
);

CREATE INDEX idx_dwa_gwa ON detailed_work_activities(gwa_id);

COMMENT ON TABLE detailed_work_activities IS '2,000+ detailed work activities - our primary AI exposure scoring unit';

-- Link tasks to DWAs (many-to-many)
CREATE TABLE task_dwa_links (
  id SERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  dwa_id TEXT NOT NULL REFERENCES detailed_work_activities(dwa_id) ON DELETE CASCADE,
  UNIQUE(task_id, dwa_id)
);

CREATE INDEX idx_task_dwa_task ON task_dwa_links(task_id);
CREATE INDEX idx_task_dwa_dwa ON task_dwa_links(dwa_id);

COMMENT ON TABLE task_dwa_links IS 'Maps specific occupation tasks to detailed work activities';

-- =====================================================
-- AI EXPOSURE SCORING (Our Custom Data)
-- =====================================================

-- AI exposure scores for each DWA (scored by Claude)
CREATE TABLE dwa_ai_exposure (
  dwa_id TEXT PRIMARY KEY REFERENCES detailed_work_activities(dwa_id) ON DELETE CASCADE,
  exposure_score INTEGER NOT NULL CHECK (exposure_score BETWEEN 0 AND 100),
  confidence DECIMAL CHECK (confidence BETWEEN 0 AND 1),
  rationale TEXT,
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_version TEXT DEFAULT 'claude-3-5-sonnet'
);

CREATE INDEX idx_dwa_exposure_score ON dwa_ai_exposure(exposure_score);

COMMENT ON TABLE dwa_ai_exposure IS 'AI automation exposure scores for each detailed work activity';
COMMENT ON COLUMN dwa_ai_exposure.exposure_score IS '0-30: Low, 31-60: Medium, 61-100: High AI exposure';

-- Aggregate AI exposure for GWAs (41 categories)
CREATE TABLE gwa_ai_exposure (
  gwa_id TEXT PRIMARY KEY,
  gwa_name TEXT NOT NULL,
  exposure_score INTEGER CHECK (exposure_score BETWEEN 0 AND 100),
  category TEXT CHECK (category IN ('low', 'medium', 'high')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE gwa_ai_exposure IS 'Aggregated AI exposure scores for generalized work activity categories';

-- =====================================================
-- USER DATA
-- =====================================================

-- Users (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'shield')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT
);

CREATE INDEX idx_users_clerk ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User accounts synced from Clerk authentication';

-- Assessment results
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_soc_code TEXT REFERENCES occupations(soc_code),
  job_title_input TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  tasks_described JSONB, -- [{description: "...", time_percent: 20}, ...]
  tools_used JSONB, -- ["HubSpot", "Salesforce", ...]
  collaboration_percent INTEGER,
  task_mappings JSONB, -- [{task_description: "...", dwa_ids: [...], confidence: 0.85}, ...]
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  confidence_range JSONB, -- {low: 52, high: 64}
  scenario_scores JSONB, -- {slow: 48, rapid: 72}
  task_breakdown JSONB, -- {high: 35, medium: 40, low: 25}
  protected_skills JSONB,
  vulnerable_skills JSONB,
  concerns TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_created ON assessments(created_at DESC);

COMMENT ON TABLE assessments IS 'User career assessment results with risk scores';

-- Career path recommendations
CREATE TABLE career_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_soc_code TEXT NOT NULL REFERENCES occupations(soc_code),
  target_title TEXT NOT NULL,
  skills_match_pct INTEGER CHECK (skills_match_pct BETWEEN 0 AND 100),
  risk_reduction INTEGER, -- Points of risk reduction vs current
  target_risk_score INTEGER CHECK (target_risk_score BETWEEN 0 AND 100),
  skills_to_learn JSONB, -- [{skill: "...", importance: "high"}, ...]
  transferable_skills JSONB,
  transition_difficulty TEXT CHECK (transition_difficulty IN ('low', 'medium', 'high')),
  job_growth_outlook TEXT,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recommendations_assessment ON career_recommendations(assessment_id);

COMMENT ON TABLE career_recommendations IS 'Recommended career transitions based on assessment';

-- Conversation history (assessment and coaching)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('assessment', 'coaching')),
  messages JSONB NOT NULL DEFAULT '[]', -- [{role: "user"|"assistant", content: "...", timestamp: "..."}]
  summary TEXT,
  assessment_id UUID REFERENCES assessments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);

COMMENT ON TABLE conversations IS 'Chat conversation history for assessments and coaching';

-- Long-term memory (embeddings for coaching context)
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  memory_type TEXT NOT NULL CHECK (memory_type IN ('insight', 'goal', 'progress', 'preference', 'concern')),
  source_conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memory_user ON user_memory(user_id);
CREATE INDEX idx_memory_type ON user_memory(memory_type);
CREATE INDEX idx_memory_embedding ON user_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE user_memory IS 'Long-term memory for coaching context using embeddings';

-- Action plans (90-day plans for Shield tier)
CREATE TABLE action_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id),
  target_career TEXT NOT NULL,
  target_soc_code TEXT REFERENCES occupations(soc_code),
  milestones JSONB NOT NULL, -- [{week: 1, title: "...", tasks: [...], status: "pending"|"in_progress"|"completed"}]
  current_milestone INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plans_user ON action_plans(user_id);

COMMENT ON TABLE action_plans IS '90-day action plans for career transitions';

-- Learning progress tracking
CREATE TABLE learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_plan_id UUID REFERENCES action_plans(id),
  resource_url TEXT,
  resource_title TEXT NOT NULL,
  resource_type TEXT CHECK (resource_type IN ('video', 'course', 'article', 'certification', 'project')),
  skill_category TEXT,
  duration_estimate TEXT,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_user ON learning_progress(user_id);
CREATE INDEX idx_learning_plan ON learning_progress(action_plan_id);

COMMENT ON TABLE learning_progress IS 'User progress on learning resources';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = clerk_id OR auth.jwt()->>'sub' = clerk_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = clerk_id OR auth.jwt()->>'sub' = clerk_id);

-- Assessments: users can only access their own
CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create own assessments"
  ON assessments FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- Career recommendations: users can only view their own
CREATE POLICY "Users can view own recommendations"
  ON career_recommendations FOR SELECT
  USING (assessment_id IN (
    SELECT a.id FROM assessments a
    JOIN users u ON a.user_id = u.id
    WHERE u.clerk_id = auth.jwt()->>'sub'
  ));

-- Conversations: users can only access their own
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- User memory: users can only access their own
CREATE POLICY "Users can view own memories"
  ON user_memory FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create own memories"
  ON user_memory FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- Action plans: users can only access their own
CREATE POLICY "Users can view own plans"
  ON action_plans FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can create own plans"
  ON action_plans FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can update own plans"
  ON action_plans FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- Learning progress: users can only access their own
CREATE POLICY "Users can view own learning progress"
  ON learning_progress FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY "Users can manage own learning progress"
  ON learning_progress FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

-- =====================================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- =====================================================

-- Allow service role to bypass RLS for imports and admin operations
CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to assessments"
  ON assessments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to recommendations"
  ON career_recommendations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to conversations"
  ON conversations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to memories"
  ON user_memory FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to plans"
  ON action_plans FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to learning"
  ON learning_progress FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate occupation risk score based on DWA exposure
CREATE OR REPLACE FUNCTION calculate_occupation_risk(p_soc_code TEXT)
RETURNS TABLE (
  risk_score INTEGER,
  task_breakdown JSONB,
  high_exposure_pct INTEGER,
  medium_exposure_pct INTEGER,
  low_exposure_pct INTEGER
) AS $$
DECLARE
  v_total_tasks INTEGER;
  v_high_count INTEGER;
  v_medium_count INTEGER;
  v_low_count INTEGER;
  v_avg_score DECIMAL;
BEGIN
  -- Get all DWAs linked to this occupation's tasks
  WITH occupation_dwas AS (
    SELECT DISTINCT tdl.dwa_id, dae.exposure_score
    FROM tasks t
    JOIN task_dwa_links tdl ON t.task_id = tdl.task_id
    JOIN dwa_ai_exposure dae ON tdl.dwa_id = dae.dwa_id
    WHERE t.soc_code = p_soc_code
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE exposure_score > 60),
    COUNT(*) FILTER (WHERE exposure_score BETWEEN 31 AND 60),
    COUNT(*) FILTER (WHERE exposure_score <= 30),
    AVG(exposure_score)
  INTO v_total_tasks, v_high_count, v_medium_count, v_low_count, v_avg_score
  FROM occupation_dwas;

  IF v_total_tasks = 0 THEN
    RETURN QUERY SELECT 50, '{}'::JSONB, 0, 0, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_avg_score)::INTEGER,
    jsonb_build_object(
      'high', v_high_count,
      'medium', v_medium_count,
      'low', v_low_count
    ),
    ROUND((v_high_count::DECIMAL / v_total_tasks) * 100)::INTEGER,
    ROUND((v_medium_count::DECIMAL / v_total_tasks) * 100)::INTEGER,
    ROUND((v_low_count::DECIMAL / v_total_tasks) * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to search for occupations by job title
CREATE OR REPLACE FUNCTION search_occupations(search_query TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  soc_code TEXT,
  title TEXT,
  match_type TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Exact match on main title
  SELECT o.soc_code, o.title, 'exact'::TEXT, 1.0::REAL
  FROM occupations o
  WHERE LOWER(o.title) = LOWER(search_query)

  UNION ALL

  -- Fuzzy match on main title
  SELECT o.soc_code, o.title, 'fuzzy_main'::TEXT,
         similarity(LOWER(o.title), LOWER(search_query))
  FROM occupations o
  WHERE similarity(LOWER(o.title), LOWER(search_query)) > 0.3
    AND LOWER(o.title) != LOWER(search_query)

  UNION ALL

  -- Match on alternate titles
  SELECT at.soc_code, o.title, 'alternate'::TEXT,
         similarity(LOWER(at.title), LOWER(search_query))
  FROM alternate_titles at
  JOIN occupations o ON at.soc_code = o.soc_code
  WHERE similarity(LOWER(at.title), LOWER(search_query)) > 0.4

  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enable trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON FUNCTION calculate_occupation_risk IS 'Calculate AI exposure risk score for an occupation based on its DWA scores';
COMMENT ON FUNCTION search_occupations IS 'Search for occupations by job title with fuzzy matching';
