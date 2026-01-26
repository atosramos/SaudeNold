# Script para verificar se há servidor HTTP inseguro na porta 8080
# Detecta e alerta sobre servidores que expõem arquivos do projeto

$ErrorActionPreference = "Stop"

$port = 8080

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificação de Segurança - Porta $port" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se há processo na porta 8080
$listening = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
if (-not $listening) {
    Write-Host "✅ Nenhum servidor rodando na porta $port" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Servidor detectado na porta $port" -ForegroundColor Yellow
Write-Host "   Verificando se é seguro..." -ForegroundColor Yellow
Write-Host ""

# Testar se o servidor lista diretórios (sinal de servidor inseguro)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    
    # Verificar se retorna listagem de diretórios
    if ($response.Content -match "<title>Directory listing" -or $response.Content -match "<h1>Directory listing") {
        Write-Host "🚨 VULNERABILIDADE CRÍTICA DETECTADA!" -ForegroundColor Red
        Write-Host ""
        Write-Host "O servidor na porta $port está EXpondo TODOS os arquivos do projeto!" -ForegroundColor Red
        Write-Host "Isso inclui:" -ForegroundColor Red
        Write-Host "  - Arquivos .env (senhas, chaves)" -ForegroundColor Red
        Write-Host "  - Código-fonte completo" -ForegroundColor Red
        Write-Host "  - Repositório Git (.git/)" -ForegroundColor Red
        Write-Host "  - Configurações sensíveis" -ForegroundColor Red
        Write-Host ""
        Write-Host "AÇÃO NECESSÁRIA:" -ForegroundColor Yellow
        Write-Host "  1. Pare o servidor inseguro imediatamente" -ForegroundColor Yellow
        Write-Host "  2. Use apenas o servidor seguro:" -ForegroundColor Yellow
        Write-Host "     .\scripts\utils\serve-dashboard-secure.ps1" -ForegroundColor White
        Write-Host ""
        
        # Tentar identificar processos Python na porta 8080
        $netstatOutput = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
        if ($netstatOutput) {
            $pids = ($netstatOutput -split '\s+') | Select-Object -Last 1
            Write-Host "Processos na porta $port (PIDs): $pids" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Para parar os processos inseguros:" -ForegroundColor Yellow
            Write-Host "  Stop-Process -Id $pids -Force" -ForegroundColor White
        }
        
        exit 1
    } else {
        # Verificar se bloqueia acesso a arquivos sensíveis
        Write-Host "✅ Servidor detectado - verificando segurança..." -ForegroundColor Yellow
        
        # Testar acesso a .env (deve ser bloqueado)
        try {
            $envTest = Invoke-WebRequest -Uri "http://localhost:$port/.env" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($envTest.StatusCode -eq 200) {
                Write-Host "🚨 VULNERABILIDADE: Arquivo .env acessível!" -ForegroundColor Red
                Write-Host "   O servidor permite acesso a arquivos sensíveis" -ForegroundColor Red
                exit 1
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 403) {
                Write-Host "✅ Acesso a .env bloqueado (403)" -ForegroundColor Green
            }
        }
        
        Write-Host "✅ Servidor parece seguro" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "⚠️  Não foi possível conectar ao servidor na porta $port" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
    exit 0
}
