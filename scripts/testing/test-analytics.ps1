# Script para testar endpoints de analytics
# Uso: .\scripts\testing\test-analytics.ps1

# Configuracao
$API_URL = $env:API_URL
if (-not $API_URL) {
    $API_URL = "http://localhost:8000"
}

$API_KEY = $env:API_KEY
if (-not $API_KEY) {
    Write-Host "AVISO: API_KEY nao configurada. Configure a variavel de ambiente API_KEY ou edite este script." -ForegroundColor Yellow
    Write-Host "Exemplo: `$env:API_KEY = 'sua-api-key'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

Write-Host "=== Testando Endpoints de Analytics ===" -ForegroundColor Green
Write-Host "API URL: $API_URL" -ForegroundColor Cyan
Write-Host ""

# Verificar se backend esta rodando
Write-Host "Verificando se backend esta rodando..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -ErrorAction Stop
    Write-Host "Backend esta rodando! Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Backend nao esta respondendo em $API_URL" -ForegroundColor Red
    Write-Host "Certifique-se de que o backend esta rodando." -ForegroundColor Yellow
    exit 1
}

# Dashboard completo
Write-Host "`n1. Dashboard Completo:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/dashboard" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "  Licencas:" -ForegroundColor Cyan
    Write-Host "    Total: $($response.license_stats.total_licenses)" -ForegroundColor White
    Write-Host "    Ativas: $($response.license_stats.active_licenses)" -ForegroundColor Green
    Write-Host "    Expiradas: $($response.license_stats.expired_licenses)" -ForegroundColor Yellow
    Write-Host "    Revogadas: $($response.license_stats.revoked_licenses)" -ForegroundColor Red
    
    Write-Host "  Ativacoes:" -ForegroundColor Cyan
    Write-Host "    Total: $($response.activation_stats.total_activations)" -ForegroundColor White
    Write-Host "    Hoje: $($response.activation_stats.activations_today)" -ForegroundColor Green
    Write-Host "    Esta semana: $($response.activation_stats.activations_this_week)" -ForegroundColor Green
    
    Write-Host "  Validacoes:" -ForegroundColor Cyan
    Write-Host "    Total: $($response.validation_stats.total_validations)" -ForegroundColor White
    Write-Host "    Sucesso: $($response.validation_stats.successful_validations)" -ForegroundColor Green
    Write-Host "    Falhas: $($response.validation_stats.failed_validations)" -ForegroundColor Red
    Write-Host "    Suspeitas: $($response.validation_stats.suspicious_attempts)" -ForegroundColor Yellow
    
    Write-Host "  Compras:" -ForegroundColor Cyan
    Write-Host "    Total: $($response.purchase_stats.total_purchases)" -ForegroundColor White
    Write-Host "    Completadas: $($response.purchase_stats.completed_purchases)" -ForegroundColor Green
    Write-Host "    Receita total: R$ $($response.purchase_stats.total_revenue)" -ForegroundColor Green
    
    Write-Host "  Ultima atualizacao: $($response.last_updated)" -ForegroundColor Gray
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  API Key invalida ou ausente!" -ForegroundColor Red
    }
}

# Estatisticas de licencas
Write-Host "`n2. Estatisticas de Licencas:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/licenses" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "  Total: $($response.total_licenses)" -ForegroundColor Cyan
    Write-Host "  Ativas: $($response.active_licenses)" -ForegroundColor Green
    Write-Host "  Expiradas: $($response.expired_licenses)" -ForegroundColor Yellow
    Write-Host "  Revogadas: $($response.revoked_licenses)" -ForegroundColor Red
    Write-Host "  Por tipo:" -ForegroundColor Cyan
    Write-Host "    1 mes: $($response.licenses_by_type.'1_month')" -ForegroundColor White
    Write-Host "    6 meses: $($response.licenses_by_type.'6_months')" -ForegroundColor White
    Write-Host "    1 ano: $($response.licenses_by_type.'1_year')" -ForegroundColor White
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de ativacoes
Write-Host "`n3. Estatisticas de Ativacoes:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/activations" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "  Total: $($response.total_activations)" -ForegroundColor Cyan
    Write-Host "  Hoje: $($response.activations_today)" -ForegroundColor Green
    Write-Host "  Esta semana: $($response.activations_this_week)" -ForegroundColor Green
    Write-Host "  Este mes: $($response.activations_this_month)" -ForegroundColor Green
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de validacoes
Write-Host "`n4. Estatisticas de Validacoes:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/validations" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "  Total: $($response.total_validations)" -ForegroundColor Cyan
    Write-Host "  Sucesso: $($response.successful_validations)" -ForegroundColor Green
    Write-Host "  Falhas: $($response.failed_validations)" -ForegroundColor Red
    Write-Host "  Tentativas suspeitas: $($response.suspicious_attempts)" -ForegroundColor Yellow
    Write-Host "  Hoje: $($response.validations_today)" -ForegroundColor Cyan
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de compras
Write-Host "`n5. Estatisticas de Compras:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/purchases" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "  Total: $($response.total_purchases)" -ForegroundColor Cyan
    Write-Host "  Completadas: $($response.completed_purchases)" -ForegroundColor Green
    Write-Host "  Pendentes: $($response.pending_purchases)" -ForegroundColor Yellow
    Write-Host "  Falhas: $($response.failed_purchases)" -ForegroundColor Red
    Write-Host "  Receita total: R$ $($response.total_revenue)" -ForegroundColor Green
    Write-Host "  Receita por tipo:" -ForegroundColor Cyan
    Write-Host "    1 mes: R$ $($response.revenue_by_type.'1_month')" -ForegroundColor White
    Write-Host "    6 meses: R$ $($response.revenue_by_type.'6_months')" -ForegroundColor White
    Write-Host "    1 ano: R$ $($response.revenue_by_type.'1_year')" -ForegroundColor White
} catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Teste Concluido ===" -ForegroundColor Green
Write-Host ""
Write-Host "Para mais informacoes, consulte:" -ForegroundColor Gray
Write-Host "  docs/features/COMO-ACESSAR-ANALYTICS.md" -ForegroundColor Gray
