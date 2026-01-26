# Script para gerar APK localmente usando Android Studio/Gradle diretamente
# Este script redireciona para a versão atualizada em scripts/build/

$scriptPath = Join-Path $PSScriptRoot "scripts\build\build-local-apk.ps1"

if (Test-Path $scriptPath) {
    Write-Host "Redirecionando para versão atualizada do script..." -ForegroundColor Cyan
    Write-Host ""
    & $scriptPath
    exit $LASTEXITCODE
} else {
    Write-Host "[ERRO] Script atualizado não encontrado em: $scriptPath" -ForegroundColor Red
    Write-Host "Execute diretamente: .\scripts\build\build-local-apk.ps1" -ForegroundColor Yellow
    exit 1
}
