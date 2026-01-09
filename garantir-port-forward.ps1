# Script para garantir que o port-forward está rodando
# Verifica se já existe e inicia se necessário

Write-Host "Verificando port-forward do backend..." -ForegroundColor Cyan

# Verificar se a porta 8000 está escutando (port-forward ativo)
$portListening = netstat -ano | Select-String ":8000" | Select-String "LISTENING" | Select-String "127.0.0.1"

if ($portListening) {
    Write-Host "✅ Port-forward já está rodando na porta 8000" -ForegroundColor Green
    
    # Testar se está funcionando
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✅ Backend respondendo: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Port-forward ativo mas backend não responde" -ForegroundColor Yellow
        Write-Host "   Tentando reiniciar..." -ForegroundColor Yellow
        
        # Matar processos kubectl port-forward antigos
        Get-Process kubectl -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*port-forward*backend*" -or $_.CommandLine -like "*port-forward*8000*"
        } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 2
        
        # Iniciar novo port-forward
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward -n saudenold svc/backend 8000:8000"
        Write-Host "✅ Novo port-forward iniciado em nova janela" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Port-forward não está rodando" -ForegroundColor Yellow
    Write-Host "Iniciando port-forward..." -ForegroundColor Cyan
    
    # Verificar se o pod está rodando
    $podStatus = kubectl get pods -n saudenold -l app=backend -o jsonpath='{.items[0].status.phase}' 2>$null
    if ($podStatus -ne "Running") {
        Write-Host "❌ Pod do backend não está Running (Status: $podStatus)" -ForegroundColor Red
        Write-Host "   Verifique o pod com: kubectl get pods -n saudenold -l app=backend" -ForegroundColor Yellow
        exit 1
    }
    
    # Iniciar port-forward em nova janela
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward -n saudenold svc/backend 8000:8000"
    
    Write-Host "✅ Port-forward iniciado em nova janela do PowerShell" -ForegroundColor Green
    Write-Host "   Aguarde 3 segundos para testar..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Testar conexão
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend respondendo: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Port-forward iniciado mas ainda não responde" -ForegroundColor Yellow
        Write-Host "   Aguarde mais alguns segundos e teste: http://localhost:8000/health" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Status do Port-Forward" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs disponíveis:" -ForegroundColor Yellow
Write-Host "  - http://localhost:8000/health" -ForegroundColor Green
Write-Host "  - http://192.168.15.17:8000/health (via proxy)" -ForegroundColor Green
Write-Host ""
Write-Host "Para parar o port-forward, feche a janela do PowerShell" -ForegroundColor Gray
Write-Host ""



