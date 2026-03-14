-- ================================================
-- MIGRATION: Adicionar Autenticação com Supabase
-- ================================================
-- 
-- ⚠️ IMPORTANTE: Use este arquivo APENAS se você já tem um banco
-- de dados EXISTENTE sem autenticação.
--
-- Se você está criando um banco NOVO do zero, use apenas schema.sql
-- que já inclui todas as colunas de autenticação.
-- ================================================

-- Adicionar coluna user_id na tabela bankroll (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bankroll' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE bankroll ADD COLUMN user_id UUID NOT NULL;
  END IF;
END $$;

-- Adicionar foreign key para auth.users do Supabase (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bankroll_user'
  ) THEN
    ALTER TABLE bankroll ADD CONSTRAINT fk_bankroll_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_bankroll_user_id ON bankroll(user_id);

-- Garantir que cada usuário tenha apenas um bankroll (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_bankroll'
  ) THEN
    ALTER TABLE bankroll ADD CONSTRAINT unique_user_bankroll UNIQUE (user_id);
  END IF;
END $$;

-- Comentário
COMMENT ON COLUMN bankroll.user_id IS 'ID do usuário dono da banca (referência auth.users)';


-- Adicionar coluna user_id na tabela bets (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE bets ADD COLUMN user_id UUID NOT NULL;
  END IF;
END $$;

-- Adicionar foreign key para auth.users do Supabase (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_bets_user'
  ) THEN
    ALTER TABLE bets ADD CONSTRAINT fk_bets_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);

-- Comentário
COMMENT ON COLUMN bets.user_id IS 'ID do usuário dono da aposta (referência auth.users)';


-- ================================================
-- ROW LEVEL SECURITY (RLS) - Segurança por usuário
-- ================================================

-- Habilitar RLS nas tabelas
ALTER TABLE bankroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own bankroll" ON bankroll;
DROP POLICY IF EXISTS "Users can insert own bankroll" ON bankroll;
DROP POLICY IF EXISTS "Users can update own bankroll" ON bankroll;
DROP POLICY IF EXISTS "Users can delete own bankroll" ON bankroll;
DROP POLICY IF EXISTS "Users can view own bets" ON bets;
DROP POLICY IF EXISTS "Users can insert own bets" ON bets;
DROP POLICY IF EXISTS "Users can update own bets" ON bets;
DROP POLICY IF EXISTS "Users can delete own bets" ON bets;

-- Política para bankroll: usuário só vê seu próprio bankroll
CREATE POLICY "Users can view own bankroll" 
  ON bankroll FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bankroll" 
  ON bankroll FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bankroll" 
  ON bankroll FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bankroll" 
  ON bankroll FOR DELETE 
  USING (auth.uid() = user_id);

-- Política para bets: usuário só vê suas próprias apostas
CREATE POLICY "Users can view own bets" 
  ON bets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" 
  ON bets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bets" 
  ON bets FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bets" 
  ON bets FOR DELETE 
  USING (auth.uid() = user_id);

-- Nota: events e opportunities permanecem compartilhadas entre todos os usuários
-- Cada usuário pode criar suas próprias bets com base nas opportunities disponíveis
