# Script para iniciar backend local e mostrar logs em tempo real
# Este script inicia o backend e mostra os logs, especialmente relacionados a login

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciar Backend Local com Monitoramento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "  1. Verificar se backend ja esta rodando" -ForegroundColor White
Write-Host "  2. Iniciar o backend se necessario" -ForegroundColor White
Write-Host "  3. Mostrar logs em tempo real (especialmente login)" -ForegroundColor White
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o backend" -ForegroundColor Yellow
Write-Host ""

# Verificar se ja esta rodando
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[AVISO] Backend ja esta rodando!" -ForegroundColor Yellow
    Write-Host "  Os logs estao no terminal onde o backend foi iniciado" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Para ver logs em tempo real, procure pelo terminal que executou:" -ForegroundColor Cyan
    Write-Host "  uvicorn main:app --host 0.0.0.0 --port 8000" -ForegroundColor White
    Write-Host ""
    exit 0
} catch {
    Write-Host "[INFO] Backend nao esta rodando, iniciando..." -ForegroundColor Yellow
}

# Navegar para pasta backend
$backendPath = Join-Path $PSScriptRoot "..\..\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERRO] Pasta backend nao encontrada: $backendPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

# Verificar ambiente virtual
if (-not (Test-Path "venv")) {
    Write-Host "[AVISO] Ambiente virtual nao encontrado. Criando..." -ForegroundColor Yellow
    python -m venv venv
}

# Ativar ambiente virtual
& .\venv\Scripts\Activate.ps1

# Verificar dependencias
$uvicornInstalled = pip show uvicorn 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend Iniciando..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend sera iniciado em:" -ForegroundColor Cyan
Write-Host "  - http://localhost:8000" -ForegroundColor White
Write-Host "  - http://192.168.0.101:8000 (via rede)" -ForegroundColor White
Write-Host ""
Write-Host "Os logs aparecerao abaixo. Procure por:" -ForegroundColor Yellow
Write-Host "  - 'POST /api/auth/login' para tentativas de login" -ForegroundColor White
Write-Host "  - 'INFO:' para informacoes gerais" -ForegroundColor White
Write-Host "  - 'WARNING:' para avisos" -ForegroundColor White
Write-Host "  - 'ERROR:' para erros" -ForegroundColor White
Write-Host ""
Write-Host "Tente fazer login no app AGORA e observe os logs abaixo:" -ForegroundColor Cyan
Write-Host ""

# Iniciar backend (os logs aparecerao aqui)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Pop-Location
