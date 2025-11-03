-- Criar tabela de processos
CREATE TABLE public.processos (
  id BIGSERIAL PRIMARY KEY,
  numero_processo TEXT,
  titulo TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'andamento'
);

-- Criar tabela de sessões de chat
CREATE TABLE public.chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_uuid UUID NOT NULL,
  instancia_dify TEXT,
  processo_id BIGINT NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de mensagens do chat
CREATE TABLE public.chat_mensagens (
  id BIGSERIAL PRIMARY KEY,
  pergunta TEXT NOT NULL,
  session_id BIGINT NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  arquivo TEXT
);

-- Criar tabela de respostas do chat
CREATE TABLE public.chat_respostas (
  id BIGSERIAL PRIMARY KEY,
  id_pergunta BIGINT NOT NULL REFERENCES public.chat_mensagens(id) ON DELETE CASCADE,
  resposta TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (Row Level Security) nas tabelas
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para processos (usuários autenticados podem ver e criar processos)
CREATE POLICY "Usuários autenticados podem ver processos" 
  ON public.processos 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários autenticados podem criar processos" 
  ON public.processos 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar processos" 
  ON public.processos 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Políticas RLS para chat_sessions (usuários só podem ver suas próprias sessões)
CREATE POLICY "Usuários podem ver suas próprias sessões" 
  ON public.chat_sessions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_uuid);

CREATE POLICY "Usuários podem criar suas próprias sessões" 
  ON public.chat_sessions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Usuários podem atualizar suas próprias sessões" 
  ON public.chat_sessions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_uuid);

-- Políticas RLS para chat_mensagens (usuários só podem ver mensagens de suas sessões)
CREATE POLICY "Usuários podem ver mensagens de suas sessões" 
  ON public.chat_mensagens 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_mensagens.session_id 
      AND chat_sessions.user_uuid = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar mensagens em suas sessões" 
  ON public.chat_mensagens 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_mensagens.session_id 
      AND chat_sessions.user_uuid = auth.uid()
    )
  );

-- Políticas RLS para chat_respostas (usuários só podem ver respostas de suas mensagens)
CREATE POLICY "Usuários podem ver respostas de suas mensagens" 
  ON public.chat_respostas 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_mensagens 
      JOIN public.chat_sessions ON chat_sessions.id = chat_mensagens.session_id
      WHERE chat_mensagens.id = chat_respostas.id_pergunta 
      AND chat_sessions.user_uuid = auth.uid()
    )
  );

CREATE POLICY "Sistema pode inserir respostas" 
  ON public.chat_respostas 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);
