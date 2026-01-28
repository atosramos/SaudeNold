# Script PowerShell para configurar git hooks no Windows

Write-Host "Configurando Git Hooks..." -ForegroundColor Yellow

# Verificar se estamos no diretório raiz do projeto
if (-not (Test-Path ".git")) {
    Write-Host "Erro: Este script deve ser executado no diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Criar diretório de hooks se não existir
if (-not (Test-Path ".githooks")) {
    Write-Host "Criando diretório .githooks..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path ".githooks" | Out-Null
}

# Verificar se pre-commit existe
if (Test-Path ".githooks/pre-commit") {
    Write-Host "✓ Pre-commit hook encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠ Pre-commit hook não encontrado em .githooks/pre-commit" -ForegroundColor Yellow
}

# Configurar Git para usar hooks do diretório .githooks
git config core.hooksPath .githooks

Write-Host "✅ Git hooks configurados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Para testar, tente fazer um commit:" -ForegroundColor Cyan
Write-Host "  git commit -m 'test: test hook'" -ForegroundColor Cyan
