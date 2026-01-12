# Script PowerShell para iniciar port-forward do backend

Write-Host "Iniciando port-forward do backend..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

kubectl port-forward -n saudenold svc/backend 8000:8000
