# Script para limpar pods evicted do namespace saudenold

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpando Pods Evicted" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Listar pods evicted
Write-Host "Pods Evicted encontrados:" -ForegroundColor Yellow
$evictedPods = kubectl get pods -n saudenold -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Where-Object { $_.status.reason -eq "Evicted" }

if (-not $evictedPods) {
    Write-Host "Nenhum pod evicted encontrado." -ForegroundColor Green
    exit 0
}

$evictedPods | ForEach-Object {
    Write-Host "  - $($_.metadata.name)" -ForegroundColor Yellow
}

Write-Host ""
$confirm = Read-Host "Deseja deletar estes pods? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deletando pods evicted..." -ForegroundColor Yellow

# Deletar pods evicted
$evictedPods | ForEach-Object {
    Write-Host "  Deletando $($_.metadata.name)..." -ForegroundColor Gray
    kubectl delete pod -n saudenold $_.metadata.name
}

Write-Host ""
Write-Host "OK: Pods evicted deletados!" -ForegroundColor Green
Write-Host ""
Write-Host "Os deployments recriarão os pods automaticamente." -ForegroundColor Cyan
Write-Host "Verifique o status com: .\verificar-status.ps1" -ForegroundColor Cyan

