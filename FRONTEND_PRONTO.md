# 🎉 App Frontend Criado com Sucesso!

## ✅ O que foi criado

Frontend Next.js + React completo para visualizar oportunidades e duplas de apostas.

### 📦 Estrutura

```
nextjs-client/
├── app/
│   ├── layout.tsx              ✅ Layout com header e tabbar
│   ├── page.tsx                ✅ Redirect para /opportunities
│   ├── opportunities/page.tsx  ✅ Tela de oportunidades
│   └── bets/page.tsx           ✅ Tela de duplas
│
├── components/
│   ├── TabBar.tsx              ✅ Navegação inferior
│   ├── OpportunityCard.tsx     ✅ Card de oportunidade
│   ├── BetCard.tsx             ✅ Card de dupla
│   └── StatsCard.tsx           ✅ Card de estatísticas
│
├── lib/
│   └── api.ts                  ✅ Funções de fetch das APIs
│
├── types/
│   └── index.ts                ✅ TypeScript types
│
└── .env.local                  ✅ Config da API URL
```

## 🚀 Como Usar

### 1. O servidor já está rodando!

✅ **Frontend**: http://localhost:3001  
⚙️ O servidor Next.js foi iniciado automaticamente

### 2. Para ver o app funcionando

1. **Certifique-se que o backend está rodando** (porta 3000):
   ```bash
   # No diretório raiz bot-apostas/
   npm run start:dev
   ```

2. **Abra no navegador**:
   ```
   http://localhost:3001
   ```

3. **Agora você tem**: 
   - Tela de **Oportunidades** com lista de apostas individuais
   - Tela de **Bets** com duplas recomendadas
   - **TabBar** para navegar entre as telas
   - **Cards de estatísticas** com métricas gerais

## 🎨 Features Implementadas

### ⚽ Tela de Oportunidades (`/opportunities`)
- ✅ Lista de todas as oportunidades disponíveis
- ✅ Cards coloridos por categoria de risco:
  - 🟢 Verde = Excelente
  - 🔵 Azul = Ótimo
  - 🟡 Amarelo = Bom
  - 🟠 Laranja = Moderado
  - 🔴 Vermelho = Alto
- ✅ Estrelas indicando qualidade (1-5 ⭐)
- ✅ Info do jogo: times, horário, handicap, odd
- ✅ Botão de refresh para atualizar dados

### 🎲 Tela de Duplas (`/bets`)
- ✅ Lista de duplas de apostas
- ✅ Cálculo de odd total
- ✅ Lucro potencial em R$
- ✅ Detalhes completos dos 2 jogos da dupla
- ✅ Filtro por status: Todas / Pendentes / Vencidas / Perdidas
- ✅ Badge de status (pending/won/lost)

### 📊 Card de Estatísticas
- ✅ Total de oportunidades
- ✅ Total de duplas
- ✅ Win Rate %
- ✅ Lucro total acumulado

### 📱 Navegação
- ✅ **TabBar fixa** no rodapé com ícones
- ✅ Highlight da tab ativa
- ✅ Navegação client-side (super rápida)

## 🧪 Testando

### 1. Sem dados no banco

Se não há dados ainda, você verá mensagens amigáveis:
- "Nenhuma oportunidade disponível no momento"
- "O bot processa odds a cada 30 minutos"

### 2. Para popular com dados de teste

No terminal do backend, execute:
```bash
curl -X POST http://localhost:3000/scheduler/process-now
```

Isso irá:
- Processar odds (mock data)
- Criar oportunidades
- Gerar duplas
- Salvar no banco

### 3. Refresh manual

Clique no botão **"Atualizar"** em qualquer tela para buscar novos dados.

## 🎯 Próximos Passos

### Para testar com dados reais:

1. **Processar odds**:
   ```bash
   curl -X POST http://localhost:3000/scheduler/process-now
   ```

2. **Atualizar o frontend** (botão "Atualizar")

3. **Navegar entre as telas** usando a TabBar

### Customizar cores/layout:

Todos os componentes usam **Tailwind CSS**. Para mudar cores:
- Edite os arquivos em `nextjs-client/components/`
- Classes como `bg-blue-600`, `text-green-800`, etc.

## 📝 Endpoints Consumidos

O app faz fetch dos seguintes endpoints:

| Endpoint | Uso |
|----------|-----|
| `GET /api/opportunities` | Lista oportunidades |
| `GET /api/bets` | Lista duplas |
| `GET /api/stats` | Estatísticas gerais |

## 🔧 Comandos Úteis

### Parar o servidor Next.js
```bash
# Encontre o processo
ps aux | grep next

# Mate o processo
kill [PID]
```

### Reiniciar o servidor
```bash
cd nextjs-client
npm run dev
```

### Ver logs do servidor
```bash
# O servidor está rodando em background
# Logs aparecem automaticamente no terminal
```

## 🎨 Visual Preview

```
┌────────────────────────────────┐
│  ⚽ Bot de Apostas              │ ← Header
│  Handicap Asiático - Brasileirão│
├────────────────────────────────┤
│                                 │
│  📊 Estatísticas                │
│  ┌──────────┬──────────┐       │
│  │ Opps: 15 │ Duplas:8 │       │
│  │ Win: 67% │ R$ 125   │       │
│  └──────────┴──────────┘       │
│                                 │
│  🏆 Top Oportunidades           │
│                                 │
│  ┌─────────────────────┐       │
│  │ ⭐⭐⭐⭐⭐ Excelente │       │
│  │ Atletico Mineiro    │       │
│  │ +1.5 @ 1.32         │       │
│  │ Vitoria vs Atl MG   │       │
│  └─────────────────────┘       │
│                                 │
│  ┌─────────────────────┐       │
│  │ ⭐⭐⭐⭐⭐ Excelente │       │
│  │ Flamengo +1.0       │       │
│  │ @ 1.45              │       │
│  └─────────────────────┘       │
│                                 │
├────────────────────────────────┤
│ Oportunidades 📋 │  Bets 🏆   │ ← TabBar
└────────────────────────────────┘
```

---

## ✨ Pronto para usar!

**Frontend**: http://localhost:3001  
**Backend**: http://localhost:3000

Digite no navegador e veja o app funcionando! 🚀

---

**Desenvolvido com Next.js 14 + React + TypeScript + Tailwind CSS**
