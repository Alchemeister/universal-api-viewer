export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      connections: {
        Row: {
          id: string
          user_id: string
          provider: string
          credentials: string // encrypted JSON
          is_active: boolean
          last_synced_at: string | null
          last_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          credentials: string
          is_active?: boolean
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          credentials?: string
          is_active?: boolean
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
        }
      }
      usage_records: {
        Row: {
          id: string
          connection_id: string
          user_id: string
          provider: string
          date: string
          amount_cents: number
          currency: string
          raw_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          user_id: string
          provider: string
          date: string
          amount_cents: number
          currency?: string
          raw_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          user_id?: string
          provider?: string
          date?: string
          amount_cents?: number
          currency?: string
          raw_data?: Json | null
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          type: 'budget' | 'provider' | 'anomaly'
          provider: string | null
          threshold_cents: number
          is_active: boolean
          last_triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'budget' | 'provider' | 'anomaly'
          provider?: string | null
          threshold_cents: number
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'budget' | 'provider' | 'anomaly'
          provider?: string | null
          threshold_cents?: number
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
        }
      }
      alert_history: {
        Row: {
          id: string
          alert_id: string
          triggered_at: string
          amount_cents: number
          message: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          triggered_at?: string
          amount_cents: number
          message?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          triggered_at?: string
          amount_cents?: number
          message?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: 'free' | 'pro' | 'team'
          status: 'active' | 'canceled' | 'past_due'
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: 'free' | 'pro' | 'team'
          status?: 'active' | 'canceled' | 'past_due'
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: 'free' | 'pro' | 'team'
          status?: 'active' | 'canceled' | 'past_due'
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
