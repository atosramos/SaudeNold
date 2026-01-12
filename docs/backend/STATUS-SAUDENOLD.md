# 📊 Status Atual do Projeto SaudeNold

## ✅ Recursos Ainda Existem

**IMPORTANTE**: Os recursos do projeto **NÃO foram eliminados**. Eles ainda existem, mas estão com problemas devido ao **Disk Pressure**.

## 📋 Status dos Recursos

### Namespace
- ✅ **Status**: `Active` (há 2d20h)
- ✅ Namespace `saudenold` existe e está ativo

### Deployments
- ✅ `backend` - Existe (mas 0/1 pods disponíveis)
- ✅ `postgres` - Existe (mas 0/1 pods disponíveis)

### Services
- ✅ `backend` - ClusterIP ativo (10.103.250.213:8000)
- ✅ `postgres` - ClusterIP ativo (10.102.228.20:5432)

### Persistent Volumes
- ✅ `postgres-pvc` - **Bound** (5Gi, funcionando corretamente)

### Pods

**Problema**: Os pods estão sendo criados mas depois são **Evicted** (removidos) pelo kubelet devido ao Disk Pressure.

#### Pods do Backend:
- Alguns em `Pending` (aguardando agendamento)
- Alguns `Evicted` (removidos por disk pressure)
- Alguns em `ContainerStatusUnknown` (estado desconhecido após eviction)

#### Pods do Postgres:
- Alguns em `Pending` (aguardando agendamento)
- Alguns `Evicted` (removidos por disk pressure)
- Alguns em `ContainerStatusUnknown` (estado desconhecido após eviction)

## 🔴 Causa do Problema: Disk Pressure

O kubelet está detectando **Disk Pressure** no nó e por isso:

1. **Não agenda novos pods** (ficam em `Pending`)
2. **Remove pods existentes** (marca como `Evicted`)

### Evidências nos Eventos:

```
Warning   Evicted   pod/backend-...   The node had condition: [DiskPressure].
Warning   Evicted   pod/postgres-...  The node had condition: [DiskPressure].
Warning   FailedScheduling   pod/...   0/1 nodes are available: 1 node(s) had untolerated taint {node.kubernetes.io/disk-pressure: }
```

## 🔧 Solução

### Passo 1: Resolver Disk Pressure

Siga as instruções em `DISK-PRESSURE-FIX.md`:

1. **Aumentar limite de disco no Docker Desktop**:
   - Docker Desktop → Settings → Resources → Advanced
   - Aumentar "Disk image size" para pelo menos 256GB
   - Apply & Restart

2. **Limpar recursos Docker**:
   ```powershell
   .\limpar-docker.ps1
   # ou
   docker system prune -a --volumes -f
   ```

3. **Remover taint manualmente** (temporário):
   ```powershell
   kubectl taint nodes docker-desktop node.kubernetes.io/disk-pressure:NoSchedule-
   ```

### Passo 2: Limpar Pods Evicted

Após resolver o disk pressure, limpe os pods evicted:

```powershell
# Ver pods evicted
kubectl get pods -n saudenold | Select-String "Evicted"

# Deletar pods evicted (serão recriados automaticamente pelos deployments)
kubectl delete pods -n saudenold --field-selector status.phase=Failed
```

### Passo 3: Verificar Recuperação

```powershell
# Aguardar alguns segundos e verificar
Start-Sleep -Seconds 10
kubectl get pods -n saudenold

# Se os pods estiverem Running, tudo está OK
```

## 📈 Resumo do Status

| Recurso | Status | Observação |
|---------|--------|------------|
| Namespace | ✅ Ativo | Funcionando |
| Deployments | ✅ Existem | 0/1 pods disponíveis |
| Services | ✅ Ativos | Funcionando |
| PVCs | ✅ Bound | Funcionando |
| Pods | ❌ Não rodando | Evicted/Pending por disk pressure |

## ⚠️ Dados Preservados

**Boa notícia**: Os dados estão preservados!
- O PVC do PostgreSQL está `Bound` e funcionando
- Os dados no volume persistente não foram afetados
- Após resolver o disk pressure, os pods serão recriados e os dados estarão disponíveis novamente

## 🔄 Comportamento Normal do Kubernetes

Este é o comportamento **normal** do Kubernetes quando há disk pressure:

1. O kubelet detecta falta de espaço
2. Marca o nó com taint `disk-pressure`
3. Para de agendar novos pods
4. Remove pods existentes (Evicted) para liberar espaço
5. **Os deployments tentam recriar os pods** (por isso você vê pods novos sendo criados)
6. Mas os novos pods também são Evicted ou ficam em Pending

**Solução**: Resolver o disk pressure. Após isso, tudo voltará ao normal automaticamente.



















