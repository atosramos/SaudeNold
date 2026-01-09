# Script para resolver problema de acesso do celular ao backend
# Execute como Administrador para modificar firewall

param(
    [switch]$DisableFirewall
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resolver Acesso do Celular" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  AVISO: Este script precisa ser executado como Administrador" -ForegroundColor Yellow
    Write-Host "   Para modificar regras de firewall" -ForegroundColor Yellow
    Write-Host ""
}

# 1. Remover todas as regras bloqueando do Docker
Write-Host "[1/5] Removendo regras bloqueando do Docker..." -ForegroundColor Yellow
$dockerRules = Get-NetFirewallRule | Where-Object { 
    $_.DisplayName -like "*Docker*Backend*" -and 
    $_.Action -eq "Block" -and 
    $_.Enabled -eq $true 
}

if ($dockerRules) {
    if ($isAdmin) {
        $dockerRules | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        Write-Host "  ✅ Regras do Docker removidas" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Regras do Docker encontradas mas não foi possível remover (precisa Admin)" -ForegroundColor Yellow
        $dockerRules | ForEach-Object { Write-Host "    - $($_.DisplayName)" -ForegroundColor Gray }
    }
} else {
    Write-Host "  ✅ Nenhuma regra bloqueando do Docker encontrada" -ForegroundColor Green
}

# 2. Criar/Atualizar regra permitindo
Write-Host "[2/5] Criando regra de firewall permitindo..." -ForegroundColor Yellow
$existingRule = Get-NetFirewallRule -DisplayName "Backend SaudeNold - Porta 8000" -ErrorAction SilentlyContinue
if ($existingRule) {
    if ($isAdmin) {
        Remove-NetFirewallRule -DisplayName "Backend SaudeNold - Porta 8000" -ErrorAction SilentlyContinue
    }
}

if ($isAdmin) {
    try {
        New-NetFirewallRule -DisplayName "Backend SaudeNold - Porta 8000" `
            -Direction Inbound `
            -LocalPort 8000 `
            -Protocol TCP `
            -Action Allow `
            -Profile Any `
            -ErrorAction Stop
        Write-Host "  ✅ Regra criada/atualizada" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Erro ao criar regra: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Não foi possível criar regra (precisa Admin)" -ForegroundColor Yellow
    Write-Host "  Execute como Administrador:" -ForegroundColor Gray
    Write-Host "    New-NetFirewallRule -DisplayName 'Backend SaudeNold - Porta 8000' -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Any" -ForegroundColor Gray
}

# 3. Verificar port-forward
Write-Host "[3/5] Verificando port-forward..." -ForegroundColor Yellow
$listening = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($listening) {
    Write-Host "  ✅ Port-forward ativo" -ForegroundColor Green
    $listening | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ Port-forward NÃO está ativo" -ForegroundColor Red
    Write-Host "  Iniciando port-forward..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward -n saudenold svc/backend 8000:8000"
    Start-Sleep -Seconds 3
    Write-Host "  ✅ Port-forward iniciado em nova janela" -ForegroundColor Green
}

# 4. Verificar proxy de porta
Write-Host "[4/5] Verificando proxy de porta..." -ForegroundColor Yellow
$portProxy = netsh interface portproxy show all
if ($portProxy -match "192.168.15.17.*8000.*127.0.0.1.*8000") {
    Write-Host "  ✅ Proxy de porta configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Proxy de porta NÃO configurado" -ForegroundColor Red
    if ($isAdmin) {
        Write-Host "  Configurando proxy de porta..." -ForegroundColor Yellow
        netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000
        Write-Host "  ✅ Proxy de porta configurado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Não foi possível configurar (precisa Admin)" -ForegroundColor Yellow
        Write-Host "  Execute como Administrador:" -ForegroundColor Gray
        Write-Host "    netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000" -ForegroundColor Gray
    }
}

# 5. Testar backend
Write-Host "[5/5] Testando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.15.17:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✅ Backend respondendo: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend não responde: $($_.Exception.Message)" -ForegroundColor Red
}

# Opção de desabilitar firewall temporariamente
if ($DisableFirewall) {
    if ($isAdmin) {
        Write-Host ""
        Write-Host "⚠️  DESABILITANDO FIREWALL TEMPORARIAMENTE..." -ForegroundColor Yellow
        Write-Host "   ⚠️  REABILITE DEPOIS!" -ForegroundColor Red
        Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
        Write-Host "  ✅ Firewall desabilitado" -ForegroundColor Green
        Write-Host "  ⚠️  LEMBRE-SE DE REABILITAR!" -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "⚠️  Para desabilitar firewall, execute como Administrador:" -ForegroundColor Yellow
        Write-Host "   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Teste do navegador do celular: http://192.168.15.17:8000/health" -ForegroundColor White
Write-Host "  2. Se não funcionar, execute este script como Administrador:" -ForegroundColor White
Write-Host "     .\resolver-acesso-celular.ps1" -ForegroundColor Gray
Write-Host "  3. Se ainda não funcionar, desabilite firewall temporariamente:" -ForegroundColor White
Write-Host "     .\resolver-acesso-celular.ps1 -DisableFirewall" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitorar logs:" -ForegroundColor Yellow
Write-Host "  kubectl logs -n saudenold deployment/backend -f | Select-String '192.168.15.7'" -ForegroundColor Gray
Write-Host ""



