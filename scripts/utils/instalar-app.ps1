# Script para instalar/desinstalar o app no dispositivo Android
# Uso: .\scripts\utils\instalar-app.ps1 [install|uninstall]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("install", "uninstall", "reinstall")]
    [string]$Action = "install"
)

# Carregar helper do ADB
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperPath = Join-Path $scriptPath "adb-helper.ps1"

# Encontrar ADB
$androidSdk = $null
$adbPath = $null

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

if (-not $adbPath) {
    $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCheck) {
        $adbPath = $adbCheck.Source
    }
}

if (-not $adbPath) {
    Write-Host "ERRO: ADB nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucao:" -ForegroundColor Yellow
    Write-Host "  1. Instale o Android SDK Platform Tools" -ForegroundColor White
    Write-Host "  2. Ou adicione ao PATH:" -ForegroundColor White
    Write-Host "     `$env:PATH += ';$env:LOCALAPPDATA\Android\Sdk\platform-tools'" -ForegroundColor Gray
    exit 1
}

$packageName = "com.atosramos.SaudeNold"
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gerenciar App Android" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ADB encontrado: $adbPath" -ForegroundColor Green
Write-Host ""

# Verificar dispositivo
Write-Host "Verificando dispositivos..." -ForegroundColor Green
$devices = & $adbPath devices
$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Host "ERRO: Nenhum dispositivo conectado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para conectar o dispositivo:" -ForegroundColor Yellow
    Write-Host "  1. Ative o Modo Desenvolvedor:" -ForegroundColor White
    Write-Host "     Configuracoes > Sobre o telefone > Tocar 7x no 'Numero da compilacao'" -ForegroundColor Gray
    Write-Host "  2. Ative a Depuracao USB:" -ForegroundColor White
    Write-Host "     Configuracoes > Opcoes do desenvolvedor > Depuracao USB" -ForegroundColor Gray
    Write-Host "  3. Conecte o cabo USB" -ForegroundColor White
    Write-Host "  4. Autorize no popup do dispositivo" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentacao completa:" -ForegroundColor Cyan
    Write-Host "  docs/troubleshooting/CONECTAR-DISPOSITIVO-ANDROID.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verificar dispositivos:" -ForegroundColor Yellow
    Write-Host "  & `"$adbPath`" devices" -ForegroundColor Gray
    exit 1
}

Write-Host "Dispositivo conectado!" -ForegroundColor Green
Write-Host ""

# Executar ação
switch ($Action) {
    "uninstall" {
        Write-Host "Desinstalando app..." -ForegroundColor Yellow
        & $adbPath uninstall $packageName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "App desinstalado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Aviso: App pode nao estar instalado" -ForegroundColor Yellow
        }
    }
    "install" {
        if (-not (Test-Path $apkPath)) {
            Write-Host "ERRO: APK nao encontrado em: $apkPath" -ForegroundColor Red
            Write-Host "Compile o app primeiro com: .\scripts\build\build-local-apk.ps1" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Instalando app..." -ForegroundColor Yellow
        & $adbPath install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "App instalado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Erro ao instalar app" -ForegroundColor Red
            exit 1
        }
    }
    "reinstall" {
        Write-Host "Desinstalando versao antiga..." -ForegroundColor Yellow
        & $adbPath uninstall $packageName | Out-Null
        
        if (-not (Test-Path $apkPath)) {
            Write-Host "ERRO: APK nao encontrado em: $apkPath" -ForegroundColor Red
            Write-Host "Compile o app primeiro com: .\scripts\build\build-local-apk.ps1" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "Instalando nova versao..." -ForegroundColor Yellow
        & $adbPath install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "App reinstalado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "Erro ao instalar app" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green
