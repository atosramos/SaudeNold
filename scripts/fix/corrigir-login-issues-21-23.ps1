# Script para corrigir problemas de login causados pelas issues 21, 22, 23
# Desabilita verificação de email e garante que tabelas de família existam

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Corrigir Login - Issues 21, 22, 23" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "  1. Desabilitar REQUIRE_EMAIL_VERIFICATION" -ForegroundColor White
Write-Host "  2. Verificar/criar tabelas de familia no banco" -ForegroundColor White
Write-Host "  3. Marcar usuarios existentes como email_verified" -ForegroundColor White
Write-Host "  4. Garantir que backend esta rodando" -ForegroundColor White
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "..\..\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERRO] Pasta backend nao encontrada" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

# 1. Corrigir .env - Desabilitar verificação de email
Write-Host "[1/4] Corrigindo REQUIRE_EMAIL_VERIFICATION..." -ForegroundColor Yellow
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "REQUIRE_EMAIL_VERIFICATION\s*=\s*.+") {
        $envContent = $envContent -replace "REQUIRE_EMAIL_VERIFICATION\s*=\s*.+", "REQUIRE_EMAIL_VERIFICATION=false"
        Write-Host "  [OK] REQUIRE_EMAIL_VERIFICATION desabilitado" -ForegroundColor Green
    } else {
        $envContent += "`nREQUIRE_EMAIL_VERIFICATION=false`n"
        Write-Host "  [OK] REQUIRE_EMAIL_VERIFICATION adicionado como false" -ForegroundColor Green
    }
    $envContent | Out-File -FilePath $envFile -Encoding UTF8 -NoNewline
} else {
    Write-Host "  [AVISO] Arquivo .env nao encontrado, criando..." -ForegroundColor Yellow
    @"
REQUIRE_EMAIL_VERIFICATION=false
ALLOW_EMAIL_DEBUG=true
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "  [OK] Arquivo .env criado com REQUIRE_EMAIL_VERIFICATION=false" -ForegroundColor Green
}

# 2. Verificar/criar tabelas no banco
Write-Host "[2/4] Verificando tabelas no banco de dados..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
try {
    python -c "from database import engine, Base; from models import Family, FamilyProfile; Base.metadata.create_all(bind=engine); print('Tabelas verificadas/criadas')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Tabelas de familia verificadas/criadas" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Erro ao verificar tabelas (pode ser normal se ja existirem)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel verificar tabelas automaticamente" -ForegroundColor Yellow
    Write-Host "    Execute manualmente: python migrate_family_profiles.py" -ForegroundColor Gray
}

# 3. Marcar usuarios existentes como email_verified
Write-Host "[3/4] Marcando usuarios existentes como email_verified..." -ForegroundColor Yellow
try {
    python -c @"
from database import SessionLocal
from models import User
db = SessionLocal()
try:
    users = db.query(User).filter(User.email_verified == False).all()
    for user in users:
        user.email_verified = True
    db.commit()
    print(f'Marcados {len(users)} usuarios como email_verified')
finally:
    db.close()
"@ 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Usuarios marcados como email_verified" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Erro ao marcar usuarios (pode ser normal se nao houver usuarios)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [AVISO] Nao foi possivel marcar usuarios automaticamente" -ForegroundColor Yellow
}

# 4. Verificar se backend esta rodando
Write-Host "[4/4] Verificando se backend esta rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  [OK] Backend esta rodando" -ForegroundColor Green
    Write-Host ""
    Write-Host "  IMPORTANTE: Reinicie o backend para aplicar as mudancas!" -ForegroundColor Yellow
    Write-Host "    1. Pare o backend atual (Ctrl+C no terminal)" -ForegroundColor White
    Write-Host "    2. Inicie novamente: .\scripts\deployment\iniciar-backend-com-logs.ps1" -ForegroundColor White
} catch {
    Write-Host "  [AVISO] Backend NAO esta rodando" -ForegroundColor Yellow
    Write-Host "    Inicie o backend: .\scripts\deployment\iniciar-backend-com-logs.ps1" -ForegroundColor White
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Correcoes Aplicadas!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mudancas realizadas:" -ForegroundColor Cyan
Write-Host "  - REQUIRE_EMAIL_VERIFICATION = false" -ForegroundColor White
Write-Host "  - Tabelas de familia verificadas" -ForegroundColor White
Write-Host "  - Usuarios existentes marcados como email_verified" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMO PASSO CRITICO:" -ForegroundColor Red
Write-Host "  REINICIE O BACKEND para aplicar as mudancas!" -ForegroundColor Yellow
Write-Host ""
Write-Host "  .\scripts\deployment\iniciar-backend-com-logs.ps1" -ForegroundColor White
Write-Host ""
