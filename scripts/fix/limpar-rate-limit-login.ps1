# Script para limpar rate limiting e tentativas falhadas de login
# Resolve o problema de "429 Too Many Requests" após muitas tentativas

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Limpar Rate Limit de Login" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "  1. Limpar tentativas falhadas de login do banco" -ForegroundColor White
Write-Host "  2. Limpar rate limit do slowapi (se possivel)" -ForegroundColor White
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "..\..\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERRO] Pasta backend nao encontrada" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

# Ativar venv
if (Test-Path "venv\Scripts\Activate.ps1") {
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "[ERRO] venv nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Limpando tentativas falhadas de login..." -ForegroundColor Yellow
try {
    python -c @"
from database import SessionLocal
from models import UserLoginAttempt
from datetime import datetime, timezone, timedelta

db = SessionLocal()
try:
    # Limpar todas as tentativas antigas (mais de 15 minutos)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    deleted = db.query(UserLoginAttempt).filter(
        UserLoginAttempt.created_at < cutoff
    ).delete()
    db.commit()
    print(f'Removidas {deleted} tentativas antigas')
    
    # Limpar TODAS as tentativas (para reset completo)
    all_deleted = db.query(UserLoginAttempt).delete()
    db.commit()
    print(f'Removidas {all_deleted} tentativas falhadas (total)')
    print('Tentativas falhadas limpas com sucesso!')
finally:
    db.close()
"@ 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Tentativas falhadas limpas" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Erro ao limpar tentativas" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel limpar tentativas automaticamente" -ForegroundColor Yellow
}

Write-Host "[2/2] Limpando rate limit do slowapi..." -ForegroundColor Yellow
Write-Host "  [INFO] O slowapi usa cache em memoria" -ForegroundColor Gray
Write-Host "  [INFO] Reinicie o backend para limpar o cache" -ForegroundColor Gray
Write-Host "  [INFO] Ou aguarde 15 minutos para o rate limit expirar" -ForegroundColor Gray

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Limpeza Concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  O slowapi rate limit (5/15min) usa cache em memoria." -ForegroundColor White
Write-Host "  Para limpar completamente:" -ForegroundColor White
Write-Host "    1. Pare o backend (Ctrl+C no terminal)" -ForegroundColor Cyan
Write-Host "    2. Inicie novamente: .\scripts\deployment\iniciar-backend-com-logs.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "  OU aguarde 15 minutos para o rate limit expirar automaticamente." -ForegroundColor White
Write-Host ""
Write-Host "Apos reiniciar o backend, tente fazer login novamente!" -ForegroundColor Green
Write-Host ""
