# Script para atualizar imagens e pods após correções de segurança
# Execute este script após fazer merge do PR de segurança

Write-Host "🔐 Atualizando imagens e pods com correções de segurança..." -ForegroundColor Cyan

# 1. Gerar API Key se não existir
Write-Host "`n1️⃣ Verificando API Key..." -ForegroundColor Yellow
$apiKey = Read-Host "Digite a API Key (ou pressione Enter para gerar uma nova)"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "Gerando nova API Key..." -ForegroundColor Yellow
    $apiKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
    Write-Host "API Key gerada: $apiKey" -ForegroundColor Green
}

# 2. Atualizar Secret do Kubernetes
Write-Host "`n2️⃣ Atualizando Secret do Kubernetes..." -ForegroundColor Yellow
$dbPassword = Read-Host "Digite a senha do banco de dados (ou pressione Enter para usar a padrão)" -AsSecureString
$dbPasswordPlain = if ($dbPassword) { 
    [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
} else { 
    "saudenold123" 
}

kubectl create secret generic backend-secret `
    --from-literal=API_KEY="$apiKey" `
    --from-literal=DATABASE_PASSWORD="$dbPasswordPlain" `
    --namespace=saudenold `
    --dry-run=client -o yaml | kubectl apply -f -

Write-Host "✅ Secret atualizado" -ForegroundColor Green

# 3. Rebuild da imagem Docker
Write-Host "`n3️⃣ Rebuild da imagem Docker..." -ForegroundColor Yellow
Set-Location backend
docker build -t saudenold-backend:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer build da imagem Docker" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Imagem Docker construída" -ForegroundColor Green
Set-Location ..

# 4. Carregar imagem no minikube (se estiver usando minikube)
Write-Host "`n4️⃣ Carregando imagem no Kubernetes..." -ForegroundColor Yellow
$minikubeStatus = minikube status 2>&1
if ($LASTEXITCODE -eq 0) {
    minikube image load saudenold-backend:latest
    Write-Host "✅ Imagem carregada no minikube" -ForegroundColor Green
} else {
    Write-Host "⚠️ Minikube não detectado, pulando carregamento de imagem" -ForegroundColor Yellow
    Write-Host "   Certifique-se de que a imagem está disponível no registry do Kubernetes" -ForegroundColor Yellow
}

# 5. Aplicar configurações do Kubernetes
Write-Host "`n5️⃣ Aplicando configurações do Kubernetes..." -ForegroundColor Yellow
Set-Location k8s
kubectl apply -k .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao aplicar configurações do Kubernetes" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Configurações aplicadas" -ForegroundColor Green
Set-Location ..

# 6. Reiniciar deployment para aplicar mudanças
Write-Host "`n6️⃣ Reiniciando deployment..." -ForegroundColor Yellow
kubectl rollout restart deployment/backend -n saudenold
kubectl rollout status deployment/backend -n saudenold --timeout=5m

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment reiniciado com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao reiniciar deployment" -ForegroundColor Red
    exit 1
}

# 7. Verificar status dos pods
Write-Host "`n7️⃣ Verificando status dos pods..." -ForegroundColor Yellow
kubectl get pods -n saudenold

Write-Host "`n✅ Atualização concluída!" -ForegroundColor Green
Write-Host "`n📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Atualize o app.json do frontend com a API Key: $apiKey" -ForegroundColor White
Write-Host "   2. Teste a API com: curl -H 'Authorization: Bearer $apiKey' http://localhost:8000/api/medications" -ForegroundColor White
Write-Host "   3. Verifique os logs: kubectl logs -f deployment/backend -n saudenold" -ForegroundColor White















