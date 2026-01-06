# Script para gerar APK do SaudeNold
# Execute este script no PowerShell

Write-Host "Iniciando build do APK..." -ForegroundColor Green
Write-Host ""

# Verificar se esta no diretorio correto
if (-not (Test-Path "package.json")) {
    Write-Host "Erro: Execute este script na pasta SaudeNold" -ForegroundColor Red
    exit 1
}

# Verificar se EAS CLI esta instalado
Write-Host "Verificando EAS CLI..." -ForegroundColor Yellow
$null = eas --version 2>&1
if ($?) {
    Write-Host "EAS CLI encontrado" -ForegroundColor Green
} else {
    Write-Host "EAS CLI nao encontrado. Instalando..." -ForegroundColor Red
    npm install -g eas-cli
}

# Verificar login
Write-Host "Verificando login..." -ForegroundColor Yellow
$user = eas whoami 2>&1
if ($?) {
    Write-Host "Logado como: $user" -ForegroundColor Green
} else {
    Write-Host "Voce precisa fazer login primeiro:" -ForegroundColor Red
    Write-Host "   eas login" -ForegroundColor Yellow
    exit 1
}

# Configurar projeto se necessario
if (-not (Test-Path "eas.json")) {
    Write-Host "Configurando projeto EAS..." -ForegroundColor Yellow
    Write-Host "   (Voce precisara responder algumas perguntas)" -ForegroundColor Yellow
    eas build:configure
}

# Verificar e instalar dependências
Write-Host "Verificando dependências..." -ForegroundColor Yellow
Write-Host "Instalando todas as dependências..." -ForegroundColor Yellow
npm install

# Instalar dependências do Expo com versões corretas
Write-Host "Instalando dependências do Expo SDK 54..." -ForegroundColor Yellow
npx expo install expo-av expo-speech expo-device --fix

# Executar build
Write-Host ""
Write-Host "Iniciando build do APK..." -ForegroundColor Green
Write-Host "   Isso pode levar 15-20 minutos..." -ForegroundColor Yellow
Write-Host "   (O build sera feito na nuvem)" -ForegroundColor Yellow
Write-Host ""

eas build --platform android --profile preview

if ($?) {
    Write-Host ""
    Write-Host "Build concluido com sucesso!" -ForegroundColor Green
    Write-Host "Acesse o link acima para baixar o APK" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Erro no build. Verifique as mensagens acima." -ForegroundColor Red
    exit 1
}
