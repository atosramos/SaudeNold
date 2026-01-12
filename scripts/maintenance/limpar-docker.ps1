# Script para limpar Docker e liberar espaço

Write-Host "Limpando Docker para liberar espaço..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Isso vai remover:" -ForegroundColor Cyan
Write-Host "  - Containers parados" -ForegroundColor Gray
Write-Host "  - Imagens não utilizadas" -ForegroundColor Gray
Write-Host "  - Volumes não utilizados" -ForegroundColor Gray
Write-Host "  - Networks não utilizadas" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Executando limpeza..." -ForegroundColor Cyan
docker system prune -a --volumes -f

Write-Host ""
Write-Host "Espaço liberado! Verificando..." -ForegroundColor Green
docker system df

Write-Host ""
Write-Host "Agora tente iniciar o pod novamente:" -ForegroundColor Yellow
Write-Host "  kubectl delete pod -n saudenold -l app=backend" -ForegroundColor Gray
Write-Host "  kubectl get pods -n saudenold -l app=backend" -ForegroundColor Gray





















