# Script para obter a API Key do backend
# Uso: .\scripts\utils\obter-api-key.ps1

$ErrorActionPreference = "Continue"

# Determinar o caminho do backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
$backendPath = Join-Path $projectRoot "backend"
$envFile = Join-Path $backendPath ".env"

Write-Host "=== Obtendo API Key do Backend ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo .env existe
if (Test-Path $envFile) {
    Write-Host "[OK] Arquivo .env encontrado em:" -ForegroundColor Green
    Write-Host "    $envFile" -ForegroundColor Gray
    Write-Host ""
    
    # Ler API Key
    $apiKeyLine = Get-Content $envFile | Select-String "^API_KEY="
    
    if ($apiKeyLine) {
        $apiKey = ($apiKeyLine -split "=", 2)[1].Trim()
        
        if ($apiKey) {
            Write-Host "API Key encontrada:" -ForegroundColor Yellow
            Write-Host $apiKey -ForegroundColor White
            Write-Host ""
            
            # Copiar para clipboard
            try {
                $apiKey | Set-Clipboard
                Write-Host "[OK] API Key copiada para a area de transferencia!" -ForegroundColor Green
            } catch {
                Write-Host "[AVISO] Nao foi possivel copiar para a area de transferencia" -ForegroundColor Yellow
            }
            
            # Tambem definir como variavel de ambiente para esta sessao
            $env:API_KEY = $apiKey
            Write-Host "[OK] API Key definida como variavel de ambiente (esta sessao)" -ForegroundColor Green
            Write-Host ""
            Write-Host "Voce pode usar: `$env:API_KEY" -ForegroundColor Gray
        } else {
            Write-Host "[ERRO] API_KEY esta vazia no arquivo .env" -ForegroundColor Red
        }
    } else {
        Write-Host "[ERRO] API_KEY nao encontrada no arquivo .env" -ForegroundColor Red
        Write-Host ""
        Write-Host "Adicione a linha abaixo ao arquivo .env:" -ForegroundColor Yellow
        Write-Host "API_KEY=sua-api-key-aqui" -ForegroundColor White
    }
} else {
    Write-Host "[AVISO] Arquivo .env nao encontrado em:" -ForegroundColor Yellow
    Write-Host "    $envFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "1. Execute o script start-backend-local.ps1 para criar o .env automaticamente" -ForegroundColor White
    Write-Host "2. Ou crie manualmente o arquivo .env com a API_KEY" -ForegroundColor White
    Write-Host ""
    
    # Tentar obter do endpoint de debug
    Write-Host "Tentando obter do endpoint de debug..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/debug/api-key-info" -Method GET -ErrorAction Stop -TimeoutSec 3
        Write-Host "[OK] Backend esta rodando" -ForegroundColor Green
        Write-Host ""
        
        if ($response.api_key_in_memory) {
            Write-Host "API Key em uso pelo backend:" -ForegroundColor Yellow
            Write-Host $response.api_key_in_memory -ForegroundColor White
            Write-Host ""
            Write-Host "Nota: Esta e a chave em memoria. A chave completa esta no arquivo .env" -ForegroundColor Gray
            Write-Host "      Crie o arquivo .env com esta chave para persistencia." -ForegroundColor Gray
        }
    } catch {
        Write-Host "[AVISO] Backend nao esta rodando ou endpoint nao disponivel" -ForegroundColor Yellow
        Write-Host "        Erro: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Fim ===" -ForegroundColor Cyan
