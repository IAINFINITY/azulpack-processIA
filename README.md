# IA Trabalhista - Sistema de Gestão Jurídica com IA

Sistema especializado em análise e gestão de processos trabalhistas com inteligência artificial.

## 🚀 Deploy na Vercel

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta na Vercel

### Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrations no diretório `supabase/migrations/`
3. Copie a URL do projeto e a chave anon (Settings > API)

### Deploy na Vercel

1. Conecte seu repositório GitHub na Vercel
2. Configure as variáveis de ambiente:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   VITE_APP_URL=https://seu-app.vercel.app
   ```
3. Deploy!

### Configuração de Administrador

Após o deploy, crie um usuário admin diretamente no Supabase:

```sql
-- Criar usuário admin (substitua os valores)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
VALUES ('admin@seuapp.com', crypt('senha_forte', gen_salt('bf')), NOW(), 'authenticated');

-- Criar perfil admin
INSERT INTO public.user_profiles (id, email, role, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@seuapp.com'),
  'admin@seuapp.com',
  'ADMIN',
  'Administrador'
);
```

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📋 Funcionalidades

- ✅ Autenticação com controle de acesso (ADMIN/USER)
- ✅ Gestão de processos trabalhistas
- ✅ Chat com IA especializada em direito trabalhista
- ✅ Análise de defesa com IA
- ✅ Histórico de conversas
- ✅ Upload de documentos
- ✅ Dashboard administrativo
- ✅ Sistema de auditoria completo

## 🛡️ Segurança

- Controle de acesso baseado em papéis (RBAC)
- Auditoria de todas as ações
- Isolamento de dados entre usuários
- Políticas de segurança no banco de dados (RLS)

## 📞 Suporte

Para suporte, entre em contato através do email de administrador configurado.