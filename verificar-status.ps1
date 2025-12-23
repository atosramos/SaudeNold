# Script para verificar status completo do projeto SaudeNold

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACAO DO PROJETO SAUDENOLD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Namespace
Write-Host "1. NAMESPACE:" -ForegroundColor Yellow
kubectl get namespace saudenold
Write-Host ""

# 2. Deployments
Write-Host "2. DEPLOYMENTS:" -ForegroundColor Yellow
kubectl get deployments -n saudenold
Write-Host ""

# 3. Services
Write-Host "3. SERVICES:" -ForegroundColor Yellow
kubectl get svc -n saudenold
Write-Host ""

# 4. PVCs
Write-Host "4. PERSISTENT VOLUMES:" -ForegroundColor Yellow
kubectl get pvc -n saudenold
Write-Host ""

# 5. Pods - Resumo
Write-Host "5. PODS (Resumo):" -ForegroundColor Yellow
kubectl get pods -n saudenold
Write-Host ""

# 6. Pods Evicted
Write-Host "6. PODS EVICTED:" -ForegroundColor Red
$evicted = kubectl get pods -n saudenold -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status.reason -eq "Evicted" }
if ($evicted) {
    $evicted | ForEach-Object {
        Write-Host "  - $($_.metadata.name)" -ForegroundColor Red
    }
} else {
    Write-Host "  Nenhum pod evicted" -ForegroundColor Green
}
Write-Host ""

# 7. Pods Pending
Write-Host "7. PODS PENDING:" -ForegroundColor Yellow
$pending = kubectl get pods -n saudenold -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status.phase -eq "Pending" }
if ($pending) {
    $pending | ForEach-Object {
        Write-Host "  - $($_.metadata.name)" -ForegroundColor Yellow
        if ($_.status.conditions) {
            $condition = $_.status.conditions | Where-Object { $_.type -eq "PodScheduled" -and $_.status -eq "False" } | Select-Object -First 1
            if ($condition) {
                Write-Host "    Motivo: $($condition.message)" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "  Nenhum pod pending" -ForegroundColor Green
}
Write-Host ""

# 8. Pods Running
Write-Host "8. PODS RUNNING:" -ForegroundColor Green
$running = kubectl get pods -n saudenold -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status.phase -eq "Running" }
if ($running) {
    $running | ForEach-Object {
        Write-Host "  - $($_.metadata.name)" -ForegroundColor Green
    }
} else {
    Write-Host "  Nenhum pod rodando" -ForegroundColor Red
}
Write-Host ""

# 9. Disk Pressure
Write-Host "9. DISK PRESSURE NO NO:" -ForegroundColor Yellow
$nodes = kubectl get nodes -o json | ConvertFrom-Json | Select-Object -ExpandProperty items
$diskPressure = $nodes | ForEach-Object {
    $_.status.conditions | Where-Object { $_.type -eq "DiskPressure" }
} | Select-Object -First 1

if ($diskPressure) {
    if ($diskPressure.status -eq "True") {
        Write-Host "  ATENCAO: DISK PRESSURE ATIVO!" -ForegroundColor Red
        Write-Host "  Mensagem: $($diskPressure.message)" -ForegroundColor Gray
        Write-Host "  Razao: $($diskPressure.reason)" -ForegroundColor Gray
    } else {
        Write-Host "  OK: Sem disk pressure" -ForegroundColor Green
    }
} else {
    Write-Host "  OK: Sem disk pressure" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIM DA VERIFICACAO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Sugestao de acao
if ($diskPressure -and $diskPressure.status -eq "True") {
    Write-Host "ACAO NECESSARIA:" -ForegroundColor Yellow
    Write-Host "   Resolver disk pressure primeiro (veja DISK-PRESSURE-FIX.md)" -ForegroundColor White
    Write-Host ""
}
