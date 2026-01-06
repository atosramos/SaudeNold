# Script para diagnosticar acesso do celular ao backend
# IP do celular: 192.168.15.7

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico de Acesso do Celular" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IP do Celular: 192.168.15.7" -ForegroundColor Yellow
Write-Host "IP do Backend: 192.168.15.17:8000" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar proxy de porta
Write-Host "[1/6] Verificando proxy de porta..." -ForegroundColor Yellow
$portProxy = netsh interface portproxy show all
if ($portProxy -match "192.168.15.17.*8000.*127.0.0.1.*8000") {
    Write-Host "  ✅ Proxy de porta configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Proxy de porta NÃO configurado" -ForegroundColor Red
    Write-Host "  Execute como Administrador:" -ForegroundColor Yellow
    Write-Host "    netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000" -ForegroundColor Gray
}

# 2. Verificar port-forward
Write-Host "[2/6] Verificando port-forward..." -ForegroundColor Yellow
$listening = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($listening -match "127.0.0.1:8000" -or $listening -match "192.168.15.17:8000") {
    Write-Host "  ✅ Port-forward ativo" -ForegroundColor Green
    $listening | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ Port-forward NÃO está ativo" -ForegroundColor Red
    Write-Host "  Execute: kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor Yellow
}

# 3. Verificar firewall
Write-Host "[3/6] Verificando firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*Backend*" -ErrorAction SilentlyContinue
if ($firewallRules) {
    $allowRule = $firewallRules | Where-Object { $_.Action -eq "Allow" -and $_.Enabled -eq $true }
    if ($allowRule) {
        Write-Host "  ✅ Regra de firewall permitindo encontrada" -ForegroundColor Green
        $allowRule | ForEach-Object { Write-Host "    $($_.DisplayName): $($_.Action)" -ForegroundColor Gray }
    } else {
        Write-Host "  ⚠️  Regra de firewall encontrada mas não está permitindo" -ForegroundColor Yellow
    }
    
    $blockRules = $firewallRules | Where-Object { $_.Action -eq "Block" -and $_.Enabled -eq $true }
    if ($blockRules) {
        Write-Host "  ⚠️  Regras bloqueando encontradas:" -ForegroundColor Yellow
        $blockRules | ForEach-Object { Write-Host "    $($_.DisplayName): $($_.Action)" -ForegroundColor Red }
    }
} else {
    Write-Host "  ❌ Nenhuma regra de firewall encontrada" -ForegroundColor Red
    Write-Host "  Execute como Administrador:" -ForegroundColor Yellow
    Write-Host "    New-NetFirewallRule -DisplayName 'Backend SaudeNold' -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow" -ForegroundColor Gray
}

# 4. Testar conectividade do celular
Write-Host "[4/6] Testando conectividade do celular..." -ForegroundColor Yellow
try {
    $test = Test-NetConnection -ComputerName 192.168.15.7 -Port 8000 -InformationLevel Detailed -WarningAction SilentlyContinue
    if ($test.PingSucceeded) {
        Write-Host "  ✅ Celular está na rede (ping OK)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Celular não responde ao ping" -ForegroundColor Red
    }
    
    if ($test.TcpTestSucceeded) {
        Write-Host "  ✅ Porta 8000 acessível do celular" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Porta 8000 NÃO acessível do celular" -ForegroundColor Red
        Write-Host "    Isso indica bloqueio de firewall ou porta não escutando" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Erro ao testar conectividade: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. Verificar backend respondendo
Write-Host "[5/6] Verificando se backend está respondendo..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend respondendo em localhost:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Backend NÃO está respondendo em localhost:8000" -ForegroundColor Red
    Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

try {
    $response = Invoke-WebRequest -Uri "http://192.168.15.17:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend respondendo em 192.168.15.17:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Backend NÃO está respondendo em 192.168.15.17:8000" -ForegroundColor Red
    Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "    Isso pode indicar problema com proxy de porta" -ForegroundColor Yellow
}

# 6. Verificar logs do backend para acessos do celular
Write-Host "[6/6] Verificando logs do backend..." -ForegroundColor Yellow
$logs = kubectl logs -n saudenold deployment/backend --tail=100 --since=30m 2>$null
$cellAccess = $logs | Select-String "192.168.15.7"
if ($cellAccess) {
    Write-Host "  ✅ Acessos do celular encontrados nos logs:" -ForegroundColor Green
    $cellAccess | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ NENHUM acesso do celular (192.168.15.7) encontrado nos logs" -ForegroundColor Red
    Write-Host "    Isso confirma que o celular não está conseguindo acessar o backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se a porta 8000 não está acessível do celular:" -ForegroundColor Yellow
Write-Host "  1. Verifique se o port-forward está rodando" -ForegroundColor White
Write-Host "  2. Verifique se o proxy de porta está configurado (como Admin)" -ForegroundColor White
Write-Host "  3. Verifique se o firewall permite conexões na porta 8000" -ForegroundColor White
Write-Host "  4. Teste do navegador do celular: http://192.168.15.17:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "Para monitorar quando o celular tentar acessar:" -ForegroundColor Yellow
Write-Host "  kubectl logs -n saudenold deployment/backend -f | Select-String '192.168.15.7'" -ForegroundColor Gray
Write-Host ""



