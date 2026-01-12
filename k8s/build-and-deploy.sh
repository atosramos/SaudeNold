#!/bin/bash

# Script para buildar imagem e fazer deploy no Kubernetes

echo "🏗️  Building backend image..."
cd backend
docker build -t saudenold-backend:latest .

echo "📦 Loading image to cluster..."
# Para minikube
if command -v minikube &> /dev/null; then
    docker save saudenold-backend:latest | minikube image load -
fi

# Para kind
if command -v kind &> /dev/null; then
    kind load docker-image saudenold-backend:latest
fi

echo "🚀 Deploying to Kubernetes..."
cd ..
kubectl apply -k k8s/

echo "⏳ Waiting for deployment..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n saudenold
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n saudenold

echo "✅ Deployment complete!"
echo "Check status with: kubectl get all -n saudenold"





















