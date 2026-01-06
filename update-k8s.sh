#!/bin/bash

# Script para rebuildar e atualizar no Kubernetes

echo "🏗️  Building backend image..."
cd backend
docker build -t saudenold-backend:latest .
cd ..

echo "📦 Loading image to cluster..."
# Para minikube
if command -v minikube &> /dev/null; then
    echo "Loading image to minikube..."
    docker save saudenold-backend:latest | minikube image load -
fi

# Para kind
if command -v kind &> /dev/null; then
    echo "Loading image to kind..."
    kind load docker-image saudenold-backend:latest
fi

# Para Docker Desktop K8s, a imagem local já está disponível
echo "✅ Image built successfully"

echo "🔄 Restarting deployment..."
kubectl rollout restart deployment/backend -n saudenold

echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/backend -n saudenold

echo "✅ Backend updated in Kubernetes!"
echo "Check status with: kubectl get pods -n saudenold"
echo "View logs with: kubectl logs -f deployment/backend -n saudenold"




















