# Script para gerar APK localmente usando Android Studio/Gradle diretamente
# Execute este script para gerar o APK sem precisar do EAS Build
# O APK sera gerado em: android\app\build\outputs\apk\release\app-release.apk

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-Command {
    param([string]$Name)
    return (Get-Command $Name -ErrorAction SilentlyContinue) -ne $null
}

# Garantir que o script roda na raiz do projeto
try {
    $repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
    Set-Location $repoRoot
} catch {
    Write-Host "Nao foi possivel resolver a raiz do projeto. Continuando no diretorio atual." -ForegroundColor Yellow
}

Write-Host "Gerando APK localmente..." -ForegroundColor Green
Write-Host ""
Write-Host "Este processo vai:" -ForegroundColor Yellow
Write-Host "1. Fazer prebuild (gerar projeto Android nativo)" -ForegroundColor White
Write-Host "2. Compilar o APK localmente" -ForegroundColor White
Write-Host "3. O APK sera gerado em: android/app/build/outputs/apk/release/" -ForegroundColor White
Write-Host ""
Write-Host "Isso pode levar 10-20 minutos na primeira vez" -ForegroundColor Yellow
Write-Host ""

# Verificar ferramentas basicas (Node/NPM)
if (-not (Test-Command node)) {
    Write-Host "Node.js nao encontrado. Instale o Node.js antes de continuar." -ForegroundColor Red
    exit 1
}
if (-not (Test-Command npx)) {
    Write-Host "npx nao encontrado. Reinstale o Node.js para incluir o npm." -ForegroundColor Red
    exit 1
}

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
if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
    Write-Host "JAVA_HOME ja configurado: $env:JAVA_HOME" -ForegroundColor Green
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    $javaFound = $true
}

$javaLocations = @(
    "$env:LOCALAPPDATA\Android\Sdk\jbr",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\jbr",
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files (x86)\Android\Android Studio\jbr",
    "$env:PROGRAMFILES\Android\Android Studio\jbr",
    "$env:PROGRAMFILES(X86)\Android\Android Studio\jbr"
)

if (-not $javaFound) {
    foreach ($loc in $javaLocations) {
        if (Test-Path $loc) {
            Write-Host "Java JDK encontrado: $loc" -ForegroundColor Green
            $env:JAVA_HOME = $loc
            $env:PATH = "$loc\bin;$env:PATH"
            $javaFound = $true
            break
        }
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
Write-Host "Passo 1: Verificando processos que podem bloquear a pasta android..." -ForegroundColor Cyan
Write-Host ""

# Função para parar processos que podem bloquear arquivos
function Stop-BlockingProcesses {
    Write-Host "  Verificando processos do Android Studio/Gradle..." -ForegroundColor Gray
    
    # Parar Gradle daemon se a pasta android existir
    if (Test-Path "android\gradlew.bat") {
        try {
            Push-Location android -ErrorAction SilentlyContinue
            if ($?) {
                Write-Host "    Parando Gradle daemon..." -ForegroundColor Gray
                .\gradlew.bat --stop 2>&1 | Out-Null
                Pop-Location
                Start-Sleep -Seconds 2
            }
        } catch {
            # Ignorar erros
        }
    }
    
    # Verificar se Android Studio está aberto
    $studioProcs = Get-Process "studio64","studio","idea64" -ErrorAction SilentlyContinue
    if ($studioProcs) {
        Write-Host "  [AVISO] Android Studio/IntelliJ detectado!" -ForegroundColor Yellow
        Write-Host "    Feche o Android Studio antes de continuar." -ForegroundColor White
        Write-Host "    Pressione qualquer tecla quando fechar, ou Ctrl+C para cancelar..." -ForegroundColor Yellow
        try {
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        } catch {
            # Se não conseguir ler tecla, continuar mesmo assim
        }
    }
    
    # Aguardar um pouco para processos liberarem arquivos
    Start-Sleep -Seconds 1
    
    Write-Host "  [OK] Verificação concluída" -ForegroundColor Green
}

# Executar verificação
Stop-BlockingProcesses

Write-Host ""
Write-Host "Passo 2: Verificando se prebuild é necessário..." -ForegroundColor Cyan
Write-Host ""

# Verificar se pasta android já existe e está completa
$androidExists = Test-Path "android"
$gradlewExists = Test-Path "android\gradlew.bat"
$buildGradleExists = Test-Path "android\app\build.gradle"

if ($androidExists -and $gradlewExists -and $buildGradleExists) {
    Write-Host "  [INFO] Pasta android já existe e parece completa" -ForegroundColor Green
    Write-Host "  [INFO] Pulando prebuild - usando projeto Android existente" -ForegroundColor Green
    Write-Host "  (Se houver problemas, delete a pasta android e execute novamente)" -ForegroundColor Gray
    Write-Host ""
    $prebuildSuccess = $true
    $prebuildExitCode = 0
} else {
    Write-Host "  [INFO] Pasta android não existe ou está incompleta" -ForegroundColor Yellow
    Write-Host "  [INFO] Executando prebuild..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Passo 2a: Fazendo prebuild (gerando projeto Android nativo)..." -ForegroundColor Cyan
    Write-Host ""

    # Tentar prebuild com --clean
    # Se falhar com EBUSY, tentar sem --clean (pode já estar atualizado)
    $prebuildSuccess = $false

    Write-Host "  Executando: npx expo prebuild --platform android --clean" -ForegroundColor Gray
    Write-Host "  (Avisos do Git sobre arquivos não commitados são normais e podem ser ignorados)" -ForegroundColor Gray
    Write-Host "  (Isso pode levar 5-10 minutos, aguarde...)" -ForegroundColor Yellow
    Write-Host ""

    # Usar variável de ambiente para pular confirmação interativa do Git
    $env:EXPO_NO_GIT_STATUS = "1"

    # Executar prebuild diretamente (mais simples e mostra output em tempo real)
    $prebuildResult = npx expo prebuild --platform android --clean 2>&1
    $prebuildExitCode = $LASTEXITCODE

    if ($prebuildExitCode -eq 0) {
        $prebuildSuccess = $true
        Write-Host "  [OK] Prebuild concluído com sucesso" -ForegroundColor Green
    } else {
        # Converter output para string para verificar
        $prebuildOutputText = $prebuildResult | Out-String
        
        # Verificar se é erro EBUSY
        if ($prebuildOutputText -match "EBUSY|resource busy|locked") {
            Write-Host "  [AVISO] Erro EBUSY detectado (pasta android bloqueada)" -ForegroundColor Yellow
            Write-Host "  Tentando sem --clean (pode deixar arquivos antigos, mas permite continuar)..." -ForegroundColor Gray
            Write-Host ""
            
            # Aguardar mais um pouco para processos liberarem arquivos
            Start-Sleep -Seconds 3
            
            # Tentar sem --clean
            Write-Host "  Executando: npx expo prebuild --platform android (sem --clean)" -ForegroundColor Gray
            $env:EXPO_NO_GIT_STATUS = "1"
            $prebuildResult2 = npx expo prebuild --platform android 2>&1
            $prebuildExitCode2 = $LASTEXITCODE
            
            if ($prebuildExitCode2 -eq 0) {
                $prebuildSuccess = $true
                Write-Host "  [OK] Prebuild concluído sem --clean" -ForegroundColor Green
            } else {
                Write-Host "  [ERRO] Prebuild falhou mesmo sem --clean" -ForegroundColor Red
                $prebuildResult2 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            }
        } else {
            Write-Host "  [ERRO] Prebuild falhou com código $prebuildExitCode" -ForegroundColor Red
            $prebuildResult | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        }
    }
}

if (-not $prebuildSuccess) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERRO NO PREBUILD" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCAO:" -ForegroundColor Yellow
    Write-Host "  1. Feche o Android Studio completamente" -ForegroundColor White
    Write-Host "  2. Feche qualquer File Explorer com a pasta android aberta" -ForegroundColor White
    Write-Host "  3. Execute manualmente:" -ForegroundColor White
    Write-Host "     cd android" -ForegroundColor Gray
    Write-Host "     .\gradlew.bat --stop" -ForegroundColor Gray
    Write-Host "  4. Aguarde 5 segundos" -ForegroundColor White
    Write-Host "  5. Tente novamente: .\scripts\build\build-local-apk.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Passo 3: Limpando build anterior..." -ForegroundColor Cyan
Write-Host ""

# Navegar para pasta android
Push-Location android

# Limpar build anterior para evitar problemas
Write-Host "Executando: .\gradlew.bat clean" -ForegroundColor Gray
.\gradlew.bat clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "Aviso: Limpeza pode ter falhado, mas continuando..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Passo 4: Compilando APK usando Gradle (Android Studio)..." -ForegroundColor Cyan
Write-Host ""

# Compilar APK de release usando Gradle
Write-Host "Executando: .\gradlew.bat app:assembleRelease" -ForegroundColor Gray
Write-Host "  (Isso pode levar 10-15 minutos)" -ForegroundColor Yellow
Write-Host "  Usando configuracoes otimizadas para evitar erro de memoria" -ForegroundColor Cyan
.\gradlew.bat app:assembleRelease --no-daemon --max-workers=2

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
    Write-Host "- Memoria insuficiente (ja aumentada para 4096m)" -ForegroundColor White
    Write-Host "- Cache do Gradle corrompido" -ForegroundColor White
    Write-Host ""
    Write-Host "Tente limpar cache do Gradle:" -ForegroundColor Cyan
    Write-Host "  cd android" -ForegroundColor Gray
    Write-Host "  .\gradlew.bat clean --no-daemon" -ForegroundColor Gray
    Write-Host "  Remove-Item -Recurse -Force .gradle" -ForegroundColor Gray
    Write-Host "  .\gradlew.bat app:assembleRelease --no-daemon" -ForegroundColor Gray
    exit 1
}

