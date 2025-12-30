# Script para executar testes unitários do backend no Windows

# Função para encontrar Python
function Find-Python {
    $pythonCommands = @('python', 'python3', 'py')
    foreach ($cmd in $pythonCommands) {
        try {
            $python = Get-Command $cmd -ErrorAction Stop
            return $python.Source
        } catch {
            continue
        }
    }
    return $null
}

# Verificar se Python está disponível
$pythonPath = Find-Python
if (-not $pythonPath) {
    Write-Host "ERRO: Python não encontrado no sistema!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale Python ou use uma das seguintes opções:" -ForegroundColor Yellow
    Write-Host "1. Instalar Python: https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host "2. Usar Docker: docker-compose up -d (depois execute pytest dentro do container)" -ForegroundColor Cyan
    Write-Host "3. Usar ambiente virtual Python se já tiver instalado" -ForegroundColor Cyan
    exit 1
}

Write-Host "Python encontrado: $pythonPath" -ForegroundColor Green
Write-Host ""

# Verificar se pip está disponível
Write-Host "Verificando pip..." -ForegroundColor Cyan
$pipCheck = & $pythonPath -m pip --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: pip não está disponível!" -ForegroundColor Red
    exit 1
}

Write-Host "Instalando dependências..." -ForegroundColor Cyan
& $pythonPath -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao instalar dependências!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Executando testes unitários..." -ForegroundColor Cyan
& $pythonPath -m pytest -v
$testExitCode = $LASTEXITCODE

Write-Host ""
if ($testExitCode -eq 0) {
    Write-Host "Todos os testes passaram!" -ForegroundColor Green
} else {
    Write-Host "Alguns testes falharam. Exit code: $testExitCode" -ForegroundColor Red
}

exit $testExitCode

