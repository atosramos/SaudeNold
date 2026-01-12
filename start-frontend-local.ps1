# Script para iniciar o frontend localmente
# Uso: .\start-frontend-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Frontend (Expo)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "[ERRO] Execute este script na pasta raiz do projeto (SaudeNold/)" -ForegroundColor Red
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green
    Write-Host ""
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "[AVISO] Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host "Criando .env com valores padrao..." -ForegroundColor Yellow
    
    @"
# Backend URL
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Gemini AI (opcional)
# EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "[OK] Arquivo .env criado" -ForegroundColor Green
    Write-Host ""
}

# Verificar se o backend está rodando (opcional)
Write-Host "[INFO] Verificando se o backend esta rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Backend esta rodando em http://localhost:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "[AVISO] Backend nao esta acessivel em http://localhost:8000" -ForegroundColor Yellow
    Write-Host "   O app funcionara apenas com dados locais (offline)" -ForegroundColor Yellow
    Write-Host "   Para habilitar sincronizacao, inicie o backend primeiro" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Expo Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione 'a' para Android" -ForegroundColor Green
Write-Host "Pressione 'i' para iOS (Mac)" -ForegroundColor Green
Write-Host "Pressione 'w' para Web" -ForegroundColor Green
Write-Host "Escaneie o QR code com Expo Go" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

# Iniciar Expo
npm start
