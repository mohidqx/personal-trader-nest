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
      copy_relationships: {
        Row: {
          created_at: string
          follower_account_id: string
          follower_user_id: string
          id: string
          is_active: boolean | null
          master_account_id: string
          risk_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_account_id: string
          follower_user_id: string
          id?: string
          is_active?: boolean | null
          master_account_id: string
          risk_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_account_id?: string
          follower_user_id?: string
          id?: string
          is_active?: boolean | null
          master_account_id?: string
          risk_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_relationships_follower_account_id_fkey"
            columns: ["follower_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_relationships_master_account_id_fkey"
            columns: ["master_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_addresses: {
        Row: {
          address: string
          amount: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          network: string
          qr_code: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          amount: number
          created_at?: string
          currency?: string
          expires_at: string
          id?: string
          network?: string
          qr_code?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          network?: string
          qr_code?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_trader_stats: {
        Row: {
          account_id: string
          created_at: string
          followers_count: number | null
          id: string
          is_accepting_followers: boolean | null
          total_profit: number | null
          total_trades: number | null
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          followers_count?: number | null
          id?: string
          is_accepting_followers?: boolean | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          followers_count?: number | null
          id?: string
          is_accepting_followers?: boolean | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      mt5_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          account_type: string
          api_key: string | null
          api_secret: string | null
          balance: number | null
          created_at: string
          equity: number | null
          id: string
          is_active: boolean | null
          password_encrypted: string
          server: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          account_type: string
          api_key?: string | null
          api_secret?: string | null
          balance?: number | null
          created_at?: string
          equity?: number | null
          id?: string
          is_active?: boolean | null
          password_encrypted: string
          server: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          account_type?: string
          api_key?: string | null
          api_secret?: string | null
          balance?: number | null
          created_at?: string
          equity?: number | null
          id?: string
          is_active?: boolean | null
          password_encrypted?: string
          server?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          profile_picture_url: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          close_price: number | null
          closed_at: string | null
          created_at: string
          id: string
          mt5_account_id: string | null
          open_price: number
          opened_at: string
          profit: number | null
          status: string
          symbol: string
          type: string
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          close_price?: number | null
          closed_at?: string | null
          created_at?: string
          id?: string
          mt5_account_id?: string | null
          open_price: number
          opened_at?: string
          profit?: number | null
          status?: string
          symbol: string
          type: string
          updated_at?: string
          user_id: string
          volume: number
        }
        Update: {
          close_price?: number | null
          closed_at?: string | null
          created_at?: string
          id?: string
          mt5_account_id?: string | null
          open_price?: number
          opened_at?: string
          profit?: number | null
          status?: string
          symbol?: string
          type?: string
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          transaction_hash: string | null
          type: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          transaction_hash?: string | null
          type: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          transaction_hash?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_transaction: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      copy_trade_to_followers: {
        Args: { p_master_user_id: string; p_trade_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_transaction: {
        Args: {
          p_amount: number
          p_notes: string
          p_payment_method: string
          p_type: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
