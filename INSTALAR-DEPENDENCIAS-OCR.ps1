# Script para instalar dependências do OCR automático
# Execute este script no PowerShell como Administrador

Write-Host "Instalando dependências para OCR automático..." -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: Execute este script na pasta SaudeNold" -ForegroundColor Red
    exit 1
}

# Instalar dependências npm
Write-Host "1. Instalando dependências npm..." -ForegroundColor Yellow
npm install

if (-not $?) {
    Write-Host "Erro ao instalar dependências npm" -ForegroundColor Red
    exit 1
}

# Instalar expo-text-extractor
Write-Host "`n2. Instalando expo-text-extractor..." -ForegroundColor Yellow
npx expo install expo-text-extractor

if (-not $?) {
    Write-Host "Aviso: expo-text-extractor pode não estar disponível. Continuando..." -ForegroundColor Yellow
}

# Instalar expo-dev-client
Write-Host "`n3. Instalando expo-dev-client..." -ForegroundColor Yellow
npx expo install expo-dev-client

if (-not $?) {
    Write-Host "Erro ao instalar expo-dev-client" -ForegroundColor Red
    exit 1
}

# Gerar código nativo
Write-Host "`n4. Gerando código nativo..." -ForegroundColor Yellow
npx expo prebuild

if (-not $?) {
    Write-Host "Erro ao gerar código nativo" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Dependências instaladas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute: npx expo run:android (para desenvolvimento)" -ForegroundColor Yellow
Write-Host "2. Ou execute: eas build --platform android (para gerar APK)" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️ IMPORTANTE: O app não funcionará mais com Expo Go!" -ForegroundColor Red
Write-Host "   Você precisará usar Expo Dev Client ou gerar um novo APK." -ForegroundColor Yellow


