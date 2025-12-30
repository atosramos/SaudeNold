#!/bin/bash
# Script para executar testes unitários do backend

echo "Instalando dependências..."
pip install -r requirements.txt

echo ""
echo "Executando testes unitários..."
pytest -v

echo ""
echo "Testes concluídos!"

