# 🔧 Corrigir Disk Pressure no Kubernetes

## 🔍 Problema Identificado

O Kubernetes está detectando **disk pressure** mesmo quando há espaço no HD físico. Isso acontece porque:

1. **Docker Desktop tem limite de disco virtual** - Mesmo que o HD tenha espaço, o Docker Desktop pode ter um limite interno configurado
2. **Volume Docker de 226GB** - Há um volume Docker anônimo usando 226GB que está consumindo espaço dentro do Docker Desktop
3. **Kubelet reaplica taint automaticamente** - O kubelet monitora o espaço e reaplica o taint quando detecta disk pressure

## ✅ Soluções

### Solução 1: Verificar Limite do Docker Desktop (RECOMENDADO)

1. Abra **Docker Desktop**
2. Vá em **Settings** (Configurações)
3. **Resources** → **Advanced**
4. Verifique o **Disk image size** configurado
5. Se necessário, **aumente o limite** e clique em **Apply & Restart**

### Solução 2: Limpar Volume Grande (CUIDADO!)

O volume `e34670359302d570e2eb69c2117b71b42be67e50cf654188db571b5c78b0cc2e` está usando 226GB.

```powershell
# Primeiro, verificar qual container usa esse volume
docker ps -a --filter volume=e34670359302d570e2eb69c2117b71b42be67e50cf654188db571b5c78b0cc2e

# Se não houver container usando, você pode remover (CUIDADO - pode perder dados!)
docker volume rm e34670359302d570e2eb69c2117b71b42be67e50cf654188db571b5c78b0cc2e
```

### Solução 3: Forçar Remoção do Taint (Temporário)

```powershell
# Remover taint
kubectl taint nodes docker-desktop node.kubernetes.io/disk-pressure:NoSchedule- --overwrite

# Verificar se foi removido
kubectl describe node docker-desktop | Select-String "Taints"
```

**⚠️ ATENÇÃO:** O kubelet pode reaplicar o taint automaticamente se ainda detectar disk pressure.

### Solução 4: Limpar Build Cache e Imagens Não Usadas

```powershell
# Limpar build cache (658MB)
docker builder prune -a -f

# Limpar imagens não usadas
docker image prune -a -f

# Limpar containers parados
docker container prune -f
```

### Solução 5: Reiniciar Docker Desktop

Às vezes, reiniciar o Docker Desktop pode resolver problemas de detecção de espaço:

1. Feche o Docker Desktop completamente
2. Abra novamente
3. Aguarde alguns minutos para o Kubernetes estabilizar

## 🔍 Verificar Estado Atual

```powershell
# Ver taints do nó
kubectl describe node docker-desktop | Select-String "Taints"

# Ver condições do nó
kubectl describe node docker-desktop | Select-String -Pattern "Conditions:" -Context 0,10

# Ver pods
kubectl get pods -n saudenold

# Ver eventos de disk pressure
kubectl get events -n saudenold --sort-by='.lastTimestamp' | Select-String "disk|pressure|evict"
```

## 📊 Após Corrigir

Depois de resolver o disk pressure:

1. Os pods devem iniciar automaticamente
2. Verificar status: `kubectl get pods -n saudenold`
3. Iniciar port-forward: `kubectl port-forward -n saudenold svc/backend 8000:8000`




















