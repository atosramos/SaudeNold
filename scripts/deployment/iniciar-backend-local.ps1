# Script para iniciar backend local (sem Kubernetes)
# Garante que o backend esteja rodando e acessivel via rede

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciar Backend Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se ja esta rodando
Write-Host "[1/4] Verificando se backend ja esta rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Backend ja esta rodando!" -ForegroundColor Green
        Write-Host "    Response: $($response.Content)" -ForegroundColor Gray
        
        # Verificar se esta acessivel via rede
        try {
            $netResponse = Invoke-WebRequest -Uri "http://192.168.0.101:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            Write-Host "  [OK] Backend acessivel via rede (192.168.0.101:8000)" -ForegroundColor Green
            Write-Host ""
            Write-Host "Backend esta pronto para uso!" -ForegroundColor Green
            exit 0
        } catch {
            Write-Host "  [AVISO] Backend nao acessivel via rede" -ForegroundColor Yellow
            Write-Host "    Verifique se esta escutando em 0.0.0.0:8000 (nao apenas 127.0.0.1)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [INFO] Backend nao esta rodando, iniciando..." -ForegroundColor Yellow
}

# Navegar para pasta backend
$backendPath = Join-Path $PSScriptRoot "..\..\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERRO] Pasta backend nao encontrada: $backendPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

# Verificar ambiente virtual
Write-Host "[2/4] Verificando ambiente virtual..." -ForegroundColor Yellow
if (-not (Test-Path "venv")) {
    Write-Host "  [AVISO] Ambiente virtual nao encontrado. Criando..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "  [OK] Ambiente virtual criado" -ForegroundColor Green
}

# Ativar ambiente virtual
Write-Host "[3/4] Ativando ambiente virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Verificar dependencias
Write-Host "[4/4] Verificando dependencias..." -ForegroundColor Yellow
$uvicornInstalled = pip show uvicorn 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Instalando dependencias..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Iniciando Backend" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend sera iniciado em:" -ForegroundColor Cyan
Write-Host "  - http://localhost:8000" -ForegroundColor White
Write-Host "  - http://192.168.0.101:8000 (via rede)" -ForegroundColor White
Write-Host ""
Write-Host "Documentacao: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

# Iniciar backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Pop-Location
