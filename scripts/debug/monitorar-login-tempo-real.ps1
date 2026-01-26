# Script para monitorar logs do backend em tempo real durante tentativa de login
# Execute este script e depois tente fazer login no app

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Monitoramento de Login em Tempo Real" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai monitorar os logs do backend em tempo real." -ForegroundColor Yellow
Write-Host "Tente fazer login no app AGORA e observe os logs abaixo." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o monitoramento" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se kubectl está disponível
try {
    $null = kubectl version --client 2>&1
} catch {
    Write-Host "[ERRO] kubectl nao encontrado. Instale o kubectl primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se o namespace existe
$namespaceCheck = kubectl get namespace saudenold 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Namespace 'saudenold' nao encontrado." -ForegroundColor Red
    exit 1
}

Write-Host "Monitorando logs do backend..." -ForegroundColor Green
Write-Host "Filtros aplicados: login, POST, /api/auth, 192.168" -ForegroundColor Gray
Write-Host ""

# Monitorar logs com filtros
kubectl logs -n saudenold deployment/backend -f --tail=50 | ForEach-Object {
    $line = $_
    
    # Destacar linhas importantes
    if ($line -match "POST.*auth|login|192\.168\.0\.101|192\.168\.0\.|/api/auth/login") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "ERROR|Error|error|Exception|Failed|failed") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "INFO.*192\.168") {
        Write-Host $line -ForegroundColor Cyan
    } else {
        Write-Host $line -ForegroundColor Gray
    }
}
