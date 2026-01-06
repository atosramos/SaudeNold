# Forcar Parada do Kubernetes Travado

## Problema

O Kubernetes esta travado em "Starting" e nao e possivel desabilitar via interface do Docker Desktop porque o toggle nao aceita enquanto esta nesse estado.

## Solucao: Script de Forca Bruta

Execute o script para forcar a parada:

```powershell
cd SaudeNold
.\forcar-parada-kubernetes.ps1
```

## O que o script faz

1. **Tenta limpar recursos do Kubernetes** (se estiver respondendo)
2. **Para containers relacionados ao Kubernetes**
3. **Mata processos do Kubernetes no Windows**
4. **Reinicia WSL2** (se estiver usando WSL2 backend)
5. **Cria backup da configuracao do Kubernetes**
6. **Fornece instrucoes para proximos passos**

## Passos Manuais (se o script nao funcionar)

### Opcao 1: Fechar Docker Desktop Completamente

1. **Clicar com botao direito no icone do Docker** na bandeja do sistema
2. **Selecionar "Quit Docker Desktop"**
3. **Aguardar 30 segundos**
4. **Abrir Docker Desktop novamente**
5. **Tentar desabilitar Kubernetes novamente**

### Opcao 2: Matar Processos Manualmente

```powershell
# Ver processos do Docker
Get-Process | Where-Object { $_.ProcessName -like "*docker*" }

# Forcar parada do Docker Desktop
Stop-Process -Name "Docker Desktop" -Force

# Matar processos do Kubernetes (se existirem)
Stop-Process -Name "kubectl" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "kubelet" -Force -ErrorAction SilentlyContinue
```

### Opcao 3: Reiniciar WSL2

```powershell
# Parar WSL2 completamente
wsl --shutdown

# Aguardar alguns segundos
Start-Sleep -Seconds 5

# Abrir Docker Desktop novamente
```

### Opcao 4: Limpar Estado do Kubernetes

```powershell
# Fazer backup da configuracao
Copy-Item "$env:USERPROFILE\.kube\config" "$env:USERPROFILE\.kube\config.backup"

# Limpar contexto do Kubernetes (opcional - cuidado!)
# Remove-Item "$env:USERPROFILE\.kube\config" -Force
```

### Opcao 5: Reiniciar o Computador (Ultimo Recurso)

Se nada funcionar, reiniciar o computador geralmente resolve problemas de processos travados.

## Apos Forcar a Parada

1. **Abrir Docker Desktop**
2. **Ir em Settings > Kubernetes**
3. **Desabilitar Kubernetes** (agora deve funcionar)
4. **Aguardar 30 segundos**
5. **Habilitar Kubernetes novamente**
6. **Aguardar 2-3 minutos para inicializacao**

## Verificacao

Apos reiniciar, verifique se funcionou:

```powershell
# Verificar se Kubernetes esta respondendo
kubectl cluster-info

# Ver status dos nos
kubectl get nodes

# Ver pods do sistema
kubectl get pods -n kube-system
```

## Prevencao

Para evitar que isso aconteca novamente:

1. **Nao force parada do Docker Desktop** enquanto Kubernetes esta inicializando
2. **Aguarde sempre** que o Kubernetes terminar de inicializar antes de desabilitar
3. **Mantenha espaco em disco** suficiente (mesmo que o HD tenha espaco, verifique o limite do Docker Desktop)
4. **Limpe pods evicted regularmente:**
   ```powershell
   kubectl delete pods --all-namespaces --field-selector=status.phase=Evicted --force --grace-period=0
   ```

## Troubleshooting

### Se o Docker Desktop nao fechar

```powershell
# Listar processos
Get-Process | Where-Object { $_.ProcessName -like "*docker*" -or $_.ProcessName -like "*com.docker*" }

# Forcar parada
Stop-Process -Name "Docker Desktop" -Force
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.proxy" -Force -ErrorAction SilentlyContinue
```

### Se WSL2 nao parar

```powershell
# Ver distribuicoes WSL
wsl --list --verbose

# Parar todas
wsl --shutdown

# Se nao funcionar, reiniciar o servico
Restart-Service LxssManager
```

### Se ainda nao funcionar

1. **Reiniciar o computador** (sempre funciona)
2. **Verificar logs do Docker Desktop:**
   - Settings > Troubleshoot > View logs
3. **Verificar se ha antivirus bloqueando:**
   - Adicionar excecoes para Docker Desktop
4. **Verificar recursos do sistema:**
   - Memoria RAM suficiente (minimo 4GB)
   - CPU nao sobrecarregada





