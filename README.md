# 🛒 Nossa Lista

> Lista de compras compartilhada para o casal — simples, rápida e sincronizada em tempo real.

**Stack:** Next.js 15 · Supabase · Tailwind CSS · TypeScript · PWA

---

## ✨ Funcionalidades

- ✅ Autenticação completa (login, cadastro)
- ✅ Lista compartilhada via código de convite de 6 dígitos
- ✅ 3 categorias: Supermercado 🛒, Depósito 🏗️, Outros 📦
- ✅ Sincronização em tempo real (Supabase Realtime)
- ✅ Adicionar produtos por voz (Web Speech API)
- ✅ Marcar/desmarcar produtos como comprados
- ✅ Editar nome e categoria do produto
- ✅ Excluir produto individualmente
- ✅ Limpar todos os comprados com confirmação
- ✅ Filtrar por categoria
- ✅ Contadores de pendentes e comprados
- ✅ Indicador de conexão e sincronização
- ✅ Funciona como PWA (instala na tela inicial do celular)
- ✅ Interface mobile-first, 100% em português

---

## 🚀 Configuração

### 1. Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, execute o arquivo [`supabase/schema.sql`](./supabase/schema.sql)
3. Em **Authentication > Settings**, configure:
   - Desabilitar confirmação de e-mail para facilitar testes (opcional)
   - URL do site: `https://seu-dominio.vercel.app`
   - Redirect URLs: `https://seu-dominio.vercel.app/api/auth/callback`

4. Copie as credenciais em **Settings > API**:
   - `Project URL`
   - `anon public key`

### 2. Variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.local.example .env.local
```

Preencha com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

---

## 📦 Deploy na Vercel

### Passo 1: GitHub

```bash
git init
git add .
git commit -m "feat: Nossa Lista - lista de compras compartilhada"
git remote add origin https://github.com/SEU_USUARIO/nossa-lista.git
git push -u origin main
```

### Passo 2: Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **New Project**
2. Importe o repositório do GitHub
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Chave anon pública
4. Clique em **Deploy**

### Passo 3: Configurar URL no Supabase

Após o deploy, volte ao Supabase:
- **Authentication > URL Configuration**
  - Site URL: `https://seu-projeto.vercel.app`
  - Redirect URLs: `https://seu-projeto.vercel.app/api/auth/callback`

---

## 📱 Como usar

### Primeiro acesso
1. Acesse o app e crie uma conta
2. Um usuário cria a lista → recebe um **código de 6 letras**
3. O outro usuário cria conta → entra com o código
4. Ambos veem a mesma lista em tempo real!

### Adicionar por voz
- Clique no ícone de microfone 🎙️
- Fale: *"Adicionar leite"* ou *"Arroz no supermercado"*
- O texto é preenchido automaticamente

### Instalar no celular (PWA)
- **Android:** Menu do navegador → "Adicionar à tela inicial"
- **iPhone:** Botão compartilhar → "Adicionar à Tela de Início"

---

## 🗄️ Estrutura do banco de dados

```
perfis          → Dados do usuário (nome, email, lista_id)
listas          → Listas compartilhadas (nome, código convite)
participantes   → Membros de cada lista
produtos        → Itens da lista (nome, categoria, comprado, quem adicionou)
```

Todas as tabelas têm **Row Level Security (RLS)** ativo — cada usuário acessa apenas as listas das quais participa.

---

## 🛠️ Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/          # Login e cadastro
│   │   ├── login/
│   │   └── cadastro/
│   ├── lista/           # Tela principal
│   │   ├── page.tsx     # Lista de compras
│   │   └── configurar/  # Criar/entrar numa lista
│   ├── api/auth/        # Callback de autenticação
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ServiceWorkerRegistration.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Cliente browser
│   │   └── server.ts    # Cliente servidor
│   └── utils.ts
├── middleware.ts         # Proteção de rotas
└── types/
    └── index.ts
```

---

## 📋 Checklist antes do deploy

- [ ] Executei o `schema.sql` no Supabase
- [ ] Configurei as variáveis de ambiente na Vercel
- [ ] Configurei as URLs de redirecionamento no Supabase
- [ ] Testei cadastro e login dos dois usuários
- [ ] Testei o compartilhamento via código de convite
- [ ] Testei sincronização em tempo real entre dois dispositivos
- [ ] Testei adição, edição e exclusão de produtos
- [ ] Testei no celular Android e iPhone

---

## 🔒 Segurança

- Apenas a chave `anon` pública é usada no frontend
- A `service_role` **nunca** é exposta
- Todas as operações são protegidas por RLS no banco de dados
- Autenticação gerenciada pelo Supabase Auth

---

Feito com ❤️ para simplificar as compras do casal.
