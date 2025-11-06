# GUIA: Criar Conta de Administrador no Supabase

## Método 1: SQL Rápido (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para [https://app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute este comando SQL** (substitua os valores):

```sql
-- Criar usuário admin
INSERT INTO auth.users (
  instance_id, id, email, encrypted_password, email_confirmed_at, role, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'admin@seudominio.com',  -- ALTERE SEU EMAIL AQUI
  crypt('SuaSenhaForte123!', gen_salt('bf')),  -- ALTERE SUA SENHA AQUI
  NOW(),
  'authenticated',
  NOW(),
  NOW()
);

-- Criar perfil admin
INSERT INTO public.user_profiles (user_id, email, role, nome, created_at, updated_at)
SELECT id, email, 'ADMIN', 'Administrador Principal', NOW(), NOW()
FROM auth.users 
WHERE email = 'admin@seudominio.com';  -- MESMO EMAIL AQUI

-- Verificar resultado
SELECT u.email, p.role, p.nome, u.created_at
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'admin@seudominio.com';
```

## Método 2: Interface do Supabase

1. **Criar usuário na interface**
   - Vá para "Authentication" → "Users"
   - Clique em "Add user"
   - Digite email e senha
   - Marque "Confirm email" (opcional)

2. **Criar perfil admin manualmente**
   - Vá para "Table Editor"
   - Procure a tabela `user_profiles`
   - Clique em "Insert row"
   - Preencha:
     - `user_id`: ID do usuário criado (pegue na tabela auth.users)
     - `email`: mesmo email do usuário
     - `role`: ADMIN
     - `nome`: Nome do administrador

## Método 3: Usar os Scripts SQL Prontos

Use os arquivos na pasta `supabase/`:
- `criar_admin_simples.sql` - Script simplificado
- `create_admin.sql` - Script completo com auditoria

## Testar o Login

1. Configure seu arquivo `.env` com as credenciais do Supabase
2. Inicie a aplicação: `npm run dev`
3. Acesse: `http://localhost:8081`
4. Faça login com as credenciais do admin criado

## Verificar se Funcionou

Após criar o admin e logar:
- Você verá links "Dashboard Admin" e "Gerenciar Usuários" no menu do usuário
- Poderá acessar: `/admin/dashboard` e `/admin/users`
- Terá controle total sobre todos os processos e usuários

## Segurança

- **Mude a senha padrão imediatamente**
- Use senhas fortes (mínimo 8 caracteres, maiúsculas, minúsculas, números e símbolos)
- Considere habilitar 2FA no Supabase
- Monitore os logs de auditoria regularmente