# 🔄 Como Atualizar o Backend com as Novas Funcionalidades

## ⚠️ Código Ainda NÃO está nos Pods/Docker

O código foi atualizado localmente, mas **ainda precisa ser reconstruído e reimplantado**.

---

## 🐳 Opção 1: Docker Compose (Desenvolvimento Local)

### Passos:

```bash
cd SaudeNold

# 1. Parar containers atuais
docker-compose down

# 2. Rebuild da imagem com as mudanças
docker-compose build backend

# 3. Subir novamente
docker-compose up -d

# 4. Verificar logs
docker-compose logs -f backend
```

### Verificar se está funcionando:

```bash
# Ver status
docker-compose ps

# Testar endpoint
curl http://localhost:8000/health
```

---

## ☸️ Opção 2: Kubernetes (Produção/Desenvolvimento)

### Passo a Passo Completo:

#### 1. Rebuild da Imagem Docker

```bash
cd SaudeNold/backend

# Build da nova imagem
docker build -t saudenold-backend:latest .
```

#### 2. Disponibilizar Imagem para o Cluster

**Se usar Docker Desktop Kubernetes:**
```bash
# A imagem já está disponível localmente
# O deployment usa imagePullPolicy: Never, então vai usar a imagem local
```

**Se usar Minikube:**
```bash
# Carregar imagem no minikube
docker save saudenold-backend:latest | minikube image load -
```

**Se usar Kind:**
```bash
# Carregar imagem no kind
kind load docker-image saudenold-backend:latest
```

**Se usar Registry (Docker Hub, ECR, etc):**
```bash
# Tag e push
docker tag saudenold-backend:latest seu-registry/saudenold-backend:latest
docker push seu-registry/saudenold-backend:latest

# Atualizar backend-deployment.yaml para usar o registry
# image: seu-registry/saudenold-backend:latest
# imagePullPolicy: Always
```

#### 3. Reiniciar o Deployment

```bash
cd SaudeNold

# Opção A: Restart forçado (mais rápido)
kubectl rollout restart deployment/backend -n saudenold

# Opção B: Delete e recriar
kubectl delete pod -l app=backend -n saudenold

# Opção C: Reaplicar tudo (se mudou o deployment)
kubectl apply -k k8s/
```

#### 4. Verificar Status

```bash
# Ver pods
kubectl get pods -n saudenold

# Ver logs
kubectl logs -f deployment/backend -n saudenold

# Verificar se está pronto
kubectl wait --for=condition=ready pod -l app=backend -n saudenold --timeout=300s
```

---

## 📋 Scripts Disponíveis

### Usar Script Automático (se disponível):

```bash
# Linux/Mac
cd SaudeNold
./update-backend.sh

# Ou usar o script do k8s
cd k8s
./build-and-deploy.sh
```

---

## ✅ Checklist de Atualização

- [ ] Código atualizado localmente
- [ ] Dockerfile atualizado (já está ✅ - tem PyMuPDF)
- [ ] requirements.txt atualizado (já está ✅ - tem PyMuPDF==1.23.8)
- [ ] Rebuild da imagem Docker
- [ ] Imagem disponível para o cluster
- [ ] Deployment reiniciado
- [ ] Pods rodando e saudáveis
- [ ] Testar endpoint de exames médicos

---

## 🧪 Testar as Novas Funcionalidades

### 1. Testar Processamento de PDF (todas as páginas):

```bash
# Fazer um POST para /api/medical-exams com um PDF
curl -X POST http://localhost:8000/api/medical-exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_API_KEY" \
  -d '{
    "image_base64": "BASE64_DO_PDF_AQUI",
    "file_type": "pdf"
  }'
```

### 2. Verificar Logs:

```bash
# Docker Compose
docker-compose logs -f backend | grep -i "pdf\|ocr\|página"

# Kubernetes
kubectl logs -f deployment/backend -n saudenold | grep -i "pdf\|ocr\|página"
```

Você deve ver mensagens como:
- "PDF convertido para X imagem(ns). Total de páginas: X"
- "Processando página 1/X do PDF..."
- "OCR realizado com sucesso. Texto extraído: X caracteres"

---

## 🔍 Verificar se Está Funcionando

### No Kubernetes:

```bash
# Ver status do pod
kubectl describe pod -l app=backend -n saudenold

# Ver logs recentes
kubectl logs --tail=100 deployment/backend -n saudenold

# Testar health check
kubectl exec -it deployment/backend -n saudenold -- curl http://localhost:8000/health
```

### No Docker Compose:

```bash
# Ver status
docker-compose ps

# Testar health check
curl http://localhost:8000/health

# Ver logs
docker-compose logs backend | tail -50
```

---

## 🚨 Troubleshooting

### Problema: Pod não inicia

```bash
# Ver eventos
kubectl describe pod -l app=backend -n saudenold

# Ver logs anteriores (se crashou)
kubectl logs --previous deployment/backend -n saudenold
```

### Problema: Imagem não encontrada

```bash
# Verificar se imagem existe
docker images | grep saudenold-backend

# Se usar minikube, garantir que está carregada
minikube image ls | grep saudenold-backend
```

### Problema: Erro ao processar PDF

Verificar se PyMuPDF está instalado:
```bash
# No pod/container
kubectl exec -it deployment/backend -n saudenold -- python -c "import fitz; print('PyMuPDF OK')"
```

---

## 📝 Resumo Rápido

**Para Docker Compose:**
```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

**Para Kubernetes:**
```bash
cd backend
docker build -t saudenold-backend:latest .
cd ../k8s
kubectl rollout restart deployment/backend -n saudenold
```

**Verificar:**
```bash
# Logs
kubectl logs -f deployment/backend -n saudenold

# Status
kubectl get pods -n saudenold
```






