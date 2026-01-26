# Script de Teste Completo do Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Teste Completo do Backend SaudeNold" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiKey = "<API_KEY>"
$baseUrl = "http://localhost:8000"

# Teste 1: Health Check
Write-Host "[1/5] Testando Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Health Check OK" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Health Check FALHOU: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Teste 2: Verificar Port-Forward
Write-Host "[2/5] Verificando Port-Forward..." -ForegroundColor Yellow
$portForward = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($portForward) {
    Write-Host "  ✅ Port-Forward ativo na porta 8000" -ForegroundColor Green
} else {
    Write-Host "  ❌ Port-Forward NÃO está ativo" -ForegroundColor Red
    Write-Host "  Execute: kubectl port-forward -n saudenold svc/backend 8000:8000" -ForegroundColor Yellow
    exit 1
}

# Teste 3: Verificar Proxy de Porta
Write-Host "[3/5] Verificando Proxy de Porta..." -ForegroundColor Yellow
$proxy = netsh interface portproxy show all | Select-String "192.168.15.17.*8000"
if ($proxy) {
    Write-Host "  ✅ Proxy de porta configurado" -ForegroundColor Green
    Write-Host "  $proxy" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Proxy de porta NÃO configurado" -ForegroundColor Yellow
    Write-Host "  Execute como Admin:" -ForegroundColor Yellow
    Write-Host "    netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000" -ForegroundColor White
}

# Teste 4: Testar API com Autenticação
Write-Host "[4/5] Testando API com Autenticação..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/medical-exams" -Headers $headers -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ API respondendo corretamente" -ForegroundColor Green
        $exams = $response.Content | ConvertFrom-Json
        Write-Host "  Exames encontrados: $($exams.Count)" -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "  ❌ Erro de autenticação (401)" -ForegroundColor Red
        Write-Host "  Verifique se a API Key está correta no secret do Kubernetes" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Erro: Status $statusCode" -ForegroundColor Red
        Write-Host "  Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Teste 5: Testar Criação de Exame
Write-Host "[5/5] Testando Criação de Exame..." -ForegroundColor Yellow
$testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
$body = @{
    image_base64 = $testImage
    file_type = "image"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/medical-exams" -Method POST -Headers $headers -Body $body -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Exame criado com sucesso!" -ForegroundColor Green
        $exam = $response.Content | ConvertFrom-Json
        Write-Host "  ID: $($exam.id)" -ForegroundColor Gray
        Write-Host "  Status: $($exam.processing_status)" -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  ❌ Erro ao criar exame: Status $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Detalhes: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Teste Concluído" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Configure o proxy de porta (se ainda não fez)" -ForegroundColor White
Write-Host "  2. Teste no celular: http://192.168.15.17:8000/health" -ForegroundColor White
Write-Host "  3. Atualize o app.json (já foi atualizado)" -ForegroundColor White
Write-Host "  4. Reinicie o Expo" -ForegroundColor White
Write-Host ""
