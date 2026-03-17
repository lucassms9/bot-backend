-- ================================================
-- MIGRATION: user_opportunities
-- Tabela de vínculo entre usuários e oportunidades
-- com status POR USUÁRIO (pending / paired / discarded)
-- ================================================

CREATE TABLE IF NOT EXISTS user_opportunities (
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_id UUID     NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paired', 'discarded')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, opportunity_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_opp_user_status
    ON user_opportunities(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_opp_opp_id
    ON user_opportunities(opportunity_id);

-- Row Level Security
ALTER TABLE user_opportunities ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias linhas
CREATE POLICY "Users read own user_opportunities"
    ON user_opportunities FOR SELECT
    USING (auth.uid() = user_id);

-- Service role gerencia tudo (cron jobs, admin)
CREATE POLICY "Service role manages all user_opportunities"
    ON user_opportunities
    USING (true);

-- ================================================
-- Remover 'paired' do status global de opportunities
-- O campo continua existindo com: pending | discarded
-- ================================================

-- 1. Converter oportunidades 'paired' de volta para 'pending' ANTES de alterar a constraint
UPDATE opportunities SET status = 'pending' WHERE status = 'paired';

-- 2. Remover a constraint antiga
ALTER TABLE opportunities
    DROP CONSTRAINT IF EXISTS chk_status_valid;

-- 3. Adicionar a nova constraint (sem 'paired')
ALTER TABLE opportunities
    ADD CONSTRAINT chk_status_valid
        CHECK (status IN ('pending', 'discarded'));
