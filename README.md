# 🎯 Bot de Apostas Esportivas - Handicap Asiático

Sistema automatizado para identificar e montar apostas duplas em handicap asiático no futebol brasileiro.

## 📋 Descrição

O sistema é dividido em dois serviços principais:

1. **Odds Processor**: Coleta odds da API, filtra oportunidades com base na estratégia e calcula o risk score
2. **Bet Builder**: Combina oportunidades aprovadas em duplas rentáveis

## 🚀 Tecnologias

- **Backend**: NestJS + TypeScript
- **Banco de Dados**: Supabase (PostgreSQL)
- **API de Odds**: The Odds API
- **Agendamento**: Node-cron

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Configurar variáveis no .env
```

## ⚙️ Configuração

### 1. The Odds API

1. Criar conta em https://the-odds-api.com
2. Obter API Key
3. Adicionar no `.env`: `ODDS_API_KEY=sua_key`

### 2. Supabase

1. Criar projeto em https://supabase.com
2. Executar scripts SQL em `/database/schema.sql`
3. Adicionar credenciais no `.env`

### 3. Variáveis de Ambiente

Ver `.env.example` para todas as configurações necessárias.

## 🏃 Executar

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📊 Estrutura do Projeto

```
src/
├── modules/
│   ├── odds/          # Coleta e processamento de odds
│   ├── risk/          # Cálculo de risk score
│   ├── bets/          # Construção de duplas
│   ├── database/      # Integração Supabase
│   └── scheduler/     # Tarefas agendadas
├── common/            # Constantes, filtros, interceptors
├── config/            # Configurações da aplicação
└── utils/             # Utilitários diversos
```

## 🎲 Estratégia

### Filtros de Handicap
- Handicap mínimo: **+1.0**
- Odds válidas: **1.25 - 1.55**

### Pareamento
- Odd total mínima: **1.60**
- Eventos diferentes
- Menor risk score possível

## 📈 Roadmap

- [x] MVP - Sistema básico funcional
- [ ] Integração com API de estatísticas
- [ ] Machine Learning para risk score
- [ ] Dashboard web
- [ ] Alertas via Telegram
- [ ] Backtesting

## 📝 Licença

MIT

## 👤 Autor

Lucas Santos
