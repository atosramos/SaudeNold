# Script para testar o app com Expo Go (sem precisar de build)
# Execute este script para iniciar o Expo e testar no celular

Write-Host "Iniciando Expo Go para testar o app..." -ForegroundColor Green
Write-Host ""
Write-Host "Instrucoes:" -ForegroundColor Yellow
Write-Host "1. Certifique-se de que o celular esta na mesma rede Wi-Fi" -ForegroundColor White
Write-Host "2. Instale o app Expo Go no celular (se ainda nao tiver)" -ForegroundColor White
Write-Host "   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent" -ForegroundColor Gray
Write-Host "   - iOS: https://apps.apple.com/app/expo-go/id982107779" -ForegroundColor Gray
Write-Host "3. Um QR code aparecera no terminal" -ForegroundColor White
Write-Host "4. Abra o Expo Go no celular e escaneie o QR code" -ForegroundColor White
Write-Host "5. O app abrira com todas as mudancas!" -ForegroundColor White
Write-Host ""
Write-Host "Vantagens do Expo Go:" -ForegroundColor Cyan
Write-Host "- Nao precisa de build" -ForegroundColor White
Write-Host "- Funciona imediatamente" -ForegroundColor White
Write-Host "- Todas as funcionalidades disponiveis" -ForegroundColor White
Write-Host "- Logs aparecem no terminal" -ForegroundColor White
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host ""

# Iniciar Expo
npx expo start


