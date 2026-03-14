# 📋 Plano de Implementação - Betting Engine (Handicap Asiático)

## 🎯 Visão Geral do Sistema

Sistema automatizado para apostas esportivas em Handicap Asiático, dividido em 2 serviços principais:

- **Serviço 1**: Odds Processor - Coleta e filtra oportunidades
- **Serviço 2**: Bet Builder - Monta duplas de apostas

**Stack Tecnológica:**
- Backend: NestJS + TypeScript
- Database: Supabase (PostgreSQL)
- API: The Odds API
- Scheduler: Node-cron
- Validação: class-validator, class-transformer

---

## 📅 Cronograma de Implementação

### **FASE 1: Setup e Infraestrutura** (Dias 1-2)

#### 1.1 Setup Inicial do Projeto
- [x] Criar projeto NestJS
- [ ] Configurar TypeScript (strict mode)
- [ ] Configurar ESLint e Prettier
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Instalar dependências base

**Dependências principais:**
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/config": "^3.0.0",
  "@nestjs/schedule": "^4.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "axios": "^1.6.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

#### 1.2 Configuração Supabase
- [ ] Criar conta Supabase
- [ ] Criar projeto
- [ ] Configurar tabelas do banco
- [ ] Obter credenciais (URL + API Key)

#### 1.3 Configuração The Odds API
- [ ] Criar conta em https://the-odds-api.com
- [ ] Obter API Key
- [ ] Testar endpoint manualmente
- [ ] Verificar limite de requisições

---

### **FASE 2: Modelagem de Dados** (Dia 2)

#### 2.1 Schema do Banco de Dados

**Tabela: events**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  league VARCHAR(100) NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  commence_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_events_commence_time ON events(commence_time);
```

**Tabela: opportunities**
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL REFERENCES events(event_id),
  team VARCHAR(100) NOT NULL,
  handicap DECIMAL(4,2) NOT NULL,
  odd DECIMAL(4,2) NOT NULL,
  bookmaker VARCHAR(50) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_status CHECK (status IN ('pending', 'paired', 'discarded'))
);

CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_risk_score ON opportunities(risk_score);
CREATE INDEX idx_opportunities_event_id ON opportunities(event_id);
```

**Tabela: bets**
```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game1_id UUID NOT NULL REFERENCES opportunities(id),
  game2_id UUID NOT NULL REFERENCES opportunities(id),
  odd_total DECIMAL(5,2) NOT NULL,
  risk_total DECIMAL(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  result VARCHAR(20),
  profit DECIMAL(10,2),
  
  CONSTRAINT chk_result CHECK (result IN ('pending', 'won', 'lost', 'partial'))
);

CREATE INDEX idx_bets_created_at ON bets(created_at);
CREATE INDEX idx_bets_result ON bets(result);
```

---

### **FASE 3: Estrutura do Projeto NestJS** (Dia 3)

```
src/
├── main.ts
├── app.module.ts
├── config/
│   ├── config.module.ts
│   └── env.validation.ts
├── modules/
│   ├── odds/
│   │   ├── odds.module.ts
│   │   ├── odds.service.ts
│   │   ├── odds.controller.ts
│   │   ├── dto/
│   │   │   ├── odds-response.dto.ts
│   │   │   └── opportunity.dto.ts
│   │   └── interfaces/
│   │       └── odds-api.interface.ts
│   ├── risk/
│   │   ├── risk.module.ts
│   │   ├── risk.service.ts
│   │   └── calculators/
│   │       └── heuristic-calculator.ts
│   ├── bets/
│   │   ├── bets.module.ts
│   │   ├── bets.service.ts
│   │   ├── pair-builder.service.ts
│   │   └── dto/
│   │       └── bet-pair.dto.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── supabase.service.ts
│   │   └── repositories/
│   │       ├── events.repository.ts
│   │       ├── opportunities.repository.ts
│   │       └── bets.repository.ts
│   └── scheduler/
│       ├── scheduler.module.ts
│       └── tasks.service.ts
├── common/
│   ├── constants/
│   │   └── strategy.constants.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── logging.interceptor.ts
└── utils/
    ├── logger.ts
    └── date.helper.ts
```

---

### **FASE 4: Implementação - Serviço de Database** (Dia 4)

#### 4.1 Supabase Service
```typescript
// Conectar ao Supabase
// Expor client para repositórios
```

#### 4.2 Repositories Pattern
- EventsRepository: CRUD de eventos
- OpportunitiesRepository: CRUD de oportunidades
- BetsRepository: CRUD de apostas

---

### **FASE 5: Implementação - Odds Processor** (Dias 5-6)

#### 5.1 Odds Service
**Responsabilidades:**
- Chamar The Odds API
- Validar response
- Tratar erros de API
- Implementar retry logic

**Endpoints utilizados:**
```
GET /v4/sports/soccer_brazil_campeonato/odds
  ?regions=eu
  &markets=spreads
  &oddsFormat=decimal
  &apiKey=YOUR_KEY
```

#### 5.2 Parser & Filtros
**Fluxo de processamento:**
1. Receber eventos da API
2. Extrair mercado `spreads`
3. Filtrar handicap >= +1.0
4. Filtrar odds entre 1.25 e 1.55
5. Estruturar oportunidades

**Pseudo-código:**
```typescript
async extractOpportunities(event) {
  const opportunities = []
  
  for (bookmaker of event.bookmakers) {
    for (market of bookmaker.markets) {
      if (market.key !== 'spreads') continue
      
      for (outcome of market.outcomes) {
        // Filtrar apenas handicap positivo >= 1
        if (outcome.point >= 1.0) {
          // Filtrar odds válidas
          if (outcome.price >= 1.25 && outcome.price <= 1.55) {
            opportunities.push({
              eventId: event.id,
              team: outcome.name,
              handicap: outcome.point,
              odd: outcome.price,
              bookmaker: bookmaker.key
            })
          }
        }
      }
    }
  }
  
  return opportunities
}
```

#### 5.3 Risk Calculator (Heurístico)
**Fórmula inicial:**
```typescript
risk = (2 - handicap) * 0.5 + (odd - 1.25) * 2

// Exemplos:
// handicap +1.5, odd 1.32 → risk = 0.39
// handicap +1.0, odd 1.50 → risk = 1.00
```

**Interpretação:**
- Menor risk = Melhor aposta
- Considera margem de segurança do handicap
- Penaliza odds muito altas

---

### **FASE 6: Implementação - Bet Builder** (Dia 7)

#### 6.1 Pair Builder Service
**Responsabilidades:**
- Buscar oportunidades com status `pending`
- Ordenar por `risk_score` (menor primeiro)
- Combinar duplas
- Validar regras de pareamento

**Regras de Pareamento:**
1. Odd total >= 1.60
2. Eventos diferentes (event_id distintos)
3. Horários diferentes (ideal >2h de diferença)
4. Menor risk_total possível

**Algoritmo:**
```typescript
async buildPairs() {
  // 1. Buscar oportunidades pending
  const opportunities = await this.getByStatus('pending')
  
  // 2. Ordenar por risk_score ASC
  const sorted = opportunities.sort((a, b) => a.risk_score - b.risk_score)
  
  // 3. Combinar pares
  const pairs = []
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const game1 = sorted[i]
      const game2 = sorted[j]
      
      // Validar regras
      if (this.isValidPair(game1, game2)) {
        const oddTotal = game1.odd * game2.odd
        const riskTotal = game1.risk_score + game2.risk_score
        
        pairs.push({
          game1_id: game1.id,
          game2_id: game2.id,
          odd_total: oddTotal,
          risk_total: riskTotal
        })
        
        // Marcar como paired
        await this.updateStatus([game1.id, game2.id], 'paired')
        
        break // Próximo jogo
      }
    }
  }
  
  // 4. Salvar duplas
  await this.saveBets(pairs)
}
```

---

### **FASE 7: Scheduler & Automação** (Dia 8)

#### 7.1 Configurar Node-cron
```typescript
@Cron('*/30 * * * *') // A cada 30 minutos
async processOdds() {
  logger.info('Iniciando processamento de odds...')
  
  try {
    // 1. Buscar odds
    const events = await this.oddsService.fetchOdds()
    
    // 2. Processar cada evento
    for (const event of events) {
      await this.processEvent(event)
    }
    
    // 3. Construir duplas
    await this.betBuilderService.buildPairs()
    
    logger.info(`Processamento concluído: ${events.length} eventos`)
  } catch (error) {
    logger.error('Erro no processamento', error)
  }
}
```

#### 7.2 Horários de Execução
- **Opção 1**: A cada 30 minutos (`*/30 * * * *`)
- **Opção 2**: Horários fixos (10h, 15h, 20h)

---

### **FASE 8: Logging & Monitoramento** (Dia 9)

#### 8.1 Sistema de Logs
**Informações a registrar:**
- ✅ Quantidade de eventos processados
- ✅ Quantidade de oportunidades encontradas
- ✅ Quantidade de duplas criadas
- ✅ Tempo de execução
- ❌ Erros de API
- ❌ Falhas de validação

#### 8.2 Estrutura de Log
```typescript
interface ProcessLog {
  timestamp: Date
  totalEvents: number
  validOpportunities: number
  pairsCreated: number
  executionTime: number
  errors: string[]
}
```

---

### **FASE 9: Testes** (Dia 10)

#### 9.1 Testes Unitários
- [ ] Risk Calculator
- [ ] Filtros de estratégia
- [ ] Parser de odds
- [ ] Validadores

#### 9.2 Testes de Integração
- [ ] API The Odds (mockar response)
- [ ] Supabase repositories
- [ ] Fluxo completo end-to-end

#### 9.3 Testes Manuais
- [ ] Processar 1 evento real
- [ ] Verificar salvamento no banco
- [ ] Validar cálculo de risk
- [ ] Confirmar geração de duplas

---

### **FASE 10: Deploy & Produção** (Dia 11)

#### 10.1 Preparação
- [ ] Configurar variáveis de ambiente de produção
- [ ] Definir limites de rate da API
- [ ] Configurar logs persistentes
- [ ] Documentar processo de deploy

#### 10.2 Plataformas Recomendadas
- **Railway**: Deploy automático, suporta NestJS
- **Render**: Free tier generoso
- **Fly.io**: Boa performance
- **VPS**: Maior controle

#### 10.3 Variáveis de Ambiente
```env
# The Odds API
ODDS_API_KEY=your_key_here
ODDS_API_BASE_URL=https://api.the-odds-api.com/v4

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_key_here

# App Config
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Strategy Config
MIN_HANDICAP=1.0
MIN_ODD=1.25
MAX_ODD=1.55
MIN_PAIR_ODD=1.60
```

---

## 📊 Constantes da Estratégia

```typescript
// src/common/constants/strategy.constants.ts

export const STRATEGY_CONFIG = {
  // Filtros
  MIN_HANDICAP: 1.0,
  MIN_ODD: 1.25,
  MAX_ODD: 1.55,
  
  // Pareamento
  MIN_PAIR_ODD: 1.60,
  MIN_TIME_DIFF_HOURS: 2,
  
  // Risk Calculator
  HANDICAP_WEIGHT: 0.5,
  ODD_WEIGHT: 2.0,
  
  // API
  SPORT_KEY: 'soccer_brazil_campeonato',
  MARKET: 'spreads',
  REGIONS: 'eu',
  ODDS_FORMAT: 'decimal'
}
```

---

## 🔄 Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     SCHEDULER (CRON)                         │
│                   Executa a cada 30min                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 1. ODDS SERVICE                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET /v4/sports/soccer_brazil_campeonato/odds        │   │
│  │  • regions=eu                                         │   │
│  │  • markets=spreads                                    │   │
│  │  • oddsFormat=decimal                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 2. PARSER & FILTERS                          │
│  • Extrair mercado spreads                                  │
│  • Filtrar handicap >= +1.0                                 │
│  • Filtrar odd 1.25 - 1.55                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 3. RISK CALCULATOR                           │
│  risk = (2 - handicap) * 0.5 + (odd - 1.25) * 2            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           4. SAVE OPPORTUNITIES (Supabase)                   │
│  • Salvar em opportunities com status='pending'             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 5. BET BUILDER                               │
│  • Buscar pending ordenado por risk_score                   │
│  • Combinar duplas válidas                                  │
│  • Calcular odd_total e risk_total                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              6. SAVE BETS (Supabase)                         │
│  • Salvar duplas na tabela bets                             │
│  • Atualizar opportunities para status='paired'             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Exemplo Prático de Processamento

**Input (The Odds API):**
```json
{
  "id": "abc123",
  "home_team": "Vitoria",
  "away_team": "Atletico Mineiro",
  "commence_time": "2026-03-15T21:30:00Z",
  "bookmakers": [{
    "key": "betonlineag",
    "markets": [{
      "key": "spreads",
      "outcomes": [
        { "name": "Atletico Mineiro", "price": 1.32, "point": 1.5 },
        { "name": "Vitoria", "price": 3.20, "point": -1.5 }
      ]
    }]
  }]
}
```

**Processamento:**
1. ✅ Handicap +1.5 >= 1.0
2. ✅ Odd 1.32 entre 1.25-1.55
3. ✅ Risk = (2-1.5)*0.5 + (1.32-1.25)*2 = 0.39

**Output (Opportunity salva):**
```json
{
  "event_id": "abc123",
  "team": "Atletico Mineiro",
  "handicap": 1.5,
  "odd": 1.32,
  "bookmaker": "betonlineag",
  "risk_score": 0.39,
  "status": "pending"
}
```

---

## 🚀 Melhorias Futuras (Roadmap)

### Fase 2 (Após MVP)
- [ ] Integração com API de estatísticas (API-Football)
- [ ] Machine Learning para Risk Score
- [ ] Detecção de Value Bets
- [ ] Múltiplas ligas (Premier League, La Liga, etc)
- [ ] Dashboard web (React/Next.js)

### Fase 3 (Avançado)
- [ ] Alertas Telegram para duplas geradas
- [ ] Backtesting histórico
- [ ] Análise de forma recente dos times
- [ ] Integração com casas de apostas (API Betfair)
- [ ] Sistema de gestão de banca

---

## 📦 Checklist Final

### Antes de Iniciar
- [ ] Criar conta The Odds API
- [ ] Criar projeto Supabase
- [ ] Node.js v18+ instalado
- [ ] Git configurado

### Durante Desenvolvimento
- [ ] Testar cada módulo isoladamente
- [ ] Validar cálculos manualmente
- [ ] Documentar decisões importantes
- [ ] Commitar código regularmente

### Antes de Deploy
- [ ] Todos os testes passando
- [ ] Variáveis de ambiente configuradas
- [ ] Logs funcionando
- [ ] Tratamento de erros completo
- [ ] README.md atualizado

---

## 📝 Notas Importantes

1. **Rate Limits The Odds API**: 
   - Free tier: 500 requests/mês
   - Planejar uso consciente (máx 1 req/30min = 1440 req/mês)

2. **Handicap Asiático**:
   - +1.0: Ganha se empatar ou ganhar
   - +1.5: Ganha mesmo perdendo por 1 gol
   - +2.0: Devolve metade se perder por exatamente 2 gols

3. **Risk Score**:
   - Versão atual é heurística
   - Coletar dados para treinar ML posteriormente

4. **Pareamento**:
   - Priorizar menor risk_total
   - Evitar jogos no mesmo horário
   - Garantir odd total rentável (>= 1.60)

---

## 🆘 Troubleshooting

### API retorna 429 (Rate Limit)
- Reduzir frequência do cron
- Implementar cache de respostas

### Nenhuma oportunidade encontrada
- Verificar se filtros não estão muito restritivos
- Conferir se há jogos no período
- Logar quantos jogos foram descartados em cada etapa

### Duplas não sendo geradas
- Verificar quantidade de oportunidades pending
- Ajustar regra de odd_total mínima
- Logar combinações rejeitadas

---

**Autor**: Sistema de Betting Engine  
**Versão**: 1.0.0  
**Data**: Março 2026  
**Status**: Pronto para implementação ✅
