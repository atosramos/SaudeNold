# Script para limpar e restaurar o ambiente K8s

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpeza e Restauração do K8s" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpar pods problemáticos
Write-Host "[1/5] Limpando pods problemáticos..." -ForegroundColor Yellow
kubectl delete pod -n saudenold --field-selector=status.phase!=Running --field-selector=status.phase!=Succeeded 2>$null
Write-Host "✓ Pods limpos" -ForegroundColor Green
Write-Host ""

# 2. Reconstruir imagem do backend
Write-Host "[2/5] Reconstruindo imagem do backend..." -ForegroundColor Yellow
cd backend
docker build -t saudenold-backend:latest . 2>&1 | Select-Object -Last 5
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Imagem construída com sucesso" -ForegroundColor Green
} else {
    Write-Host "✗ Erro ao construir imagem" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host ""

# 3. Verificar se imagem existe
Write-Host "[3/5] Verificando imagem..." -ForegroundColor Yellow
$imageExists = docker images saudenold-backend:latest --format "{{.Repository}}:{{.Tag}}"
if ($imageExists) {
    Write-Host "✓ Imagem encontrada: $imageExists" -ForegroundColor Green
} else {
    Write-Host "✗ Imagem não encontrada!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Recriar deployments
Write-Host "[4/5] Recriando deployments..." -ForegroundColor Yellow
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
Write-Host "✓ Deployments aplicados" -ForegroundColor Green
Write-Host ""

# 5. Aguardar pods iniciarem
Write-Host "[5/5] Aguardando pods iniciarem (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Status dos Pods" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
kubectl get pods -n saudenold

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Próximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se os pods estiverem Running:" -ForegroundColor Yellow
Write-Host "  1. kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor Gray
Write-Host "  2. Acesse: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Se ainda houver problemas:" -ForegroundColor Yellow
Write-Host "  1. Ver logs: kubectl logs -n saudenold -l app=backend" -ForegroundColor Gray
Write-Host "  2. Ver eventos: kubectl get events -n saudenold --sort-by='.lastTimestamp'" -ForegroundColor Gray
Write-Host ""




