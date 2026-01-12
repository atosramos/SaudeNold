# Script para corrigir dependências do projeto
Write-Host "Corrigindo dependências do projeto..." -ForegroundColor Green

# Instalar dependências usando expo install para garantir compatibilidade
Write-Host "`nInstalando dependências com versões compatíveis..." -ForegroundColor Yellow
npx expo install expo-av expo-speech expo-device

Write-Host "`nDependências corrigidas!" -ForegroundColor Green
Write-Host "Agora você pode tentar o build novamente com: .\build-apk.ps1" -ForegroundColor Cyan








