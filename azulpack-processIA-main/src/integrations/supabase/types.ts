export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analise_defesa: {
        Row: {
          conteudo_analise: string
          created_at: string | null
          defesa_analisada: string
          id: number
          processo_id: number
          user_id: string
          versao: number
        }
        Insert: {
          conteudo_analise: string
          created_at?: string | null
          defesa_analisada: string
          id?: number
          processo_id: number
          user_id: string
          versao?: number
        }
        Update: {
          conteudo_analise?: string
          created_at?: string | null
          defesa_analisada?: string
          id?: number
          processo_id?: number
          user_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "analise_defesa_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          created_at: string
          id: number
          pergunta: string
          session_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          pergunta: string
          session_id: number
        }
        Update: {
          created_at?: string
          id?: number
          pergunta?: string
          session_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_respostas: {
        Row: {
          created_at: string
          id: number
          id_pergunta: number
          resposta: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_pergunta: number
          resposta: string
        }
        Update: {
          created_at?: string
          id?: number
          id_pergunta?: number
          resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_respostas_id_pergunta_fkey"
            columns: ["id_pergunta"]
            isOneToOne: false
            referencedRelation: "chat_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: number
          instancia_dify: string | null
          nome: string | null
          processo_id: number
          user_uuid: string
        }
        Insert: {
          created_at?: string
          id?: number
          instancia_dify?: string | null
          nome?: string | null
          processo_id: number
          user_uuid: string
        }
        Update: {
          created_at?: string
          id?: number
          instancia_dify?: string | null
          nome?: string | null
          processo_id?: number
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      defesa_historico: {
        Row: {
          conteudo: string
          created_at: string | null
          id: number
          processo_id: number
          user_id: string
          versao: number
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          id?: number
          processo_id: number
          user_id: string
          versao?: number
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          id?: number
          processo_id?: number
          user_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "defesa_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          arquivos_url: string[] | null
          created_at: string
          defesa: string | null
          descricao: string | null
          id: number
          numero_processo: string | null
          resumo: string | null
          status: string | null
          titulo: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          arquivos_url?: string[] | null
          created_at?: string
          defesa?: string | null
          descricao?: string | null
          id?: number
          numero_processo?: string | null
          resumo?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          arquivos_url?: string[] | null
          created_at?: string
          defesa?: string | null
          descricao?: string | null
          id?: number
          numero_processo?: string | null
          resumo?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sugestoes_prompts: {
        Row: {
          created_at: string | null
          id: number
          prompt_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          prompt_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          prompt_text?: string
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
      get_next_analysis_version: {
        Args: { p_processo_id: number }
        Returns: number
      }
      get_next_defense_version: {
        Args: { p_processo_id: number }
        Returns: number
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
