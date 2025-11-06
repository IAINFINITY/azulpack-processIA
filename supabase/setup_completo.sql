-- Script para criar a tabela user_profiles e conta admin
-- Execute este script completo no SQL Editor do Supabase

-- 1. Criar tabela user_profiles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Criar tabela audit_logs (se não existir)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('LOGIN', 'LOGOUT', 'CREATE_PROCESS', 'EDIT_PROCESS', 'VIEW_PROCESS', 'DELETE_PROCESS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('PROCESS', 'USER', 'SYSTEM')),
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Adicionar coluna user_id à tabela processos (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='processos' AND column_name='user_id') THEN
    ALTER TABLE public.processos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processos_user_id ON public.processos(user_id);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas básicas
CREATE POLICY IF NOT EXISTS "Usuários podem ver seus próprios perfis" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "ADMINs podem ver todos os perfis" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'ADMIN'
    )
  );

-- 7. Criar usuário admin (ALTERE AQUI)
INSERT INTO auth.users (
  instance_id,
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'admin@azulpack.com',  -- ALTERE SEU EMAIL AQUI
  crypt('Admin@2024!', gen_salt('bf')),  -- ALTERE SUA SENHA AQUI
  NOW(),
  'authenticated',
  NOW(),
  NOW()
);

-- 8. Criar perfil admin
INSERT INTO public.user_profiles (user_id, role, nome, created_at, updated_at)
SELECT 
  id,
  'ADMIN',
  'Administrador Principal',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@azulpack.com';  -- MESMO EMAIL AQUI

-- 9. Verificar resultado
SELECT u.email, p.role, p.nome, u.created_at
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'admin@azulpack.com';