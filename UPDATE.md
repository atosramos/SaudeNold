# 🔄 Como Atualizar o Projeto

## 📱 Frontend (React Native/Expo)

O frontend **NÃO precisa de rebuild de Docker/Kubernetes**. Ele roda via `npm start` e tem hot reload automático.

### Após fazer mudanças no código:

1. **Se o servidor já está rodando:**
   - As mudanças são aplicadas automaticamente (hot reload)
   - No Expo Go: agite o dispositivo → "Reload" para forçar recarregar

2. **Se o servidor não está rodando:**
   ```bash
   npm start
   ```

3. **Limpar cache se necessário:**
   ```bash
   npm start -- --clear
   ```

---

## 🔧 Backend (FastAPI + PostgreSQL)

### Opção 1: Docker Compose

```bash
# Rebuild e restart
cd backend
docker build -t saudenold-backend:latest .
cd ..
docker-compose down
docker-compose up -d

# Ou use o script
./update-backend.sh
```

### Opção 2: Kubernetes

```bash
# 1. Rebuildar imagem
cd backend
docker build -t saudenold-backend:latest .
cd ..

# 2. Carregar imagem no cluster (se necessário)
# Para Docker Desktop K8s, a imagem local já está disponível
# Para minikube:
docker save saudenold-backend:latest | minikube image load -

# 3. Restartar deployment
kubectl rollout restart deployment/backend -n saudenold

# 4. Verificar status
kubectl rollout status deployment/backend -n saudenold

# Ou use o script
./update-k8s.sh
```

---

## 🔍 Verificar Status

### Docker Compose:
```bash
docker-compose ps
docker-compose logs -f backend
```

### Kubernetes:
```bash
kubectl get pods -n saudenold
kubectl logs -f deployment/backend -n saudenold
```

---

## ⚡ Mudanças Apenas no Frontend (Código React)

**NÃO precisa rebuildar Docker/Kubernetes!**

Basta:
1. Salvar o arquivo
2. O Expo faz hot reload automaticamente
3. Ou recarregar no Expo Go

---

## 📝 Resumo

| O que mudou? | O que fazer? |
|--------------|--------------|
| Código do frontend (app/) | Nada, hot reload automático |
| Código do backend | Rebuild Docker/K8s |
| Dependencies (package.json) | `npm install` + restart Expo |
| Backend dependencies | Rebuild Docker/K8s |





