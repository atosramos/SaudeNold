# 🔧 Corrigir Kubernetes Travado em "Starting vpnkit-controller and storage-provisioner"

## 🔴 Problema Identificado

O Kubernetes no Docker Desktop está travado na mensagem:
```
Starting Kubernetes cluster
Starting vpnkit-controller and storage-provisioner
```

Mesmo com centenas de GB livres no HD, o Kubernetes não consegue inicializar completamente.

## 🔍 Causas Possíveis

1. **Estado corrompido do Kubernetes** - Estado interno do cluster pode estar inconsistente
2. **Problemas com etcd** - Banco de dados do Kubernetes pode estar corrompido
3. **Storage-provisioner travado** - Componente responsável por provisionar volumes
4. **Pods evicted acumulados** - Milhares de pods antigos sobrecarregando o sistema
5. **Limite de disco do Docker Desktop** - Mesmo com espaço no HD, o Docker Desktop pode ter limite interno

## ✅ Soluções (em ordem de prioridade)

### Solução 1: Resetar Kubernetes no Docker Desktop (RECOMENDADO)

Esta é a solução mais eficaz para problemas de inicialização:

1. **Abrir Docker Desktop**
2. **Ir em Settings** (ícone de engrenagem)
3. **Selecionar "Kubernetes"** no menu lateral
4. **Desabilitar Kubernetes** (toggle OFF)
5. **Aguardar 30 segundos** para limpar o estado
6. **Habilitar Kubernetes novamente** (toggle ON)
7. **Aguardar 2-3 minutos** para inicialização completa
8. **Verificar status:**
   ```powershell
   kubectl get nodes
   kubectl get pods -n kube-system
   ```

### Solução 2: Reiniciar Docker Desktop Completamente

Se a Solução 1 não funcionar:

1. **Fechar Docker Desktop completamente**
   - Clicar com botão direito no ícone da bandeja
   - Selecionar "Quit Docker Desktop"
   - Aguardar 30 segundos
2. **Abrir Docker Desktop novamente**
3. **Aguardar Kubernetes inicializar** (pode levar 3-5 minutos)
4. **Verificar se inicializou:**
   ```powershell
   kubectl cluster-info
   kubectl get nodes
   ```

### Solução 3: Limpar Estado do Kubernetes Manualmente

Se as soluções anteriores não funcionarem:

```powershell
# 1. Desabilitar Kubernetes no Docker Desktop (Settings > Kubernetes)

# 2. Limpar configuração do kubectl (se necessário)
Remove-Item -Path "$env:USERPROFILE\.kube\config" -Force -ErrorAction SilentlyContinue

# 3. Limpar pods evicted (se o Kubernetes conseguir iniciar parcialmente)
kubectl delete pods --all-namespaces --field-selector=status.phase=Evicted --force --grace-period=0

# 4. Limpar recursos antigos
kubectl delete pods --all-namespaces --field-selector=status.phase=Failed --force --grace-period=0
```

### Solução 4: Verificar e Aumentar Disco do Docker Desktop

Mesmo com espaço no HD, o Docker Desktop pode ter um limite interno:

1. **Abrir Docker Desktop**
2. **Ir em Settings > Resources > Advanced**
3. **Verificar "Disk image size"** ou "Virtual disk limit"
4. **Aumentar para pelo menos 100GB** (recomendado: 200GB)
5. **Clicar em "Apply & Restart"**
6. **Aguardar reinicialização completa**

### Solução 5: Limpar Docker Completamente (ÚLTIMO RECURSO)

⚠️ **CUIDADO**: Isso remove TODOS os containers, imagens e volumes!

```powershell
# Parar Docker Desktop primeiro

# Limpar tudo
docker system prune -a --volumes --force

# Limpar volumes específicos
docker volume prune --force

# Reiniciar Docker Desktop
```

## 🔍 Diagnóstico

Para entender melhor o problema, execute:

```powershell
# Verificar se Kubernetes está respondendo
kubectl cluster-info

# Ver status dos nós
kubectl get nodes

# Ver pods do sistema
kubectl get pods -n kube-system

# Ver eventos recentes
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | Select-Object -Last 20

# Ver logs do storage-provisioner (se conseguir acessar)
kubectl logs -n kube-system -l app=storage-provisioner

# Ver logs do vpnkit-controller (se conseguir acessar)
kubectl logs -n kube-system -l app=vpnkit-controller
```

## 🎯 Solução Rápida (Script Automatizado)

Execute o script `fix-kubernetes-starting.ps1` que automatiza as soluções:

```powershell
cd SaudeNold
.\fix-kubernetes-starting.ps1
```

## ⚠️ Notas Importantes

1. **Tempo de inicialização**: O Kubernetes pode levar 2-5 minutos para inicializar completamente
2. **Primeira inicialização**: A primeira vez após reset pode levar mais tempo
3. **Recursos do sistema**: Certifique-se de que há memória RAM suficiente (mínimo 4GB recomendado)
4. **Antivírus**: Alguns antivírus podem interferir - considere adicionar exceções para Docker Desktop

## 📊 Verificação de Sucesso

Após aplicar as soluções, verifique:

```powershell
# 1. Kubernetes deve estar respondendo
kubectl cluster-info
# Deve mostrar: Kubernetes control plane is running at https://...

# 2. Nó deve estar Ready
kubectl get nodes
# Deve mostrar: docker-desktop   Ready

# 3. Pods do sistema devem estar Running
kubectl get pods -n kube-system
# Todos os pods principais devem estar Running (não Pending ou Error)

# 4. Storage-provisioner deve estar Running
kubectl get pods -n kube-system -l app=storage-provisioner
# Deve mostrar: Running
```

## 🚀 Próximos Passos

Após resolver o problema de inicialização:

1. **Verificar namespace do projeto:**
   ```powershell
   kubectl get namespaces
   ```

2. **Aplicar recursos do projeto:**
   ```powershell
   kubectl apply -k k8s/
   ```

3. **Verificar pods do projeto:**
   ```powershell
   kubectl get pods -n saudenold
   ```







