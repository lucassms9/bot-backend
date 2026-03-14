#!/bin/bash

echo "🧪 ========================================="
echo "   TESTE RÁPIDO - BOT DE APOSTAS"
echo "==========================================="
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# 1. Testar conexão
echo -e "${BLUE}1️⃣ Testando conexão com The Odds API...${NC}"
response=$(curl -s ${BASE_URL}/test/api-connection)
success=$(echo $response | jq -r '.success')

if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ API conectada!${NC}"
    echo $response | jq '.usage'
else
    echo -e "${RED}❌ Erro na conexão!${NC}"
    echo $response | jq '.'
    exit 1
fi

echo ""
echo "==========================================="
echo ""

# 2. Dry run
echo -e "${BLUE}2️⃣ Executando dry-run (não salva no banco)...${NC}"
response=$(curl -s ${BASE_URL}/test/dry-run)
success=$(echo $response | jq -r '.success')

if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ Processamento concluído!${NC}"
    echo ""
    echo "📊 Resumo:"
    echo $response | jq '.summary'
    echo ""
    echo "🎯 Top 3 Oportunidades:"
    echo $response | jq '.topOpportunities[0:3]'
else
    echo -e "${RED}❌ Erro no processamento!${NC}"
    echo $response | jq '.'
fi

echo ""
echo "==========================================="
echo ""

# 3. Simular pareamento
echo -e "${BLUE}3️⃣ Simulando pareamento de duplas...${NC}"
response=$(curl -s -X POST ${BASE_URL}/test/simulate-pairs)
success=$(echo $response | jq -r '.success')

if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ Simulação concluída!${NC}"
    echo ""
    echo "📊 Resumo:"
    echo $response | jq '.summary'
    echo ""
    echo "🎲 Top 3 Duplas:"
    echo $response | jq '.pairs[0:3]'
else
    echo -e "${RED}❌ Erro na simulação!${NC}"
    echo $response | jq '.'
fi

echo ""
echo "==========================================="
echo ""

# 4. Calcular risk de exemplo
echo -e "${BLUE}4️⃣ Calculando risk score de exemplo (handicap=1.5, odd=1.32)...${NC}"
response=$(curl -s "${BASE_URL}/test/calculate-risk?handicap=1.5&odd=1.32")
echo $response | jq '.'

echo ""
echo "==========================================="
echo ""
echo -e "${GREEN}✅ TESTES CONCLUÍDOS!${NC}"
echo ""
echo "Para executar fluxo completo (com banco):"
echo -e "${BLUE}curl -X POST ${BASE_URL}/scheduler/process-now${NC}"
echo ""
