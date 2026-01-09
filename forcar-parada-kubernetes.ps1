# Script para forcar parada do Kubernetes quando travado em "Starting"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Forcar Parada do Kubernetes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se esta rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[AVISO] Algumas operacoes podem precisar de privilegios de administrador" -ForegroundColor Yellow
    Write-Host ""
}

# Passo 1: Tentar parar via kubectl (se estiver respondendo)
Write-Host "[1/6] Tentando parar recursos do Kubernetes..." -ForegroundColor Yellow
try {
    $kubeInfo = kubectl cluster-info 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Kubernetes esta respondendo, tentando limpar recursos..." -ForegroundColor Gray
        
        # Deletar todos os pods em todos os namespaces
        kubectl delete pods --all --all-namespaces --force --grace-period=0 2>&1 | Out-Null
        
        # Limpar pods evicted
        kubectl delete pods --all-namespaces --field-selector=status.phase=Evicted --force --grace-period=0 2>&1 | Out-Null
        
        Write-Host "  [OK] Recursos limpos" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Kubernetes nao esta respondendo (esperado se estiver travado)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel acessar Kubernetes" -ForegroundColor Yellow
}
Write-Host ""

# Passo 2: Parar processos do Docker relacionados ao Kubernetes
Write-Host "[2/6] Parando processos do Docker relacionados ao Kubernetes..." -ForegroundColor Yellow
try {
    # Parar containers relacionados ao Kubernetes
    docker ps -a --filter "name=kube" --format "{{.ID}}" | ForEach-Object {
        docker stop $_ 2>&1 | Out-Null
        docker rm $_ 2>&1 | Out-Null
    }
    
    # Parar containers do kube-system
    docker ps -a --filter "name=kube-system" --format "{{.ID}}" | ForEach-Object {
        docker stop $_ 2>&1 | Out-Null
        docker rm $_ 2>&1 | Out-Null
    }
    
    Write-Host "  [OK] Containers relacionados parados" -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Nao foi possivel parar containers" -ForegroundColor Yellow
}
Write-Host ""

# Passo 3: Matar processos do Kubernetes no Windows
Write-Host "[3/6] Parando processos do Kubernetes no Windows..." -ForegroundColor Yellow
try {
    # Processos relacionados ao Kubernetes
    $processes = @("kubectl", "kubelet", "kube-proxy", "kube-apiserver", "kube-scheduler", "kube-controller-manager", "etcd")
    
    foreach ($proc in $processes) {
        $procs = Get-Process -Name $proc -ErrorAction SilentlyContinue
        if ($procs) {
            foreach ($p in $procs) {
                Write-Host "  Parando processo: $($p.Name) (PID: $($p.Id))" -ForegroundColor Gray
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    Write-Host "  [OK] Processos parados" -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Nao foi possivel parar alguns processos" -ForegroundColor Yellow
}
Write-Host ""

# Passo 4: Parar Docker Desktop via WSL (se estiver usando WSL2 backend)
Write-Host "[4/6] Tentando parar Kubernetes via WSL2..." -ForegroundColor Yellow
try {
    # Verificar se WSL esta disponivel
    $wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslAvailable) {
        # Parar Docker Desktop no WSL
        wsl --shutdown 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        
        Write-Host "  [OK] WSL2 reiniciado" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] WSL2 nao disponivel" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel parar via WSL2" -ForegroundColor Yellow
}
Write-Host ""

# Passo 5: Limpar configuracao do Kubernetes
Write-Host "[5/6] Limpando configuracao do Kubernetes..." -ForegroundColor Yellow
try {
    $kubeConfig = "$env:USERPROFILE\.kube\config"
    if (Test-Path $kubeConfig) {
        Write-Host "  Backup da configuracao criado em: $kubeConfig.backup" -ForegroundColor Gray
        Copy-Item $kubeConfig "$kubeConfig.backup" -Force -ErrorAction SilentlyContinue
        
        # Nao deletar, apenas limpar contexto se necessario
        Write-Host "  [OK] Backup criado" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Arquivo de configuracao nao encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel limpar configuracao" -ForegroundColor Yellow
}
Write-Host ""

# Passo 6: Instrucoes finais
Write-Host "[6/6] Instrucoes finais..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Proximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora siga estes passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Feche o Docker Desktop completamente:" -ForegroundColor White
Write-Host "   - Clique com botao direito no icone do Docker na bandeja do sistema" -ForegroundColor Gray
Write-Host "   - Selecione 'Quit Docker Desktop'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Aguarde 30 segundos" -ForegroundColor White
Write-Host ""
Write-Host "3. Abra o Docker Desktop novamente" -ForegroundColor White
Write-Host ""
Write-Host "4. Vá em Settings > Kubernetes" -ForegroundColor White
Write-Host "   - Agora você deve conseguir DESABILITAR Kubernetes" -ForegroundColor Gray
Write-Host "   - Aguarde 30 segundos" -ForegroundColor Gray
Write-Host "   - HABILITE Kubernetes novamente" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Aguarde 2-3 minutos para inicializacao completa" -ForegroundColor White
Write-Host ""
Write-Host "Se ainda nao funcionar, tente:" -ForegroundColor Yellow
Write-Host "  - Reiniciar o computador" -ForegroundColor White
Write-Host "  - Verificar se ha processos do Docker ainda rodando:" -ForegroundColor White
Write-Host "    Get-Process | Where-Object {`$_.ProcessName -like '*docker*'}" -ForegroundColor Gray
Write-Host ""

# Verificar processos do Docker ainda rodando
Write-Host "Verificando processos do Docker ainda rodando..." -ForegroundColor Cyan
$dockerProcs = Get-Process | Where-Object { $_.ProcessName -like "*docker*" -or $_.ProcessName -like "*com.docker*" }
if ($dockerProcs) {
    Write-Host "  Processos encontrados:" -ForegroundColor Yellow
    $dockerProcs | ForEach-Object {
        Write-Host "    - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  Se o Docker Desktop nao fechar, voce pode forcar:" -ForegroundColor Yellow
    Write-Host "    Stop-Process -Name 'Docker Desktop' -Force" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Nenhum processo do Docker encontrado" -ForegroundColor Green
}
Write-Host ""





