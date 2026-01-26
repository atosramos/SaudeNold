# Script para verificar logs do backend local
# Verifica arquivos de log e processos rodando

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificar Logs do Backend Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se backend esta rodando
Write-Host "[1/4] Verificando se backend esta rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  [OK] Backend esta respondendo" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Backend NAO esta rodando" -ForegroundColor Red
    Write-Host "    Inicie o backend primeiro: .\scripts\deployment\iniciar-backend-local.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# 2. Verificar processos Python
Write-Host "[2/4] Verificando processos Python..." -ForegroundColor Yellow
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*Saude*backend*venv*" -or 
    $_.Path -like "*Saude*backend*Scripts*"
}

if ($pythonProcs) {
    Write-Host "  [OK] Processos Python encontrados:" -ForegroundColor Green
    $pythonProcs | ForEach-Object { 
        Write-Host "    PID: $($_.Id) - $($_.Path)" -ForegroundColor Gray 
    }
    Write-Host ""
    Write-Host "  IMPORTANTE: Os logs aparecem no terminal onde o backend foi iniciado!" -ForegroundColor Yellow
    Write-Host "  Procure pelo terminal que executou: uvicorn main:app" -ForegroundColor Gray
} else {
    Write-Host "  [AVISO] Nenhum processo Python encontrado" -ForegroundColor Yellow
    Write-Host "    O backend pode estar rodando em Docker ou outro processo" -ForegroundColor Gray
}

# 3. Verificar arquivos de log
Write-Host "[3/4] Verificando arquivos de log..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "..\..\backend"
$logFiles = @(
    "$backendPath\logs\*.log",
    "$backendPath\*.log",
    "$backendPath\alerts.log"
)

$foundLogs = $false
foreach ($pattern in $logFiles) {
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    if ($files) {
        $foundLogs = $true
        Write-Host "  [OK] Arquivos de log encontrados:" -ForegroundColor Green
        $files | ForEach-Object {
            Write-Host "    $($_.FullName)" -ForegroundColor Gray
            Write-Host "      Tamanho: $([math]::Round($_.Length / 1KB, 2)) KB" -ForegroundColor Gray
            Write-Host "      Modificado: $($_.LastWriteTime)" -ForegroundColor Gray
            
            # Mostrar ultimas linhas relacionadas a login
            Write-Host "      Ultimas linhas relacionadas a login:" -ForegroundColor Cyan
            $logContent = Get-Content $_.FullName -Tail 50 -ErrorAction SilentlyContinue
            $loginLines = $logContent | Select-String -Pattern "login|POST.*auth|/api/auth/login|192\.168\.0" -CaseSensitive:$false
            if ($loginLines) {
                $loginLines | Select-Object -Last 10 | ForEach-Object {
                    Write-Host "        $_" -ForegroundColor White
                }
            } else {
                Write-Host "        (Nenhuma linha de login encontrada)" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }
}

if (-not $foundLogs) {
    Write-Host "  [AVISO] Nenhum arquivo de log encontrado" -ForegroundColor Yellow
    Write-Host "    O uvicorn geralmente mostra logs apenas no terminal" -ForegroundColor Gray
}

# 4. Testar login e capturar resposta
Write-Host "[4/4] Testando login para ver se aparece nos logs..." -ForegroundColor Yellow
Write-Host "  (Fazendo uma tentativa de login de teste)" -ForegroundColor Gray
try {
    $loginBody = @{
        email = "test@example.com"
        password = "test123"
        device = @{
            device_id = "test-device-log-check"
        }
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "  [OK] Login testado (status: $($loginResponse.StatusCode))" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        Write-Host "  [OK] Login testado (status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
        Write-Host "    Esta tentativa deve aparecer nos logs do backend" -ForegroundColor Gray
    } else {
        Write-Host "  [ERRO] Login nao chegou ao backend: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Como Ver os Logs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Se o backend esta rodando em um terminal:" -ForegroundColor Yellow
Write-Host "   - Os logs aparecem em tempo real nesse terminal" -ForegroundColor White
Write-Host "   - Procure por linhas como:" -ForegroundColor White
Write-Host "     INFO:     192.168.0.x:xxxxx - \"POST /api/auth/login HTTP/1.1\" 401" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Para ver logs em tempo real durante tentativa de login:" -ForegroundColor Yellow
Write-Host "   - Mantenha o terminal do backend aberto" -ForegroundColor White
Write-Host "   - Tente fazer login no app" -ForegroundColor White
Write-Host "   - Observe o terminal do backend" -ForegroundColor White
Write-Host ""
Write-Host "3. Se nao encontrar o terminal do backend:" -ForegroundColor Yellow
Write-Host "   - Pare todos os processos Python: .\scripts\deployment\parar-backend-local.ps1" -ForegroundColor White
Write-Host "   - Inicie novamente: .\scripts\deployment\iniciar-backend-local.ps1" -ForegroundColor White
Write-Host "   - Mantenha esse terminal aberto para ver os logs" -ForegroundColor White
Write-Host ""
