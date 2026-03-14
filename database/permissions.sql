-- ================================================
-- CONFIGURAÇÃO DE PERMISSÕES - SUPABASE
-- ================================================

-- ⚠️ IMPORTANTE: Execute este script no Supabase SQL Editor
-- após executar o schema.sql

-- ================================================
-- OPÇÃO 1: DESABILITAR RLS (Recomendado para Desenvolvimento)
-- ================================================

-- Desabilitar Row Level Security em todas as tabelas
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;

-- ================================================
-- OPÇÃO 2: CONFIGURAR POLÍTICAS RLS (Recomendado para Produção)
-- ================================================

-- Se preferir manter RLS ativo, descomente as linhas abaixo:

/*
-- Habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Políticas para events
CREATE POLICY "Enable read access for all users" ON events
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON events
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON events
  FOR DELETE USING (true);

-- Políticas para opportunities
CREATE POLICY "Enable read access for all users" ON opportunities
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON opportunities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON opportunities
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON opportunities
  FOR DELETE USING (true);

-- Políticas para bets
CREATE POLICY "Enable read access for all users" ON bets
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON bets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON bets
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON bets
  FOR DELETE USING (true);
*/

-- ================================================
-- VERIFICAR CONFIGURAÇÃO
-- ================================================

-- Para verificar o status do RLS:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ================================================
-- FIM
-- ================================================
