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
  public: {
    Tables: {
      active_timers: {
        Row: {
          baby_id: string | null
          created_at: string
          data: Json
          family_id: string
          kind: string
          started_at: string
          started_by: string | null
          updated_at: string
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          data?: Json
          family_id: string
          kind: string
          started_at?: string
          started_by?: string | null
          updated_at?: string
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          data?: Json
          family_id?: string
          kind?: string
          started_at?: string
          started_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_timers_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_timers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          updated_at?: string
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      babies: {
        Row: {
          data: Json
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          family_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "babies_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          at: string
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          at: string
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          type: string
          updated_at?: string
        }
        Update: {
          at?: string
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
        }
        Relationships: []
      }
      family_settings: {
        Row: {
          data: Json
          family_id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          family_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          family_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_settings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      lifetime_records: {
        Row: {
          archived_at: string | null
          baby_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          details: Json
          event_at: string
          event_type: string
          family_id: string
          has_time: boolean
          id: string
          media_paths: string[]
          notes: string | null
          source: string
          source_device: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          baby_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json
          event_at: string
          event_type: string
          family_id: string
          has_time?: boolean
          id?: string
          media_paths?: string[]
          notes?: string | null
          source?: string
          source_device?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          baby_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json
          event_at?: string
          event_type?: string
          family_id?: string
          has_time?: boolean
          id?: string
          media_paths?: string[]
          notes?: string | null
          source?: string
          source_device?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifetime_records_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifetime_records_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_documents: {
        Row: {
          archived_at: string | null
          baby_id: string
          category: string
          created_at: string
          created_by: string | null
          document_at: string
          family_id: string
          id: string
          mime_type: string
          note: string | null
          object_path: string
          original_name: string
          size_bytes: number
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          baby_id: string
          category: string
          created_at?: string
          created_by?: string | null
          document_at: string
          family_id: string
          id?: string
          mime_type: string
          note?: string | null
          object_path: string
          original_name: string
          size_bytes: number
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          baby_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          document_at?: string
          family_id?: string
          id?: string
          mime_type?: string
          note?: string | null
          object_path?: string
          original_name?: string
          size_bytes?: number
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          updated_at?: string
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicines_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          updated_at?: string
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      name_ideas: {
        Row: {
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          name_key: string
          updated_at: string
          votes: Json
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          name_key: string
          updated_at?: string
          votes?: Json
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          name_key?: string
          updated_at?: string
          votes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "name_ideas_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "name_ideas_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          emoji: string
          family_id: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          emoji?: string
          family_id?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          emoji?: string
          family_id?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccines: {
        Row: {
          baby_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id: string
          id: string
          updated_at?: string
        }
        Update: {
          baby_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccines_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccines_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_family_by_code: { Args: { _code: string }; Returns: string }
      my_family_id: { Args: never; Returns: string }
      set_name_vote: {
        Args: { _id: string; _vote: string }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
