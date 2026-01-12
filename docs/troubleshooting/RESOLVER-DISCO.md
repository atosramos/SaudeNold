# ❌ Problema: Falta de Espaço em Disco (Disk Pressure)

## 🔍 Diagnóstico

O cluster Kubernetes está com **falta de espaço em disco** (`disk-pressure`). Por isso:
- Pods estão sendo "Evicted" (expulsos)
- Novos pods ficam em "Pending"
- O backend não consegue iniciar

## ✅ Soluções

### Solução 1: Limpar Docker (Recomendado)

```powershell
# Limpar containers, imagens e volumes não utilizados
docker system prune -a --volumes

# Ou apenas imagens e containers parados
docker system prune -a
```

### Solução 2: Limpar Imagens Docker Antigas

```powershell
# Ver imagens grandes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | Sort-Object

# Remover imagens específicas (cuidado!)
docker rmi <image-id>
```

### Solução 3: Limpar Volumes Kubernetes Não Usados

```powershell
# Ver volumes
kubectl get pvc -n saudenold

# Limpar pods evicted
kubectl delete pod --field-selector=status.phase==Failed -n saudenold --all-namespaces
```

### Solução 4: Aumentar Espaço no Docker Desktop

1. Abra **Docker Desktop**
2. Vá em **Settings** (Configurações)
3. **Resources** → **Advanced**
4. Aumente o **Disk image size** (ex: de 64GB para 128GB)
5. Clique em **Apply & Restart**

### Solução 5: Usar Docker Compose ao Invés de K8s (Temporário)

Enquanto resolve o espaço, você pode usar Docker Compose:

```powershell
cd SaudeNold
docker-compose up -d
```

Isso roda localmente sem usar o K8s.

## 🔧 Verificar Espaço

```powershell
# Espaço usado pelo Docker
docker system df

# Ver o que está ocupando espaço
docker system df -v
```

## ⚡ Solução Rápida (Limpar Agora)

```powershell
# Limpar tudo não utilizado (cuidado - remove coisas não usadas!)
docker system prune -a --volumes -f

# Depois, tentar novamente
kubectl delete pod -n saudenold -l app=backend
kubectl scale deployment backend --replicas=1 -n saudenold
```

## 📊 Depois de Limpar

Após liberar espaço:

1. Verificar se o pod inicia:
```powershell
kubectl get pods -n saudenold
```

2. Se estiver Running, iniciar port-forward:
```powershell
kubectl port-forward -n saudenold svc/backend 8000:8000
```





















