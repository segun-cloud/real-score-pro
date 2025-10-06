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
      competition_participants: {
        Row: {
          competition_id: string
          final_position: number | null
          id: string
          points_earned: number | null
          team_id: string
        }
        Insert: {
          competition_id: string
          final_position?: number | null
          id?: string
          points_earned?: number | null
          team_id: string
        }
        Update: {
          competition_id?: string
          final_position?: number | null
          id?: string
          points_earned?: number | null
          team_id?: string
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
          id: string
          name: string
          prize_coins: number
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status: Database["public"]["Enums"]["competition_status"] | null
        }
        Insert: {
          created_at?: string
          division?: number | null
          end_date: string
          entry_fee: number
          id?: string
          name: string
          prize_coins: number
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string
          status?: Database["public"]["Enums"]["competition_status"] | null
        }
        Update: {
          created_at?: string
          division?: number | null
          end_date?: string
          entry_fee?: number
          id?: string
          name?: string
          prize_coins?: number
          sport?: Database["public"]["Enums"]["sport_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["competition_status"] | null
        }
        Relationships: []
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
      user_profiles: {
        Row: {
          coins: number
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          coins?: number
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
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
      [_ in never]: never
    }
    Enums: {
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
