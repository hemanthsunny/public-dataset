// Hand-maintained to match supabase/migrations/*.sql.
// Once the Supabase CLI is available, regenerate with:
//   supabase gen types typescript --project-id <ref> > src/types/database.types.ts
// and reconcile any drift.

export type AgentId =
  | 'new-incorporations'
  | 'dissolutions-strike-offs'
  | 'fsa-hygiene-ratings'
  | 'planning-applications'
  | 'ccj-court-judgments'
  | 'street-works-roadworks'
  | 'nhs-public-data-watcher'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'
export type ChannelType = 'slack' | 'whatsapp' | 'teams' | 'email'
export type AlertStatus = 'sent' | 'failed' | 'skipped'

type Relationships = Array<{
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: Relationships
      }
      agents: {
        Row: {
          id: AgentId
          name: string
          tagline: string
          description: string
          data_source: string
          delivery_mode: 'subscription' | 'on_demand'
          monthly_price_gbp: number | null
          is_available: boolean
          sort_order: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['agents']['Row']> & { id: AgentId }
        Update: Partial<Database['public']['Tables']['agents']['Row']>
        Relationships: Relationships
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          agent_id: AgentId
          status: SubscriptionStatus
          filters: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & {
          user_id: string
          agent_id: AgentId
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>
        Relationships: Relationships
      }
      delivery_channels: {
        Row: {
          id: string
          user_id: string
          channel_type: ChannelType
          label: string | null
          destination: string
          is_verified: boolean
          is_active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['delivery_channels']['Row']> & {
          user_id: string
          channel_type: ChannelType
          destination: string
        }
        Update: Partial<Database['public']['Tables']['delivery_channels']['Row']>
        Relationships: Relationships
      }
      subscription_channels: {
        Row: { subscription_id: string; delivery_channel_id: string }
        Insert: { subscription_id: string; delivery_channel_id: string }
        Update: Partial<{ subscription_id: string; delivery_channel_id: string }>
        Relationships: Relationships
      }
      alerts_log: {
        Row: {
          id: string
          subscription_id: string | null
          agent_id: AgentId
          user_id: string | null
          delivery_channel_id: string | null
          payload: Record<string, unknown>
          status: AlertStatus
          error_message: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['alerts_log']['Row']> & {
          agent_id: AgentId
          payload: Record<string, unknown>
          status: AlertStatus
        }
        Update: Partial<Database['public']['Tables']['alerts_log']['Row']>
        Relationships: Relationships
      }
      companies_cache: {
        Row: {
          company_number: string
          company_name: string
          incorporation_date: string | null
          sic_codes: string[]
          address: Record<string, unknown> | null
          postcode: string | null
          raw: Record<string, unknown>
          first_seen_at: string
        }
        Insert: Partial<Database['public']['Tables']['companies_cache']['Row']> & {
          company_number: string
          company_name: string
          raw: Record<string, unknown>
        }
        Update: Partial<Database['public']['Tables']['companies_cache']['Row']>
        Relationships: Relationships
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      agent_id: AgentId
      subscription_status: SubscriptionStatus
      channel_type: ChannelType
      alert_status: AlertStatus
    }
    CompositeTypes: Record<string, never>
  }
}
