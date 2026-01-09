# Testar Backend no Kubernetes

## ✅ Status Atual

O backend está rodando! Pod status: **Running**

## 🚀 Como Acessar

### 1. Fazer Port Forward

Em um terminal, execute (deixe rodando):

```bash
kubectl port-forward -n saudenold svc/backend 8000:8000
```

### 2. Testar Backend

Em outro terminal, teste se está funcionando:

```bash
# Health check
curl http://localhost:8000/health

# Ou no navegador
# Acesse: http://localhost:8000/docs
```

### 3. Rodar o App

```bash
cd SaudeNold
npm start
```

O app está configurado para usar `http://localhost:8000` ✅

## 🔧 Se o Pod Não Estiver Rodando

Se precisar rebuildar a imagem:

```bash
# 1. Buildar imagem
cd backend
docker build -t saudenold-backend:latest .
cd ..

# 2. Deletar pod para forçar recriar
kubectl delete pod -n saudenold -l app=backend

# 3. Verificar status
kubectl get pods -n saudenold
```

## 📊 Verificar Logs

```bash
# Logs do backend
kubectl logs -f deployment/backend -n saudenold

# Logs do postgres
kubectl logs -f deployment/postgres -n saudenold
```




















