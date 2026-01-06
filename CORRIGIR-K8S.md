# 🔧 Correção dos Erros nos Pods Kubernetes

## ❌ Problemas Identificados

### 1. **Disk Pressure (Falta de Espaço)**
- **Sintoma**: Pods em `Pending` com erro: `disk-pressure`
- **Causa**: Nó Kubernetes sem espaço suficiente
- **Impacto**: Novos pods não podem ser agendados

### 2. **ErrImageNeverPull (Imagem Não Encontrada)**
- **Sintoma**: Pods com erro: `Container image "saudenold-backend:latest" is not present`
- **Causa**: Imagem Docker não está disponível no cluster
- **Impacto**: Backend não consegue iniciar

### 3. **Pods Evicted (Expulsos)**
- **Sintoma**: Múltiplos pods com status `Evicted`
- **Causa**: Falta de recursos (disco/memória)
- **Impacto**: Deployments não funcionam corretamente

## ✅ Soluções

### Passo 1: Limpar Pods Problemáticos

```powershell
# Remover todos os pods evicted e failed
kubectl delete pod -n saudenold --field-selector=status.phase!=Running --field-selector=status.phase!=Succeeded

# Ou manualmente:
kubectl delete pod -n saudenold backend-6bbc98854b-7cpxr backend-777b7fdb4b-krfn4 postgres-5599495894-77q8p
```

### Passo 2: Reconstruir Imagem do Backend

```powershell
cd SaudeNold/backend

# Reconstruir a imagem
docker build -t saudenold-backend:latest .

# Verificar se foi criada
docker images saudenold-backend
```

### Passo 3: Liberar Espaço em Disco

#### Opção A: Limpar Docker (Recomendado)

```powershell
# Ver espaço usado
docker system df

# Limpar containers, imagens e volumes não usados
docker system prune -a --volumes -f
```

#### Opção B: Limpar Pods Antigos

```powershell
# Limpar pods completados/evicted
kubectl delete pod -n saudenold --field-selector=status.phase==Succeeded
kubectl delete pod -n saudenold --field-selector=status.phase==Failed
```

### Passo 4: Recriar Deployment do Backend

```powershell
cd SaudeNold

# Deletar deployment (isso vai deletar os pods também)
kubectl delete deployment backend -n saudenold

# Recriar deployment
kubectl apply -f k8s/backend-deployment.yaml

# Aguardar pod iniciar
kubectl get pods -n saudenold -l app=backend -w
```

### Passo 5: Verificar Estado Final

```powershell
# Ver pods
kubectl get pods -n saudenold

# Ver logs do backend (quando estiver rodando)
kubectl logs -n saudenold -l app=backend

# Ver eventos recentes
kubectl get events -n saudenold --sort-by='.lastTimestamp' | Select-Object -Last 20
```

## 🚀 Solução Completa Automatizada

Execute este script para corrigir tudo de uma vez:

```powershell
cd SaudeNold

# 1. Limpar pods problemáticos
kubectl delete pod -n saudenold --field-selector=status.phase!=Running --field-selector=status.phase!=Succeeded

# 2. Reconstruir imagem
cd backend
docker build -t saudenold-backend:latest .
cd ..

# 3. Recriar deployment
kubectl delete deployment backend -n saudenold
kubectl apply -f k8s/backend-deployment.yaml

# 4. Aguardar
Write-Host "Aguardando pod iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
kubectl get pods -n saudenold
```

## 🔍 Verificar Espaço em Disco

Se o problema persistir:

```powershell
# Ver uso de disco do Docker
docker system df -v

# Ver uso de disco do nó Kubernetes
kubectl top nodes

# Ver condições do nó
kubectl describe node docker-desktop
```

## 💡 Dica: Usar Docker Compose (Alternativa)

Se o problema de espaço no K8s persistir, use Docker Compose temporariamente:

```powershell
cd SaudeNold
docker-compose up -d
```

Isso roda localmente sem usar Kubernetes e evita problemas de recursos.



















