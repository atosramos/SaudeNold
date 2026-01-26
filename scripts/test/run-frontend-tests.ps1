# Script para executar testes do frontend
# Verifica segurança em todas as telas do app

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXECUTANDO TESTES DO FRONTEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: Execute este script a partir da raiz do projeto SaudeNold" -ForegroundColor Red
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Executar testes de segurança
Write-Host "Executando testes de segurança..." -ForegroundColor Green
Write-Host ""

npm test -- __tests__/components/theme-safety.test.js --verbose

Write-Host ""
Write-Host "Executando testes de validação de dados..." -ForegroundColor Green
Write-Host ""

npm test -- __tests__/components/data-validation.test.js --verbose

Write-Host ""
Write-Host "Executando testes de tratamento de erros assíncronos..." -ForegroundColor Green
Write-Host ""

npm test -- __tests__/components/async-error-handling.test.js --verbose

Write-Host ""
Write-Host "Executando testes da tela Daily Tracking..." -ForegroundColor Green
Write-Host ""

npm test -- __tests__/screens/daily-tracking.test.js --verbose

Write-Host ""
Write-Host "Executando validação de todas as telas..." -ForegroundColor Green
Write-Host ""

npm test -- __tests__/screens/all-screens-safety.test.js --verbose

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTES CONCLUÍDOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Executar todos os testes com cobertura
Write-Host "Gerando relatório de cobertura..." -ForegroundColor Green
Write-Host ""

npm test -- --coverage --collectCoverageFrom="app/**/*.js" --collectCoverageFrom="components/**/*.js" --collectCoverageFrom="services/**/*.js"

Write-Host ""
Write-Host "Testes finalizados!" -ForegroundColor Green
