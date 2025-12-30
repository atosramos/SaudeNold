# Script para executar testes unitários do backend no Windows

Write-Host "Instalando dependências..." -ForegroundColor Cyan
python -m pip install -r requirements.txt

Write-Host ""
Write-Host "Executando testes unitários..." -ForegroundColor Cyan
pytest -v

Write-Host ""
Write-Host "Testes concluídos!" -ForegroundColor Green

