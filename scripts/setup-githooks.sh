#!/bin/bash
# Script para configurar git hooks

echo "Configurando Git Hooks..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -d ".git" ]; then
    echo "Erro: Este script deve ser executado no diretório raiz do projeto"
    exit 1
fi

# Criar diretório de hooks se não existir
if [ ! -d ".githooks" ]; then
    echo "Criando diretório .githooks..."
    mkdir -p .githooks
fi

# Tornar pre-commit executável
if [ -f ".githooks/pre-commit" ]; then
    chmod +x .githooks/pre-commit
    echo "✓ Pre-commit hook configurado"
fi

# Configurar Git para usar hooks do diretório .githooks
git config core.hooksPath .githooks

echo "✅ Git hooks configurados com sucesso!"
echo ""
echo "Para testar, tente fazer um commit:"
echo "  git commit -m 'test: test hook'"
