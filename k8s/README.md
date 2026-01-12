# Kubernetes Manifests - SaudeNold

## 📋 Arquivos Criados

- `namespace.yaml` - Namespace do projeto
- `postgres-configmap.yaml` - Configurações do PostgreSQL
- `postgres-secret.yaml` - Senha do PostgreSQL
- `postgres-pvc.yaml` - Volume persistente para dados
- `postgres-deployment.yaml` - Deployment do PostgreSQL
- `postgres-service.yaml` - Service do PostgreSQL
- `backend-configmap.yaml` - Configurações do Backend
- `backend-deployment.yaml` - Deployment do Backend
- `backend-service.yaml` - Service do Backend
- `backend-ingress.yaml` - Ingress para acesso externo
- `kustomization.yaml` - Kustomize para gerenciar tudo junto

## 🚀 Como Aplicar no Kubernetes

### Opção 1: Aplicar todos de uma vez (Recomendado)

```bash
# Aplicar todos os recursos
kubectl apply -k k8s/

# Ou usando kustomize diretamente
kubectl apply -f k8s/
```

### Opção 2: Aplicar individualmente

```bash
# 1. Criar namespace
kubectl apply -f k8s/namespace.yaml

# 2. PostgreSQL
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# 3. Backend
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-ingress.yaml
```

## 🔍 Verificar Status

```bash
# Ver todos os recursos no namespace
kubectl get all -n saudenold

# Ver pods
kubectl get pods -n saudenold

# Ver services
kubectl get svc -n saudenold

# Ver logs do backend
kubectl logs -f deployment/backend -n saudenold

# Ver logs do postgres
kubectl logs -f deployment/postgres -n saudenold
```

## 📦 Build e Push da Imagem Docker

Antes de aplicar o deployment do backend, você precisa:

### 1. Build da imagem

```bash
cd backend
docker build -t saudenold-backend:latest .
```

### 2. Tag para registry (se usar)

```bash
docker tag saudenold-backend:latest seu-registry/saudenold-backend:latest
docker push seu-registry/saudenold-backend:latest
```

### 3. Se usar Docker Desktop com Kubernetes local

```bash
# A imagem precisa estar disponível para o cluster
# Se usar kind ou minikube, você precisa carregar a imagem:
docker save saudenold-backend:latest | minikube image load -

# Ou com kind:
kind load docker-image saudenold-backend:latest
```

### 4. Ou usar imagePullPolicy: Never (apenas para desenvolvimento local)

Se você usar `imagePullPolicy: Never` no deployment, o Kubernetes tentará usar a imagem local.

## 🔌 Acessar Serviços

### Dentro do Cluster

- Backend: `http://backend.saudenold.svc.cluster.local:8000`
- PostgreSQL: `postgres.saudenold.svc.cluster.local:5432`

### Port Forward (para desenvolvimento)

```bash
# Backend
kubectl port-forward -n saudenold svc/backend 8000:8000

# PostgreSQL
kubectl port-forward -n saudenold svc/postgres 5432:5432
```

Depois acesse:
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

### Via Ingress

Se você configurou o Ingress com hostname, acesse:
- http://saudenold-backend.local

(Adicione ao `/etc/hosts` ou configure DNS)

## 🗑️ Remover Tudo

```bash
# Remover todos os recursos
kubectl delete -k k8s/

# Ou remover namespace (remove tudo dentro)
kubectl delete namespace saudenold
```

## ⚠️ Notas Importantes

1. **Imagem do Backend**: Você precisa buildar e disponibilizar a imagem antes de aplicar o deployment
2. **PersistentVolume**: O PVC precisa de um StorageClass disponível no cluster
3. **Ingress**: Requer um Ingress Controller instalado (ex: nginx-ingress)
4. **Secrets**: Em produção, use um gerenciador de secrets adequado

## 🔧 Para Produção

- Use Secrets adequados (não hardcoded)
- Configure Resource Limits apropriados
- Use HPA (Horizontal Pod Autoscaler) se necessário
- Configure Network Policies
- Use certificados SSL para o Ingress





















