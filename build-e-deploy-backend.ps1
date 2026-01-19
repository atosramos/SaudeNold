# Script para buildar imagem Docker e fazer deploy no Kubernetes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build e Deploy Backend SaudeNold" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está rodando
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "  ✅ Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Verificar se kubectl está disponível
Write-Host "[2/6] Verificando kubectl..." -ForegroundColor Yellow
try {
    kubectl version --client | Out-Null
    Write-Host "  ✅ kubectl está disponível" -ForegroundColor Green
} catch {
    Write-Host "  ❌ kubectl não está disponível" -ForegroundColor Red
    exit 1
}

# Build da imagem Docker (sem cache)
Write-Host "[3/6] Buildando imagem Docker (sem cache)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
try {
    docker build --no-cache -t saudenold-backend:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Imagem buildada com sucesso (sem cache)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Erro ao buildar imagem" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ Erro ao buildar imagem: $_" -ForegroundColor Red
    exit 1
}

# Verificar se é Docker Desktop Kubernetes (não precisa carregar imagem)
Write-Host "[4/6] Verificando tipo de cluster..." -ForegroundColor Yellow
$clusterInfo = kubectl cluster-info 2>&1 | Out-String
if ($clusterInfo -like "*docker-desktop*" -or $clusterInfo -like "*docker-for-desktop*") {
    Write-Host "  ✅ Docker Desktop Kubernetes detectado" -ForegroundColor Green
    Write-Host "  ℹ️  Imagem já está disponível (imagePullPolicy: Never)" -ForegroundColor Gray
} elseif ($clusterInfo -like "*minikube*") {
    Write-Host "  ⚠️  Minikube detectado - carregando imagem..." -ForegroundColor Yellow
    docker save saudenold-backend:latest | minikube image load -
    Write-Host "  ✅ Imagem carregada no Minikube" -ForegroundColor Green
} elseif ($clusterInfo -like "*kind*") {
    Write-Host "  ⚠️  Kind detectado - carregando imagem..." -ForegroundColor Yellow
    kind load docker-image saudenold-backend:latest
    Write-Host "  ✅ Imagem carregada no Kind" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Tipo de cluster não identificado" -ForegroundColor Yellow
    Write-Host "  ℹ️  Assumindo que imagem está disponível" -ForegroundColor Gray
}

# Aplicar deployment no Kubernetes
Write-Host "[5/6] Aplicando deployment no Kubernetes..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
try {
    kubectl apply -k k8s/ 2>&1 | Out-Null
    Write-Host "  ✅ Deployment aplicado" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Erro ao aplicar deployment: $_" -ForegroundColor Red
    exit 1
}

# Aguardar pods ficarem prontos
Write-Host "[6/8] Aguardando pods ficarem prontos..." -ForegroundColor Yellow
Write-Host "  Aguardando backend..." -ForegroundColor Gray
try {
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n saudenold 2>&1 | Out-Null
    Write-Host "  ✅ Backend pronto" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Timeout aguardando backend (pode estar iniciando)" -ForegroundColor Yellow
}

# Reiniciar port-forward
Write-Host "[7/8] Reiniciando port-forward..." -ForegroundColor Yellow
try {
    # Encerrar port-forwards antigos
    Get-Process kubectl -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*port-forward*backend*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Iniciar novo port-forward em background
    Start-Process kubectl -ArgumentList "port-forward", "-n", "saudenold", "svc/backend", "8000:8000" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verificar se está rodando
    $portCheck = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
    if ($portCheck) {
        Write-Host "  ✅ Port-forward ativo na porta 8000" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Port-forward pode não estar ativo" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Erro ao reiniciar port-forward: $_" -ForegroundColor Yellow
}

# Testar health check
Write-Host "[8/8] Testando health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Health check OK" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  Health check retornou status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Health check FALHOU: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  ⚠️  Backend pode estar ainda iniciando. Aguarde alguns segundos e teste manualmente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build e Deploy Concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar status
Write-Host "Status dos Pods:" -ForegroundColor Yellow
kubectl get pods -n saudenold

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Verificar logs: kubectl logs -f deployment/backend -n saudenold" -ForegroundColor White
Write-Host "  2. Testar completo: .\testar-backend.ps1" -ForegroundColor White
Write-Host "  3. Acessar docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

