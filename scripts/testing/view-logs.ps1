# Script para ver logs do app no celular Android
# Execute este script enquanto o app está rodando no celular

Write-Host "Visualizando logs do Android..." -ForegroundColor Green
Write-Host ""
Write-Host "Certifique-se de que:" -ForegroundColor Yellow
Write-Host "  1. O celular esta conectado via USB" -ForegroundColor Yellow
Write-Host "  2. A depuracao USB esta ativada" -ForegroundColor Yellow
Write-Host "  3. O app esta rodando no celular" -ForegroundColor Yellow
Write-Host ""
Write-Host "Processe um PDF no app e os logs aparecerao abaixo" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host ""

# Verificar se adb está disponível
$adbCheck = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCheck) {
    Write-Host "Erro: ADB nao encontrado" -ForegroundColor Red
    Write-Host "Ou use: npx expo start e pressione 'a' para Android" -ForegroundColor Yellow
    exit 1
}

# Limpar logs antigos
Write-Host "Limpando logs antigos..." -ForegroundColor Gray
adb logcat -c

Write-Host ""
Write-Host "Aguardando logs... Processe um PDF no app" -ForegroundColor Green
Write-Host ""

# Filtrar logs relevantes - usando apenas texto ASCII
$pattern = 'SaudeNold|OCR|Gemini|processExam|saveExam|fileToBase64|extractData|performOCR|Erro|Error|Tentando|Iniciando|Concluido|Falhou'
adb logcat | Select-String -Pattern $pattern -Context 1
