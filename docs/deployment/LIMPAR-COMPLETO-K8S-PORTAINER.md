# Limpeza Completa do Kubernetes e Portainer

## Problema Identificado

Apos desinstalar e reinstalar o Docker Desktop, o Kubernetes continua travado em "Starting". Isso indica que ha **arquivos persistentes** que nao foram removidos durante a desinstalacao.

O problema comecou apos instalar o Portainer, que pode ter deixado recursos ou configuracoes que estao causando conflito.

## Solucao: Limpeza Completa

Execute o script para remover TODOS os arquivos persistentes:

```powershell
cd SaudeNold
.\limpar-completo-kubernetes-portainer.ps1
```

## O que o script remove

1. **Configuracao do kubectl** (`%USERPROFILE%\.kube\`)
   - Arquivo `config` com contextos do Kubernetes
   - Cache do kubectl
   - Credenciais antigas

2. **Dados do Docker Desktop**
   - `%LOCALAPPDATA%\Docker\`
   - `%APPDATA%\Docker\`
   - `%PROGRAMDATA%\Docker\`
   - Configuracoes persistentes

3. **Cache do Kubernetes**
   - Cache de imagens
   - Dados temporarios

4. **Dados do WSL2**
   - Para WSL2 backend (se estiver usando)

5. **Processos relacionados**
   - Processos do Kubernetes ainda rodando
   - Processos do Portainer

## Passos apos a limpeza

### 1. Reinstalar Docker Desktop

- Baixe a versao mais recente do site oficial
- Instale normalmente
- **NAO ative o Kubernetes ainda!**

### 2. Configurar Docker Desktop ANTES de ativar Kubernetes

1. Abra Docker Desktop
2. Va em **Settings > Resources > Advanced**
3. **Aumente "Disk image size"** para pelo menos **200GB** (recomendado: 256GB)
4. Clique em **Apply & Restart**
5. Aguarde reinicializacao completa

### 3. Limpar recursos Docker antigos

```powershell
docker system prune -a --volumes -f
```

### 4. AGORA ative o Kubernetes

1. Va em **Settings > Kubernetes**
2. **Habilite Kubernetes**
3. **Aguarde 2-3 minutos** para inicializacao completa
4. Verifique se funcionou:
   ```powershell
   kubectl cluster-info
   kubectl get nodes
   kubectl get pods -n kube-system
   ```

### 5. IMPORTANTE: NAO instale Portainer ainda!

- Aguarde alguns dias para garantir que o Kubernetes esta estavel
- Verifique se nao ha problemas de disk pressure
- Se quiser instalar Portainer depois, faca com cuidado e monitore

## Por que o Portainer pode ter causado o problema?

O Portainer pode ter deixado:

1. **PVC (Persistent Volume Claim) pendente**
   - O PVC do Portainer pode estar em estado "Pending"
   - Isso pode causar problemas no storage-provisioner

2. **Recursos do namespace portainer**
   - Deployments, Services, PVCs que nao foram removidos corretamente

3. **Configuracoes de StorageClass**
   - O Portainer usa StorageClass que pode ter conflitos

4. **Problemas com storage-provisioner**
   - O storage-provisioner pode ter ficado em estado inconsistente

## Limpeza manual (se o script nao funcionar)

### Remover configuracao do kubectl

```powershell
# Fazer backup primeiro
Copy-Item "$env:USERPROFILE\.kube" "$env:USERPROFILE\.kube.backup" -Recurse

# Remover
Remove-Item "$env:USERPROFILE\.kube" -Recurse -Force
```

### Remover dados do Docker Desktop

```powershell
# Fechar Docker Desktop primeiro!

# Remover dados
Remove-Item "$env:LOCALAPPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:PROGRAMDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
```

### Limpar WSL2

```powershell
# Parar WSL2
wsl --shutdown

# Se necessario, remover distribuicao do Docker
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
```

## Prevencao para o futuro

1. **Antes de instalar Portainer:**
   - Certifique-se de que o Kubernetes esta funcionando perfeitamente
   - Verifique se nao ha disk pressure
   - Verifique se o storage-provisioner esta funcionando

2. **Ao instalar Portainer:**
   - Monitore os recursos criados
   - Verifique se o PVC foi criado corretamente
   - Verifique se o pod iniciou

3. **Ao remover Portainer:**
   - Sempre remova o namespace completo:
     ```powershell
     kubectl delete namespace portainer
     ```
   - Verifique se todos os recursos foram removidos:
     ```powershell
     kubectl get all -n portainer
     kubectl get pvc -n portainer
     ```

4. **Manutencao regular:**
   - Limpe pods evicted regularmente
   - Monitore disk pressure
   - Limpe recursos nao utilizados

## Verificacao apos reinstalacao

Apos reinstalar e ativar Kubernetes, verifique:

```powershell
# 1. Kubernetes esta respondendo
kubectl cluster-info

# 2. No esta Ready
kubectl get nodes

# 3. Pods do sistema estao Running
kubectl get pods -n kube-system

# 4. Nao ha disk pressure
kubectl describe node docker-desktop | Select-String "DiskPressure"

# 5. Storage-provisioner esta funcionando
kubectl get pods -n kube-system -l app=storage-provisioner

# 6. Nao ha pods evicted
kubectl get pods --all-namespaces --field-selector=status.phase=Evicted
```

Se tudo estiver OK, o Kubernetes esta funcionando corretamente!





