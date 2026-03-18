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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_match_cache: {
        Row: {
          api_match_id: string
          away_score: number | null
          away_team: string
          created_at: string | null
          highlight_urls: Json | null
          home_score: number | null
          home_team: string
          id: string
          last_updated: string | null
          league_name: string
          match_date: string
          minute: number | null
          raw_data: Json
          sport: Database["public"]["Enums"]["sport_type"]
          status: string
          video_url: string | null
        }
        Insert: {
          api_match_id: string
          away_score?: number | null
          away_team: string
          created_at?: string | null
          highlight_urls?: Json | null
          home_score?: number | null
          home_team: string
          id?: string
          last_updated?: string | null
          league_name: string
          match_date: string
          minute?: number | null
          raw_data: Json
          sport: Database["public"]["Enums"]["sport_type"]
          status: string
          video_url?: string | null
        }
        Update: {
          api_match_id?: string
          away_score?: number | null
          away_team?: string
          created_at?: string | null
          highlight_urls?: Json | null
          home_score?: number | null
          home_team?: string
          id?: string
          last_updated?: string | null
          league_name?: string
          match_date?: string
          minute?: number | null
          raw_data?: Json
          sport?: Database["public"]["Enums"]["sport_type"]
          status?: string
          video_url?: string | null
        }
        Relationships: []
      }
      api_request_log: {
        Row: {
          cached: boolean | null
          created_at: string | null
          endpoint: string
          id: string
          request_params: Json | null
          response_status: number | null
          sport: Database["public"]["Enums"]["sport_type"] | null
        }
        Insert: {
          cached?: boolean | null
          created_at?: string | null
          endpoint: string
          id?: string
          request_params?: Json | null
          response_status?: number | null
          sport?: Database["public"]["Enums"]["sport_type"] | null
        }
        Update: {
          cached?: boolean | null
          created_at?: string | null
          endpoint?: string
          id?: string
          request_params?: Json | null
          response_status?: number | null
          sport?: Database["public"]["Enums"]["sport_type"] | null
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          competition_id: string
          draws: number | null
          final_position: number | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          matches_played: number | null
          points_earned: number | null
          team_id: string
          wins: number | null
        }
        Insert: {
          competition_id: string
          draws?: number | null
          final_position?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          points_earned?: number | null
          team_id: string
          wins?: number | null
        }
        Update: {
          competition_id?: string
          draws?: number | null
          final_position?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches_played?: number | null
          points_earned?: number | null
          team_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          division: number | null
          end_date: string
          entry_fee: number
          format: string | null
          id: string
          match_generation_status: string | null
          max_participants: number | null
          min_participants: number | null
          name: string
          prize_coins: number
          registration_deadline: string | null
          season_id: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status: Database["public"]["Enums"]["competition_status"] | null
        }
        Insert: {
          created_at?: string
          division?: number | null
          end_date: string
          entry_fee: number
          format?: string | null
          id?: string
          match_generation_status?: string | null
          max_participants?: number | null
          min_participants?: number | null
          name: string
          prize_coins: number
          registration_deadline?: string | null
          season_id?: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status?: Database["public"]["Enums"]["competition_status"] | null
        }
        Update: {
          created_at?: string
          division?: number | null
          end_date?: string
          entry_fee?: number
          format?: string | null
          id?: string
          match_generation_status?: string | null
          max_participants?: number | null
          min_participants?: number | null
          name?: string
          prize_coins?: number
          registration_deadline?: string | null
          season_id?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["competition_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_emblems: {
        Row: {
          bg_color: string
          created_at: string
          icon: string
          icon_color: string
          id: string
          name: string
          shape: string
          user_id: string
        }
        Insert: {
          bg_color: string
          created_at?: string
          icon: string
          icon_color: string
          id?: string
          name: string
          shape: string
          user_id: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          icon?: string
          icon_color?: string
          id?: string
          name?: string
          shape?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_kits: {
        Row: {
          created_at: string
          id: string
          name: string
          pattern: string
          primary_color: string
          secondary_color: string
          sport: Database["public"]["Enums"]["sport_type"]
          tertiary_color: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pattern: string
          primary_color: string
          secondary_color: string
          sport: Database["public"]["Enums"]["sport_type"]
          tertiary_color?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pattern?: string
          primary_color?: string
          secondary_color?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          tertiary_color?: string | null
          user_id?: string
        }
        Relationships: []
      }
      division_movements: {
        Row: {
          created_at: string | null
          final_position: number
          from_division: number
          id: string
          movement_type: string
          season_id: string
          team_id: string
          to_division: number
        }
        Insert: {
          created_at?: string | null
          final_position: number
          from_division: number
          id?: string
          movement_type: string
          season_id: string
          team_id: string
          to_division: number
        }
        Update: {
          created_at?: string | null
          final_position?: number
          from_division?: number
          id?: string
          movement_type?: string
          season_id?: string
          team_id?: string
          to_division?: number
        }
        Relationships: [
          {
            foreignKeyName: "division_movements_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_movements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          api_league_id: string | null
          api_provider: string | null
          country: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sport: Database["public"]["Enums"]["sport_type"]
          tier: number
        }
        Insert: {
          api_league_id?: string | null
          api_provider?: string | null
          country: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sport: Database["public"]["Enums"]["sport_type"]
          tier: number
        }
        Update: {
          api_league_id?: string | null
          api_provider?: string | null
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          tier?: number
        }
        Relationships: []
      }
      live_match_state: {
        Row: {
          attacking_team: string | null
          away_attacks: number | null
          away_dangerous_attacks: number | null
          away_possession: number | null
          ball_x: number
          ball_y: number
          created_at: string
          home_attacks: number | null
          home_dangerous_attacks: number | null
          home_possession: number | null
          id: string
          match_id: string
          phase: string
          updated_at: string
        }
        Insert: {
          attacking_team?: string | null
          away_attacks?: number | null
          away_dangerous_attacks?: number | null
          away_possession?: number | null
          ball_x?: number
          ball_y?: number
          created_at?: string
          home_attacks?: number | null
          home_dangerous_attacks?: number | null
          home_possession?: number | null
          id?: string
          match_id: string
          phase?: string
          updated_at?: string
        }
        Update: {
          attacking_team?: string | null
          away_attacks?: number | null
          away_dangerous_attacks?: number | null
          away_possession?: number | null
          ball_x?: number
          ball_y?: number
          created_at?: string
          home_attacks?: number | null
          home_dangerous_attacks?: number | null
          home_possession?: number | null
          id?: string
          match_id?: string
          phase?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_scores: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_logo: string | null
          created_at: string
          home_score: number | null
          home_team: string
          home_team_logo: string | null
          id: string
          last_updated: string
          league_name: string
          match_date: string | null
          match_id: string
          minute: number | null
          sport: string
          status: string
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_logo?: string | null
          created_at?: string
          home_score?: number | null
          home_team: string
          home_team_logo?: string | null
          id?: string
          last_updated?: string
          league_name: string
          match_date?: string | null
          match_id: string
          minute?: number | null
          sport?: string
          status?: string
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_logo?: string | null
          created_at?: string
          home_score?: number | null
          home_team?: string
          home_team_logo?: string | null
          id?: string
          last_updated?: string
          league_name?: string
          match_date?: string | null
          match_id?: string
          minute?: number | null
          sport?: string
          status?: string
        }
        Relationships: []
      }
      match_score_cache: {
        Row: {
          away_score: number
          away_team: string
          events_hash: string | null
          home_score: number
          home_team: string
          id: string
          last_checked: string
          match_id: string
          status: string | null
        }
        Insert: {
          away_score?: number
          away_team: string
          events_hash?: string | null
          home_score?: number
          home_team: string
          id?: string
          last_checked?: string
          match_id: string
          status?: string | null
        }
        Update: {
          away_score?: number
          away_team?: string
          events_hash?: string | null
          home_score?: number
          home_team?: string
          id?: string
          last_checked?: string
          match_id?: string
          status?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string
          competition_id: string
          created_at: string
          home_score: number | null
          home_team_id: string
          id: string
          match_date: string
          match_day: number | null
          status: Database["public"]["Enums"]["match_status"] | null
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          competition_id: string
          created_at?: string
          home_score?: number | null
          home_team_id: string
          id?: string
          match_date: string
          match_day?: number | null
          status?: Database["public"]["Enums"]["match_status"] | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          competition_id?: string
          created_at?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          match_date?: string
          match_day?: number | null
          status?: Database["public"]["Enums"]["match_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          cards: boolean
          created_at: string
          goals: boolean
          id: string
          match_end: boolean
          match_kickoff: boolean
          match_reminders: boolean
          news_updates: boolean
          penalties: boolean
          user_id: string
        }
        Insert: {
          cards?: boolean
          created_at?: string
          goals?: boolean
          id?: string
          match_end?: boolean
          match_kickoff?: boolean
          match_reminders?: boolean
          news_updates?: boolean
          penalties?: boolean
          user_id: string
        }
        Update: {
          cards?: boolean
          created_at?: string
          goals?: boolean
          id?: string
          match_end?: boolean
          match_kickoff?: boolean
          match_reminders?: boolean
          news_updates?: boolean
          penalties?: boolean
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_sent_cache: {
        Row: {
          id: string
          match_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          match_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          match_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          season_number: number
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          season_number: number
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          season_number?: number
          sport?: Database["public"]["Enums"]["sport_type"]
          start_date?: string
          status?: string | null
        }
        Relationships: []
      }
      sports_feeds: {
        Row: {
          created_at: string | null
          description: string | null
          external_url: string | null
          feed_type: string
          id: string
          image_url: string | null
          match_id: string | null
          published_at: string
          source: string | null
          sport: string
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          feed_type: string
          id?: string
          image_url?: string | null
          match_id?: string | null
          published_at: string
          source?: string | null
          sport: string
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          feed_type?: string
          id?: string
          image_url?: string | null
          match_id?: string | null
          published_at?: string
          source?: string | null
          sport?: string
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      team_emblems: {
        Row: {
          id: number
          name: string
          svg_path: string
          unlock_cost: number
        }
        Insert: {
          id?: number
          name: string
          svg_path: string
          unlock_cost?: number
        }
        Update: {
          id?: number
          name?: string
          svg_path?: string
          unlock_cost?: number
        }
        Relationships: []
      }
      team_kits: {
        Row: {
          id: number
          name: string
          pattern: string | null
          primary_color: string
          secondary_color: string
          sport: Database["public"]["Enums"]["sport_type"]
          unlock_cost: number
        }
        Insert: {
          id?: number
          name: string
          pattern?: string | null
          primary_color: string
          secondary_color: string
          sport: Database["public"]["Enums"]["sport_type"]
          unlock_cost?: number
        }
        Update: {
          id?: number
          name?: string
          pattern?: string | null
          primary_color?: string
          secondary_color?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          unlock_cost?: number
        }
        Relationships: []
      }
      team_players: {
        Row: {
          created_at: string
          defending: number | null
          id: string
          jersey_number: number
          overall_rating: number | null
          pace: number | null
          passing: number | null
          physical: number | null
          player_name: string
          position: string
          shooting: number | null
          team_id: string
          training_level: number | null
        }
        Insert: {
          created_at?: string
          defending?: number | null
          id?: string
          jersey_number: number
          overall_rating?: number | null
          pace?: number | null
          passing?: number | null
          physical?: number | null
          player_name: string
          position: string
          shooting?: number | null
          team_id: string
          training_level?: number | null
        }
        Update: {
          created_at?: string
          defending?: number | null
          id?: string
          jersey_number?: number
          overall_rating?: number | null
          pace?: number | null
          passing?: number | null
          physical?: number | null
          player_name?: string
          position?: string
          shooting?: number | null
          team_id?: string
          training_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favourites: {
        Row: {
          created_at: string
          entity_data: Json
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_data: Json
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          coins: number
          created_at: string
          favourite_players: Json | null
          favourite_sports: string[] | null
          favourite_teams: Json | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string
          username: string
        }
        Insert: {
          coins?: number
          created_at?: string
          favourite_players?: Json | null
          favourite_sports?: string[] | null
          favourite_teams?: Json | null
          id: string
          onboarding_completed?: boolean | null
          updated_at?: string
          username: string
        }
        Update: {
          coins?: number
          created_at?: string
          favourite_players?: Json | null
          favourite_sports?: string[] | null
          favourite_teams?: Json | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_teams: {
        Row: {
          created_at: string
          custom_emblem_id: string | null
          custom_kit_id: string | null
          division: number | null
          draws: number | null
          emblem_id: number | null
          id: string
          kit_id: number | null
          losses: number | null
          points: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          team_name: string
          user_id: string
          wins: number | null
        }
        Insert: {
          created_at?: string
          custom_emblem_id?: string | null
          custom_kit_id?: string | null
          division?: number | null
          draws?: number | null
          emblem_id?: number | null
          id?: string
          kit_id?: number | null
          losses?: number | null
          points?: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          team_name: string
          user_id: string
          wins?: number | null
        }
        Update: {
          created_at?: string
          custom_emblem_id?: string | null
          custom_kit_id?: string | null
          division?: number | null
          draws?: number | null
          emblem_id?: number | null
          id?: string
          kit_id?: number | null
          losses?: number | null
          points?: number | null
          sport?: Database["public"]["Enums"]["sport_type"]
          team_name?: string
          user_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_custom_emblem_id_fkey"
            columns: ["custom_emblem_id"]
            isOneToOne: false
            referencedRelation: "custom_emblems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_custom_kit_id_fkey"
            columns: ["custom_kit_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_opponent_team: {
        Args: { _team_id: string; _viewer: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      competition_status: "upcoming" | "active" | "completed"
      match_status: "scheduled" | "completed"
      sport_type:
        | "football"
        | "basketball"
        | "tennis"
        | "baseball"
        | "boxing"
        | "cricket"
        | "ice-hockey"
        | "rugby"
        | "american-football"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      competition_status: ["upcoming", "active", "completed"],
      match_status: ["scheduled", "completed"],
      sport_type: [
        "football",
        "basketball",
        "tennis",
        "baseball",
        "boxing",
        "cricket",
        "ice-hockey",
        "rugby",
        "american-football",
      ],
    },
  },
} as const
