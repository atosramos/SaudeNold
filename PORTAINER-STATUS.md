# 🔍 Status Atual do Portainer

## ⚠️ Problemas Identificados

### 1. Pod em Pending

O pod do Portainer está em `Pending` e não pode iniciar devido a:

#### Problema A: PVC Não Vinculado
```
STATUS: Pending
StorageClass: hostpath
Provisioner: docker.io/hostpath
```

**Causa**: O storage-provisioner (`storage-provisioner` no namespace `kube-system`) está em estado **Error**, então não consegue criar o PersistentVolume para o PVC do Portainer.

**Verificar**:
```powershell
kubectl get pods -n kube-system | Select-String "storage-provisioner"
kubectl describe pod -n kube-system -l app=storage-provisioner
```

#### Problema B: Disk Pressure no Nó
```
Type: DiskPressure
Status: True
Message: kubelet has disk pressure
```

O nó do Kubernetes está com disk pressure, o que impede novos pods de serem agendados.

**Verificar**:
```powershell
kubectl get nodes -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Select-Object -ExpandProperty status | Select-Object -ExpandProperty conditions | Where-Object { $_.type -eq "DiskPressure" }
```

## 🔧 Solução Passo a Passo

### Passo 1: Verificar Status Atual

```powershell
# Ver pod do Portainer
kubectl get pods -n portainer

# Ver PVC
kubectl get pvc -n portainer

# Ver storage provisioner
kubectl get pods -n kube-system | Select-String "storage-provisioner"

# Ver disk pressure
kubectl get nodes -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Select-Object -ExpandProperty status | Select-Object -ExpandProperty conditions | Where-Object { $_.type -eq "DiskPressure" } | Format-List
```

### Passo 2: Resolver Disk Pressure

Siga as instruções em `DISK-PRESSURE-FIX.md`:

1. Aumentar o limite de disco no Docker Desktop:
   - Docker Desktop → Settings → Resources → Advanced
   - Aumentar "Disk image size" para pelo menos 256GB
   - Apply & Restart

2. Limpar recursos Docker:
   ```powershell
   .\limpar-docker.ps1
   # ou
   docker system prune -a --volumes -f
   ```

3. Remover taint manualmente (temporário):
   ```powershell
   kubectl taint nodes docker-desktop node.kubernetes.io/disk-pressure:NoSchedule-
   ```

### Passo 3: Reiniciar Storage Provisioner

Após resolver o disk pressure:

```powershell
# Verificar storage provisioner
kubectl get pods -n kube-system | Select-String "storage"

# Se estiver em Error, deletar (será recriado automaticamente pelo Docker Desktop)
kubectl delete pod -n kube-system storage-provisioner

# Aguardar alguns segundos e verificar se reiniciou
Start-Sleep -Seconds 10
kubectl get pods -n kube-system | Select-String "storage"
```

**Nota**: No Docker Desktop, o storage-provisioner é recriado automaticamente. Se não for recriado, pode ser necessário:
1. Reiniciar o Docker Desktop completamente
2. Ou resolver o disk pressure primeiro (ele pode estar impedindo a recriação)

### Passo 4: Verificar PVC

Após o storage provisioner reiniciar, o PVC deve ser criado:

```powershell
# Aguardar alguns segundos e verificar
kubectl get pvc -n portainer

# Se ainda estiver Pending, ver eventos
kubectl describe pvc -n portainer portainer
```

### Passo 5: Verificar Pod do Portainer

Após o PVC ser vinculado e o disk pressure resolvido, o pod deve iniciar:

```powershell
# Verificar status
kubectl get pods -n portainer

# Se estiver Running, pode fazer port-forward
kubectl port-forward -n portainer svc/portainer 9000:9000 9443:9443
```

## 📊 Status Atual Detalhado

**PVC Status**: `Pending` (aguardando storage-provisioner)
**Pod Status**: `Pending` (PVC não vinculado + disk pressure)
**Storage Provisioner**: `Error` (precisa reiniciar após resolver disk pressure)
**Disk Pressure**: `True` (nó com pressão de disco)

## ⏭️ Próximos Passos

1. ✅ Resolver disk pressure primeiro (prioritário)
2. ✅ Reiniciar storage-provisioner
3. ✅ Aguardar PVC ser vinculado
4. ✅ Pod do Portainer deve iniciar automaticamente
5. ✅ Fazer port-forward e acessar interface web

