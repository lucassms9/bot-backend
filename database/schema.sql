-- ================================================
-- SCHEMA DO BANCO DE DADOS - BOT DE APOSTAS
-- ================================================

-- Limpar tabelas existentes (cuidado em produção!)
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- ================================================
-- TABELA: events
-- Armazena os eventos/jogos coletados da API
-- ================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    league VARCHAR(100) NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_events_commence_time ON events(commence_time);
CREATE INDEX idx_events_league ON events(league);

-- Comentários
COMMENT ON TABLE events IS 'Eventos/jogos coletados da The Odds API';
COMMENT ON COLUMN events.event_id IS 'ID único do evento fornecido pela API';
COMMENT ON COLUMN events.league IS 'Liga/campeonato do jogo';
COMMENT ON COLUMN events.home_team IS 'Time mandante';
COMMENT ON COLUMN events.away_team IS 'Time visitante';
COMMENT ON COLUMN events.commence_time IS 'Data e hora de início do jogo';

-- ================================================
-- TABELA: opportunities
-- Armazena oportunidades de apostas filtradas
-- ================================================
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    team VARCHAR(100) NOT NULL,
    handicap DECIMAL(4,2) NOT NULL,
    odd DECIMAL(4,2) NOT NULL,
    bookmaker VARCHAR(50) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_handicap_positive CHECK (handicap >= 0),
    CONSTRAINT chk_odd_positive CHECK (odd >= 1.0),
    CONSTRAINT chk_risk_positive CHECK (risk_score >= 0),
    CONSTRAINT chk_status_valid CHECK (status IN ('pending', 'paired', 'discarded'))
);

-- Índices para performance
CREATE INDEX idx_opportunities_event_id ON opportunities(event_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_risk_score ON opportunities(risk_score);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at);

-- Comentários
COMMENT ON TABLE opportunities IS 'Oportunidades de apostas aprovadas pelos filtros da estratégia';
COMMENT ON COLUMN opportunities.event_id IS 'Referência ao evento (jogo)';
COMMENT ON COLUMN opportunities.team IS 'Time da aposta';
COMMENT ON COLUMN opportunities.handicap IS 'Valor do handicap asiático (positivo)';
COMMENT ON COLUMN opportunities.odd IS 'Odd da aposta';
COMMENT ON COLUMN opportunities.bookmaker IS 'Casa de apostas';
COMMENT ON COLUMN opportunities.risk_score IS 'Score de risco calculado (quanto menor, melhor)';
COMMENT ON COLUMN opportunities.status IS 'Status: pending, paired, discarded';

-- ================================================
-- TABELA: bets
-- Armazena as duplas de apostas montadas
-- ================================================
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game1_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
    game2_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
    odd_total DECIMAL(5,2) NOT NULL,
    risk_total DECIMAL(6,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    result VARCHAR(20) DEFAULT 'pending',
    profit DECIMAL(10,2),
    
    -- Constraints
    CONSTRAINT chk_different_games CHECK (game1_id != game2_id),
    CONSTRAINT chk_odd_total_positive CHECK (odd_total >= 1.0),
    CONSTRAINT chk_result_valid CHECK (result IN ('pending', 'won', 'lost', 'partial')),
    CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_bets_game1_id ON bets(game1_id);
CREATE INDEX idx_bets_game2_id ON bets(game2_id);
CREATE INDEX idx_bets_created_at ON bets(created_at);
CREATE INDEX idx_bets_result ON bets(result);
CREATE INDEX idx_bets_user_id ON bets(user_id);

-- Comentários
COMMENT ON TABLE bets IS 'Duplas de apostas combinadas';
COMMENT ON COLUMN bets.user_id IS 'ID do usuário dono da aposta';
COMMENT ON COLUMN bets.game1_id IS 'Referência à primeira aposta da dupla';
COMMENT ON COLUMN bets.game2_id IS 'Referência à segunda aposta da dupla';
COMMENT ON COLUMN bets.odd_total IS 'Odd total da dupla (multiplicação)';
COMMENT ON COLUMN bets.risk_total IS 'Risk score total da dupla (soma)';
COMMENT ON COLUMN bets.result IS 'Resultado: pending, won, lost, partial';
COMMENT ON COLUMN bets.profit IS 'Lucro/prejuízo da aposta';

-- ================================================
-- TABELA: bankroll
-- Gestão de saldo/banca do usuário
-- ================================================
CREATE TABLE bankroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'BRL',
    stake_percentage DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balance_non_negative CHECK (current_balance >= 0),
    CONSTRAINT chk_initial_balance_positive CHECK (initial_balance > 0),
    CONSTRAINT chk_stake_percentage_valid CHECK (stake_percentage > 0 AND stake_percentage <= 100),
    CONSTRAINT fk_bankroll_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_bankroll UNIQUE (user_id)
);

-- Índices para performance
CREATE INDEX idx_bankroll_updated_at ON bankroll(updated_at);
CREATE INDEX idx_bankroll_user_id ON bankroll(user_id);

-- Comentários
COMMENT ON TABLE bankroll IS 'Gestão de banca/saldo do usuário';
COMMENT ON COLUMN bankroll.user_id IS 'ID do usuário dono da banca';
COMMENT ON COLUMN bankroll.current_balance IS 'Saldo atual disponível';
COMMENT ON COLUMN bankroll.initial_balance IS 'Saldo inicial cadastrado (para histórico)';
COMMENT ON COLUMN bankroll.currency IS 'Moeda (BRL, USD, EUR, etc)';
COMMENT ON COLUMN bankroll.stake_percentage IS 'Porcentagem do saldo para sugerir como stake (padrão 10%)';

-- Modificar tabela bets para incluir stake (valor apostado)
ALTER TABLE bets ADD COLUMN stake DECIMAL(10,2);
ALTER TABLE bets ADD COLUMN suggested_stake DECIMAL(10,2);
COMMENT ON COLUMN bets.stake IS 'Valor efetivamente apostado pelo usuário';
COMMENT ON COLUMN bets.suggested_stake IS 'Valor sugerido (10% do bankroll)';

-- ================================================
-- QUERIES ÚTEIS
-- ================================================

-- Ver oportunidades pendentes ordenadas por risk
-- SELECT * FROM opportunities WHERE status = 'pending' ORDER BY risk_score ASC;

-- Ver duplas criadas recentemente
-- SELECT * FROM bets ORDER BY created_at DESC LIMIT 10;

-- Estatísticas de oportunidades
-- SELECT status, COUNT(*) as total FROM opportunities GROUP BY status;

-- Performance das apostas
-- SELECT result, COUNT(*) as total, SUM(profit) as total_profit FROM bets GROUP BY result;

-- ================================================
-- DUMP DE DADOS DE TESTE (OPCIONAL)
-- ================================================

-- Descomentar para inserir dados de teste
/*
INSERT INTO events (event_id, league, home_team, away_team, commence_time) VALUES
('test001', 'Brazil Série A', 'Flamengo', 'Palmeiras', '2026-03-20T19:00:00Z'),
('test002', 'Brazil Série A', 'Corinthians', 'São Paulo', '2026-03-20T21:30:00Z');

INSERT INTO opportunities (event_id, team, handicap, odd, bookmaker, risk_score, status) VALUES
('test001', 'Palmeiras', 1.5, 1.35, 'bet365', 0.45, 'pending'),
('test002', 'São Paulo', 1.0, 1.50, 'betfair', 1.00, 'pending');
*/

-- ================================================
-- DESABILITAR RLS (Row Level Security)
-- Para desenvolvimento, desabilitamos RLS
-- ================================================

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;

-- ================================================
-- FIM DO SCHEMA
-- ================================================
