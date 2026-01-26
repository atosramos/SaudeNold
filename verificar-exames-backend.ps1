# Script para verificar status dos exames no backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificação de Exames Médicos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiKey = "<API_KEY>"
$baseUrl = "http://localhost:8000"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Teste 1: Health Check
Write-Host "[1/4] Verificando backend..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    if ($health.StatusCode -eq 200) {
        Write-Host "  ✅ Backend está respondendo" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Backend não está acessível" -ForegroundColor Red
    exit 1
}

# Teste 2: Listar todos os exames
Write-Host "[2/4] Listando exames..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/medical-exams" -Headers $headers -UseBasicParsing
    $exams = $response.Content | ConvertFrom-Json
    
    Write-Host "  ✅ Total de exames: $($exams.Count)" -ForegroundColor Green
    Write-Host ""
    
    if ($exams.Count -eq 0) {
        Write-Host "  ⚠️  Nenhum exame encontrado no backend" -ForegroundColor Yellow
        Write-Host "  Isso pode significar:" -ForegroundColor Yellow
        Write-Host "    - PDF foi salvo apenas localmente no app" -ForegroundColor Gray
        Write-Host "    - Backend estava offline quando o PDF foi enviado" -ForegroundColor Gray
        Write-Host "    - Sincronização ainda não ocorreu" -ForegroundColor Gray
        exit 0
    }
    
    # Separar por tipo
    $pdfs = $exams | Where-Object { $_.file_type -eq 'pdf' }
    $images = $exams | Where-Object { $_.file_type -eq 'image' }
    
    Write-Host "  PDFs: $($pdfs.Count)" -ForegroundColor $(if ($pdfs.Count -gt 0) { 'Green' } else { 'Yellow' })
    Write-Host "  Imagens: $($images.Count)" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "  ❌ Erro ao listar exames: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Teste 3: Detalhes de cada exame
Write-Host "[3/4] Detalhes dos exames..." -ForegroundColor Yellow
Write-Host ""

foreach ($exam in $exams | Sort-Object {[DateTime]$_.created_at} -Descending) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "ID: $($exam.id)" -ForegroundColor Cyan
    Write-Host "Tipo: $($exam.file_type)" -ForegroundColor $(if ($exam.file_type -eq 'pdf') { 'Magenta' } else { 'White' })
    Write-Host "Status: $($exam.processing_status)" -ForegroundColor $(switch($exam.processing_status) {
        'completed' { 'Green' }
        'processing' { 'Yellow' }
        'pending' { 'Red' }
        'error' { 'Red' }
        default { 'White' }
    })
    
    if ($exam.exam_type) {
        Write-Host "Tipo de Exame: $($exam.exam_type)" -ForegroundColor Green
    } else {
        Write-Host "Tipo de Exame: Não identificado" -ForegroundColor Yellow
    }
    
    if ($exam.exam_date) {
        Write-Host "Data do Exame: $($exam.exam_date)" -ForegroundColor Green
    } else {
        Write-Host "Data do Exame: Não informada" -ForegroundColor Yellow
    }
    
    Write-Host "Criado em: $($exam.created_at)" -ForegroundColor Gray
    
    if ($exam.extracted_data -and $exam.extracted_data.parameters) {
        Write-Host "Parâmetros: $($exam.extracted_data.parameters.Count)" -ForegroundColor Green
        if ($exam.extracted_data.parameters.Count -gt 0) {
            Write-Host "  Primeiros parâmetros:" -ForegroundColor Gray
            $exam.extracted_data.parameters | Select-Object -First 3 | ForEach-Object {
                Write-Host "    - $($_.name): $($_.value) $($_.unit)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "Parâmetros: 0" -ForegroundColor Yellow
    }
    
    if ($exam.processing_error) {
        Write-Host "❌ Erro: $($exam.processing_error)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Teste 4: Verificar exames pendentes
Write-Host "[4/4] Verificando exames pendentes..." -ForegroundColor Yellow
$pending = $exams | Where-Object { $_.processing_status -eq 'pending' -or $_.processing_status -eq 'processing' }
if ($pending.Count -gt 0) {
    Write-Host "  ⚠️  Exames pendentes/processando: $($pending.Count)" -ForegroundColor Yellow
    foreach ($p in $pending) {
        Write-Host "    - ID $($p.id) ($($p.file_type)): $($p.processing_status)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  ℹ️  Estes exames serão processados em background" -ForegroundColor Cyan
} else {
    Write-Host "  ✅ Nenhum exame pendente" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificação Concluída" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Resumo
Write-Host "Resumo:" -ForegroundColor Yellow
Write-Host "  Total: $($exams.Count)" -ForegroundColor White
Write-Host "  PDFs: $($pdfs.Count)" -ForegroundColor $(if ($pdfs.Count -gt 0) { 'Green' } else { 'Yellow' })
Write-Host "  Imagens: $($images.Count)" -ForegroundColor White
Write-Host "  Processados: $(($exams | Where-Object { $_.processing_status -eq 'completed' }).Count)" -ForegroundColor Green
Write-Host "  Pendentes: $(($exams | Where-Object { $_.processing_status -eq 'pending' }).Count)" -ForegroundColor Yellow
Write-Host "  Processando: $(($exams | Where-Object { $_.processing_status -eq 'processing' }).Count)" -ForegroundColor Yellow
$errorCount = ($exams | Where-Object { $_.processing_status -eq 'error' }).Count
Write-Host "  Com erro: $errorCount" -ForegroundColor Red
Write-Host ""

