# 📊 Scripts SQL do Banco de Dados

## Arquivos Disponíveis

### 1. `schema.sql` - Schema Completo (NOVO BANCO)
**Quando usar:** Criando um banco de dados do ZERO

```bash
# Execute no Supabase SQL Editor
schema.sql
```

Este arquivo cria todas as tabelas com autenticação já incluída:
- ✅ Tabelas: `events`, `opportunities`, `bets`, `bankroll`
- ✅ Colunas `user_id` já incluídas
- ✅ Foreign keys para `auth.users`
- ✅ Índices e constraints
- ✅ **NÃO** aplica Row Level Security (RLS)

**Importante:** Após rodar o `schema.sql`, você ainda precisa rodar apenas a parte de RLS do `migration-auth.sql`.

---

### 2. `migration-auth.sql` - Adicionar Autenticação (BANCO EXISTENTE)
**Quando usar:** Você já tem um banco antigo SEM autenticação

```bash
# Execute no Supabase SQL Editor
migration-auth.sql
```

Este arquivo adiciona autenticação a um banco existente:
- ✅ Adiciona colunas `user_id` (se não existirem)
- ✅ Cria foreign keys (se não existirem)
- ✅ Cria índices (se não existirem)
- ✅ Habilita Row Level Security (RLS)
- ✅ Cria políticas de segurança

**Seguro para re-executar:** Usa `IF NOT EXISTS` e `DROP POLICY IF EXISTS`

---

## 🚀 Guia de Uso

### Cenário 1: Novo Projeto (Banco Vazio)

1. Vá para Supabase Dashboard → SQL Editor
2. Execute o `schema.sql` completo
3. Execute APENAS a parte de RLS do `migration-auth.sql` (linhas 90+)

Ou simplesmente execute o `migration-auth.sql` completo depois do `schema.sql` - ele detectará que as colunas já existem e pulará essa parte.

### Cenário 2: Projeto Existente (Sem Autenticação)

1. Faça backup do banco de dados
2. Vá para Supabase Dashboard → SQL Editor
3. Execute `migration-auth.sql` completo

### Cenário 3: Você Rodou schema.sql e Deu Erro no migration-auth.sql

Não tem problema! O erro aconteceu porque as colunas já existem.

**Solução:** Execute apenas a parte de RLS do `migration-auth.sql`:

```sql
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
```

---

## 🔒 Row Level Security (RLS)

### O que é RLS?

Row Level Security garante que cada query ao banco filtra automaticamente os dados por usuário:

```sql
-- Você executa:
SELECT * FROM bets;

-- O Supabase executa (automaticamente):
SELECT * FROM bets WHERE user_id = auth.uid();
```

### Por que é importante?

- ✅ Impossível ver dados de outros usuários
- ✅ Funciona mesmo se o frontend for hackeado
- ✅ Segurança no nível do banco de dados
- ✅ Cada usuário vê apenas seus dados

### Tabelas com RLS:
- `bankroll` - Cada usuário tem sua própria banca
- `bets` - Cada usuário vê apenas suas apostas

### Tabelas sem RLS (públicas):
- `events` - Eventos são compartilhados
- `opportunities` - Oportunidades são compartilhadas

---

## ✅ Verificar se RLS está Ativo

Execute este SQL no Supabase:

```sql
-- Verificar RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('bankroll', 'bets', 'events', 'opportunities');

-- Listar políticas ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('bankroll', 'bets');
```

**Resultado esperado:**
- `bankroll.rowsecurity` = `true`
- `bets.rowsecurity` = `true`
- 8 políticas listadas (4 para bankroll, 4 para bets)

---

## 🐛 Troubleshooting

### Erro: "column user_id already exists"
**Solução:** Use o `migration-auth.sql` atualizado que tem `IF NOT EXISTS`

### Erro: "policy already exists"
**Solução:** Use o `migration-auth.sql` atualizado que tem `DROP POLICY IF EXISTS`

### Erro: "permission denied for table"
**Solução:** Verifique se RLS está ativo. Execute as políticas novamente.

### Dados não aparecem no frontend
**Possíveis causas:**
1. Token JWT inválido → Faça logout/login
2. RLS ativo mas sem dados do usuário → Crie um bankroll primeiro
3. user_id NULL → Verifique se o backend está passando o userId corretamente

---

## 📝 Ordem de Execução Recomendada

Para um banco NOVO:

```bash
1. schema.sql          # Cria todas as tabelas
2. RLS do migration-auth.sql  # Ativa segurança
```

Depois de executar o SQL:

```bash
cd bot-backend
npm run dev           # Backend em http://localhost:3001

cd bot-frontend  
npm run dev           # Frontend em http://localhost:3000
```

Acesse http://localhost:3000, crie uma conta e comece a usar! 🚀
