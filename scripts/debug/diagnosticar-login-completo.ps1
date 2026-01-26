# Diagnostico completo do problema de login
# Verifica APK instalado, rede, e testa login diretamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnostico Completo: Login no APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se novo APK foi instalado
Write-Host "[1/6] Verificando versao do APK instalado..." -ForegroundColor Yellow
try {
    $apkInfo = adb shell dumpsys package com.atosramos.SaudeNold | Select-String "versionName|versionCode"
    if ($apkInfo) {
        Write-Host "  APK instalado:" -ForegroundColor Green
        $apkInfo | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        
        # Verificar data de instalacao
        $installDate = adb shell dumpsys package com.atosramos.SaudeNold | Select-String "firstInstallTime|lastUpdateTime"
        if ($installDate) {
            Write-Host "  Data de instalacao/atualizacao:" -ForegroundColor Cyan
            $installDate | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
    } else {
        Write-Host "  [AVISO] Nao foi possivel obter informacoes do APK" -ForegroundColor Yellow
        Write-Host "    Certifique-se de que o celular esta conectado via USB" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [AVISO] ADB nao disponivel ou celular nao conectado" -ForegroundColor Yellow
}

# 2. Verificar configuracao do app.json
Write-Host "[2/6] Verificando app.json..." -ForegroundColor Yellow
$appJson = Get-Content "app.json" | ConvertFrom-Json
$apiUrl = $appJson.expo.extra.apiUrl
Write-Host "  API URL: $apiUrl" -ForegroundColor $(if ($apiUrl -eq "http://192.168.0.101:8000") { "Green" } else { "Red" })

# 3. Verificar proxy de porta
Write-Host "[3/6] Verificando proxy de porta..." -ForegroundColor Yellow
$portProxy = netsh interface portproxy show all 2>$null
$proxyLine = $portProxy | Select-String "192.168.0.101.*8000"
if ($proxyLine) {
    Write-Host "  [OK] Proxy configurado:" -ForegroundColor Green
    Write-Host "    $proxyLine" -ForegroundColor Gray
} else {
    Write-Host "  [ERRO] Proxy NAO configurado para 192.168.0.101:8000" -ForegroundColor Red
}

# 4. Testar health check
Write-Host "[4/6] Testando health check (GET)..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://192.168.0.101:8000/health" -UseBasicParsing -TimeoutSec 5
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "  [OK] Health check funcionando" -ForegroundColor Green
        Write-Host "    Status: $($healthResponse.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [ERRO] Health check falhou: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Testar login diretamente (POST)
Write-Host "[5/6] Testando login diretamente (POST)..." -ForegroundColor Yellow
Write-Host "  (Isso vai falhar, mas vamos ver se a requisicao chega ao backend)" -ForegroundColor Gray
try {
    $loginBody = @{
        email = "test@example.com"
        password = "test"
        device = @{
            device_id = "test-device"
        }
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://192.168.0.101:8000/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "  [OK] Requisicao POST chegou ao backend" -ForegroundColor Green
    Write-Host "    Status: $($loginResponse.StatusCode)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response) {
        Write-Host "  [OK] Requisicao POST chegou ao backend (resposta de erro esperada)" -ForegroundColor Green
        Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    } else {
        Write-Host "  [ERRO] Requisicao POST NAO chegou ao backend" -ForegroundColor Red
        Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Gray
        Write-Host "    Isso indica problema de rede/firewall bloqueando POST" -ForegroundColor Yellow
    }
}

# 6. Verificar logs recentes do backend
Write-Host "[6/6] Verificando logs recentes do backend..." -ForegroundColor Yellow
try {
    $logs = kubectl logs -n saudenold deployment/backend --tail=50 --since=5m 2>$null
    if ($logs) {
        $loginLogs = $logs | Select-String "POST.*auth|login|192.168.0"
        if ($loginLogs) {
            Write-Host "  [OK] Tentativas de login encontradas nos logs:" -ForegroundColor Green
            $loginLogs | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        } else {
            Write-Host "  [ERRO] NENHUMA tentativa de login encontrada nos logs!" -ForegroundColor Red
            Write-Host "    Isso confirma que as requisicoes POST nao estao chegando" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [AVISO] Nao foi possivel obter logs do backend" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Erro ao verificar logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo e Acoes Recomendadas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se o health check funciona mas login nao:" -ForegroundColor Yellow
Write-Host "  1. Verifique se o NOVO APK foi instalado (desinstale e reinstale)" -ForegroundColor White
Write-Host "  2. Limpe cache do app no celular" -ForegroundColor White
Write-Host "  3. Verifique firewall - pode estar bloqueando POST mas permitindo GET" -ForegroundColor White
Write-Host "  4. Execute monitoramento em tempo real:" -ForegroundColor White
Write-Host "     .\scripts\debug\monitorar-login-tempo-real.ps1" -ForegroundColor Gray
Write-Host ""
