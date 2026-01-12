# Script para gerar APK localmente usando Android Studio/Gradle diretamente
# Execute este script para gerar o APK sem precisar do EAS Build
# O APK sera gerado em: android\app\build\outputs\apk\release\app-release.apk

Write-Host "Gerando APK localmente..." -ForegroundColor Green
Write-Host ""
Write-Host "Este processo vai:" -ForegroundColor Yellow
Write-Host "1. Fazer prebuild (gerar projeto Android nativo)" -ForegroundColor White
Write-Host "2. Compilar o APK localmente" -ForegroundColor White
Write-Host "3. O APK sera gerado em: android/app/build/outputs/apk/release/" -ForegroundColor White
Write-Host ""
Write-Host "Isso pode levar 10-20 minutos na primeira vez" -ForegroundColor Yellow
Write-Host ""

# Verificar e configurar Android SDK
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $androidSdk)) {
    $androidSdk = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

if (Test-Path $androidSdk) {
    Write-Host "Android SDK encontrado: $androidSdk" -ForegroundColor Green
    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk
    Write-Host "Variaveis de ambiente configuradas para esta sessao" -ForegroundColor Gray
} else {
    Write-Host "Android SDK nao encontrado no local padrao" -ForegroundColor Yellow
    Write-Host "O Expo tentara encontrar automaticamente" -ForegroundColor Gray
}

# Verificar e configurar Java JDK
$javaFound = $false
$javaLocations = @(
    "$env:LOCALAPPDATA\Android\Sdk\jbr",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\jbr",
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files (x86)\Android\Android Studio\jbr",
    "$env:PROGRAMFILES\Android\Android Studio\jbr",
    "$env:PROGRAMFILES(X86)\Android\Android Studio\jbr"
)

foreach ($loc in $javaLocations) {
    if (Test-Path $loc) {
        Write-Host "Java JDK encontrado: $loc" -ForegroundColor Green
        $env:JAVA_HOME = $loc
        $env:PATH = "$loc\bin;$env:PATH"
        $javaFound = $true
        break
    }
}

if (-not $javaFound) {
    # Tentar encontrar Java no PATH
    try {
        $javaVersion = java -version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Java encontrado no PATH" -ForegroundColor Green
            $javaFound = $true
        }
    } catch {
        Write-Host "Java nao encontrado automaticamente" -ForegroundColor Yellow
        Write-Host "Tentando continuar mesmo assim..." -ForegroundColor Gray
    }
}

if ($javaFound) {
    Write-Host "JAVA_HOME configurado: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "AVISO: Java nao foi configurado automaticamente" -ForegroundColor Yellow
    Write-Host "Se houver erro, configure manualmente:" -ForegroundColor Yellow
    Write-Host "  `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Passo 1: Fazendo prebuild (gerando projeto Android nativo)..." -ForegroundColor Cyan
Write-Host ""

# Fazer prebuild para gerar projeto Android
npx expo prebuild --platform android --clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no prebuild. Verifique as mensagens acima." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Passo 2: Compilando APK usando Gradle (Android Studio)..." -ForegroundColor Cyan
Write-Host ""

# Navegar para pasta android e compilar usando Gradle diretamente
Push-Location android

# Compilar APK de release usando Gradle
Write-Host "Executando: .\gradlew.bat app:assembleRelease" -ForegroundColor Gray
.\gradlew.bat app:assembleRelease

# Voltar para pasta raiz
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK gerado com sucesso pelo Android Studio/Gradle!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Localizacao do APK:" -ForegroundColor Cyan
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $fullPath = (Resolve-Path $apkPath).Path
        Write-Host "  $fullPath" -ForegroundColor White
        Write-Host ""
        Write-Host "Tamanho do APK:" -ForegroundColor Cyan
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "  $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
        Write-Host ""
        Write-Host "Para instalar no celular:" -ForegroundColor Yellow
        Write-Host "  1. Transfira o APK para o celular (USB, email, nuvem)" -ForegroundColor White
        Write-Host "  2. Ative 'Fontes desconhecidas' nas configuracoes" -ForegroundColor White
        Write-Host "  3. Abra o arquivo APK e instale" -ForegroundColor White
        Write-Host ""
        Write-Host "Ou abra o arquivo diretamente:" -ForegroundColor Yellow
        Write-Host "  explorer /select,$fullPath" -ForegroundColor Gray
    } else {
        Write-Host "APK nao encontrado no local esperado" -ForegroundColor Yellow
        Write-Host "Verifique: android\app\build\outputs\apk\release\" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Possiveis causas:" -ForegroundColor Yellow
        Write-Host "- Build pode ter falhado silenciosamente" -ForegroundColor White
        Write-Host "- Verifique os logs acima para erros" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Erro na compilacao. Verifique as mensagens acima." -ForegroundColor Red
    Write-Host ""
    Write-Host "Possiveis problemas:" -ForegroundColor Yellow
    Write-Host "- Android SDK nao configurado corretamente" -ForegroundColor White
    Write-Host "- Java JDK nao instalado ou nao no PATH" -ForegroundColor White
    Write-Host "- Dependencias do Android nao instaladas" -ForegroundColor White
    Write-Host "- Memoria insuficiente (aumente em gradle.properties)" -ForegroundColor White
    exit 1
}

