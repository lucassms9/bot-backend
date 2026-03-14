# 📱 API de Consumo - Documentação para Cliente

## 🎯 Visão Geral

APIs REST bem estruturadas para aplicações cliente consumirem dados do bot de apostas.

**Base URL:** `http://localhost:3000/api`

---

## 📋 Endpoints Disponíveis

### 1. Listar Oportunidades (Apostas Individuais)

```bash
GET /api/opportunities
GET /api/opportunities?status=pending
```

**Parâmetros:**
- `status` (opcional): `pending`, `paired`, `discarded`

**Resposta:**
```json
{
  "success": true,
  "count": 6,
  "opportunities": [
    {
      "id": "uuid-123",
      "status": "pending",
      
      "match": {
        "eventId": "415aadf5c1b1e11a02cd90d1c70dc4d6",
        "league": "Brazil Série A",
        "homeTeam": "Vitoria",
        "awayTeam": "Atletico Mineiro",
        "kickoff": "2026-03-14T21:30:00.000Z",
        "kickoffFormatted": "14/03/2026 18:30"
      },
      
      "bet": {
        "team": "Atletico Mineiro",
        "handicap": 1.5,
        "odd": 1.32,
        "bookmaker": "betonlineag"
      },
      
      "risk": {
        "score": 0.39,
        "category": "Excelente",
        "stars": 5
      },
      
      "createdAt": "2026-03-14T12:00:00.000Z",
      "createdAtFormatted": "14/03/2026 09:00"
    }
  ],
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

---

### 2. Listar Duplas de Apostas

```bash
GET /api/bets
GET /api/bets?status=pending
```

**Parâmetros:**
- `status` (opcional): `pending`, `won`, `lost`, `partial`

**Resposta:**
```json
{
  "success": true,
  "count": 3,
  "bets": [
    {
      "id": "uuid-456",
      "status": "pending",
      
      "summary": {
        "oddTotal": 1.85,
        "riskTotal": 0.89,
        "riskCategory": "Excelente",
        "potentialProfit": "85.00",
        "profitPercentage": "85.00"
      },
      
      "game1": {
        "id": "uuid-111",
        "team": "Atletico Mineiro",
        "handicap": 1.5,
        "odd": 1.32,
        "bookmaker": "betonlineag",
        "riskScore": 0.39,
        "riskCategory": "Excelente",
        "match": {
          "league": "Brazil Série A",
          "homeTeam": "Vitoria",
          "awayTeam": "Atletico Mineiro",
          "kickoff": "2026-03-14T21:30:00.000Z",
          "kickoffFormatted": "14/03/2026 18:30"
        }
      },
      
      "game2": {
        "id": "uuid-222",
        "team": "Bahia",
        "handicap": 1.0,
        "odd": 1.40,
        "bookmaker": "betonlineag",
        "riskScore": 0.50,
        "riskCategory": "Excelente",
        "match": {
          "league": "Brazil Série A",
          "homeTeam": "Internacional",
          "awayTeam": "Bahia",
          "kickoff": "2026-03-15T19:00:00.000Z",
          "kickoffFormatted": "15/03/2026 16:00"
        }
      },
      
      "result": {
        "status": "pending",
        "profit": null
      },
      
      "createdAt": "2026-03-14T12:00:00.000Z",
      "createdAtFormatted": "14/03/2026 09:00"
    }
  ],
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

---

### 3. Detalhes de Uma Aposta

```bash
GET /api/bets/:id
```

**Resposta:** Mesmo formato de `/api/bets` mas com apenas uma aposta.

---

### 4. Top Oportunidades

```bash
GET /api/top-opportunities
GET /api/top-opportunities?limit=5
```

**Parâmetros:**
- `limit` (opcional): Quantidade de resultados (padrão: 10)

**Resposta:** Lista de oportunidades ordenadas por menor risk score.

---

### 5. Estatísticas Gerais

```bash
GET /api/stats
```

**Resposta:**
```json
{
  "success": true,
  "stats": {
    "opportunities": {
      "total": 15,
      "pending": 9,
      "paired": 6,
      "averageRisk": 0.67
    },
    "bets": {
      "total": 8,
      "pending": 5,
      "won": 2,
      "lost": 1,
      "winRate": 66.67,
      "averageOdd": 1.75,
      "totalProfit": 125.50
    }
  },
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

---

## 🎨 Guia de Interface

### 📊 Cards de Oportunidades

```jsx
// Exemplo React
{opportunities.map(opp => (
  <Card key={opp.id}>
    <Badge color={getRiskColor(opp.risk.category)}>
      {opp.risk.category} ⭐ {opp.risk.stars}/5
    </Badge>
    
    <Match>
      {opp.match.homeTeam} vs {opp.match.awayTeam}
      <Time>{opp.match.kickoffFormatted}</Time>
    </Match>
    
    <Bet>
      <Team>{opp.bet.team}</Team>
      <Handicap>+{opp.bet.handicap}</Handicap>
      <Odd>@ {opp.bet.odd}</Odd>
    </Bet>
    
    <Footer>
      <Bookmaker>{opp.bet.bookmaker}</Bookmaker>
      <Risk>Risk: {opp.risk.score}</Risk>
    </Footer>
  </Card>
))}
```

### 🎲 Cards de Duplas

```jsx
// Exemplo React
{bets.map(bet => (
  <BetCard key={bet.id}>
    <Header>
      <OddTotal>Odd: {bet.summary.oddTotal}</OddTotal>
      <Profit>Lucro: R$ {bet.summary.potentialProfit}</Profit>
      <Badge>{bet.summary.riskCategory}</Badge>
    </Header>
    
    <GameBox>
      <GameLabel>Jogo 1</GameLabel>
      <Match>{bet.game1.match.homeTeam} vs {bet.game1.match.awayTeam}</Match>
      <BetInfo>
        {bet.game1.team} +{bet.game1.handicap} @ {bet.game1.odd}
      </BetInfo>
      <Time>{bet.game1.match.kickoffFormatted}</Time>
    </GameBox>
    
    <Divider>+</Divider>
    
    <GameBox>
      <GameLabel>Jogo 2</GameLabel>
      <Match>{bet.game2.match.homeTeam} vs {bet.game2.match.awayTeam}</Match>
      <BetInfo>
        {bet.game2.team} +{bet.game2.handicap} @ {bet.game2.odd}
      </BetInfo>
      <Time>{bet.game2.match.kickoffFormatted}</Time>
    </GameBox>
  </BetCard>
))}
```

---

## 🎨 Categorias de Risco (UI)

```javascript
const riskColors = {
  'Excelente': { bg: '#10b981', text: '#fff' },  // verde
  'Ótimo': { bg: '#3b82f6', text: '#fff' },      // azul
  'Bom': { bg: '#f59e0b', text: '#fff' },         // laranja
  'Moderado': { bg: '#f97316', text: '#fff' },    // laranja escuro
  'Alto': { bg: '#ef4444', text: '#fff' },        // vermelho
};

const getRiskColor = (category) => riskColors[category];
```

---

## 📱 Exemplo de Tela - Dashboard

```
┌─────────────────────────────────────┐
│  📊 Estatísticas                     │
├─────────────────────────────────────┤
│  Oportunidades: 15 (9 disponíveis)  │
│  Duplas: 8 (Win Rate: 66.67%)       │
│  Lucro Total: R$ 125.50              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🏆 Top Oportunidades                │
├─────────────────────────────────────┤
│  ⭐⭐⭐⭐⭐ Excelente (0.39)          │
│  Atletico Mineiro +1.5 @ 1.32       │
│  Vitoria vs Atletico Mineiro        │
│  14/03/2026 18:30                   │
│  ─────────────────────────────────  │
│  ⭐⭐⭐⭐⭐ Excelente (0.45)          │
│  Flamengo +1.0 @ 1.45               │
│  Botafogo vs Flamengo               │
│  14/03/2026 20:30                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🎲 Duplas Recomendadas              │
├─────────────────────────────────────┤
│  Odd: 1.85 • Lucro: R$ 85.00        │
│  Excelente                           │
│  ─────────────────────────────────  │
│  [1] Atletico Mineiro +1.5 @ 1.32   │
│      Vitoria vs Atletico Mineiro    │
│      14/03 18:30                    │
│  ─────────────────────────────────  │
│  [2] Bahia +1.0 @ 1.40              │
│      Internacional vs Bahia         │
│      15/03 16:00                    │
└─────────────────────────────────────┘
```

---

## 🚀 Exemplos de Uso

### Fetch em JavaScript

```javascript
// Listar duplas
const response = await fetch('http://localhost:3000/api/bets');
const data = await response.json();
console.log(data.bets);

// Top oportunidades
const top = await fetch('http://localhost:3000/api/top-opportunities?limit=5');
const topData = await top.json();
console.log(topData.topOpportunities);

// Estatísticas
const stats = await fetch('http://localhost:3000/api/stats');
const statsData = await stats.json();
console.log(statsData.stats);
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Listar oportunidades pendentes
const opportunities = await api.get('/opportunities?status=pending');

// Listar duplas
const bets = await api.get('/bets');

// Estatísticas
const stats = await api.get('/stats');
```

---

## 🎯 Filtros e Ordenação

**Frontend pode filtrar por:**
- Risk category
- Odd range
- Horário do jogo
- Status

**Exemplo:**
```javascript
const filteredBets = data.bets.filter(bet => 
  bet.summary.riskCategory === 'Excelente' &&
  bet.summary.oddTotal >= 1.7
);
```

---

**APIs prontas para consumo! 🚀**

Formato rico em informações, fácil de usar no frontend.
