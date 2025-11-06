-- Criar tabela de perfis de usuário
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('LOGIN', 'CREATE_PROCESS', 'EDIT_PROCESS', 'VIEW_PROCESS', 'DELETE_PROCESS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('PROCESS', 'USER', 'SYSTEM')),
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna user_id à tabela processos
ALTER TABLE public.processos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_processos_user_id ON public.processos(user_id);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Usuários podem ver seus próprios perfis" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ADMINs podem ver todos os perfis" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "ADMINs podem criar perfis" ON public.user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "ADMINs podem atualizar perfis" ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

-- Políticas para audit_logs
CREATE POLICY "ADMINs podem ver todos os logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Usuários podem ver seus próprios logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas atualizadas para processos
DROP POLICY IF EXISTS "Usuários autenticados podem ver processos" ON public.processos;
DROP POLICY IF EXISTS "Usuários autenticados podem criar processos" ON public.processos;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar processos" ON public.processos;

-- Novas políticas para processos com controle por usuário
CREATE POLICY "Usuários podem ver seus próprios processos" ON public.processos
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Usuários podem criar seus próprios processos" ON public.processos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios processos" ON public.processos
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, nome)
  VALUES (NEW.id, 'USER', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para registrar logs de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, 
    action_type, 
    resource_type, 
    resource_id, 
    details,
    ip_address,
    user_agent
  )
  SELECT 
    auth.uid(),
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details,
    current_setting('request.jwt.claims', true)::json->>'ip_address'::inet,
    current_setting('request.headers', true)::json->>'user-agent'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;