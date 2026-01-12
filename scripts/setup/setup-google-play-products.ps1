# Script para auxiliar na configuração de produtos Google Play
# Este script gera um template JSON com os produtos a serem criados

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao de Produtos Google Play" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Produtos a serem criados
$products = @(
    @{
        id = "pro_1_month"
        name = "Licenca PRO - 1 Mes"
        description = "Acesso completo as funcionalidades PRO por 1 mes, incluindo leitura automatica com Gemini AI para exames medicos e acompanhamento diario."
        price = 9.90
        currency = "BRL"
        licenseType = "1_month"
    },
    @{
        id = "pro_6_months"
        name = "Licenca PRO - 6 Meses"
        description = "Acesso completo as funcionalidades PRO por 6 meses, incluindo leitura automatica com Gemini AI para exames medicos e acompanhamento diario. Economia de 17% em relacao ao plano mensal."
        price = 49.90
        currency = "BRL"
        licenseType = "6_months"
    },
    @{
        id = "pro_1_year"
        name = "Licenca PRO - 1 Ano"
        description = "Acesso completo as funcionalidades PRO por 1 ano, incluindo leitura automatica com Gemini AI para exames medicos e acompanhamento diario. Economia de 25% em relacao ao plano mensal."
        price = 89.90
        currency = "BRL"
        licenseType = "1_year"
    }
)

Write-Host "Produtos a serem criados no Google Play Console:" -ForegroundColor Yellow
Write-Host ""

foreach ($product in $products) {
    Write-Host "ID do Produto: $($product.id)" -ForegroundColor Green
    Write-Host "  Nome: $($product.name)" -ForegroundColor White
    Write-Host "  Preco: R$ $($product.price)" -ForegroundColor White
    Write-Host "  Tipo de Licenca: $($product.licenseType)" -ForegroundColor White
    Write-Host ""
}

# Gerar arquivo JSON de referência
$jsonOutput = @{
    products = $products
    packageName = "com.atosramos.SaudeNold"
    notes = "Use estes IDs de produto no codigo do app e backend"
} | ConvertTo-Json -Depth 10

$outputFile = "google-play-products.json"
$jsonOutput | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Arquivo de referencia criado: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Acesse: https://play.google.com/console" -ForegroundColor White
Write-Host "2. Vá em: Monetizacao > Produtos e assinaturas > Produtos in-app" -ForegroundColor White
Write-Host "3. Crie cada produto usando as informacoes acima" -ForegroundColor White
Write-Host "4. Use os IDs exatamente como mostrado (pro_1_month, pro_6_months, pro_1_year)" -ForegroundColor White
Write-Host ""
Write-Host "Documentacao completa: docs/features/GOOGLE-PLAY-CONSOLE-SETUP.md" -ForegroundColor Yellow
