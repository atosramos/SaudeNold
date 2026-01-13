# Script para verificar logs do Android e identificar erros
# Uso: .\scripts\debug\verificar-logs-android.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificando Logs do Android" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Encontrar Android SDK e ADB
$androidSdk = $null
$adbPath = $null

# Verificar locais comuns do Android SDK
$sdkLocations = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT"
)

foreach ($sdk in $sdkLocations) {
    if ($sdk -and (Test-Path $sdk)) {
        $platformTools = Join-Path $sdk "platform-tools\adb.exe"
        if (Test-Path $platformTools) {
            $androidSdk = $sdk
            $adbPath = $platformTools
            break
        }
    }
}

# Se não encontrou, tentar usar adb do PATH
if (-not $adbPath) {
    $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCheck) {
        $adbPath = $adbCheck.Source
        Write-Host "ADB encontrado no PATH: $adbPath" -ForegroundColor Green
    }
}

# Se ainda não encontrou, erro
if (-not $adbPath) {
    Write-Host "ERRO: ADB (Android Debug Bridge) nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Locais verificados:" -ForegroundColor Yellow
    foreach ($loc in $sdkLocations) {
        if ($loc) {
            Write-Host "  - $loc" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Host "Solucao:" -ForegroundColor Yellow
    Write-Host "  1. Instale o Android SDK Platform Tools" -ForegroundColor White
    Write-Host "  2. Ou adicione o caminho ao PATH:" -ForegroundColor White
    Write-Host "     `$env:PATH += ';$env:LOCALAPPDATA\Android\Sdk\platform-tools'" -ForegroundColor Gray
    exit 1
}

Write-Host "ADB encontrado: $adbPath" -ForegroundColor Green
Write-Host ""

Write-Host "1. Verificando dispositivos conectados..." -ForegroundColor Green
$devices = & $adbPath devices
Write-Host $devices
Write-Host ""

$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count
if ($deviceCount -eq 0) {
    Write-Host "ERRO: Nenhum dispositivo Android conectado!" -ForegroundColor Red
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "  1. Conecte o dispositivo via USB" -ForegroundColor Yellow
    Write-Host "  2. Ative o modo desenvolvedor" -ForegroundColor Yellow
    Write-Host "  3. Ative a depuracao USB" -ForegroundColor Yellow
    exit 1
}

Write-Host "2. Limpando logs antigos..." -ForegroundColor Green
& $adbPath logcat -c
Write-Host ""

Write-Host "3. Capturando logs do app SaudeNold..." -ForegroundColor Green
Write-Host "   (Pressione Ctrl+C para parar)" -ForegroundColor Yellow
Write-Host ""

# Filtrar logs relevantes
& $adbPath logcat | Select-String -Pattern "SaudeNold|ReactNative|Expo|FATAL|AndroidRuntime|Error|Exception" -Context 2,2
