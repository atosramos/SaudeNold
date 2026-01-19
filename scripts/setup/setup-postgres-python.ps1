# Script para configurar PostgreSQL usando Python (sem precisar de psql)
# Uso: .\scripts\setup\setup-postgres-python.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao PostgreSQL (via Python)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Python está disponível
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Python nao encontrado" -ForegroundColor Red
    Write-Host "   Instale Python 3.11+ de https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Verificar se psycopg2 está instalado
Write-Host "[INFO] Verificando psycopg2..." -ForegroundColor Yellow
$psycopg2Installed = python -c "import psycopg2; print('OK')" 2>&1

if ($LASTEXITCODE -ne 0 -or $psycopg2Installed -notmatch "OK") {
    Write-Host "[INFO] Instalando psycopg2..." -ForegroundColor Yellow
    pip install psycopg2-binary
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar psycopg2-binary" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] psycopg2 instalado" -ForegroundColor Green
} else {
    Write-Host "[OK] psycopg2 ja instalado" -ForegroundColor Green
}

Write-Host ""

# Solicitar informações de conexão
Write-Host "Digite as credenciais do PostgreSQL (superusuario):" -ForegroundColor Yellow
$dbHost = Read-Host "Host (Enter para localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "localhost"
}

$dbPort = Read-Host "Porta (Enter para 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "5432"
}

$dbSuperUser = Read-Host "Usuario superusuario (Enter para postgres)"
if ([string]::IsNullOrWhiteSpace($dbSuperUser)) {
    $dbSuperUser = "postgres"
}

$dbSuperPassword = Read-Host "Senha do superusuario" -AsSecureString
$dbSuperPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSuperPassword)
)

Write-Host ""
Write-Host "[INFO] Testando conexao..." -ForegroundColor Yellow

# Perguntar sobre recriação antes de executar Python
$recreateUser = "n"
$recreateDb = "n"

# Verificar se usuário existe (via Python rápido)
$checkScript = @"
import psycopg2
import sys
try:
    conn = psycopg2.connect(host="$dbHost", port=$dbPort, user="$dbSuperUser", password="$dbSuperPasswordPlain", database="postgres")
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='saudenold';")
    if cursor.fetchone():
        print("USER_EXISTS")
    cursor.execute("SELECT 1 FROM pg_database WHERE datname='saudenold';")
    if cursor.fetchone():
        print("DB_EXISTS")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
"@

$checkTemp = [System.IO.Path]::GetTempFileName() + ".py"
$checkScript | Out-File -FilePath $checkTemp -Encoding UTF8
$checkResult = python $checkTemp 2>&1
Remove-Item $checkTemp -Force

if ($checkResult -match "USER_EXISTS") {
    $recreateUser = Read-Host "Usuario 'saudenold' ja existe. Deseja recriar? (s/N)"
}

if ($checkResult -match "DB_EXISTS") {
    $recreateDb = Read-Host "Banco 'saudenold' ja existe. Deseja recriar? (s/N) - ATENCAO: Isso apagara todos os dados!"
}

# Script Python para configurar o banco
$pythonScript = @"
import psycopg2
import sys

try:
    # Conectar como superusuário
    conn = psycopg2.connect(
        host="$dbHost",
        port=$dbPort,
        user="$dbSuperUser",
        password="$dbSuperPasswordPlain",
        database="postgres"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("[OK] Conexao estabelecida")
    
    # Verificar se o usuário existe
    cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='saudenold';")
    user_exists = cursor.fetchone()
    
    if user_exists:
        print("[INFO] Usuario 'saudenold' ja existe")
        recreate_user = sys.argv[1] if len(sys.argv) > 1 else 'n'
        if recreate_user.lower() == 's':
            cursor.execute("DROP USER IF EXISTS saudenold;")
            print("[INFO] Usuario removido")
            create_user = True
        else:
            create_user = False
    else:
        create_user = True
    
    # Criar usuário
    if create_user:
        try:
            cursor.execute("CREATE USER saudenold WITH PASSWORD 'saudenold123';")
            print("[OK] Usuario 'saudenold' criado")
        except psycopg2.errors.DuplicateObject:
            print("[AVISO] Usuario ja existe (continuando...)")
    
    # Verificar se o banco existe
    cursor.execute("SELECT 1 FROM pg_database WHERE datname='saudenold';")
    db_exists = cursor.fetchone()
    
    if db_exists:
        print("[INFO] Banco 'saudenold' ja existe")
        recreate_db = sys.argv[2] if len(sys.argv) > 2 else 'n'
        if recreate_db.lower() == 's':
            # Desconectar todas as conexões
            cursor.execute("""
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = 'saudenold' AND pid <> pg_backend_pid();
            """)
            cursor.execute("DROP DATABASE IF EXISTS saudenold;")
            print("[INFO] Banco removido")
            create_db = True
        else:
            create_db = False
    else:
        create_db = True
    
    # Criar banco
    if create_db:
        try:
            cursor.execute("CREATE DATABASE saudenold OWNER saudenold;")
            print("[OK] Banco 'saudenold' criado")
        except psycopg2.errors.DuplicateDatabase:
            print("[AVISO] Banco ja existe (continuando...)")
    
    # Dar permissões
    try:
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE saudenold TO saudenold;")
        print("[OK] Permissoes configuradas")
    except Exception as e:
        print(f"[AVISO] Aviso ao configurar permissoes: {e}")
    
    # Testar conexão com o novo usuário
    cursor.close()
    conn.close()
    
    # Testar conexão com novo usuário
    test_conn = psycopg2.connect(
        host="$dbHost",
        port=$dbPort,
        user="saudenold",
        password="saudenold123",
        database="saudenold"
    )
    test_cursor = test_conn.cursor()
    test_cursor.execute("SELECT current_database(), current_user;")
    result = test_cursor.fetchone()
    print(f"[OK] Conexao testada: database={result[0]}, user={result[1]}")
    test_cursor.close()
    test_conn.close()
    
    print("\n[OK] Configuracao concluida com sucesso!")
    sys.exit(0)
    
except psycopg2.OperationalError as e:
    print(f"[ERRO] Erro de conexao: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[ERRO] Erro: {e}")
    sys.exit(1)
"@

# Salvar script temporário
$tempScript = [System.IO.Path]::GetTempFileName() + ".py"
$pythonScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Executar script Python com parâmetros
    python $tempScript $recreateUser $recreateDb
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Configuracao Concluida!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Credenciais do banco:" -ForegroundColor Yellow
        Write-Host "   Host: $dbHost" -ForegroundColor White
        Write-Host "   Porta: $dbPort" -ForegroundColor White
        Write-Host "   Usuario: saudenold" -ForegroundColor White
        Write-Host "   Senha: saudenold123" -ForegroundColor White
        Write-Host "   Database: saudenold" -ForegroundColor White
        Write-Host ""
        Write-Host "[OK] Pronto para usar!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERRO] Falha na configuracao" -ForegroundColor Red
    }
} finally {
    # Limpar arquivo temporário
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
    # Limpar senha da memória
    $dbSuperPasswordPlain = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSuperPassword))
}
