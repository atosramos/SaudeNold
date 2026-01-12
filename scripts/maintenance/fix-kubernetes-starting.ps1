# Script para corrigir Kubernetes travado em "Starting vpnkit-controller and storage-provisioner"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Correcao do Kubernetes Travado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker Desktop esta rodando
Write-Host "[1/7] Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker Desktop esta rodando" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Docker Desktop nao esta rodando!" -ForegroundColor Red
        Write-Host "  Por favor, inicie o Docker Desktop primeiro." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERRO] Docker Desktop nao esta rodando!" -ForegroundColor Red
    Write-Host "  Por favor, inicie o Docker Desktop primeiro." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Verificar se Kubernetes esta habilitado
Write-Host "[2/7] Verificando status do Kubernetes..." -ForegroundColor Yellow
$kubeRunning = $false
try {
    $kubeInfo = kubectl cluster-info 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $kubeInfo) {
        Write-Host "[OK] Kubernetes esta respondendo" -ForegroundColor Green
        $kubeRunning = $true
    } else {
        Write-Host "[AVISO] Kubernetes nao esta respondendo (pode estar travado)" -ForegroundColor Yellow
        $kubeRunning = $false
    }
} catch {
    Write-Host "[AVISO] Kubernetes nao esta respondendo" -ForegroundColor Yellow
    $kubeRunning = $false
}
Write-Host ""

# Tentar limpar pods evicted (se Kubernetes estiver parcialmente funcional)
if ($kubeRunning) {
    Write-Host "[3/7] Limpando pods evicted..." -ForegroundColor Yellow
    try {
        $evicted = kubectl get pods --all-namespaces --field-selector=status.phase=Evicted --no-headers 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $evicted -and $evicted.Trim()) {
            kubectl delete pods --all-namespaces --field-selector=status.phase=Evicted --force --grace-period=0 2>&1 | Out-Null
            Write-Host "[OK] Pods evicted limpos" -ForegroundColor Green
        } else {
            Write-Host "[OK] Nenhum pod evicted encontrado" -ForegroundColor Green
        }
    } catch {
        Write-Host "[AVISO] Nao foi possivel limpar pods evicted (Kubernetes pode estar travado)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[3/7] Pulando limpeza de pods (Kubernetes nao esta respondendo)" -ForegroundColor Yellow
}
Write-Host ""

# Verificar status dos componentes do sistema
if ($kubeRunning) {
    Write-Host "[4/7] Verificando componentes do sistema..." -ForegroundColor Yellow
    try {
        $systemPods = kubectl get pods -n kube-system --no-headers 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $systemPods -and $systemPods.Trim()) {
            Write-Host "  Pods do sistema encontrados:" -ForegroundColor Gray
            $systemPodsLines = $systemPods -split "`n" | Where-Object { $_.Trim() }
            $systemPodsLines | ForEach-Object {
                $parts = $_ -split '\s+'
                if ($parts.Length -ge 3) {
                    Write-Host "    - $($parts[0]): $($parts[2])" -ForegroundColor Gray
                }
            }
        }
        
        # Verificar storage-provisioner especificamente
        $storageProv = kubectl get pods -n kube-system -l app=storage-provisioner --no-headers 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $storageProv -and $storageProv.Trim()) {
            Write-Host "  Storage-provisioner encontrado" -ForegroundColor Gray
        } else {
            Write-Host "  [AVISO] Storage-provisioner nao encontrado" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[AVISO] Nao foi possivel verificar componentes" -ForegroundColor Yellow
    }
} else {
    Write-Host "[4/7] Pulando verificacao de componentes (Kubernetes nao esta respondendo)" -ForegroundColor Yellow
}
Write-Host ""

# Instrucoes para resetar Kubernetes
Write-Host "[5/7] Instrucoes para resetar Kubernetes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para resolver o problema, siga estes passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Abra o Docker Desktop" -ForegroundColor White
Write-Host "  2. Va em Settings (icone de engrenagem)" -ForegroundColor White
Write-Host "  3. Selecione 'Kubernetes' no menu lateral" -ForegroundColor White
Write-Host "  4. DESABILITE Kubernetes (toggle OFF)" -ForegroundColor Yellow
Write-Host "  5. Aguarde 30 segundos" -ForegroundColor White
Write-Host "  6. HABILITE Kubernetes novamente (toggle ON)" -ForegroundColor Yellow
Write-Host "  7. Aguarde 2-3 minutos para inicializacao" -ForegroundColor White
Write-Host ""
Write-Host "  Pressione ENTER quando terminar..." -ForegroundColor Cyan
Read-Host
Write-Host ""

# Aguardar e verificar novamente
Write-Host "[6/7] Aguardando Kubernetes inicializar (30 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host ""

# Verificar status final
Write-Host "[7/7] Verificando status final..." -ForegroundColor Yellow
Write-Host ""

try {
    $kubeInfo = kubectl cluster-info 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $kubeInfo) {
        Write-Host "[OK] Kubernetes esta respondendo!" -ForegroundColor Green
        Write-Host ""
        
        # Verificar nos
        Write-Host "Status dos nos:" -ForegroundColor Cyan
        kubectl get nodes 2>&1 | Out-String | Write-Host
        Write-Host ""
        
        # Verificar pods do sistema
        Write-Host "Pods do sistema (kube-system):" -ForegroundColor Cyan
        kubectl get pods -n kube-system 2>&1 | Select-Object -First 10 | Out-String | Write-Host
        Write-Host ""
        
        # Verificar storage-provisioner especificamente
        Write-Host "Storage-provisioner:" -ForegroundColor Cyan
        kubectl get pods -n kube-system -l app=storage-provisioner 2>&1 | Out-String | Write-Host
        Write-Host ""
        
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Kubernetes esta funcionando!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        
    } else {
        Write-Host "[ERRO] Kubernetes ainda nao esta respondendo" -ForegroundColor Red
        Write-Host ""
        Write-Host "Tente as seguintes solucoes:" -ForegroundColor Yellow
        Write-Host "  1. Reiniciar Docker Desktop completamente" -ForegroundColor White
        Write-Host "  2. Verificar configuracoes de disco em Settings > Resources > Advanced" -ForegroundColor White
        Write-Host "  3. Verificar se ha memoria RAM suficiente (minimo 4GB)" -ForegroundColor White
        Write-Host "  4. Verificar logs do Docker Desktop" -ForegroundColor White
    }
} catch {
    Write-Host "[ERRO] Erro ao verificar Kubernetes" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Proximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se o Kubernetes estiver funcionando:" -ForegroundColor Yellow
Write-Host "  1. kubectl apply -k k8s/" -ForegroundColor Gray
Write-Host "  2. kubectl get pods -n saudenold" -ForegroundColor Gray
Write-Host ""
Write-Host "Se ainda houver problemas:" -ForegroundColor Yellow
Write-Host "  1. Ver documentacao: FIX-KUBERNETES-STARTING.md" -ForegroundColor Gray
Write-Host "  2. Verificar logs do Kubernetes" -ForegroundColor Gray
Write-Host ""
