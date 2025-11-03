
-- Primeiro, vamos corrigir a estrutura das tabelas para incluir user_id nos processos
ALTER TABLE public.processos ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Atualizar as políticas RLS para processos (apenas o dono pode ver seus processos)
DROP POLICY IF EXISTS "Usuários autenticados podem ver processos" ON public.processos;
DROP POLICY IF EXISTS "Usuários autenticados podem criar processos" ON public.processos;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar processos" ON public.processos;

CREATE POLICY "Usuários podem ver seus próprios processos" 
  ON public.processos 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios processos" 
  ON public.processos 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios processos" 
  ON public.processos 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios processos" 
  ON public.processos 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);
