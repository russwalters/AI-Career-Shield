import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for our database tables
export interface Database {
  public: {
    Tables: {
      occupations: {
        Row: {
          soc_code: string;
          title: string;
          description: string | null;
          job_zone: number | null;
        };
        Insert: Omit<Database['public']['Tables']['occupations']['Row'], never>;
        Update: Partial<Database['public']['Tables']['occupations']['Row']>;
      };
      alternate_titles: {
        Row: {
          id: number;
          soc_code: string;
          title: string;
          short_title: string | null;
        };
        Insert: Omit<Database['public']['Tables']['alternate_titles']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['alternate_titles']['Row']>;
      };
      tasks: {
        Row: {
          task_id: string;
          soc_code: string;
          statement: string;
          task_type: string | null;
          importance: number | null;
        };
        Insert: Database['public']['Tables']['tasks']['Row'];
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
      };
      detailed_work_activities: {
        Row: {
          dwa_id: string;
          dwa_title: string;
          iwa_id: string | null;
          gwa_id: string | null;
        };
        Insert: Database['public']['Tables']['detailed_work_activities']['Row'];
        Update: Partial<Database['public']['Tables']['detailed_work_activities']['Row']>;
      };
      dwa_ai_exposure: {
        Row: {
          dwa_id: string;
          exposure_score: number;
          confidence: number | null;
          rationale: string | null;
          scored_at: string;
          model_version: string | null;
        };
        Insert: Omit<Database['public']['Tables']['dwa_ai_exposure']['Row'], 'scored_at'>;
        Update: Partial<Database['public']['Tables']['dwa_ai_exposure']['Row']>;
      };
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
          updated_at: string;
          subscription_tier: 'free' | 'shield';
          subscription_status: 'active' | 'canceled' | 'past_due';
          stripe_customer_id: string | null;
          // Onboarding fields
          job_title: string | null;
          years_of_experience: number | null;
          current_salary: number | null;
          onboarding_completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          matched_soc_code: string | null;
          job_title_input: string;
          industry: string | null;
          company_size: string | null;
          tasks_described: TaskDescription[] | null;
          tools_used: string[] | null;
          collaboration_percent: number | null;
          task_mappings: TaskMapping[] | null;
          risk_score: number | null;
          confidence_range: { low: number; high: number } | null;
          scenario_scores: { slow: number; rapid: number } | null;
          task_breakdown: { high: number; medium: number; low: number } | null;
          protected_skills: string[] | null;
          vulnerable_skills: string[] | null;
          concerns: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assessments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['assessments']['Row']>;
      };
      career_recommendations: {
        Row: {
          id: string;
          assessment_id: string;
          target_soc_code: string;
          target_title: string;
          skills_match_pct: number | null;
          risk_reduction: number | null;
          target_risk_score: number | null;
          skills_to_learn: SkillToLearn[] | null;
          transferable_skills: string[] | null;
          transition_difficulty: 'low' | 'medium' | 'high' | null;
          job_growth_outlook: string | null;
          rank: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['career_recommendations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['career_recommendations']['Row']>;
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          conversation_type: 'assessment' | 'coaching';
          messages: ChatMessage[];
          summary: string | null;
          assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Row']>;
      };
      action_plans: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string | null;
          target_career: string;
          target_soc_code: string | null;
          milestones: Milestone[];
          current_milestone: number;
          start_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['action_plans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['action_plans']['Row']>;
      };
      learning_progress: {
        Row: {
          id: string;
          user_id: string;
          action_plan_id: string | null;
          resource_url: string | null;
          resource_title: string;
          resource_type: 'video' | 'course' | 'article' | 'certification' | 'project' | null;
          skill_category: string | null;
          duration_estimate: string | null;
          completed: boolean;
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['learning_progress']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['learning_progress']['Row']>;
      };
    };
    Functions: {
      calculate_occupation_risk: {
        Args: { p_soc_code: string };
        Returns: {
          risk_score: number;
          task_breakdown: { high: number; medium: number; low: number };
          high_exposure_pct: number;
          medium_exposure_pct: number;
          low_exposure_pct: number;
        }[];
      };
      search_occupations: {
        Args: { search_query: string; result_limit?: number };
        Returns: {
          soc_code: string;
          title: string;
          match_type: string;
          similarity: number;
        }[];
      };
    };
  };
}

// Helper types for JSONB columns
export interface TaskDescription {
  description: string;
  time_percent: number;
}

export interface TaskMapping {
  task_description: string;
  dwa_ids: string[];
  confidence: number;
}

export interface SkillToLearn {
  skill: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Milestone {
  week: number;
  title: string;
  description?: string;
  tasks: MilestoneTask[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MilestoneTask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

// Supabase client singleton for client-side
let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) return clientInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return clientInstance;
}

// Server-side client with service role key (for API routes)
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Convenience export for client components
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;
