-- Script para criar conta de administrador no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar usuário admin (substitua os valores conforme necessário)
DO $$
DECLARE
  admin_email TEXT := 'admin@azulpack.com';
  admin_password TEXT := 'Admin@2024!';
  admin_name TEXT := 'Administrador Principal';
  new_user_id UUID;
BEGIN
  -- Criar usuário na tabela auth.users
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
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    NOW(),
    NOW()
  ) RETURNING id INTO new_user_id;

  -- Criar perfil do admin
  INSERT INTO public.user_profiles (
    user_id,
    role,
    nome,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'ADMIN',
    admin_name,
    NOW(),
    NOW()
  );

  -- Registrar criação no audit log
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    created_at
  ) VALUES (
    new_user_id,
    'CREATE_USER',
    'USER',
    new_user_id,
    jsonb_build_object(
      'role', 'ADMIN',
      'created_by', 'system',
      'method', 'manual_script'
    ),
    NOW()
  );

  RAISE NOTICE 'Admin criado com sucesso!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Senha: %', admin_password;
  RAISE NOTICE 'ID do usuário: %', new_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar admin: %', SQLERRM;
END $$;

-- Query para verificar se o admin foi criado corretamente
SELECT 
  u.id as user_id,
  u.email,
  p.role,
  p.nome,
  u.created_at
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'admin@azulpack.com';