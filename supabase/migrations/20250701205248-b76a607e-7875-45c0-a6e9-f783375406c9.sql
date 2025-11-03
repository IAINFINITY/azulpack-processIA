
-- Criar tabela para histórico de defesas
CREATE TABLE public.defesa_historico (
  id SERIAL PRIMARY KEY,
  processo_id BIGINT NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_defesa_historico_processo_id ON public.defesa_historico(processo_id);
CREATE INDEX idx_defesa_historico_user_id ON public.defesa_historico(user_id);
CREATE INDEX idx_defesa_historico_processo_versao ON public.defesa_historico(processo_id, versao DESC);

-- Habilitar RLS
ALTER TABLE public.defesa_historico ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas o histórico de seus próprios processos
CREATE POLICY "Users can view own defense history" ON public.defesa_historico
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = defesa_historico.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Política para inserir histórico
CREATE POLICY "Users can insert own defense history" ON public.defesa_historico
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = defesa_historico.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Política para deletar histórico (caso necessário)
CREATE POLICY "Users can delete own defense history" ON public.defesa_historico
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = defesa_historico.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Função para obter a próxima versão
CREATE OR REPLACE FUNCTION get_next_defense_version(p_processo_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(versao) + 1 FROM public.defesa_historico WHERE processo_id = p_processo_id),
    1
  );
END;
$$ LANGUAGE plpgsql;
