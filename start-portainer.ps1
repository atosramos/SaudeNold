# Script para iniciar port-forward do Portainer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Portainer Port-Forward" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o namespace existe
Write-Host "Verificando namespace portainer..." -ForegroundColor Yellow
$namespace = kubectl get namespace portainer 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Namespace portainer não encontrado!" -ForegroundColor Red
    Write-Host "Instale o Portainer primeiro:" -ForegroundColor Yellow
    Write-Host "  kubectl apply -n portainer -f https://raw.githubusercontent.com/portainer/k8s/master/deploy/manifests/portainer/portainer.yaml" -ForegroundColor Gray
    exit 1
}

# Verificar se o serviço existe
Write-Host "Verificando serviço..." -ForegroundColor Yellow
$service = kubectl get svc -n portainer portainer 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Serviço portainer não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar status do pod
Write-Host "Verificando status do pod..." -ForegroundColor Yellow
$podStatus = kubectl get pods -n portainer -l app=portainer -o jsonpath='{.items[0].status.phase}' 2>&1
Write-Host "Status do pod: $podStatus" -ForegroundColor Cyan

if ($podStatus -ne "Running") {
    Write-Host ""
    Write-Host "⚠️  AVISO: O pod do Portainer não está rodando (Status: $podStatus)" -ForegroundColor Yellow
    Write-Host "Isso pode ser devido ao disk pressure no cluster." -ForegroundColor Yellow
    Write-Host "O port-forward pode não funcionar até o pod estar Running." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verificar motivo:" -ForegroundColor Cyan
    Write-Host "  kubectl describe pod -n portainer -l app=portainer" -ForegroundColor Gray
    Write-Host ""
    
    $continue = Read-Host "Continuar mesmo assim? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        Write-Host "Cancelado." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Port-Forward Iniciado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse o Portainer em:" -ForegroundColor Yellow
Write-Host "  HTTP:  http://localhost:9000" -ForegroundColor Green
Write-Host "  HTTPS: https://localhost:9443" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o port-forward" -ForegroundColor Yellow
Write-Host ""

# Iniciar port-forward
kubectl port-forward -n portainer svc/portainer 9000:9000 9443:9443




