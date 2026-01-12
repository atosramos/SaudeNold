# Como Testar Endpoints de Licenças PRO

## 🚀 Método 1: Script PowerShell (Recomendado)

```powershell
# Na raiz do projeto SaudeNold
cd SaudeNold
.\scripts\testing\test-licenses.ps1
```

O script vai pedir:
- URL da API (ex: `http://localhost:8000`)
- API Key

## 🐍 Método 2: Script Python

```powershell
# Na raiz do projeto SaudeNold
cd SaudeNold\backend

# Configurar variáveis
$env:API_URL = "http://localhost:8000"
$env:API_KEY = "sua-api-key-aqui"

# Executar
python test_licenses.py
```

## 📋 Pré-requisitos

1. **Backend rodando:**
   ```powershell
   # Local
   cd SaudeNold\backend
   uvicorn main:app --reload
   
   # Ou Docker
   docker-compose up backend
   ```

2. **LICENSE_SECRET_KEY configurada:**
   ```powershell
   # Gerar chave
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   
   # Adicionar ao .env em backend/
   LICENSE_SECRET_KEY=sua_chave_gerada_aqui
   ```

3. **API_KEY configurada:**
   - Verificar em `backend/.env` ou Kubernetes Secret

## ✅ Testes que serão executados

1. Health Check - Verifica se backend está respondendo
2. Validação de chave inválida - Deve retornar erro
3. Geração de licença - Gera chave de 1 mês
4. Validação de chave gerada - Valida a chave recém-criada

## 🔍 Testar Manualmente com curl

### Gerar Licença

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer sua-api-key"
}

$body = @{
    license_type = "1_month"
    user_id = "test-user"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/generate-license" -Method Post -Headers $headers -Body $body
```

### Validar Licença

```powershell
$body = @{
    key = "PRO1M..."
    device_id = "test-device"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/validate-license" -Method Post -Headers $headers -Body $body
```

## 🐛 Troubleshooting

### Erro: "LICENSE_SECRET_KEY não configurada"
- Verifique se está no `.env` do backend
- Reinicie o backend após adicionar

### Erro: "401 Unauthorized"
- Verifique se a API_KEY está correta
- Verifique o header Authorization

### Erro: "Connection refused"
- Verifique se o backend está rodando
- Verifique a URL (deve ser `http://localhost:8000`)
