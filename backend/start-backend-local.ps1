# Script para iniciar o backend localmente (sem Docker)
# Uso: .\start-backend-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Backend Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "main.py")) {
    Write-Host "[ERRO] Execute este script na pasta backend/" -ForegroundColor Red
    exit 1
}

# Verificar se o ambiente virtual existe
if (-not (Test-Path "venv")) {
    Write-Host "[AVISO] Ambiente virtual nao encontrado. Criando..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "[OK] Ambiente virtual criado" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green
    Write-Host ""
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "[AVISO] Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host "Criando .env com valores padrão..." -ForegroundColor Yellow
    
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
    Write-Host ""
}

# Verificar se o PostgreSQL está acessível
Write-Host "[INFO] Verificando conexao com PostgreSQL..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "saudenold123"
    $sqlQuery = "SELECT 1;"
    $result = psql -U saudenold -d saudenold -h localhost -c $sqlQuery 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] PostgreSQL acessivel" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Nao foi possivel conectar ao PostgreSQL" -ForegroundColor Yellow
        Write-Host "   Certifique-se de que o PostgreSQL esta rodando" -ForegroundColor Yellow
        Write-Host "   e que o banco 'saudenold' existe" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[AVISO] psql nao encontrado ou PostgreSQL nao acessivel" -ForegroundColor Yellow
    Write-Host "   O backend tentara conectar na inicializacao" -ForegroundColor Yellow
}
Write-Host ""

# Ativar ambiente virtual
Write-Host "[INFO] Ativando ambiente virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Verificar se uvicorn está instalado
$uvicornInstalled = pip show uvicorn 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando servidor na porta 8000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentacao: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
