# Como Acessar os Endpoints de Analytics

## Requisitos

1. **Backend rodando** em `http://localhost:8000` (ou URL configurada)
2. **API Key** configurada e valida
3. **Ferramenta para fazer requisicoes HTTP** (curl, Postman, Insomnia, etc.)

## Endpoints Disponiveis

### 1. Dashboard Completo

**Endpoint:** `GET /api/analytics/dashboard`

**Exemplo com curl:**
```bash
curl -X GET "http://localhost:8000/api/analytics/dashboard" \
  -H "Authorization: Bearer sua-api-key-aqui" \
  -H "Content-Type: application/json"
```

**Exemplo com PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer sua-api-key-aqui"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/analytics/dashboard" `
    -Method GET `
    -Headers $headers
```

### 2. Estatisticas de Licencas

**Endpoint:** `GET /api/analytics/licenses`

```bash
curl -X GET "http://localhost:8000/api/analytics/licenses" \
  -H "Authorization: Bearer sua-api-key-aqui"
```

### 3. Estatisticas de Ativacoes

**Endpoint:** `GET /api/analytics/activations`

```bash
curl -X GET "http://localhost:8000/api/analytics/activations" \
  -H "Authorization: Bearer sua-api-key-aqui"
```

### 4. Estatisticas de Validacoes

**Endpoint:** `GET /api/analytics/validations`

```bash
curl -X GET "http://localhost:8000/api/analytics/validations" \
  -H "Authorization: Bearer sua-api-key-aqui"
```

### 5. Estatisticas de Compras

**Endpoint:** `GET /api/analytics/purchases`

```bash
curl -X GET "http://localhost:8000/api/analytics/purchases" \
  -H "Authorization: Bearer sua-api-key-aqui"
```

## Exemplo de Resposta do Dashboard

```json
{
  "license_stats": {
    "total_licenses": 150,
    "active_licenses": 120,
    "expired_licenses": 20,
    "revoked_licenses": 10,
    "licenses_by_type": {
      "1_month": 50,
      "6_months": 60,
      "1_year": 40
    },
    "licenses_by_status": {
      "active": 120,
      "expired": 20,
      "revoked": 10
    }
  },
  "activation_stats": {
    "total_activations": 120,
    "activations_today": 5,
    "activations_this_week": 25,
    "activations_this_month": 80,
    "activations_by_type": {
      "1_month": 40,
      "6_months": 50,
      "1_year": 30
    },
    "activation_trend": [
      {"date": "2024-01-01", "count": 2},
      {"date": "2024-01-02", "count": 3}
    ]
  },
  "validation_stats": {
    "total_validations": 500,
    "successful_validations": 450,
    "failed_validations": 50,
    "suspicious_attempts": 5,
    "validations_today": 20,
    "validations_this_week": 150,
    "validation_results": {
      "valid": 450,
      "invalid": 30,
      "expired": 15,
      "revoked": 5
    },
    "top_error_messages": [
      {"error": "Formato de chave invalido", "count": 20}
    ]
  },
  "purchase_stats": {
    "total_purchases": 150,
    "completed_purchases": 140,
    "pending_purchases": 5,
    "failed_purchases": 5,
    "total_revenue": 1500.00,
    "revenue_by_type": {
      "1_month": 500.00,
      "6_months": 600.00,
      "1_year": 400.00
    },
    "purchases_today": 3,
    "purchases_this_week": 15,
    "purchases_this_month": 50
  },
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## Como Obter a API Key

### Se o backend esta rodando localmente:

1. **Verificar no arquivo `.env` do backend:**
```bash
cd backend
cat .env | grep API_KEY
```

2. **Ou usar o endpoint de debug (apenas desenvolvimento):**
```bash
curl http://localhost:8000/debug/api-key-info
```

### Se o backend esta em producao:

A API Key deve estar configurada nas variaveis de ambiente do servidor.

## Script PowerShell para Testar

Crie um arquivo `test-analytics.ps1`:

```powershell
# Configuracao
$API_URL = "http://localhost:8000"
$API_KEY = "sua-api-key-aqui"

$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

Write-Host "=== Testando Endpoints de Analytics ===" -ForegroundColor Green

# Dashboard completo
Write-Host "`n1. Dashboard Completo:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/dashboard" `
        -Method GET `
        -Headers $headers
    Write-Host "Licencas ativas: $($response.license_stats.active_licenses)" -ForegroundColor Cyan
    Write-Host "Receita total: R$ $($response.purchase_stats.total_revenue)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de licencas
Write-Host "`n2. Estatisticas de Licencas:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/licenses" `
        -Method GET `
        -Headers $headers
    Write-Host "Total: $($response.total_licenses)" -ForegroundColor Cyan
    Write-Host "Ativas: $($response.active_licenses)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de ativacoes
Write-Host "`n3. Estatisticas de Ativacoes:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/activations" `
        -Method GET `
        -Headers $headers
    Write-Host "Total: $($response.total_activations)" -ForegroundColor Cyan
    Write-Host "Hoje: $($response.activations_today)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de validacoes
Write-Host "`n4. Estatisticas de Validacoes:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/validations" `
        -Method GET `
        -Headers $headers
    Write-Host "Total: $($response.total_validations)" -ForegroundColor Cyan
    Write-Host "Sucesso: $($response.successful_validations)" -ForegroundColor Cyan
    Write-Host "Falhas: $($response.failed_validations)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Estatisticas de compras
Write-Host "`n5. Estatisticas de Compras:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/analytics/purchases" `
        -Method GET `
        -Headers $headers
    Write-Host "Total: $($response.total_purchases)" -ForegroundColor Cyan
    Write-Host "Completadas: $($response.completed_purchases)" -ForegroundColor Cyan
    Write-Host "Receita: R$ $($response.total_revenue)" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Teste Concluido ===" -ForegroundColor Green
```

## Usando Postman ou Insomnia

1. **Criar nova requisicao GET**
2. **URL:** `http://localhost:8000/api/analytics/dashboard`
3. **Headers:**
   - `Authorization: Bearer sua-api-key-aqui`
   - `Content-Type: application/json`
4. **Enviar requisicao**

## Usando Navegador (apenas para GET)

**Nota:** Requisicoes GET podem ser feitas diretamente no navegador, mas a autenticacao via header nao funciona. Use uma extensao como "ModHeader" para adicionar o header de autorizacao.

## Verificando se o Backend Esta Rodando

```bash
# Health check
curl http://localhost:8000/health

# Deve retornar: {"status":"ok"}
```

## Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se a API Key esta correta
- Verifique se o header `Authorization: Bearer ...` esta sendo enviado

### Erro 429 (Too Many Requests)
- Rate limiting ativo (30 req/min)
- Aguarde alguns segundos e tente novamente

### Erro de Conexao
- Verifique se o backend esta rodando
- Verifique a URL (deve ser `http://localhost:8000` ou a URL configurada)

### Dados Vazios
- Normal se nao houver dados no banco ainda
- Crie algumas licencas/compras para ver dados

## Próximos Passos

Para criar uma interface web visual, voce pode:
1. Criar uma pagina React/HTML que consome esses endpoints
2. Usar ferramentas como Grafana ou Metabase
3. Criar um dashboard customizado usando os dados JSON retornados
