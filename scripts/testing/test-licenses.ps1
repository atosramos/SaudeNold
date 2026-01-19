# Script para testar endpoints de licenças PRO
# Execute: .\scripts\testing\test-licenses.ps1

Write-Host "=== Teste de Endpoints de Licenças PRO ===" -ForegroundColor Green
Write-Host ""

# Configuração
$API_URL = $env:API_URL
if (-not $API_URL) {
    $API_URL = Read-Host "Digite a URL da API (ex: http://localhost:8000)"
}

$API_KEY = $env:API_KEY
if (-not $API_KEY) {
    $API_KEY = Read-Host "Digite a API Key"
}

Write-Host "API URL: $API_URL" -ForegroundColor Cyan
Write-Host "API Key: $($API_KEY.Substring(0, [Math]::Min(20, $API_KEY.Length)))..." -ForegroundColor Cyan
Write-Host ""

# Teste 1: Health Check
Write-Host "1. Testando Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    Write-Host "   ✅ Backend está respondendo: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao conectar ao backend: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifique se o backend está rodando em $API_URL" -ForegroundColor Yellow
    exit 1
}

# Teste 2: Validar Licença Inválida
Write-Host ""
Write-Host "2. Testando validação de licença inválida..." -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $API_KEY"
    }
    $body = @{
        key = "INVALID_KEY"
        device_id = "test-device-123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/validate-license" -Method Post -Headers $headers -Body $body
    Write-Host "   Resposta: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Detalhes: $responseBody" -ForegroundColor Red
    }
}

# Teste 3: Gerar Licença
Write-Host ""
Write-Host "3. Testando geração de licença (1 mês)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $API_KEY"
    }
    $body = @{
        license_type = "1_month"
        user_id = "test-user-ps1"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/generate-license" -Method Post -Headers $headers -Body $body
    Write-Host "   ✅ Licença gerada com sucesso!" -ForegroundColor Green
    Write-Host "   Chave: $($response.license_key)" -ForegroundColor Cyan
    Write-Host "   Expira em: $($response.expiration_date)" -ForegroundColor Cyan
    
    # Testar validação da chave gerada
    Write-Host ""
    Write-Host "4. Validando chave gerada..." -ForegroundColor Yellow
    $validateBody = @{
        key = $response.license_key
        device_id = "test-device-ps1"
    } | ConvertTo-Json
    
    $validateResponse = Invoke-RestMethod -Uri "$API_URL/api/validate-license" -Method Post -Headers $headers -Body $validateBody
    Write-Host "   ✅ Validação: $($validateResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Detalhes: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Testes Concluídos ===" -ForegroundColor Green
