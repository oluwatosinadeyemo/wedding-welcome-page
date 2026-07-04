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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agbada_orders: {
        Row: {
          amount: number | null
          created_at: string
          delivered: boolean
          delivery_address: string | null
          full_name: string
          id: string
          measurements: string | null
          notes: string | null
          paid: boolean
          phone: string | null
          tailor: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          delivered?: boolean
          delivery_address?: string | null
          full_name: string
          id?: string
          measurements?: string | null
          notes?: string | null
          paid?: boolean
          phone?: string | null
          tailor?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          delivered?: boolean
          delivery_address?: string | null
          full_name?: string
          id?: string
          measurements?: string | null
          notes?: string | null
          paid?: boolean
          phone?: string | null
          tailor?: string
          updated_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          invite_code: string
          party_size: number
          pass_generated_at: string | null
          pass_id: string | null
          phone: string | null
          side: string | null
          table_assignment: string | null
          updated_at: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invite_code: string
          party_size?: number
          pass_generated_at?: string | null
          pass_id?: string | null
          phone?: string | null
          side?: string | null
          table_assignment?: string | null
          updated_at?: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invite_code?: string
          party_size?: number
          pass_generated_at?: string | null
          pass_id?: string | null
          phone?: string | null
          side?: string | null
          table_assignment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          attending: string
          guest_id: string
          id: string
          message: string | null
          number_of_guests: number
          submitted_at: string
          updated_at: string
        }
        Insert: {
          attending: string
          guest_id: string
          id?: string
          message?: string | null
          number_of_guests?: number
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          attending?: string
          guest_id?: string
          id?: string
          message?: string | null
          number_of_guests?: number
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_log: {
        Row: {
          id: string
          label: string | null
          pass_id: string | null
          raw_value: string
          scanned_at: string
        }
        Insert: {
          id?: string
          label?: string | null
          pass_id?: string | null
          raw_value: string
          scanned_at?: string
        }
        Update: {
          id?: string
          label?: string | null
          pass_id?: string | null
          raw_value?: string
          scanned_at?: string
        }
        Relationships: []
      }
      wedding_photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          file_name: string
          file_path: string
          id: string
          status: string
          uploaded_by: string | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          file_name: string
          file_path: string
          id?: string
          status?: string
          uploaded_by?: string | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          status?: string
          uploaded_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkin_by_guest_id: { Args: { p_guest_id: string }; Returns: Json }
      checkin_by_pass_id: { Args: { p_pass_id: string }; Returns: Json }
      delete_photo_with_pin: {
        Args: { p_photo_id: string; p_pin: string }
        Returns: string
      }
      generate_guest_pass: {
        Args: { p_guest_id: string; p_invite_code: string }
        Returns: string
      }
      generate_pass_by_guest_id: {
        Args: { p_guest_id: string }
        Returns: string
      }
      get_guest_pass_id: { Args: { p_guest_id: string }; Returns: string }
      insert_scan_log: {
        Args: { p_label?: string; p_pass_id?: string; p_raw_value: string }
        Returns: Json
      }
      lookup_guest_by_invite_code: {
        Args: { code: string }
        Returns: {
          full_name: string
          has_pass: boolean
          has_rsvp: boolean
          id: string
          party_size: number
          rsvp_attending: string
        }[]
      }
      lookup_guest_by_name: {
        Args: { guest_name: string }
        Returns: {
          full_name: string
          has_pass: boolean
          has_rsvp: boolean
          id: string
          party_size: number
          rsvp_attending: string
        }[]
      }
      search_guests_for_checkin: {
        Args: { p_query: string }
        Returns: {
          checked_in: boolean
          checked_in_at: string
          full_name: string
          id: string
          invite_code: string
          party_size: number
        }[]
      }
      submit_guest_photo: {
        Args: {
          p_caption?: string
          p_file_name: string
          p_file_path: string
          p_full_name: string
        }
        Returns: string
      }
      submit_walkin_rsvp: {
        Args: {
          p_attending: string
          p_full_name: string
          p_message?: string
          p_number_of_guests?: number
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
    Enums: {},
  },
} as const
