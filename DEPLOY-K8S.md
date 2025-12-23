# Deploy no Kubernetes - Guia Rápido

## ⚠️ Por que não estava visível?

O `docker-compose.yml` é apenas para Docker Compose (desenvolvimento local), não funciona no Kubernetes. Para K8s, precisamos de **manifests YAML**.

## 🚀 Passos para Deploy

### 1. Buildar Imagem do Backend

```bash
cd backend
docker build -t saudenold-backend:latest .
cd ..
```

### 2. Carregar Imagem no Cluster (se usar Docker Desktop K8s)

Para Docker Desktop, a imagem já está disponível. Para outros clusters:

```bash
# Minikube
docker save saudenold-backend:latest | minikube image load -

# Kind
kind load docker-image saudenold-backend:latest
```

### 3. Aplicar Manifests no Kubernetes

```bash
# Aplicar tudo de uma vez
kubectl apply -k k8s/
```

### 4. Verificar Status

```bash
# Ver todos os recursos
kubectl get all -n saudenold

# Ver pods
kubectl get pods -n saudenold

# Ver se está rodando
kubectl get pods -n saudenold -w
```

### 5. Acessar os Serviços

#### Via Port Forward:

```bash
# Backend (porta 8000)
kubectl port-forward -n saudenold svc/backend 8000:8000

# PostgreSQL (porta 5432) - se necessário
kubectl port-forward -n saudenold svc/postgres 5432:5432
```

Depois acesse: http://localhost:8000/docs

#### Ver Logs:

```bash
# Backend
kubectl logs -f deployment/backend -n saudenold

# PostgreSQL
kubectl logs -f deployment/postgres -n saudenold
```

## 📋 Recursos Criados

No namespace `saudenold` você terá:

- ✅ **Namespace**: saudenold
- ✅ **PostgreSQL**: Deployment + Service + PVC
- ✅ **Backend**: Deployment + Service + Ingress
- ✅ **ConfigMaps**: Configurações
- ✅ **Secrets**: Senhas

## 🔍 Verificar no Dashboard (se tiver)

```bash
kubectl get namespaces
# Você deve ver "saudenold" na lista
```

## ⚙️ Configurações Importantes

### DATABASE_URL
Está configurado para usar o service interno do K8s:
```
postgresql://saudenold:saudenold123@postgres.saudenold.svc.cluster.local:5432/saudenold
```

### Imagem do Backend
- Nome: `saudenold-backend:latest`
- Pull Policy: `Never` (usa imagem local)
- Se usar registry, altere no `backend-deployment.yaml`

## 🗑️ Para Remover

```bash
kubectl delete namespace saudenold
```

## ⚠️ Troubleshooting

### Pod não inicia
```bash
kubectl describe pod <nome-do-pod> -n saudenold
```

### Erro de conexão com banco
- Verifique se o postgres está rodando: `kubectl get pods -n saudenold`
- Verifique logs: `kubectl logs deployment/postgres -n saudenold`

### Imagem não encontrada
- Build a imagem: `docker build -t saudenold-backend:latest ./backend`
- Para Docker Desktop K8s, a imagem local já está disponível
- Para outros clusters, use o comando de load apropriado





