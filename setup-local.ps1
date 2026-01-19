# Script para configurar ambiente local completo (sem Docker)
# Uso: .\setup-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Local - SaudeNold" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar pré-requisitos
Write-Host "[INFO] Verificando pre-requisitos..." -ForegroundColor Yellow
Write-Host ""

# Verificar Python
Write-Host "  Python..." -NoNewline
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(1[1-9]|[2-9]\d)") {
        Write-Host " [OK] $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host " [AVISO] $pythonVersion (recomendado: Python 3.11+)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [ERRO] Nao encontrado" -ForegroundColor Red
    Write-Host "     Instale Python 3.11+ de https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Verificar Node.js
Write-Host "  Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v(1[8-9]|[2-9]\d)") {
        Write-Host " [OK] $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " [AVISO] $nodeVersion (recomendado: Node.js 18+)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [ERRO] Nao encontrado" -ForegroundColor Red
    Write-Host "     Instale Node.js 18+ de https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar PostgreSQL
Write-Host "  PostgreSQL..." -NoNewline
try {
    $pgVersion = psql --version 2>&1
    Write-Host " [OK] $pgVersion" -ForegroundColor Green
} catch {
    Write-Host " [AVISO] Nao encontrado" -ForegroundColor Yellow
    Write-Host "     Instale PostgreSQL 15+ de https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

# Verificar Tesseract (opcional)
Write-Host "  Tesseract OCR..." -NoNewline
try {
    $tesseractVersion = tesseract --version 2>&1 | Select-Object -First 1
    Write-Host " [OK] Encontrado" -ForegroundColor Green
} catch {
    Write-Host " [AVISO] Nao encontrado (opcional)" -ForegroundColor Yellow
    Write-Host "     Instale de https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
}

Write-Host ""

# Setup Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location backend

# Criar ambiente virtual
if (-not (Test-Path "venv")) {
    Write-Host "[INFO] Criando ambiente virtual Python..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "[OK] Ambiente virtual criado" -ForegroundColor Green
}

# Ativar e instalar dependências
Write-Host "[INFO] Instalando dependencias Python..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# Criar .env se não existir
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Criando arquivo .env..." -ForegroundColor Yellow
    
    $apiKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
    $licenseKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
    
    @"
# Banco de Dados
DATABASE_USER=saudenold
DATABASE_PASSWORD=saudenold123
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=saudenold

# API Key
API_KEY=$apiKey

# CORS
CORS_ORIGINS=http://localhost:8081,http://localhost:8082,exp://*

# License Secret Key
LICENSE_SECRET_KEY=$licenseKey
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "[OK] Arquivo .env criado" -ForegroundColor Green
}

Set-Location ..

# Setup Frontend
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Instalar dependências Node
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Instalando dependencias Node.js..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "[OK] Dependencias Node.js ja instaladas" -ForegroundColor Green
}

# Criar .env se não existir
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Criando arquivo .env..." -ForegroundColor Yellow
    
    @"
# Backend URL
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Gemini AI (opcional)
# EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "[OK] Arquivo .env criado" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Concluido!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure o PostgreSQL:" -ForegroundColor White
Write-Host "   - Crie o banco de dados 'saudenold'" -ForegroundColor Gray
Write-Host "   - Crie o usuario 'saudenold' com senha 'saudenold123'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Inicie o backend:" -ForegroundColor White
Write-Host "   .\backend\start-backend-local.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "3. Inicie o frontend (em outro terminal):" -ForegroundColor White
Write-Host "   .\start-frontend-local.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "Documentacao completa:" -ForegroundColor Yellow
Write-Host "   docs\setup\RODAR-SEM-DOCKER.md" -ForegroundColor Cyan
Write-Host ""
