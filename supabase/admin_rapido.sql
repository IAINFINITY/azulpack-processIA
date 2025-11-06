-- Script ULTRA SIMPLIFICADO para criar admin
-- COPIE E COLE NO SQL EDITOR DO SUPABASE
-- ALTERE APENAS O EMAIL E SENHA ABAIXO

-- Configurações (ALTERE AQUI) 👇
SET myvars.admin_email = 'seuadmin@email.com';
SET myvars.admin_senha = 'SuaSenha123!';
SET myvars.admin_nome = 'Administrador';

-- Criar tabela user_profiles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar usuário auth
INSERT INTO auth.users (
  instance_id, id, email, encrypted_password, email_confirmed_at, role, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  current_setting('myvars.admin_email')::text,
  crypt(current_setting('myvars.admin_senha')::text, gen_salt('bf')),
  NOW(),
  'authenticated',
  NOW(),
  NOW()
);

-- Criar perfil admin
INSERT INTO public.user_profiles (user_id, role, nome, created_at, updated_at)
SELECT 
  id,
  'ADMIN',
  current_setting('myvars.admin_nome')::text,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = current_setting('myvars.admin_email')::text;

-- Verificar se deu certo
SELECT u.email, p.role, p.nome, u.created_at
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = current_setting('myvars.admin_email')::text;