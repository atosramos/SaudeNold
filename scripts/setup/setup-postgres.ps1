# Script para configurar PostgreSQL localmente
# Uso: .\scripts\setup\setup-postgres.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao PostgreSQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se psql está disponível
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "[ERRO] psql nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "O PostgreSQL nao esta instalado ou nao esta no PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "1. Instale o PostgreSQL e adicione ao PATH" -ForegroundColor White
    Write-Host "   Veja: docs\setup\INSTALAR-POSTGRESQL.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Use o script alternativo que nao precisa de psql:" -ForegroundColor White
    Write-Host "   .\scripts\setup\setup-postgres-python.ps1" -ForegroundColor Green
    Write-Host ""
    $usePython = Read-Host "Deseja usar o script Python agora? (S/n)"
    if ($usePython -eq "" -or $usePython -eq "s" -or $usePython -eq "S") {
        Write-Host ""
        Write-Host "Executando script Python..." -ForegroundColor Yellow
        & .\scripts\setup\setup-postgres-python.ps1
        exit $LASTEXITCODE
    }
    exit 1
}

# Solicitar senha do superusuário postgres
Write-Host "Digite a senha do usuario 'postgres' (superusuario):" -ForegroundColor Yellow
$postgresPassword = Read-Host -AsSecureString
$postgresPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword)
)

# Configurar variável de ambiente para psql
$env:PGPASSWORD = $postgresPasswordPlain

Write-Host ""
Write-Host "[INFO] Verificando conexao..." -ForegroundColor Yellow

# Testar conexão - usar aspas simples para SQL
try {
    $sqlQuery = 'SELECT version();'
    $testResult = psql -U postgres -h localhost -c $sqlQuery 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Conexao com PostgreSQL estabelecida" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Erro ao conectar ao PostgreSQL" -ForegroundColor Red
        Write-Host "   Verifique se o PostgreSQL esta rodando" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERRO] Erro ao conectar ao PostgreSQL" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verificar se o usuário já existe
Write-Host "[INFO] Verificando se o usuario 'saudenold' existe..." -ForegroundColor Yellow
$sqlQuery = "SELECT 1 FROM pg_roles WHERE rolname='saudenold';"
$userExists = psql -U postgres -h localhost -tAc $sqlQuery 2>&1

if ($userExists -match "1") {
    Write-Host "[OK] Usuario 'saudenold' ja existe" -ForegroundColor Green
    
    # Perguntar se quer recriar
    $recreate = Read-Host "Deseja recriar o usuario? (s/N)"
    if ($recreate -eq "s" -or $recreate -eq "S") {
        Write-Host "[INFO] Removendo usuario existente..." -ForegroundColor Yellow
        $sqlQuery = "DROP USER IF EXISTS saudenold;"
        psql -U postgres -h localhost -c $sqlQuery 2>&1 | Out-Null
        $createUser = $true
    } else {
        $createUser = $false
    }
} else {
    $createUser = $true
}

# Criar usuário
if ($createUser) {
    Write-Host "[INFO] Criando usuario 'saudenold'..." -ForegroundColor Yellow
    $sqlQuery = "CREATE USER saudenold WITH PASSWORD 'saudenold123';"
    $createUserResult = psql -U postgres -h localhost -c $sqlQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Usuario criado com sucesso" -ForegroundColor Green
    } else {
        if ($createUserResult -match "already exists") {
            Write-Host "[AVISO] Usuario ja existe (continuando...)" -ForegroundColor Yellow
        } else {
            Write-Host "[ERRO] Erro ao criar usuario" -ForegroundColor Red
            Write-Host "   $createUserResult" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Verificar se o banco já existe
Write-Host ""
Write-Host "[INFO] Verificando se o banco 'saudenold' existe..." -ForegroundColor Yellow
$sqlQuery = "SELECT 1 FROM pg_database WHERE datname='saudenold';"
$dbExists = psql -U postgres -h localhost -tAc $sqlQuery 2>&1

if ($dbExists -match "1") {
    Write-Host "[OK] Banco 'saudenold' ja existe" -ForegroundColor Green
    
    # Perguntar se quer recriar
    $recreate = Read-Host "Deseja recriar o banco? (s/N) - ATENCAO: Isso apagara todos os dados!"
    if ($recreate -eq "s" -or $recreate -eq "S") {
        Write-Host "[INFO] Removendo banco existente..." -ForegroundColor Yellow
        # Desconectar todas as conexões primeiro
        $sqlQuery = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'saudenold' AND pid <> pg_backend_pid();"
        psql -U postgres -h localhost -c $sqlQuery 2>&1 | Out-Null
        $sqlQuery = "DROP DATABASE IF EXISTS saudenold;"
        psql -U postgres -h localhost -c $sqlQuery 2>&1 | Out-Null
        $createDb = $true
    } else {
        $createDb = $false
    }
} else {
    $createDb = $true
}

# Criar banco
if ($createDb) {
    Write-Host "[INFO] Criando banco de dados 'saudenold'..." -ForegroundColor Yellow
    $sqlQuery = "CREATE DATABASE saudenold OWNER saudenold;"
    $createDbResult = psql -U postgres -h localhost -c $sqlQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Banco criado com sucesso" -ForegroundColor Green
    } else {
        if ($createDbResult -match "already exists") {
            Write-Host "[AVISO] Banco ja existe (continuando...)" -ForegroundColor Yellow
        } else {
            Write-Host "[ERRO] Erro ao criar banco" -ForegroundColor Red
            Write-Host "   $createDbResult" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Dar permissões
Write-Host ""
Write-Host "[INFO] Configurando permissoes..." -ForegroundColor Yellow
$sqlQuery = "GRANT ALL PRIVILEGES ON DATABASE saudenold TO saudenold;"
$grantResult = psql -U postgres -h localhost -c $sqlQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Permissoes configuradas" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Aviso ao configurar permissoes (pode ser normal)" -ForegroundColor Yellow
}

# Testar conexão com o novo usuário
Write-Host ""
Write-Host "[INFO] Testando conexao com o novo usuario..." -ForegroundColor Yellow
$env:PGPASSWORD = "saudenold123"
$sqlQuery = "SELECT current_database(), current_user;"
$testConnection = psql -U saudenold -d saudenold -h localhost -c $sqlQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Conexao testada com sucesso" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Nao foi possivel testar a conexao" -ForegroundColor Yellow
    Write-Host "   Mas o banco foi criado. Teste manualmente:" -ForegroundColor Yellow
    Write-Host "   psql -U saudenold -d saudenold -h localhost" -ForegroundColor Cyan
}

# Limpar senha da memória
$env:PGPASSWORD = ""
$postgresPasswordPlain = $null
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword))

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao Concluida!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciais do banco:" -ForegroundColor Yellow
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Porta: 5432" -ForegroundColor White
Write-Host "   Usuario: saudenold" -ForegroundColor White
Write-Host "   Senha: saudenold123" -ForegroundColor White
Write-Host "   Database: saudenold" -ForegroundColor White
Write-Host ""
Write-Host "[OK] Pronto para usar!" -ForegroundColor Green
Write-Host ""
