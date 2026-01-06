# Script para preparar o projeto antes do build
Write-Host "Preparando projeto para build..." -ForegroundColor Green

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "`nInstalando dependências..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "`nVerificando dependências..." -ForegroundColor Yellow
    npx expo install --fix
}

# Instalar dependências específicas do Expo SDK 54
Write-Host "`nInstalando dependências do Expo SDK 54..." -ForegroundColor Yellow
npx expo install expo-av expo-speech expo-device

Write-Host "`nVerificando compatibilidade..." -ForegroundColor Yellow
npx expo install --check

Write-Host "`nProjeto preparado!" -ForegroundColor Green
Write-Host "Agora você pode executar: .\build-apk.ps1" -ForegroundColor Cyan







