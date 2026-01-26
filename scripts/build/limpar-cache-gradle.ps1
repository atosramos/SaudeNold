# Script para limpar cache do Gradle e builds anteriores
# Use este script se o build estiver falhando com erros estranhos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpar Cache do Gradle" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Garantir que o script roda na raiz do projeto
try {
    $repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
    Set-Location $repoRoot
} catch {
    Write-Host "Nao foi possivel resolver a raiz do projeto. Continuando no diretorio atual." -ForegroundColor Yellow
}

Write-Host "[1/4] Limpando build do Android..." -ForegroundColor Yellow
Push-Location android
if (Test-Path ".\gradlew.bat") {
    .\gradlew.bat clean --no-daemon 2>$null | Out-Null
    Write-Host "  Build limpo" -ForegroundColor Green
} else {
    Write-Host "  gradlew.bat nao encontrado" -ForegroundColor Yellow
}
Pop-Location

Write-Host "[2/4] Removendo pasta .gradle..." -ForegroundColor Yellow
if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
    Write-Host "  Pasta .gradle removida" -ForegroundColor Green
} else {
    Write-Host "  Pasta .gradle nao encontrada" -ForegroundColor Gray
}

Write-Host "[3/4] Removendo pasta build..." -ForegroundColor Yellow
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
    Write-Host "  Pasta build removida" -ForegroundColor Green
} else {
    Write-Host "  Pasta build nao encontrada" -ForegroundColor Gray
}

Write-Host "[4/4] Removendo cache do Gradle do usuario..." -ForegroundColor Yellow
$gradleCache = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCache) {
    Write-Host "  Cache do Gradle encontrado: $gradleCache" -ForegroundColor Gray
    Write-Host "  AVISO: Remover cache pode fazer downloads demorarem na proxima vez" -ForegroundColor Yellow
    $confirm = Read-Host "  Deseja remover cache do Gradle? (S/N)"
    if ($confirm -eq "S" -or $confirm -eq "s") {
        Remove-Item -Recurse -Force "$gradleCache\modules-2" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "$gradleCache\transforms-*" -ErrorAction SilentlyContinue
        Write-Host "  Cache do Gradle limpo" -ForegroundColor Green
    } else {
        Write-Host "  Cache do Gradle mantido" -ForegroundColor Gray
    }
} else {
    Write-Host "  Cache do Gradle nao encontrado" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Limpeza Concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agora voce pode executar o build novamente:" -ForegroundColor Cyan
Write-Host "  .\scripts\build\build-local-apk.ps1" -ForegroundColor White
Write-Host ""
