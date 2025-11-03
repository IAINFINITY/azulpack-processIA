
-- Criar tabela para análises de defesa
CREATE TABLE public.analise_defesa (
  id SERIAL PRIMARY KEY,
  processo_id BIGINT NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo_analise TEXT NOT NULL,
  defesa_analisada TEXT NOT NULL, -- A defesa que foi analisada
  versao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_analise_defesa_processo_id ON public.analise_defesa(processo_id);
CREATE INDEX idx_analise_defesa_user_id ON public.analise_defesa(user_id);
CREATE INDEX idx_analise_defesa_processo_versao ON public.analise_defesa(processo_id, versao DESC);

-- Habilitar RLS
ALTER TABLE public.analise_defesa ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas suas próprias análises
CREATE POLICY "Users can view own defense analysis" ON public.analise_defesa
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = analise_defesa.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Política para inserir análises
CREATE POLICY "Users can insert own defense analysis" ON public.analise_defesa
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = analise_defesa.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Política para deletar análises
CREATE POLICY "Users can delete own defense analysis" ON public.analise_defesa
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.processos 
      WHERE processos.id = analise_defesa.processo_id 
      AND processos.user_id = auth.uid()
    )
  );

-- Função para obter a próxima versão de análise
CREATE OR REPLACE FUNCTION get_next_analysis_version(p_processo_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(versao) + 1 FROM public.analise_defesa WHERE processo_id = p_processo_id),
    1
  );
END;
$$ LANGUAGE plpgsql;
