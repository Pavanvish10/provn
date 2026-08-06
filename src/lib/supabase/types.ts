export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string
          description: string | null
          icon: string | null
          id: string
          profile_id: string
          source: string
          title: string
        }
        Insert: {
          achieved_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          profile_id: string
          source?: string
          title: string
        }
        Update: {
          achieved_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          profile_id?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          minutes: number
          profile_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          minutes?: number
          profile_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          minutes?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          code: string
          description: string | null
          icon: string | null
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          icon?: string | null
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          icon?: string | null
          name?: string
        }
        Relationships: []
      }
      career_roadmap_tasks: {
        Row: {
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          granularity: string
          id: string
          period_index: number
          roadmap_id: string
          task_date: string | null
          title: string
        }
        Insert: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          granularity: string
          id?: string
          period_index: number
          roadmap_id: string
          task_date?: string | null
          title: string
        }
        Update: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          granularity?: string
          id?: string
          period_index?: number
          roadmap_id?: string
          task_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_roadmap_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "career_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      career_roadmaps: {
        Row: {
          coding_practice_plan: Json
          company_readiness_score: number
          created_at: string
          duration_months: number
          hiring_readiness_score: number
          hr_prep_plan: Json
          id: string
          interview_prep_plan: Json
          job_description_text: string | null
          profile_id: string
          recommended_projects: Json
          resume_id: string | null
          role_readiness_score: number
          skill_gap: Json
          start_date: string
          status: string
          summary: string | null
          target_company: string | null
          target_role: string
          updated_at: string
          voice_interview_session_id: string | null
        }
        Insert: {
          coding_practice_plan?: Json
          company_readiness_score?: number
          created_at?: string
          duration_months: number
          hiring_readiness_score?: number
          hr_prep_plan?: Json
          id?: string
          interview_prep_plan?: Json
          job_description_text?: string | null
          profile_id: string
          recommended_projects?: Json
          resume_id?: string | null
          role_readiness_score?: number
          skill_gap?: Json
          start_date?: string
          status?: string
          summary?: string | null
          target_company?: string | null
          target_role: string
          updated_at?: string
          voice_interview_session_id?: string | null
        }
        Update: {
          coding_practice_plan?: Json
          company_readiness_score?: number
          created_at?: string
          duration_months?: number
          hiring_readiness_score?: number
          hr_prep_plan?: Json
          id?: string
          interview_prep_plan?: Json
          job_description_text?: string | null
          profile_id?: string
          recommended_projects?: Json
          resume_id?: string | null
          role_readiness_score?: number
          skill_gap?: Json
          start_date?: string
          status?: string
          summary?: string | null
          target_company?: string | null
          target_role?: string
          updated_at?: string
          voice_interview_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_roadmaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmaps_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_roadmaps_voice_interview_session_id_fkey"
            columns: ["voice_interview_session_id"]
            isOneToOne: false
            referencedRelation: "voice_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_categories: {
        Row: {
          id: string
          name: string
          slug: string
          tracks: string[]
        }
        Insert: {
          id?: string
          name: string
          slug: string
          tracks?: string[]
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          tracks?: string[]
        }
        Relationships: []
      }
      challenge_discussions: {
        Row: {
          author_id: string
          challenge_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          challenge_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          challenge_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_discussions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "challenge_discussions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          hint_used: boolean
          id: string
          language: string
          local_date: string | null
          passed_count: number
          profile_id: string
          runtime_ms: number | null
          source_code: string
          status: string
          stderr: string | null
          stdout: string | null
          time_taken_seconds: number | null
          total_count: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          hint_used?: boolean
          id?: string
          language: string
          local_date?: string | null
          passed_count?: number
          profile_id: string
          runtime_ms?: number | null
          source_code: string
          status?: string
          stderr?: string | null
          stdout?: string | null
          time_taken_seconds?: number | null
          total_count?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          hint_used?: boolean
          id?: string
          language?: string
          local_date?: string | null
          passed_count?: number
          profile_id?: string
          runtime_ms?: number | null
          source_code?: string
          status?: string
          stderr?: string | null
          stdout?: string | null
          time_taken_seconds?: number | null
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_test_cases: {
        Row: {
          challenge_id: string
          created_at: string
          expected_output: string
          id: string
          input: string
          is_hidden: boolean
        }
        Insert: {
          challenge_id: string
          created_at?: string
          expected_output: string
          id?: string
          input?: string
          is_hidden?: boolean
        }
        Update: {
          challenge_id?: string
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          is_hidden?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "challenge_test_cases_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "challenge_test_cases_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category_id: string | null
          company_tags: string[]
          constraints: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          editorial: string | null
          estimated_minutes: number
          hints: Json
          id: string
          input_format: string | null
          is_active: boolean
          is_premium: boolean
          last_daily_used_at: string | null
          output_format: string | null
          question_format: string
          slug: string
          starter_code: Json
          tags: string[]
          title: string
          xp_reward: number
        }
        Insert: {
          category_id?: string | null
          company_tags?: string[]
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty: string
          editorial?: string | null
          estimated_minutes?: number
          hints?: Json
          id?: string
          input_format?: string | null
          is_active?: boolean
          is_premium?: boolean
          last_daily_used_at?: string | null
          output_format?: string | null
          question_format?: string
          slug: string
          starter_code?: Json
          tags?: string[]
          title: string
          xp_reward?: number
        }
        Update: {
          category_id?: string | null
          company_tags?: string[]
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          editorial?: string | null
          estimated_minutes?: number
          hints?: Json
          id?: string
          input_format?: string | null
          is_active?: boolean
          is_premium?: boolean
          last_daily_used_at?: string | null
          output_format?: string | null
          question_format?: string
          slug?: string
          starter_code?: Json
          tags?: string[]
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "challenge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_interview_sessions: {
        Row: {
          ats_score: number | null
          better_solution: string | null
          career_roadmap_id: string | null
          code_quality_score: number | null
          completed_at: string | null
          constraints: string | null
          correctness_score: number | null
          created_at: string
          description: string
          difficulty: string
          edge_case_score: number | null
          examples: Json
          id: string
          language: string | null
          learning_resources: string[]
          mistakes: string[]
          optimization_score: number | null
          optimization_suggestions: string[]
          overall_score: number | null
          passed_count: number | null
          profile_id: string
          resume_id: string | null
          roadmap_progress_percent: number | null
          runtime_ms: number | null
          sample_test_cases: Json
          source_code: string | null
          space_complexity_score: number | null
          status: string
          stderr: string | null
          stdout: string | null
          target_company: string | null
          target_role: string
          test_cases: Json
          time_complexity_score: number | null
          title: string
          total_count: number | null
        }
        Insert: {
          ats_score?: number | null
          better_solution?: string | null
          career_roadmap_id?: string | null
          code_quality_score?: number | null
          completed_at?: string | null
          constraints?: string | null
          correctness_score?: number | null
          created_at?: string
          description: string
          difficulty: string
          edge_case_score?: number | null
          examples?: Json
          id?: string
          language?: string | null
          learning_resources?: string[]
          mistakes?: string[]
          optimization_score?: number | null
          optimization_suggestions?: string[]
          overall_score?: number | null
          passed_count?: number | null
          profile_id: string
          resume_id?: string | null
          roadmap_progress_percent?: number | null
          runtime_ms?: number | null
          sample_test_cases?: Json
          source_code?: string | null
          space_complexity_score?: number | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          target_company?: string | null
          target_role: string
          test_cases?: Json
          time_complexity_score?: number | null
          title: string
          total_count?: number | null
        }
        Update: {
          ats_score?: number | null
          better_solution?: string | null
          career_roadmap_id?: string | null
          code_quality_score?: number | null
          completed_at?: string | null
          constraints?: string | null
          correctness_score?: number | null
          created_at?: string
          description?: string
          difficulty?: string
          edge_case_score?: number | null
          examples?: Json
          id?: string
          language?: string | null
          learning_resources?: string[]
          mistakes?: string[]
          optimization_score?: number | null
          optimization_suggestions?: string[]
          overall_score?: number | null
          passed_count?: number | null
          profile_id?: string
          resume_id?: string | null
          roadmap_progress_percent?: number | null
          runtime_ms?: number | null
          sample_test_cases?: Json
          source_code?: string | null
          space_complexity_score?: number | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          target_company?: string | null
          target_role?: string
          test_cases?: Json
          time_complexity_score?: number | null
          title?: string
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coding_interview_sessions_career_roadmap_id_fkey"
            columns: ["career_roadmap_id"]
            isOneToOne: false
            referencedRelation: "career_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_interview_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_interview_sessions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          profile_id: string
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          profile_id: string
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_name: string | null
          company_size: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          location: string | null
          logo: string | null
          verified: boolean
          website: string | null
        }
        Insert: {
          company_name?: string | null
          company_size?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          logo?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          company_name?: string | null
          company_size?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          logo?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_follows: {
        Row: {
          company_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_follows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_follows_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          invited_at: string
          joined_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          profile_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          profile_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          activity_date: string
          challenges_solved: number
          id: string
          profile_id: string
          xp_earned: number
        }
        Insert: {
          activity_date?: string
          challenges_solved?: number
          id?: string
          profile_id: string
          xp_earned?: number
        }
        Update: {
          activity_date?: string
          challenges_solved?: number
          id?: string
          profile_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_assignments: {
        Row: {
          assigned_date: string
          challenge_id: string
          completed: boolean
          completed_at: string | null
          id: string
          profile_id: string
        }
        Insert: {
          assigned_date?: string
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          assigned_date?: string
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_assignments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "daily_challenge_assignments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenge_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_completions: {
        Row: {
          challenge_date: string
          challenge_id: string
          completed_at: string
          id: string
          profile_id: string
        }
        Insert: {
          challenge_date: string
          challenge_id: string
          completed_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          completed_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "daily_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenge_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          profile_id: string
          reward_claimed: boolean
          session_date: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          profile_id: string
          reward_claimed?: boolean
          session_date?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          reward_claimed?: boolean
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_skips: {
        Row: {
          challenge_date: string
          challenge_id: string
          id: string
          profile_id: string
          skipped_at: string
        }
        Insert: {
          challenge_date?: string
          challenge_id: string
          id?: string
          profile_id: string
          skipped_at?: string
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          id?: string
          profile_id?: string
          skipped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_skips_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "daily_challenge_skips_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenge_skips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          challenge_id: string
          created_at: string
          id: string
        }
        Insert: {
          challenge_date: string
          challenge_id: string
          created_at?: string
          id?: string
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "daily_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_session_questions: {
        Row: {
          challenge_id: string
          id: string
          session_topic_id: string
          solved: boolean
          solved_at: string | null
          started_at: string | null
        }
        Insert: {
          challenge_id: string
          id?: string
          session_topic_id: string
          solved?: boolean
          solved_at?: string | null
          started_at?: string | null
        }
        Update: {
          challenge_id?: string
          id?: string
          session_topic_id?: string
          solved?: boolean
          solved_at?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_session_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "daily_session_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_session_questions_session_topic_id_fkey"
            columns: ["session_topic_id"]
            isOneToOne: false
            referencedRelation: "daily_session_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_session_topics: {
        Row: {
          category_id: string
          completed: boolean
          completed_at: string | null
          id: string
          required_solved: number
          session_id: string
          solved_count: number
        }
        Insert: {
          category_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          required_solved?: number
          session_id: string
          solved_count?: number
        }
        Update: {
          category_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          required_solved?: number
          session_id?: string
          solved_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_session_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "challenge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_session_topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_challenge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string | null
          description: string | null
          end_year: number | null
          field: string | null
          id: string
          institution: string
          profile_id: string
          start_year: number | null
        }
        Insert: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_year?: number | null
          field?: string | null
          id?: string
          institution: string
          profile_id: string
          start_year?: number | null
        }
        Update: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_year?: number | null
          field?: string | null
          id?: string
          institution?: string
          profile_id?: string
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "education_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_reports: {
        Row: {
          ats_score: number
          career_roadmap_id: string | null
          company_eligibility_score: number
          created_at: string
          estimated_interview_readiness: number
          id: string
          job_description_text: string | null
          missing_certifications: string[]
          missing_projects: string[]
          missing_skills: string[]
          profile_id: string
          recommendations: Json
          resume_id: string | null
          roadmap_progress_percent: number | null
          role_match_score: number
          score_rationale: Json
          skill_match_percent: number | null
          target_company: string | null
          target_role: string
          voice_interview_session_id: string | null
        }
        Insert: {
          ats_score?: number
          career_roadmap_id?: string | null
          company_eligibility_score?: number
          created_at?: string
          estimated_interview_readiness?: number
          id?: string
          job_description_text?: string | null
          missing_certifications?: string[]
          missing_projects?: string[]
          missing_skills?: string[]
          profile_id: string
          recommendations?: Json
          resume_id?: string | null
          roadmap_progress_percent?: number | null
          role_match_score?: number
          score_rationale?: Json
          skill_match_percent?: number | null
          target_company?: string | null
          target_role: string
          voice_interview_session_id?: string | null
        }
        Update: {
          ats_score?: number
          career_roadmap_id?: string | null
          company_eligibility_score?: number
          created_at?: string
          estimated_interview_readiness?: number
          id?: string
          job_description_text?: string | null
          missing_certifications?: string[]
          missing_projects?: string[]
          missing_skills?: string[]
          profile_id?: string
          recommendations?: Json
          resume_id?: string | null
          roadmap_progress_percent?: number | null
          role_match_score?: number
          score_rationale?: Json
          skill_match_percent?: number | null
          target_company?: string | null
          target_role?: string
          voice_interview_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_reports_career_roadmap_id_fkey"
            columns: ["career_roadmap_id"]
            isOneToOne: false
            referencedRelation: "career_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_reports_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_reports_voice_interview_session_id_fkey"
            columns: ["voice_interview_session_id"]
            isOneToOne: false
            referencedRelation: "voice_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          profile_id: string
          start_date: string | null
          title: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          profile_id: string
          start_date?: string | null
          title: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          profile_id?: string
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_schedules: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          id: string
          interviewer_name: string | null
          meeting_link: string | null
          mode: string
          notes: string | null
          responded_at: string | null
          scheduled_at: string
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          interviewer_name?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          responded_at?: string | null
          scheduled_at: string
          status?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interviewer_name?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          responded_at?: string | null
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          ats_score: number | null
          cover_note: string | null
          id: string
          job_id: string
          job_match_percentage: number | null
          skills_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          ats_score?: number | null
          cover_note?: string | null
          id?: string
          job_id: string
          job_match_percentage?: number | null
          skills_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          ats_score?: number | null
          cover_note?: string | null
          id?: string
          job_id?: string
          job_match_percentage?: number | null
          skills_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          job_id: string
          profile_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          job_id: string
          profile_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          job_id?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_saves: {
        Row: {
          created_at: string
          id: string
          job_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_saves_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_saves_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          benefits: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          department: string | null
          description: string | null
          employment_type: string | null
          experience_level: string | null
          feed_post_id: string | null
          id: string
          location: string | null
          openings_count: number
          posted_at: string
          published_at: string | null
          requirements: string | null
          responsibilities: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          tags: string[]
          title: string | null
          work_mode: string | null
        }
        Insert: {
          application_deadline?: string | null
          benefits?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          feed_post_id?: string | null
          id?: string
          location?: string | null
          openings_count?: number
          posted_at?: string
          published_at?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          tags?: string[]
          title?: string | null
          work_mode?: string | null
        }
        Update: {
          application_deadline?: string | null
          benefits?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          feed_post_id?: string | null
          id?: string
          location?: string | null
          openings_count?: number
          posted_at?: string
          published_at?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          tags?: string[]
          title?: string | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_interviews: {
        Row: {
          completed_at: string | null
          created_at: string
          feedback: Json | null
          id: string
          mode: string
          profile_id: string
          role: string
          score: number | null
          status: string
          transcript: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          mode?: string
          profile_id: string
          role: string
          score?: number | null
          status?: string
          transcript?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          mode?: string
          profile_id?: string
          role?: string
          score?: number | null
          status?: string
          transcript?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mock_interviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          id: string
          image_urls: string[]
          kind: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          kind?: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          kind?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_subscriptions: {
        Row: {
          current_period_end: string | null
          external_reference: string | null
          id: string
          payment_provider: string | null
          plan: string
          profile_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          current_period_end?: string | null
          external_reference?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          profile_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          current_period_end?: string | null
          external_reference?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          profile_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_daily_solves: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          local_date: string
          profile_id: string
          submission_id: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          local_date: string
          profile_id: string
          submission_id?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          local_date?: string
          profile_id?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_daily_solves_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_stats"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "profile_daily_solves_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_daily_solves_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_daily_solves_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          branch: string | null
          coins: number
          college: string | null
          created_at: string | null
          daily_challenges_total_solved: number
          daily_solved_today: number
          daily_streak_current: number
          daily_streak_highest: number
          daily_streak_last_date: string | null
          degree: string | null
          email: string | null
          founder_company_description: string | null
          founder_company_linkedin: string | null
          founder_company_name: string | null
          founder_company_website: string | null
          founder_industry: string | null
          founder_startup_stage: string | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          is_banned: boolean
          is_online: boolean
          last_activity_date: string | null
          last_seen_at: string | null
          linkedin_url: string | null
          live_resume_pdf_url: string | null
          live_resume_updated_at: string | null
          location: string | null
          longest_streak: number
          mobile: string | null
          onboarding_completed: boolean
          persona: string | null
          portfolio_url: string | null
          role: string
          streak: number
          target_role: string | null
          updated_at: string
          username: string | null
          xp: number
          year_of_study: number | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          coins?: number
          college?: string | null
          created_at?: string | null
          daily_challenges_total_solved?: number
          daily_solved_today?: number
          daily_streak_current?: number
          daily_streak_highest?: number
          daily_streak_last_date?: string | null
          degree?: string | null
          email?: string | null
          founder_company_description?: string | null
          founder_company_linkedin?: string | null
          founder_company_name?: string | null
          founder_company_website?: string | null
          founder_industry?: string | null
          founder_startup_stage?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id: string
          is_banned?: boolean
          is_online?: boolean
          last_activity_date?: string | null
          last_seen_at?: string | null
          linkedin_url?: string | null
          live_resume_pdf_url?: string | null
          live_resume_updated_at?: string | null
          location?: string | null
          longest_streak?: number
          mobile?: string | null
          onboarding_completed?: boolean
          persona?: string | null
          portfolio_url?: string | null
          role?: string
          streak?: number
          target_role?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
          year_of_study?: number | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          coins?: number
          college?: string | null
          created_at?: string | null
          daily_challenges_total_solved?: number
          daily_solved_today?: number
          daily_streak_current?: number
          daily_streak_highest?: number
          daily_streak_last_date?: string | null
          degree?: string | null
          email?: string | null
          founder_company_description?: string | null
          founder_company_linkedin?: string | null
          founder_company_name?: string | null
          founder_company_website?: string | null
          founder_industry?: string | null
          founder_startup_stage?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          is_banned?: boolean
          is_online?: boolean
          last_activity_date?: string | null
          last_seen_at?: string | null
          linkedin_url?: string | null
          live_resume_pdf_url?: string | null
          live_resume_updated_at?: string | null
          location?: string | null
          longest_streak?: number
          mobile?: string | null
          onboarding_completed?: boolean
          persona?: string | null
          portfolio_url?: string | null
          role?: string
          streak?: number
          target_role?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
          year_of_study?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          profile_id: string
          project_url: string | null
          repo_url: string | null
          tags: string[]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          profile_id: string
          project_url?: string | null
          repo_url?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          profile_id?: string
          project_url?: string | null
          repo_url?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          ats_score: number | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_current: boolean
          jd_match: Json | null
          jd_match_updated_at: string | null
          mime_type: string | null
          profile_id: string | null
          resume_url: string | null
          storage_path: string | null
          updated_at: string
          version: number
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          ats_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          jd_match?: Json | null
          jd_match_updated_at?: string | null
          mime_type?: string | null
          profile_id?: string | null
          resume_url?: string | null
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          ats_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          jd_match?: Json | null
          jd_match_updated_at?: string | null
          mime_type?: string | null
          profile_id?: string | null
          resume_url?: string | null
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resumes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_steps: {
        Row: {
          description: string | null
          estimated_hours: number
          id: string
          order_index: number
          resource_url: string | null
          roadmap_id: string
          title: string
        }
        Insert: {
          description?: string | null
          estimated_hours?: number
          id?: string
          order_index?: number
          resource_url?: string | null
          roadmap_id: string
          title: string
        }
        Update: {
          description?: string | null
          estimated_hours?: number
          id?: string
          order_index?: number
          resource_url?: string | null
          roadmap_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_steps_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmap_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_premium: boolean
          role: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean
          role: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean
          role?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          level: string | null
          profile_id: string | null
          skill_name: string | null
          source: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          profile_id?: string | null
          skill_name?: string | null
          source?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          profile_id?: string | null
          skill_name?: string | null
          source?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          profile_id: string
          seen: boolean
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          profile_id: string
          seen?: boolean
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          profile_id?: string
          seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roadmap_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          step_id: string
          user_roadmap_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step_id: string
          user_roadmap_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step_id?: string
          user_roadmap_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roadmap_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "roadmap_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roadmap_progress_user_roadmap_id_fkey"
            columns: ["user_roadmap_id"]
            isOneToOne: false
            referencedRelation: "user_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roadmaps: {
        Row: {
          id: string
          profile_id: string
          roadmap_id: string
          started_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          roadmap_id: string
          started_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          roadmap_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roadmaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roadmaps_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmap_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_interview_sessions: {
        Row: {
          communication_score: number | null
          company: string | null
          completed_at: string | null
          confidence_score: number | null
          context_block: string | null
          created_at: string
          difficulty: string
          duration_minutes: number
          grammar_score: number | null
          hiring_recommendation: string | null
          id: string
          improvement_plan: string[] | null
          interview_type: string
          language: string
          leadership_score: number | null
          matched_skills: string[] | null
          missing_skills: string[] | null
          overall_score: number | null
          problem_solving_score: number | null
          professionalism_score: number | null
          profile_id: string
          questions: Json
          role: string
          started_at: string
          status: string
          strengths: string[] | null
          summary: string | null
          technical_score: number | null
          voice_gender: string
          weaknesses: string[] | null
        }
        Insert: {
          communication_score?: number | null
          company?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          context_block?: string | null
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          grammar_score?: number | null
          hiring_recommendation?: string | null
          id?: string
          improvement_plan?: string[] | null
          interview_type: string
          language?: string
          leadership_score?: number | null
          matched_skills?: string[] | null
          missing_skills?: string[] | null
          overall_score?: number | null
          problem_solving_score?: number | null
          professionalism_score?: number | null
          profile_id: string
          questions?: Json
          role: string
          started_at?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          technical_score?: number | null
          voice_gender?: string
          weaknesses?: string[] | null
        }
        Update: {
          communication_score?: number | null
          company?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          context_block?: string | null
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          grammar_score?: number | null
          hiring_recommendation?: string | null
          id?: string
          improvement_plan?: string[] | null
          interview_type?: string
          language?: string
          leadership_score?: number | null
          matched_skills?: string[] | null
          missing_skills?: string[] | null
          overall_score?: number | null
          problem_solving_score?: number | null
          professionalism_score?: number | null
          profile_id?: string
          questions?: Json
          role?: string
          started_at?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          technical_score?: number | null
          voice_gender?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_interview_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          profile_id: string
          reason: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          profile_id: string
          reason: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      challenge_stats: {
        Row: {
          acceptance_rate: number | null
          challenge_id: string | null
          total_attempts: number | null
          total_passed: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_coins: {
        Args: { p_amount: number; p_profile_id: string; p_reason: string }
        Returns: undefined
      }
      award_xp: {
        Args: {
          p_amount: number
          p_profile_id: string
          p_reason: string
          p_source_id?: string
          p_source_type?: string
        }
        Returns: undefined
      }
      company_has_any_members: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      compute_weekly_monthly_streak: {
        Args: { p_profile_id: string }
        Returns: {
          monthly_streak: number
          weekly_streak: number
        }[]
      }
      create_notification: {
        Args: {
          p_actor_id: string
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_recipient_id: string
          p_type: string
        }
        Returns: undefined
      }
      current_role: { Args: never; Returns: string }
      get_my_daily_progress: {
        Args: { p_local_date?: string }
        Returns: {
          current_streak: number
          highest_streak: number
          solved_today: number
          total_solved: number
        }[]
      }
      get_or_assign_daily_challenge: {
        Args: { p_date?: string }
        Returns: string
      }
      grant_badge: {
        Args: { p_code: string; p_profile_id: string }
        Returns: undefined
      }
      has_company_role: {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_premium: { Args: { p_profile_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
