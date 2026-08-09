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
      bills: {
        Row: {
          categoria: string
          created_at: string
          due_date: string | null
          id: string
          meses_atrasada: number
          nome: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          due_date?: string | null
          id?: string
          meses_atrasada?: number
          nome: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          due_date?: string | null
          id?: string
          meses_atrasada?: number
          nome?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          emoji: string | null
          grupo: string
          id: string
          is_operacional: boolean
          nome: string
          ordem: number
          slug: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          emoji?: string | null
          grupo: string
          id?: string
          is_operacional?: boolean
          nome: string
          ordem?: number
          slug: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          emoji?: string | null
          grupo?: string
          id?: string
          is_operacional?: boolean
          nome?: string
          ordem?: number
          slug?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          complemento: string | null
          created_at: string
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          rua: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          rua?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          rua?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          photo_url: string | null
          price: number
          stock: number | null
          stock_by_unit: boolean
          unit_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          price?: number
          stock?: number | null
          stock_by_unit?: boolean
          unit_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          price?: number
          stock?: number | null
          stock_by_unit?: boolean
          unit_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price: number
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          quantity?: number
          unit_price: number
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method_label: string
          method_value: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method_label: string
          method_value: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method_label?: string
          method_value?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_time: string | null
          delivery_type: string
          id: string
          notes: string | null
          payment_method: string
          source: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          delivery_type?: string
          id?: string
          notes?: string | null
          payment_method?: string
          source?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          delivery_type?: string
          id?: string
          notes?: string | null
          payment_method?: string
          source?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          emoji: string
          id: string
          is_cash: boolean
          label: string
          sort_order: number
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji?: string
          id?: string
          is_cash?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string
          id?: string
          is_cash?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      pratos: {
        Row: {
          created_at: string
          data: string
          id: string
          nome_prato: string
          quantidade_vendida: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          nome_prato: string
          quantidade_vendida?: number
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nome_prato?: string
          quantidade_vendida?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: string
          schedule: Json
          store_open_override: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          schedule?: Json
          store_open_override?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          schedule?: Json
          store_open_override?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_today_sold_quantities: {
        Args: never
        Returns: {
          menu_item_id: string
          sold_qty: number
        }[]
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
