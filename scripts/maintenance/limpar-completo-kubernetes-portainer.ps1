# Script para limpar COMPLETAMENTE Kubernetes e Portainer antes de reinstalar Docker Desktop

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpeza Completa Kubernetes e Portainer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai remover TODOS os arquivos e configuracoes" -ForegroundColor Yellow
Write-Host "relacionados ao Kubernetes e Portainer que podem estar" -ForegroundColor Yellow
Write-Host "causando problemas na inicializacao." -ForegroundColor Yellow
Write-Host ""
Write-Host "ATENCAO: Isso vai remover:" -ForegroundColor Red
Write-Host "  - Configuracoes do kubectl" -ForegroundColor Gray
Write-Host "  - Dados do Docker Desktop (se estiver fechado)" -ForegroundColor Gray
Write-Host "  - Dados do WSL2 relacionados ao Docker" -ForegroundColor Gray
Write-Host "  - Cache do Kubernetes" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "Deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Verificar se Docker Desktop esta rodando
Write-Host "[1/8] Verificando se Docker Desktop esta rodando..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [AVISO] Docker Desktop esta rodando!" -ForegroundColor Red
        Write-Host "  Por favor, feche o Docker Desktop antes de continuar." -ForegroundColor Yellow
        Write-Host "  Execute: .\forcar-fechar-docker.ps1" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "  [OK] Docker Desktop nao esta rodando" -ForegroundColor Green
}
Write-Host ""

# Limpar configuracao do kubectl
Write-Host "[2/8] Limpando configuracao do kubectl..." -ForegroundColor Yellow
$kubeDir = "$env:USERPROFILE\.kube"
if (Test-Path $kubeDir) {
    Write-Host "  Criando backup em: $kubeDir.backup" -ForegroundColor Gray
    try {
        Copy-Item $kubeDir "$kubeDir.backup" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $kubeDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Configuracao do kubectl removida" -ForegroundColor Green
    } catch {
        Write-Host "  [AVISO] Nao foi possivel remover completamente" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [OK] Diretorio .kube nao existe" -ForegroundColor Green
}
Write-Host ""

# Limpar dados do Docker Desktop
Write-Host "[3/8] Limpando dados do Docker Desktop..." -ForegroundColor Yellow
$dockerPaths = @(
    "$env:LOCALAPPDATA\Docker",
    "$env:APPDATA\Docker",
    "$env:PROGRAMDATA\Docker",
    "$env:PROGRAMDATA\DockerDesktop"
)

foreach ($path in $dockerPaths) {
    if (Test-Path $path) {
        Write-Host "  Removendo: $path" -ForegroundColor Gray
        try {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "    [OK] Removido" -ForegroundColor Green
        } catch {
            Write-Host "    [AVISO] Nao foi possivel remover (pode estar em uso)" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Limpar cache do Kubernetes
Write-Host "[4/8] Limpando cache do Kubernetes..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:USERPROFILE\.kube\cache",
    "$env:LOCALAPPDATA\kubectl",
    "$env:APPDATA\kubectl"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Write-Host "  Removendo: $path" -ForegroundColor Gray
        try {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "    [OK] Removido" -ForegroundColor Green
        } catch {
            Write-Host "    [AVISO] Nao foi possivel remover" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Limpar dados do WSL2 relacionados ao Docker
Write-Host "[5/8] Limpando dados do WSL2 relacionados ao Docker..." -ForegroundColor Yellow
try {
    $wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslAvailable) {
        Write-Host "  Parando WSL2..." -ForegroundColor Gray
        wsl --shutdown 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        
        # Limpar dados do Docker no WSL
        $wslDataPath = "$env:USERPROFILE\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\rootfs\mnt\wsl"
        if (Test-Path $wslDataPath) {
            Write-Host "  [AVISO] Dados do WSL encontrados (pode precisar limpar manualmente)" -ForegroundColor Yellow
        }
        
        Write-Host "  [OK] WSL2 parado" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] WSL2 nao disponivel" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel limpar WSL2" -ForegroundColor Yellow
}
Write-Host ""

# Limpar variaveis de ambiente relacionadas
Write-Host "[6/8] Verificando variaveis de ambiente..." -ForegroundColor Yellow
$envVars = @("KUBECONFIG", "KUBERNETES_SERVICE_HOST", "KUBERNETES_SERVICE_PORT")
$found = $false
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "User")
    if ($value) {
        Write-Host "  Encontrada: $var = $value" -ForegroundColor Gray
        $found = $true
    }
}
if (-not $found) {
    Write-Host "  [OK] Nenhuma variavel de ambiente encontrada" -ForegroundColor Green
} else {
    Write-Host "  [AVISO] Variaveis encontradas (remova manualmente se necessario)" -ForegroundColor Yellow
}
Write-Host ""

# Limpar processos relacionados (se ainda estiverem rodando)
Write-Host "[7/8] Verificando processos relacionados..." -ForegroundColor Yellow
$processes = @("kubectl", "kubelet", "kube-proxy", "kube-apiserver", "kube-scheduler", "kube-controller-manager", "etcd", "portainer")
$found = $false
foreach ($procName in $processes) {
    $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host "  Processo encontrado: $procName" -ForegroundColor Gray
        foreach ($proc in $procs) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "    [OK] Parado (PID: $($proc.Id))" -ForegroundColor Green
            } catch {
                Write-Host "    [AVISO] Nao foi possivel parar" -ForegroundColor Yellow
            }
        }
        $found = $true
    }
}
if (-not $found) {
    Write-Host "  [OK] Nenhum processo relacionado encontrado" -ForegroundColor Green
}
Write-Host ""

# Resumo final
Write-Host "[8/8] Resumo da limpeza..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpeza Concluida" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivos e configuracoes removidos:" -ForegroundColor Green
Write-Host "  [OK] Configuracao do kubectl (.kube)" -ForegroundColor Gray
Write-Host "  [OK] Dados do Docker Desktop" -ForegroundColor Gray
Write-Host "  [OK] Cache do Kubernetes" -ForegroundColor Gray
Write-Host "  [OK] WSL2 parado" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Proximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. REINSTALE o Docker Desktop:" -ForegroundColor Yellow
Write-Host "   - Baixe a versao mais recente do site oficial" -ForegroundColor White
Write-Host "   - Instale normalmente" -ForegroundColor White
Write-Host ""
Write-Host "2. APOS instalar, NAO ative o Kubernetes ainda!" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Primeiro, limpe recursos Docker antigos:" -ForegroundColor Yellow
Write-Host "   docker system prune -a --volumes -f" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure o Docker Desktop:" -ForegroundColor Yellow
Write-Host "   - Settings > Resources > Advanced" -ForegroundColor White
Write-Host "   - Aumente 'Disk image size' para pelo menos 200GB" -ForegroundColor White
Write-Host "   - Apply & Restart" -ForegroundColor White
Write-Host ""
Write-Host "5. AGORA ative o Kubernetes:" -ForegroundColor Yellow
Write-Host "   - Settings > Kubernetes" -ForegroundColor White
Write-Host "   - Habilite Kubernetes" -ForegroundColor White
Write-Host "   - Aguarde 2-3 minutos para inicializacao" -ForegroundColor White
Write-Host ""
Write-Host "6. IMPORTANTE: NAO instale o Portainer ainda!" -ForegroundColor Red
Write-Host "   - Verifique se o Kubernetes esta funcionando corretamente" -ForegroundColor White
Write-Host "   - Aguarde alguns dias para garantir estabilidade" -ForegroundColor White
Write-Host "   - Se quiser instalar Portainer depois, faca com cuidado" -ForegroundColor White
Write-Host ""
Write-Host "7. Verifique se esta funcionando:" -ForegroundColor Yellow
Write-Host "   kubectl cluster-info" -ForegroundColor Gray
Write-Host "   kubectl get nodes" -ForegroundColor Gray
Write-Host "   kubectl get pods -n kube-system" -ForegroundColor Gray
Write-Host ""





