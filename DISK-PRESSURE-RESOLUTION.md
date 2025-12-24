# Resolução do Problema de Disk-Pressure

## 📊 Situação Atual

O Kubernetes está detectando **disk-pressure** continuamente, causando eviction dos pods. O problema é que o kubelet precisa de aproximadamente **67GB de espaço livre** mas não consegue encontrar recursos para liberar.

## ✅ Ações Executadas

1. ✅ Limpeza de pods evicted
2. ✅ Limpeza do Docker (system prune)
3. ✅ Remoção de taint do nó
4. ✅ Tolerations adicionadas aos deployments
5. ✅ Pods sendo agendados com sucesso

## ⚠️ Problema Identificado

O problema **não é do Docker**, mas sim do **disco do sistema Windows**. O Kubernetes Docker Desktop monitora o espaço em disco do sistema operacional, não apenas do Docker.

### Evidências:
- Docker mostra espaço disponível
- Kubernetes continua detectando disk-pressure
- Kubelet tenta liberar 67GB mas não encontra recursos
- Pods são agendados mas depois evicted

## 🔧 Soluções Possíveis

### Opção 1: Liberar Espaço no Disco C: (Recomendado)

1. **Limpar arquivos temporários do Windows:**
   ```powershell
   # Limpar arquivos temporários
   Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
   Cleanmgr.exe /d C:
   ```

2. **Limpar cache do Windows:**
   - Executar "Limpeza de Disco" do Windows
   - Remover arquivos de atualização antigos
   - Limpar cache do navegador

3. **Verificar espaço usado por aplicativos:**
   ```powershell
   # Verificar espaço usado por diretórios grandes
   Get-ChildItem C:\ -Directory | ForEach-Object {
       $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1GB
       [PSCustomObject]@{Path=$_.FullName; SizeGB=[math]::Round($size,2)}
   } | Sort-Object SizeGB -Descending | Select-Object -First 10
   ```

### Opção 2: Ajustar Configurações do Kubernetes

1. **Aumentar threshold de disk-pressure:**
   - Editar configurações do Docker Desktop
   - Aumentar espaço alocado para Kubernetes
   - Ajustar limites de recursos

2. **Desabilitar garbage collection agressivo:**
   - Modificar configurações do kubelet (requer acesso root)

### Opção 3: Usar Cluster Kubernetes Externo

Se o problema persistir, considere:
- Usar um cluster Kubernetes em nuvem (GKE, EKS, AKS)
- Usar minikube com mais espaço alocado
- Usar kind com configurações de disco maiores

## 📝 Status dos Pods

Os pods estão sendo **agendados com sucesso** mas são **evicted** pelo kubelet devido ao disk-pressure. As tolerations permitem o agendamento, mas não impedem a eviction.

### Comandos para Monitorar:

```bash
# Ver status dos pods
kubectl get pods -n saudenold

# Ver eventos
kubectl get events -n saudenold --sort-by='.lastTimestamp'

# Ver status do nó
kubectl describe node docker-desktop

# Limpar pods evicted
kubectl get pods -n saudenold | grep Evicted | awk '{print $1}' | xargs kubectl delete pod -n saudenold
```

## 🎯 Próximos Passos Recomendados

1. **Liberar espaço no disco C:** (pelo menos 10-20GB livres)
2. **Reiniciar Docker Desktop** após liberar espaço
3. **Aguardar** o Kubernetes detectar espaço suficiente
4. **Monitorar** os pods iniciarem automaticamente

## 🔍 Verificação de Espaço

Para verificar espaço disponível:
```powershell
Get-PSDrive C | Select-Object Used,Free,@{Name='FreeGB';Expression={[math]::Round($_.Free/1GB,2)}}
```

**Recomendação:** Ter pelo menos **20GB livres** no disco C: para o Kubernetes operar normalmente.

## ⚡ Solução Rápida (Temporária)

Se precisar testar as correções de segurança imediatamente, pode usar **Docker Compose** localmente:

```bash
cd SaudeNold
docker-compose up -d
```

Isso não requer Kubernetes e permite testar todas as correções de segurança implementadas.

---

**Data:** 2025-12-24  
**Status:** Problema de infraestrutura (espaço em disco do sistema)  
**Solução:** Liberar espaço no disco C: do Windows

