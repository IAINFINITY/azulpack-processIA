-- Script simplificado para criar admin Supabase
-- COPIE E COLE NO SQL EDITOR DO SUPABASE

-- Configurações (ALTERE AQUI)
SET myvars.admin_email = 'admin@seuapp.com';
SET myvars.admin_senha = 'SuaSenhaForte123!';
SET myvars.admin_nome = 'Administrador';

-- Criar usuário auth
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  current_setting('myvars.admin_email')::text,
  crypt(current_setting('myvars.admin_senha')::text, gen_salt('bf')),
  NOW(),
  'authenticated',
  NOW(),
  NOW();

-- Criar perfil admin
INSERT INTO public.user_profiles (user_id, email, role, nome, created_at, updated_at)
SELECT 
  id,
  email,
  'ADMIN',
  current_setting('myvars.admin_nome')::text,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = current_setting('myvars.admin_email')::text;

-- Verificar resultado
SELECT u.email, p.role, p.nome, u.created_at
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = current_setting('myvars.admin_email')::text;