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
      agents: {
        Row: {
          created_at: string
          data_source: string
          delivery_mode: string
          description: string
          id: string
          is_available: boolean
          monthly_price_gbp: number | null
          name: string
          sort_order: number
          tagline: string
        }
        Insert: {
          created_at?: string
          data_source: string
          delivery_mode?: string
          description: string
          id: string
          is_available?: boolean
          monthly_price_gbp?: number | null
          name: string
          sort_order?: number
          tagline: string
        }
        Update: {
          created_at?: string
          data_source?: string
          delivery_mode?: string
          description?: string
          id?: string
          is_available?: boolean
          monthly_price_gbp?: number | null
          name?: string
          sort_order?: number
          tagline?: string
        }
        Relationships: []
      }
      alerts_log: {
        Row: {
          agent_id: string
          created_at: string
          delivery_channel_id: string | null
          error_message: string | null
          id: string
          payload: Json
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          delivery_channel_id?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          status: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          delivery_channel_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_log_delivery_channel_id_fkey"
            columns: ["delivery_channel_id"]
            isOneToOne: false
            referencedRelation: "delivery_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_cache: {
        Row: {
          address: Json | null
          company_name: string
          company_number: string
          first_seen_at: string
          incorporation_date: string | null
          postcode: string | null
          raw: Json
          sic_codes: string[] | null
        }
        Insert: {
          address?: Json | null
          company_name: string
          company_number: string
          first_seen_at?: string
          incorporation_date?: string | null
          postcode?: string | null
          raw: Json
          sic_codes?: string[] | null
        }
        Update: {
          address?: Json | null
          company_name?: string
          company_number?: string
          first_seen_at?: string
          incorporation_date?: string | null
          postcode?: string | null
          raw?: Json
          sic_codes?: string[] | null
        }
        Relationships: []
      }
      delivery_channels: {
        Row: {
          channel_type: string
          created_at: string
          destination: string
          id: string
          is_active: boolean
          is_verified: boolean
          label: string | null
          user_id: string
        }
        Insert: {
          channel_type: string
          created_at?: string
          destination: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          label?: string | null
          user_id: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          destination?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      la_opportunity_metrics: {
        Row: {
          convenience_est: number | null
          convenience_per_10k: number | null
          created_at: string
          fetch_date: string | null
          food_per_10k: number | null
          food_total: number
          hotels_est: number | null
          hotels_per_10k: number | null
          id: string
          is_exact: boolean
          la_name: string
          method_notes: string | null
          population: number
          population_source: string
          pubs_est: number | null
          pubs_per_10k: number | null
          region: string
          restaurants_est: number | null
          restaurants_per_10k: number | null
          sample_size: number | null
          scale_factor: number | null
          source_url: string | null
          takeaways_est: number | null
          takeaways_per_10k: number | null
        }
        Insert: {
          convenience_est?: number | null
          convenience_per_10k?: number | null
          created_at?: string
          fetch_date?: string | null
          food_per_10k?: number | null
          food_total: number
          hotels_est?: number | null
          hotels_per_10k?: number | null
          id?: string
          is_exact?: boolean
          la_name: string
          method_notes?: string | null
          population: number
          population_source?: string
          pubs_est?: number | null
          pubs_per_10k?: number | null
          region: string
          restaurants_est?: number | null
          restaurants_per_10k?: number | null
          sample_size?: number | null
          scale_factor?: number | null
          source_url?: string | null
          takeaways_est?: number | null
          takeaways_per_10k?: number | null
        }
        Update: {
          convenience_est?: number | null
          convenience_per_10k?: number | null
          created_at?: string
          fetch_date?: string | null
          food_per_10k?: number | null
          food_total?: number
          hotels_est?: number | null
          hotels_per_10k?: number | null
          id?: string
          is_exact?: boolean
          la_name?: string
          method_notes?: string | null
          population?: number
          population_source?: string
          pubs_est?: number | null
          pubs_per_10k?: number | null
          region?: string
          restaurants_est?: number | null
          restaurants_per_10k?: number | null
          sample_size?: number | null
          scale_factor?: number | null
          source_url?: string | null
          takeaways_est?: number | null
          takeaways_per_10k?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_channels: {
        Row: {
          delivery_channel_id: string
          subscription_id: string
        }
        Insert: {
          delivery_channel_id: string
          subscription_id: string
        }
        Update: {
          delivery_channel_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_channels_delivery_channel_id_fkey"
            columns: ["delivery_channel_id"]
            isOneToOne: false
            referencedRelation: "delivery_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_channels_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          agent_id: string
          created_at: string
          filters: Json
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          filters?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          filters?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
