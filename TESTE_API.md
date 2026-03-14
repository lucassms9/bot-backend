# 🧪 Guia de Testes - API Endpoints

## 📋 Visão Geral

O sistema possui **dois modos de operação**:

1. **🤖 Automático (Cron)** - Roda a cada 30 minutos
2. **🧪 Manual (API)** - Endpoints para testes e execução sob demanda

---

## 🚀 Endpoints de Produção

### 1. Processar Odds Agora (Fluxo Completo)

Execute todo o pipeline do bot manualmente:

```bash
curl -X POST http://localhost:3000/scheduler/process-now
```

**O que faz:**
- Busca odds da The Odds API
- Filtra handicaps válidos
- Calcula risk scores
- Salva oportunidades no banco
- Constrói duplas de apostas
- Salva apostas no banco

**Resposta:**
```json
{
  "success": true,
  "message": "Processing completed successfully",
  "timestamp": "2026-03-14T20:30:00.000Z"
}
```

### 2. Status do Scheduler

```bash
curl http://localhost:3000/scheduler/status
```

**Resposta:**
```json
{
  "status": "running",
  "scheduledTasks": [
    {
      "name": "processOdds",
      "schedule": "Every 30 minutes",
      "description": "Process odds and build bets"
    },
    {
      "name": "healthCheck",
      "schedule": "Every hour",
      "description": "System health check"
    }
  ],
  "manualTrigger": "POST /scheduler/process-now"
}
```

---

## 🧪 Endpoints de Teste (Sem Salvar no Banco)

### 1. Testar Conexão com API

```bash
curl http://localhost:3000/test/api-connection
```

**Verifica:**
- Conectividade com The Odds API
- Requisições restantes
- Validade da API Key

**Resposta:**
```json
{
  "success": true,
  "message": "API connection successful",
  "usage": {
    "requestsUsed": 15,
    "requestsRemaining": 485
  }
}
```

### 2. Dry Run (Teste Completo sem Banco)

```bash
curl http://localhost:3000/test/dry-run
```

**O que faz:**
- Busca odds reais da API
- Processa todo o fluxo
- **NÃO salva no banco**
- Retorna top 10 oportunidades

**Resposta:**
```json
{
  "success": true,
  "summary": {
    "eventsFromAPI": 12,
    "opportunitiesExtracted": 48,
    "afterFilters": 15,
    "discarded": 33
  },
  "topOpportunities": [
    {
      "team": "Atletico Mineiro",
      "handicap": 1.5,
      "odd": 1.32,
      "riskScore": 0.39,
      "riskCategory": "Very Low",
      "homeTeam": "Vitoria",
      "awayTeam": "Atletico Mineiro",
      "bookmaker": "bet365"
    }
  ],
  "filterStats": {
    "total": 48,
    "validHandicap": 35,
    "validOdd": 28,
    "validBoth": 15
  }
}
```

### 3. Calcular Risk Score

```bash
curl "http://localhost:3000/test/calculate-risk?handicap=1.5&odd=1.32"
```

**Parâmetros:**
- `handicap` - Valor do handicap (ex: 1.5)
- `odd` - Valor da odd (ex: 1.32)

**Resposta:**
```json
{
  "success": true,
  "input": {
    "handicap": 1.5,
    "odd": 1.32
  },
  "result": {
    "riskScore": 0.39,
    "category": "Very Low"
  },
  "interpretation": {
    "Very Low": "< 0.5 - Excelente oportunidade",
    "Low": "0.5 - 1.0 - Boa oportunidade",
    "Medium": "1.0 - 1.5 - Oportunidade moderada",
    "High": "1.5 - 2.0 - Risco elevado",
    "Very High": "> 2.0 - Evitar"
  }
}
```

### 4. Simular Pareamento

```bash
curl -X POST http://localhost:3000/test/simulate-pairs
```

**O que faz:**
- Busca odds reais
- Processa e filtra
- **Simula** construção de duplas
- **NÃO salva no banco**

**Resposta:**
```json
{
  "success": true,
  "summary": {
    "opportunitiesAnalyzed": 15,
    "pairsFound": 6,
    "minOddRequired": 1.6
  },
  "pairs": [
    {
      "game1": {
        "team": "Atletico Mineiro",
        "handicap": 1.5,
        "odd": 1.32,
        "risk": 0.39
      },
      "game2": {
        "team": "Sao Paulo",
        "handicap": 1.0,
        "odd": 1.25,
        "risk": 0.5
      },
      "oddTotal": 1.65,
      "riskTotal": 0.89
    }
  ]
}
```

### 5. Informações do Sistema

```bash
curl http://localhost:3000/test/info
```

**Resposta:**
```json
{
  "success": true,
  "system": {
    "name": "Bot de Apostas - Handicap Asiático",
    "version": "1.0.0",
    "environment": "development"
  },
  "configuration": {
    "minHandicap": 1.0,
    "minOdd": 1.25,
    "maxOdd": 1.55,
    "minPairOdd": 1.6,
    "sportKey": "soccer_brazil_campeonato"
  },
  "endpoints": { ... }
}
```

---

## 📊 Endpoints de Dados

### Odds

```bash
# Buscar e salvar odds
curl http://localhost:3000/odds/fetch

# Ver uso da API
curl http://localhost:3000/odds/usage
```

### Bets

```bash
# Construir duplas
curl -X POST http://localhost:3000/bets/build-pairs

# Listar todas as apostas
curl http://localhost:3000/bets

# Apostas pendentes
curl http://localhost:3000/bets/pending

# Estatísticas
curl http://localhost:3000/bets/statistics

# Stats de pareamento
curl http://localhost:3000/bets/pairing-stats
```

---

## 🎯 Fluxo Recomendado para Testes

### 1️⃣ Verificar Conectividade

```bash
curl http://localhost:3000/test/api-connection
```

### 2️⃣ Testar sem Salvar (Dry Run)

```bash
curl http://localhost:3000/test/dry-run
```

### 3️⃣ Simular Pareamento

```bash
curl -X POST http://localhost:3000/test/simulate-pairs
```

### 4️⃣ Se tudo OK, executar de verdade

```bash
curl -X POST http://localhost:3000/scheduler/process-now
```

### 5️⃣ Verificar resultados

```bash
curl http://localhost:3000/bets/statistics
```

---

## 🔧 Exemplos com HTTPie (alternativa ao curl)

```bash
# Instalar httpie
brew install httpie

# Usar
http GET localhost:3000/test/dry-run
http POST localhost:3000/scheduler/process-now
http GET localhost:3000/test/calculate-risk handicap==1.5 odd==1.32
```

---

## 🧪 Scripts de Teste Rápido

Crie um arquivo `test-bot.sh`:

```bash
#!/bin/bash

echo "🧪 Testando Bot de Apostas..."
echo ""

echo "1️⃣ Verificando conexão com API..."
curl -s http://localhost:3000/test/api-connection | jq '.success'
echo ""

echo "2️⃣ Executando dry-run..."
curl -s http://localhost:3000/test/dry-run | jq '.summary'
echo ""

echo "3️⃣ Simulando pareamento..."
curl -s -X POST http://localhost:3000/test/simulate-pairs | jq '.summary'
echo ""

echo "✅ Testes concluídos!"
```

Execute:
```bash
chmod +x test-bot.sh
./test-bot.sh
```

---

## ⚙️ Variáveis de Ambiente para Teste

Crie um `.env.test`:

```env
NODE_ENV=test
PORT=3000
LOG_LEVEL=debug

# The Odds API (sua key real)
ODDS_API_KEY=sua_key_aqui
ODDS_API_BASE_URL=https://api.the-odds-api.com/v4

# Supabase (banco de teste)
SUPABASE_URL=sua_url_test
SUPABASE_KEY=sua_key_test

# Strategy mais permissiva para testes
MIN_HANDICAP=0.5
MIN_ODD=1.20
MAX_ODD=2.00
MIN_PAIR_ODD=1.50

SPORT_KEY=soccer_brazil_campeonato
MARKET=spreads
REGIONS=eu
ODDS_FORMAT=decimal
```

---

## 📝 Notas Importantes

### ✅ Endpoints que SALVAM no Banco
- `POST /scheduler/process-now`
- `GET /odds/fetch`
- `POST /bets/build-pairs`

### 🧪 Endpoints que NÃO SALVAM (apenas leitura/teste)
- `GET /test/dry-run`
- `POST /test/simulate-pairs`
- `GET /test/calculate-risk`
- `GET /test/api-connection`
- `GET /test/info`

### 🤖 Cron Automático
O cron continua funcionando normalmente em background:
- **Processar odds**: A cada 30 minutos
- **Health check**: A cada hora

Para desabilitar temporariamente, comente no `.env`:
```env
# CRON_ODDS_PROCESSOR=*/30 * * * *
```

---

## 🎓 Exemplos de Uso

### Testar com handicap diferente
```bash
curl "http://localhost:3000/test/calculate-risk?handicap=2.0&odd=1.40"
```

### Ver todas as duplas criadas hoje
```bash
curl http://localhost:3000/bets | jq '.[] | select(.created_at | startswith("2026-03-14"))'
```

### Executar fluxo completo e ver resultado
```bash
curl -X POST http://localhost:3000/scheduler/process-now && \
sleep 2 && \
curl http://localhost:3000/bets/statistics
```

---

**Pronto para testes! 🚀**

Use os endpoints de teste (`/test/*`) para experimentar sem afetar o banco de dados.
