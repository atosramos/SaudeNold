# Corrigir Proxy de Porta do Backend
# Remove proxy antigo e configura para o IP correto (192.168.0.101)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Corrigir Proxy de Porta do Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERRO] Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "  Clique com botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    exit 1
}

$correctIP = "192.168.0.101"
$oldIP = "192.168.15.17"
$port = 8000

Write-Host "[1/3] Removendo proxy antigo ($oldIP)..." -ForegroundColor Yellow
try {
    netsh interface portproxy delete v4tov4 listenaddress=$oldIP listenport=$port 2>$null | Out-Null
    Write-Host "  Proxy antigo removido" -ForegroundColor Green
} catch {
    Write-Host "  Proxy antigo não encontrado (pode ignorar)" -ForegroundColor Gray
}

Write-Host "[2/3] Removendo proxy existente para $correctIP (se houver)..." -ForegroundColor Yellow
try {
    netsh interface portproxy delete v4tov4 listenaddress=$correctIP listenport=$port 2>$null | Out-Null
    Write-Host "  Proxy existente removido" -ForegroundColor Green
} catch {
    Write-Host "  Nenhum proxy existente para remover" -ForegroundColor Gray
}

Write-Host "[3/3] Configurando proxy para IP correto ($correctIP)..." -ForegroundColor Yellow
try {
    netsh interface portproxy add v4tov4 listenaddress=$correctIP listenport=$port connectaddress=127.0.0.1 connectport=$port | Out-Null
    Write-Host "  Proxy configurado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Falha ao configurar proxy: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Verificação" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
$proxy = netsh interface portproxy show all | Select-String "$correctIP.*$port"
if ($proxy) {
    Write-Host "  [OK] Proxy configurado:" -ForegroundColor Green
    Write-Host "    $proxy" -ForegroundColor Gray
} else {
    Write-Host "  [AVISO] Proxy não encontrado na verificação" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuração Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend agora acessível em:" -ForegroundColor Cyan
Write-Host "  http://$correctIP`:$port" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host "O app.json já está configurado corretamente!" -ForegroundColor Green
Write-Host ""
