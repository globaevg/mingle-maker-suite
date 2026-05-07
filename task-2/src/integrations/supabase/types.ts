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
      event_feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      event_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["photo_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["photo_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["photo_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number
          cover_url: string | null
          created_at: string
          description: string
          ends_at: string
          host_id: string
          id: string
          is_hidden: boolean
          location: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at: string
          host_id: string
          id?: string
          is_hidden?: boolean
          location?: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string
          host_id?: string
          id?: string
          is_hidden?: boolean
          location?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      host_invites: {
        Row: {
          created_at: string
          expires_at: string
          host_owner_id: string
          id: string
          role: Database["public"]["Enums"]["host_member_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          host_owner_id: string
          id?: string
          role: Database["public"]["Enums"]["host_member_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          host_owner_id?: string
          id?: string
          role?: Database["public"]["Enums"]["host_member_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      host_members: {
        Row: {
          created_at: string
          host_owner_id: string
          id: string
          member_user_id: string
          role: Database["public"]["Enums"]["host_member_role"]
        }
        Insert: {
          created_at?: string
          host_owner_id: string
          id?: string
          member_user_id: string
          role: Database["public"]["Enums"]["host_member_role"]
        }
        Update: {
          created_at?: string
          host_owner_id?: string
          id?: string
          member_user_id?: string
          role?: Database["public"]["Enums"]["host_member_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reason?: string
          reporter_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_host_invite: {
        Args: { _token: string }
        Returns: {
          host_owner_id: string
          role: Database["public"]["Enums"]["host_member_role"]
        }[]
      }
      can_checkin_event: {
        Args: { _event_id: string; _user: string }
        Returns: boolean
      }
      can_manage_event: {
        Args: { _event_id: string; _user: string }
        Returns: boolean
      }
      get_invite: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          host_name: string
          host_owner_id: string
          role: Database["public"]["Enums"]["host_member_role"]
          used_at: string
        }[]
      }
      has_confirmed_rsvp: {
        Args: { _event: string; _user: string }
        Returns: boolean
      }
      is_event_host: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      promote_waitlist: { Args: { _event_id: string }; Returns: undefined }
    }
    Enums: {
      host_member_role: "host" | "checker"
      photo_status: "pending" | "approved" | "rejected"
      report_status: "pending" | "reviewed" | "dismissed"
      report_target: "event" | "photo"
      rsvp_status: "confirmed" | "waitlist" | "cancelled"
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
      host_member_role: ["host", "checker"],
      photo_status: ["pending", "approved", "rejected"],
      report_status: ["pending", "reviewed", "dismissed"],
      report_target: ["event", "photo"],
      rsvp_status: ["confirmed", "waitlist", "cancelled"],
    },
  },
} as const
