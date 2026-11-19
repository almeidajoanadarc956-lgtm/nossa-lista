-- ============================================================
-- Nossa Lista - Script de banco de dados Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- =====================
-- 1. TABELA: perfis
-- =====================
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  lista_id UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. TABELA: listas
-- =====================
CREATE TABLE IF NOT EXISTS public.listas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Nossa Lista',
  codigo_convite TEXT UNIQUE NOT NULL,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 3. TABELA: participantes
-- =====================
CREATE TABLE IF NOT EXISTS public.participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entrou_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_id, user_id)
);

-- =====================
-- 4. TABELA: produtos
-- =====================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'supermercado'
    CHECK (categoria IN ('supermercado', 'deposito', 'outros')),
  comprado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_por UUID REFERENCES auth.users(id),
  criado_por_nome TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_produtos_lista_id ON public.produtos(lista_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_comprado ON public.produtos(comprado);
CREATE INDEX IF NOT EXISTS idx_participantes_lista_id ON public.participantes(lista_id);
CREATE INDEX IF NOT EXISTS idx_participantes_user_id ON public.participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_listas_codigo_convite ON public.listas(codigo_convite);

-- =====================
-- 6. ROW LEVEL SECURITY
-- =====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- ----- perfis -----
CREATE POLICY "Usuário vê próprio perfil"
  ON public.perfis FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuário cria próprio perfil"
  ON public.perfis FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário atualiza próprio perfil"
  ON public.perfis FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----- listas -----
-- Ver lista: apenas participantes
CREATE POLICY "Participantes veem a lista"
  ON public.listas FOR SELECT
  USING (
    id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
  );

-- Criar lista: qualquer usuário autenticado
CREATE POLICY "Usuário autenticado cria lista"
  ON public.listas FOR INSERT
  WITH CHECK (auth.uid() = criado_por);

-- Atualizar lista: apenas criador
CREATE POLICY "Criador atualiza lista"
  ON public.listas FOR UPDATE
  USING (criado_por = auth.uid());

-- ----- participantes -----
-- Ver participantes: membros da lista
CREATE POLICY "Membros veem participantes"
  ON public.participantes FOR SELECT
  USING (
    lista_id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
  );

-- Adicionar participante: o próprio usuário (ao entrar com código)
CREATE POLICY "Usuário entra na lista"
  ON public.participantes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Remover-se da lista
CREATE POLICY "Usuário sai da lista"
  ON public.participantes FOR DELETE
  USING (auth.uid() = user_id);

-- ----- produtos -----
-- Ver produtos: apenas participantes da lista
CREATE POLICY "Participantes veem produtos"
  ON public.produtos FOR SELECT
  USING (
    lista_id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
  );

-- Adicionar produto: participantes da lista
CREATE POLICY "Participantes adicionam produtos"
  ON public.produtos FOR INSERT
  WITH CHECK (
    lista_id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
    AND auth.uid() = criado_por
  );

-- Atualizar produto: qualquer participante da lista
CREATE POLICY "Participantes atualizam produtos"
  ON public.produtos FOR UPDATE
  USING (
    lista_id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
  );

-- Deletar produto: qualquer participante da lista
CREATE POLICY "Participantes deletam produtos"
  ON public.produtos FOR DELETE
  USING (
    lista_id IN (
      SELECT lista_id FROM public.participantes WHERE user_id = auth.uid()
    )
  );

-- =====================
-- 7. REALTIME
-- =====================
-- Habilitar realtime na tabela produtos
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;

-- =====================
-- 8. FUNÇÃO: criar perfil automaticamente
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- FIM DO SCRIPT
-- =====================
-- Após executar, verifique:
-- 1. Tabelas criadas: perfis, listas, participantes, produtos
-- 2. RLS habilitado em todas as tabelas
-- 3. Políticas criadas corretamente
-- 4. Realtime habilitado para a tabela produtos
