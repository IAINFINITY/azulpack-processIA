
export interface Processo {
  id: number;
  numero_processo?: string;
  titulo?: string;
  descricao?: string;
  defesa?: string;
  resumo?: string;
  arquivos_url?: string[];
  created_at: string;
  updated_at?: string;
  user_id?: string;
  status?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  role: 'ADMIN' | 'USER';
  nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action_type: 'LOGIN' | 'CREATE_PROCESS' | 'EDIT_PROCESS' | 'VIEW_PROCESS' | 'DELETE_PROCESS' | 'CREATE_USER' | 'EDIT_USER' | 'DELETE_USER';
  resource_type: 'PROCESS' | 'USER' | 'SYSTEM';
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  user_uuid: string;
  instancia_dify?: string;
  processo_id: number;
  nome?: string;
  created_at: string;
  processo?: Processo;
}

export interface ChatMensagem {
  id: number;
  pergunta: string;
  session_id: number;
  created_at: string;
}

export interface ChatResposta {
  id: number;
  id_pergunta: number;
  resposta: string;
  created_at: string;
}

export interface WebhookRequest {
  action: string;
  sessionId: string;
  chatInput: string;
  ask_id: string;
  user: string;
  session_dify: string;
}

export interface DefenseHistoryItem {
  id: number;
  processo_id: number;
  user_id: string;
  conteudo: string;
  versao: number;
  created_at: string;
}

export interface DefenseAnalysisItem {
  id: number;
  processo_id: number;
  user_id: string;
  conteudo_analise: string;
  defesa_analisada: string;
  versao: number;
  created_at: string;
}

export interface SugestaoPrompt {
  id: number;
  user_id: string;
  prompt_text: string;
  created_at: string;
  updated_at: string;
}
