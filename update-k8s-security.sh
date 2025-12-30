#!/bin/bash
# Script para atualizar imagens e pods após correções de segurança
# Execute este script após fazer merge do PR de segurança

set -e

echo "🔐 Atualizando imagens e pods com correções de segurança..."

# 1. Gerar API Key se não existir
echo ""
echo "1️⃣ Verificando API Key..."
read -p "Digite a API Key (ou pressione Enter para gerar uma nova): " api_key
if [ -z "$api_key" ]; then
    echo "Gerando nova API Key..."
    api_key=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "API Key gerada: $api_key"
fi

# 2. Atualizar Secret do Kubernetes
echo ""
echo "2️⃣ Atualizando Secret do Kubernetes..."
read -sp "Digite a senha do banco de dados (ou pressione Enter para usar a padrão): " db_password
echo ""
db_password=${db_password:-saudenold123}

kubectl create secret generic backend-secret \
    --from-literal=API_KEY="$api_key" \
    --from-literal=DATABASE_PASSWORD="$db_password" \
    --namespace=saudenold \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret atualizado"

# 3. Rebuild da imagem Docker
echo ""
echo "3️⃣ Rebuild da imagem Docker..."
cd backend
docker build -t saudenold-backend:latest .
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build da imagem Docker"
    exit 1
fi
echo "✅ Imagem Docker construída"
cd ..

# 4. Carregar imagem no minikube (se estiver usando minikube)
echo ""
echo "4️⃣ Carregando imagem no Kubernetes..."
if command -v minikube &> /dev/null && minikube status &> /dev/null; then
    minikube image load saudenold-backend:latest
    echo "✅ Imagem carregada no minikube"
else
    echo "⚠️ Minikube não detectado, pulando carregamento de imagem"
    echo "   Certifique-se de que a imagem está disponível no registry do Kubernetes"
fi

# 5. Aplicar configurações do Kubernetes
echo ""
echo "5️⃣ Aplicando configurações do Kubernetes..."
cd k8s
kubectl apply -k .
if [ $? -ne 0 ]; then
    echo "❌ Erro ao aplicar configurações do Kubernetes"
    exit 1
fi
echo "✅ Configurações aplicadas"
cd ..

# 6. Reiniciar deployment para aplicar mudanças
echo ""
echo "6️⃣ Reiniciando deployment..."
kubectl rollout restart deployment/backend -n saudenold
kubectl rollout status deployment/backend -n saudenold --timeout=5m

if [ $? -eq 0 ]; then
    echo "✅ Deployment reiniciado com sucesso"
else
    echo "❌ Erro ao reiniciar deployment"
    exit 1
fi

# 7. Verificar status dos pods
echo ""
echo "7️⃣ Verificando status dos pods..."
kubectl get pods -n saudenold

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Atualize o app.json do frontend com a API Key: $api_key"
echo "   2. Teste a API com: curl -H 'Authorization: Bearer $api_key' http://localhost:8000/api/medications"
echo "   3. Verifique os logs: kubectl logs -f deployment/backend -n saudenold"

