# Script para verificar logs do Android e identificar erros
# Uso: .\scripts\debug\verificar-logs-android.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificando Logs do Android" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se adb está disponível
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "ERRO: ADB (Android Debug Bridge) nao encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale o Android SDK Platform Tools" -ForegroundColor Yellow
    Write-Host "Ou adicione o caminho do SDK ao PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Verificando dispositivos conectados..." -ForegroundColor Green
$devices = adb devices
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
adb logcat -c
Write-Host ""

Write-Host "3. Capturando logs do app SaudeNold..." -ForegroundColor Green
Write-Host "   (Pressione Ctrl+C para parar)" -ForegroundColor Yellow
Write-Host ""

# Filtrar logs relevantes
adb logcat | Select-String -Pattern "SaudeNold|ReactNative|Expo|FATAL|AndroidRuntime|Error|Exception" -Context 2,2
