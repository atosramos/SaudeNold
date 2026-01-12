# Expor Backend do Kubernetes na Rede Local
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Expor Backend SaudeNold na Rede" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se port-forward está rodando
Write-Host "[1/5] Verificando port-forward..." -ForegroundColor Yellow
$portForward = Get-Process kubectl -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*port-forward*backend*" -or 
    (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue)
}

if (-not $portForward) {
    Write-Host "  Port-forward não encontrado. Iniciando..." -ForegroundColor Yellow
    Start-Process kubectl -ArgumentList "port-forward", "-n", "saudenold", "svc/backend", "8000:8000" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "  Port-forward iniciado em background" -ForegroundColor Green
} else {
    Write-Host "  Port-forward já está rodando" -ForegroundColor Green
}

# 2. Configurar firewall
Write-Host "[2/5] Configurando firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  Firewall configurado" -ForegroundColor Green
} catch {
    Write-Host "  Firewall já configurado ou erro (pode ignorar)" -ForegroundColor Yellow
}

# 3. Obter IP da máquina
Write-Host "[3/5] Detectando IP da máquina..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -like "192.168.*" -or 
    $_.IPAddress -like "10.*" -or
    $_.IPAddress -like "172.16.*" -or
    $_.IPAddress -like "172.17.*" -or
    $_.IPAddress -like "172.18.*" -or
    $_.IPAddress -like "172.19.*" -or
    $_.IPAddress -like "172.20.*" -or
    $_.IPAddress -like "172.21.*" -or
    $_.IPAddress -like "172.22.*" -or
    $_.IPAddress -like "172.23.*" -or
    $_.IPAddress -like "172.24.*" -or
    $_.IPAddress -like "172.25.*" -or
    $_.IPAddress -like "172.26.*" -or
    $_.IPAddress -like "172.27.*" -or
    $_.IPAddress -like "172.28.*" -or
    $_.IPAddress -like "172.29.*" -or
    $_.IPAddress -like "172.30.*" -or
    $_.IPAddress -like "172.31.*"
} | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "  Não foi possível detectar o IP da rede local" -ForegroundColor Red
    Write-Host "  Execute 'ipconfig' e use o IP manualmente" -ForegroundColor Yellow
    exit 1
}

Write-Host "  IP detectado: $ip" -ForegroundColor Green

# 4. Remover proxy anterior se existir
Write-Host "[4/5] Configurando proxy de porta..." -ForegroundColor Yellow
try {
    netsh interface portproxy delete v4tov4 listenaddress=$ip listenport=8000 2>$null | Out-Null
} catch {
    # Ignorar erro se não existir
}

# 5. Criar novo proxy
try {
    netsh interface portproxy add v4tov4 listenaddress=$ip listenport=8000 connectaddress=127.0.0.1 connectport=8000 | Out-Null
    Write-Host "  Proxy de porta configurado" -ForegroundColor Green
} catch {
    Write-Host "  Erro ao configurar proxy de porta. Execute como Administrador" -ForegroundColor Red
    exit 1
}

# 6. Verificar configuração
Write-Host "[5/5] Verificando configuração..." -ForegroundColor Yellow
$proxy = netsh interface portproxy show all | Select-String "$ip.*8000"
if ($proxy) {
    Write-Host "  Configuração verificada" -ForegroundColor Green
} else {
    Write-Host "  Aviso: Proxy não encontrado na verificação" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuração Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend acessível em:" -ForegroundColor Cyan
Write-Host "  http://$ip:8000" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host "Teste no navegador:" -ForegroundColor Yellow
Write-Host "  http://$ip:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "Atualize o app.json com:" -ForegroundColor Yellow
Write-Host '  "apiUrl": "http://' + $ip + ':8000"' -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "  - Mantenha o port-forward rodando" -ForegroundColor Yellow
Write-Host "  - Celular e computador devem estar na mesma rede Wi-Fi" -ForegroundColor Yellow
Write-Host "  - Reinicie o Expo após atualizar app.json" -ForegroundColor Yellow
Write-Host ""




