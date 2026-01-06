# Script para fazer rebuild do app com OCR automático
# Execute este script no PowerShell

Write-Host "Fazendo rebuild do app com OCR automático..." -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: Execute este script na pasta SaudeNold" -ForegroundColor Red
    exit 1
}

# Verificar se código nativo foi gerado
if (-not (Test-Path "android")) {
    Write-Host "Gerando código nativo primeiro..." -ForegroundColor Yellow
    npx expo prebuild
}

Write-Host "Iniciando build do app..." -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Gray
Write-Host ""

# Rebuild do app
npx expo run:android

if ($?) {
    Write-Host ""
    Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "O app foi instalado no dispositivo/emulador." -ForegroundColor Cyan
    Write-Host "Agora você pode testar o OCR automático!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro no build. Verifique os logs acima." -ForegroundColor Red
}


