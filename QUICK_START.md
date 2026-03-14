# 🚀 Guia de Início Rápido - Bot de Apostas

## ⚡ Setup em 5 Minutos

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar The Odds API

1. Acesse: https://the-odds-api.com
2. Crie uma conta gratuita
3. Copie sua API Key

### 3. Configurar Supabase

1. Acesse: https://supabase.com
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o script `database/schema.sql`
4. Copie as credenciais:
   - Project URL
   - Anon/Public Key

### 4. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha:

```env
# The Odds API
ODDS_API_KEY=SUA_KEY_AQUI
ODDS_API_BASE_URL=https://api.the-odds-api.com/v4

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_key_aqui

# App Config
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Strategy
MIN_HANDICAP=1.0
MIN_ODD=1.25
MAX_ODD=1.55
MIN_PAIR_ODD=1.60

# Scheduler
CRON_ODDS_PROCESSOR=*/30 * * * *

# The Odds API Settings
SPORT_KEY=soccer_brazil_campeonato
MARKET=spreads
REGIONS=eu
ODDS_FORMAT=decimal
```

### 5. Executar o Sistema

**Modo desenvolvimento (com auto-reload):**
```bash
npm run start:dev
```

**Modo produção:**
```bash
npm run build
npm run start:prod
```

---

## 🧪 Testar Manualmente

### 1. Buscar Odds da API

```bash
curl http://localhost:3000/odds/fetch
```

**Resposta esperada:**
```json
{
  "success": true,
  "summary": {
    "eventsProcessed": 10,
    "opportunitiesExtracted": 25,
    "opportunitiesFiltered": 8
  },
  "opportunities": [...]
}
```

### 2. Construir Duplas de Apostas

```bash
curl -X POST http://localhost:3000/bets/build-pairs
```

**Resposta esperada:**
```json
{
  "success": true,
  "summary": {
    "pairsCreated": 3
  },
  "bets": [...]
}
```

### 3. Ver Estatísticas

```bash
curl http://localhost:3000/bets/statistics
```

### 4. Verificar Uso da API

```bash
curl http://localhost:3000/odds/usage
```

---

## 📊 Endpoints Disponíveis

### Odds
- `GET /odds/fetch` - Buscar odds manualmente
- `GET /odds/usage` - Ver uso da API

### Bets
- `GET /bets` - Listar todas as apostas
- `GET /bets/pending` - Apostas pendentes
- `GET /bets/statistics` - Estatísticas gerais
- `GET /bets/pairing-stats` - Estatísticas de pareamento
- `POST /bets/build-pairs` - Construir duplas manualmente

---

## ⏰ Scheduler Automático

O sistema roda automaticamente a cada **30 minutos**.

**Fluxo automático:**
1. Busca odds da API
2. Filtra handicaps válidos
3. Calcula risk score
4. Salva oportunidades
5. Monta duplas
6. Salva apostas

Para alterar o intervalo, edite `CRON_ODDS_PROCESSOR` no `.env`:

```env
# A cada 30 minutos
CRON_ODDS_PROCESSOR=*/30 * * * *

# A cada hora
CRON_ODDS_PROCESSOR=0 * * * *

# Horários específicos (10h, 15h, 20h)
CRON_ODDS_PROCESSOR=0 10,15,20 * * *
```

---

## 🔍 Verificar Logs

Os logs mostram todo o processo em tempo real:

```
🚀 Starting scheduled odds processing
📊 Fetching odds from The Odds API
✅ Fetched 12 events
📊 Parsing events
✅ Extracted 30 opportunities
📊 Applying strategy filters
✅ 10 opportunities passed filters
📊 Calculating risk scores
✅ Saved 10 opportunities
📊 Building bet pairs
✅ Created 4 bet pairs
⏱️ Execution time: 2.45s
```

---

## 📦 Consultar Banco de Dados

### Via Supabase Dashboard

1. Acesse seu projeto no Supabase
2. Vá para **Table Editor**
3. Visualize as tabelas:
   - `events` - Jogos coletados
   - `opportunities` - Apostas filtradas
   - `bets` - Duplas criadas

### Via SQL

```sql
-- Ver últimas oportunidades criadas
SELECT * FROM opportunities 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver duplas pendentes
SELECT * FROM bets 
WHERE result = 'pending' 
ORDER BY created_at DESC;

-- Estatísticas de risk score
SELECT 
  MIN(risk_score) as min_risk,
  MAX(risk_score) as max_risk,
  AVG(risk_score) as avg_risk
FROM opportunities;

-- Top 5 melhores duplas (menor risk)
SELECT * FROM bets 
ORDER BY risk_total ASC 
LIMIT 5;
```

---

## ⚠️ Troubleshooting

### API retorna 401 (Unauthorized)
- Verifique se `ODDS_API_KEY` está correto no `.env`
- Confirme que a key está ativa em https://the-odds-api.com/account

### API retorna 429 (Rate Limit)
- Você excedeu o limite de requisições
- Free tier: 500 requests/mês
- Reduza a frequência do cron

### Nenhuma oportunidade encontrada
- Pode não haver jogos no momento
- Verifique se os filtros não estão muito restritivos
- Teste com outros mercados (ajustar `SPORT_KEY`)

### Erro de conexão com Supabase
- Verifique `SUPABASE_URL` e `SUPABASE_KEY` no `.env`
- Confirme que as tabelas foram criadas (execute `database/schema.sql`)

### Duplas não sendo criadas
- Precisa de pelo menos 2 oportunidades pendentes
- Verifique `MIN_PAIR_ODD` não está muito alto
- Consulte `/bets/pairing-stats` para diagnóstico

---

## 🎯 Próximos Passos

Após confirmar que tudo está funcionando:

1. **Monitorar por alguns dias**
   - Verificar quantidade de oportunidades
   - Analisar quality das duplas
   - Ajustar filtros se necessário

2. **Ajustar estratégia**
   - Testar diferentes ranges de odds
   - Modificar pesos do risk score
   - Adicionar mais ligas

3. **Melhorias**
   - Dashboard web
   - Alertas Telegram
   - Backtesting
   - Machine Learning

---

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs em tempo real
- Consulte `PLANO_IMPLEMENTACAO.md`
- Teste endpoints manualmente com curl

**Boa sorte com as apostas! 🎲📈**
