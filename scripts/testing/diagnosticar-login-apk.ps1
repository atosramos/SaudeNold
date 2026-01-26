# Script para diagnosticar problema de login no APK
# Analisa configuracao do app.json, rede, e logs

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnostico: Erro de Login no APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar configuracao do app.json
Write-Host "[1/8] Verificando configuracao do app.json..." -ForegroundColor Yellow
$appJsonPath = "app.json"
if (Test-Path $appJsonPath) {
    $appJson = Get-Content $appJsonPath | ConvertFrom-Json
    $apiUrl = $appJson.expo.extra.apiUrl
    $apiKey = $appJson.expo.extra.apiKey
    
    Write-Host "  API URL configurada: $apiUrl" -ForegroundColor $(if ($apiUrl) { "Green" } else { "Red" })
    Write-Host "  API Key configurada: $(if ($apiKey) { 'SIM (oculta)' } else { 'VAZIA' })" -ForegroundColor $(if ($apiKey) { "Green" } else { "Yellow" })
    
    if (-not $apiUrl) {
        Write-Host "  [ERRO] API URL nao configurada!" -ForegroundColor Red
    } elseif ($apiUrl -match "localhost|127.0.0.1") {
        Write-Host "  [AVISO] API URL usa localhost - nao funcionara em APK instalado!" -ForegroundColor Red
        Write-Host "     Use o IP da maquina (ex: http://192.168.x.x:8000)" -ForegroundColor Yellow
    }
    
    if (-not $apiKey) {
        Write-Host "  [INFO] API Key vazia - OK para login (endpoint nao requer API key)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  [ERRO] Arquivo app.json nao encontrado!" -ForegroundColor Red
}

# 2. Verificar IP atual da maquina
Write-Host "[2/8] Verificando IP atual da maquina..." -ForegroundColor Yellow
$ipConfig = ipconfig | Select-String "IPv4"
$ipPattern = '([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})'
$currentIPs = $ipConfig | ForEach-Object { 
    if ($_ -match $ipPattern) {
        $matches[1]
    }
}
if ($currentIPs) {
    Write-Host "  IPs encontrados:" -ForegroundColor Green
    $currentIPs | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    
    if ($apiUrl -and $apiUrl -match $ipPattern) {
        $configuredIP = $matches[1]
        if ($currentIPs -contains $configuredIP) {
            Write-Host "  [OK] IP configurado ($configuredIP) esta ativo" -ForegroundColor Green
        } else {
            Write-Host "  [AVISO] IP configurado ($configuredIP) NAO esta ativo!" -ForegroundColor Red
            Write-Host "     IPs ativos: $($currentIPs -join ', ')" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  [ERRO] Nenhum IP encontrado" -ForegroundColor Red
}

# 3. Verificar port-forward
Write-Host "[3/8] Verificando port-forward..." -ForegroundColor Yellow
$listening = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
$portPattern = '([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):8000'
if ($listening) {
    Write-Host "  [OK] Porta 8000 esta escutando:" -ForegroundColor Green
    $listening | ForEach-Object { 
        if ($_ -match $portPattern) {
            Write-Host "    $($matches[1]):8000" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  [ERRO] Porta 8000 NAO esta escutando!" -ForegroundColor Red
    Write-Host "     Execute: kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor Yellow
}

# 4. Verificar proxy de porta
Write-Host "[4/8] Verificando proxy de porta..." -ForegroundColor Yellow
$portProxy = netsh interface portproxy show all 2>$null
$proxyPattern = '192\.168\.[0-9]{1,3}\.[0-9]{1,3}.*8000.*127\.0\.0\.1.*8000'
$proxyIP = $null
if ($portProxy -match $proxyPattern) {
    Write-Host "  [OK] Proxy de porta configurado" -ForegroundColor Green
    $portProxy | Select-String "192.168" | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    
    # Extrair IP do proxy configurado
    $proxyLine = $portProxy | Select-String "192\.168\.[0-9]{1,3}\.[0-9]{1,3}.*8000" | Select-Object -First 1
    if ($proxyLine) {
        $proxyIPMatch = $proxyLine -match '192\.168\.([0-9]{1,3}\.[0-9]{1,3})'
        if ($proxyIPMatch) {
            $proxyIP = "192.168.$($matches[1])"
        }
    }
} else {
    Write-Host "  [AVISO] Proxy de porta pode nao estar configurado" -ForegroundColor Yellow
    $ipPattern192 = '192\.168\.([0-9]{1,3}\.[0-9]{1,3})'
    if ($apiUrl -and $apiUrl -match $ipPattern192) {
        $ip = $matches[0] -replace "http://|:8000", ""
        Write-Host "     Para configurar (como Admin):" -ForegroundColor Yellow
        Write-Host "     netsh interface portproxy add v4tov4 listenaddress=$ip listenport=8000 connectaddress=127.0.0.1 connectport=8000" -ForegroundColor Gray
    }
}

# Verificar inconsistência entre IP do app.json e IP do proxy
if ($apiUrl -and $proxyIP) {
    $appIPPattern = '192\.168\.([0-9]{1,3}\.[0-9]{1,3})'
    if ($apiUrl -match $appIPPattern) {
        $appIP = "192.168.$($matches[1])"
        if ($appIP -ne $proxyIP) {
            Write-Host "" -ForegroundColor Red
            Write-Host "  [ERRO CRITICO] INCONSISTENCIA DETECTADA!" -ForegroundColor Red
            Write-Host "     IP no app.json: $appIP" -ForegroundColor Yellow
            Write-Host "     IP no proxy de porta: $proxyIP" -ForegroundColor Yellow
            Write-Host "     O celular tentara acessar $appIP, mas o proxy so redireciona $proxyIP!" -ForegroundColor Red
            Write-Host "" -ForegroundColor Red
            Write-Host "  Solucao 1: Atualizar app.json para usar o IP do proxy:" -ForegroundColor Cyan
            Write-Host "     apiUrl: http://$proxyIP`:8000" -ForegroundColor Gray
            Write-Host "" -ForegroundColor Cyan
            Write-Host "  Solucao 2: Adicionar proxy para o IP do app.json (como Admin):" -ForegroundColor Cyan
            Write-Host "     netsh interface portproxy add v4tov4 listenaddress=$appIP listenport=8000 connectaddress=127.0.0.1 connectport=8000" -ForegroundColor Gray
            Write-Host "" -ForegroundColor Red
        }
    }
}

# 5. Verificar firewall
Write-Host "[5/8] Verificando firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*Backend*" -ErrorAction SilentlyContinue
try {
    $firewallPortRules = Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 8000 } | Get-NetFirewallRule -ErrorAction SilentlyContinue
} catch {
    $firewallPortRules = $null
}
if ($firewallRules -or $firewallPortRules) {
    $allRules = @($firewallRules) + @($firewallPortRules) | Select-Object -Unique
    $allowRule = $allRules | Where-Object { $_.Action -eq "Allow" -and $_.Enabled -eq $true }
    if ($allowRule) {
        Write-Host "  [OK] Regra de firewall permitindo encontrada" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Nenhuma regra permitindo encontrada" -ForegroundColor Yellow
    }
    
    $blockRules = $allRules | Where-Object { $_.Action -eq "Block" -and $_.Enabled -eq $true }
    if ($blockRules) {
        Write-Host "  [AVISO] Regras bloqueando encontradas:" -ForegroundColor Red
        $blockRules | ForEach-Object { Write-Host "    $($_.DisplayName)" -ForegroundColor Gray }
    }
} else {
    Write-Host "  [AVISO] Nenhuma regra de firewall especifica encontrada para porta 8000" -ForegroundColor Yellow
    Write-Host "     Considere criar regra permitindo porta 8000" -ForegroundColor Gray
}

# 6. Testar backend localmente
Write-Host "[6/8] Testando backend localmente..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Backend respondendo em localhost:8000" -ForegroundColor Green
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "    Status: $($healthData.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [ERRO] Backend NAO esta respondendo em localhost:8000" -ForegroundColor Red
    Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

if ($apiUrl) {
    # Tentar extrair IP e porta da URL
    $testIP = $null
    $testPort = 8000
    try {
        # Tentar usar objeto URI do PowerShell
        $uri = [System.Uri]$apiUrl
        $testIP = $uri.Host
        if ($uri.Port -ne -1) {
            $testPort = $uri.Port
        }
    } catch {
        # Se falhar, tentar regex
        $ipPattern = '([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})'
        if ($apiUrl -match $ipPattern) {
            $testIP = $matches[1]
        }
        # Tentar extrair porta
        if ($apiUrl -match ':([0-9]+)') {
            $testPort = [int]$matches[1]
        }
    }
    
    if ($testIP -and $testIP -ne '' -and $testIP -ne 'localhost' -and $testIP -ne '127.0.0.1') {
        try {
            $testUri = "http://$testIP`:$testPort/health"
            $response = Invoke-WebRequest -Uri $testUri -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] Backend respondendo em $testIP`:$testPort" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [ERRO] Backend NAO esta respondendo em $testIP`:$testPort" -ForegroundColor Red
            Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Gray
            Write-Host "    Isso pode indicar problema com proxy de porta ou firewall" -ForegroundColor Yellow
        }
    } else {
        if ($testIP -eq 'localhost' -or $testIP -eq '127.0.0.1') {
            Write-Host "  [AVISO] URL usa localhost - ja testado acima" -ForegroundColor Yellow
        } else {
            Write-Host "  [AVISO] Nao foi possivel extrair IP da URL configurada: $apiUrl" -ForegroundColor Yellow
            Write-Host "    Formato esperado: http://192.168.x.x:8000" -ForegroundColor Gray
        }
    }
}

# 7. Verificar logs do backend para tentativas de login
Write-Host "[7/8] Verificando logs do backend (ultimas 30 min)..." -ForegroundColor Yellow
try {
    $logs = kubectl logs -n saudenold deployment/backend --tail=200 --since=30m 2>$null
    if ($logs) {
        $loginAttempts = $logs | Select-String "/api/auth/login"
        if ($loginAttempts) {
            Write-Host "  [OK] Tentativas de login encontradas nos logs:" -ForegroundColor Green
            $loginAttempts | Select-Object -First 5 | ForEach-Object { 
                Write-Host "    $_" -ForegroundColor Gray 
            }
        } else {
            Write-Host "  [ERRO] NENHUMA tentativa de login encontrada nos logs!" -ForegroundColor Red
            Write-Host "     Isso confirma que a requisicao nao esta chegando ao backend" -ForegroundColor Yellow
        }
        
        $errorPattern = 'error|Error|ERROR|401|403|500'
        $errors = $logs | Select-String $errorPattern | Select-Object -First 5
        if ($errors) {
            Write-Host "  [AVISO] Erros encontrados nos logs:" -ForegroundColor Yellow
            $errors | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
    } else {
        Write-Host "  [AVISO] Nao foi possivel obter logs do backend" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Erro ao verificar logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 8. Verificar endpoint de login no backend
Write-Host "[8/8] Verificando endpoint de login..." -ForegroundColor Yellow
Write-Host "  [INFO] Endpoint: POST /api/auth/login" -ForegroundColor Cyan
Write-Host "  [INFO] Nao requer API key (endpoint publico)" -ForegroundColor Cyan
Write-Host "  [INFO] Rate limit: 5 tentativas / 15 minutos" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo e Recomendacoes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Diagnostico
$issues = @()

if (-not $apiUrl -or $apiUrl -match "localhost|127.0.0.1") {
    $issues += "URL do backend usa localhost (nao funcionara em APK)"
}

if (-not $listening) {
    $issues += "Port-forward nao esta ativo"
}

# Verificar inconsistência entre IP do app.json e proxy de porta
if ($apiUrl -and $proxyIP) {
    $appIPPattern = '192\.168\.([0-9]{1,3}\.[0-9]{1,3})'
    if ($apiUrl -match $appIPPattern) {
        $appIP = "192.168.$($matches[1])"
        if ($appIP -ne $proxyIP) {
            $issues += "INCONSISTENCIA: IP no app.json ($appIP) diferente do IP no proxy de porta ($proxyIP)"
        }
    }
}

if ($issues.Count -eq 0) {
    Write-Host "[OK] Configuracao basica parece OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "Se o login ainda nao funciona:" -ForegroundColor Yellow
    Write-Host "  1. Verifique se o APK foi rebuildado apos alterar app.json" -ForegroundColor White
    Write-Host "  2. Teste do navegador do celular: $apiUrl/health" -ForegroundColor White
    Write-Host "  3. Verifique logs do app no celular (via ADB)" -ForegroundColor White
    Write-Host "  4. Monitore logs do backend durante tentativa:" -ForegroundColor White
    Write-Host "     kubectl logs -n saudenold deployment/backend -f" -ForegroundColor Gray
} else {
    Write-Host "[ERRO] Problemas encontrados:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Acoes recomendadas:" -ForegroundColor Yellow
    Write-Host "  1. Corrigir URL no app.json (usar IP da maquina)" -ForegroundColor White
    Write-Host "  2. Garantir port-forward ativo" -ForegroundColor White
    Write-Host "  3. Configurar proxy de porta (como Admin)" -ForegroundColor White
    Write-Host "  4. Rebuild do APK apos correcoes" -ForegroundColor White
}

Write-Host ""
Write-Host "Para monitorar em tempo real:" -ForegroundColor Cyan
Write-Host "  kubectl logs -n saudenold deployment/backend -f | Select-String 'login|POST.*auth'" -ForegroundColor Gray
Write-Host ""
