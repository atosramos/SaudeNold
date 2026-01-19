# Como Obter a API Key do Backend

## Metodos Disponiveis

### Metodo 1: Verificar no Arquivo .env (Recomendado)

A API Key esta armazenada no arquivo `.env` do backend.

**Passos:**

1. **Navegar ate a pasta do backend:**
```powershell
cd SaudeNold\backend
```

2. **Verificar se o arquivo .env existe:**
```powershell
Test-Path .env
```

3. **Ler a API Key do arquivo .env:**
```powershell
# PowerShell
Get-Content .env | Select-String "API_KEY"

# Ou ver o conteudo completo
Get-Content .env
```

**Exemplo de saida:**
```
API_KEY=abc123xyz456def789ghi012jkl345mno678pqr901stu234vwx567
```

### Metodo 2: Usar o Endpoint de Debug (Backend Rodando)

Se o backend esta rodando, voce pode usar o endpoint de debug para verificar a API Key em uso.

**Endpoint:** `GET /debug/api-key-info`

**Exemplo com curl:**
```bash
curl http://localhost:8000/debug/api-key-info
```

**Exemplo com PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/debug/api-key-info" -Method GET
```

**Resposta esperada:**
```json
{
  "api_key_from_env": "abc123xyz456...",
  "api_key_in_memory": "abc123xyz456...",
  "api_key_length_memory": 43,
  "keys_match": true
}
```

**Nota:** Este endpoint mostra apenas os primeiros e ultimos caracteres da chave por seguranca.

### Metodo 3: Gerar Nova API Key (Se Nao Existe)

Se o arquivo `.env` nao existe, o script `start-backend-local.ps1` cria automaticamente um com uma API Key gerada.

**Passos:**

1. **Executar o script de inicializacao:**
```powershell
cd SaudeNold\backend
.\start-backend-local.ps1
```

2. **O script criara automaticamente o .env com uma API Key gerada**

3. **Depois, ler a API Key:**
```powershell
Get-Content .env | Select-String "API_KEY"
```

### Metodo 4: Gerar Manualmente uma Nova API Key

Se voce quiser gerar uma nova API Key manualmente:

**Python:**
```python
import secrets
api_key = secrets.token_urlsafe(32)
print(api_key)
```

**PowerShell (usando Python):**
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Depois, adicionar ao .env:**
```powershell
# Editar o arquivo .env e substituir a linha API_KEY
# Ou usar:
$newApiKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
(Get-Content .env) -replace '^API_KEY=.*', "API_KEY=$newApiKey" | Set-Content .env
```

## Script Automatizado para Obter API Key

Crie um arquivo `obter-api-key.ps1`:

```powershell
# Script para obter a API Key do backend
# Uso: .\obter-api-key.ps1

$backendPath = "SaudeNold\backend"
$envFile = Join-Path $backendPath ".env"

Write-Host "=== Obtendo API Key do Backend ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo .env existe
if (Test-Path $envFile) {
    Write-Host "[OK] Arquivo .env encontrado" -ForegroundColor Green
    Write-Host ""
    
    # Ler API Key
    $apiKeyLine = Get-Content $envFile | Select-String "^API_KEY="
    
    if ($apiKeyLine) {
        $apiKey = ($apiKeyLine -split "=")[1]
        Write-Host "API Key encontrada:" -ForegroundColor Yellow
        Write-Host $apiKey -ForegroundColor White
        Write-Host ""
        
        # Copiar para clipboard (opcional)
        $apiKey | Set-Clipboard
        Write-Host "[OK] API Key copiada para a area de transferencia!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] API_KEY nao encontrada no arquivo .env" -ForegroundColor Red
    }
} else {
    Write-Host "[AVISO] Arquivo .env nao encontrado em $envFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "1. Execute o script start-backend-local.ps1 para criar o .env automaticamente" -ForegroundColor White
    Write-Host "2. Ou crie manualmente o arquivo .env com a API_KEY" -ForegroundColor White
    Write-Host ""
    
    # Tentar obter do endpoint de debug
    Write-Host "Tentando obter do endpoint de debug..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/debug/api-key-info" -Method GET -ErrorAction Stop
        Write-Host "[OK] Backend esta rodando" -ForegroundColor Green
        Write-Host ""
        Write-Host "API Key (primeiros caracteres):" -ForegroundColor Yellow
        Write-Host $response.api_key_in_memory -ForegroundColor White
        Write-Host ""
        Write-Host "Nota: A chave completa esta no arquivo .env do backend" -ForegroundColor Gray
    } catch {
        Write-Host "[ERRO] Backend nao esta rodando ou endpoint nao disponivel" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Fim ===" -ForegroundColor Cyan
```

## Como Usar a API Key

### Em Scripts PowerShell

```powershell
# Definir como variavel de ambiente
$env:API_KEY = "sua-api-key-aqui"

# Ou ler do arquivo .env
$apiKey = (Get-Content "SaudeNold\backend\.env" | Select-String "^API_KEY=").ToString().Split("=")[1]
$env:API_KEY = $apiKey
```

### Em Requisicoes HTTP

**Header Authorization:**
```
Authorization: Bearer sua-api-key-aqui
```

**Exemplo com curl:**
```bash
curl -X GET "http://localhost:8000/api/analytics/dashboard" \
  -H "Authorization: Bearer sua-api-key-aqui"
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

## Seguranca

### Boas Praticas

1. **Nunca commitar a API Key no Git**
   - O arquivo `.env` deve estar no `.gitignore`
   - Verificar se esta ignorado:
   ```powershell
   git check-ignore SaudeNold/backend/.env
   ```

2. **Usar variaveis de ambiente em producao**
   - Nao hardcodar a API Key no codigo
   - Usar variaveis de ambiente do sistema ou do servidor

3. **Rotacionar a API Key periodicamente**
   - Gerar nova chave
   - Atualizar no .env
   - Reiniciar o backend
   - Atualizar todos os clientes que usam a API

4. **Nao compartilhar a API Key publicamente**
   - Manter em segredo
   - Usar apenas em comunicacoes seguras

## Troubleshooting

### "Invalid API Key" (401 Unauthorized)

**Possiveis causas:**

1. **API Key incorreta**
   - Verificar se esta usando a chave correta do .env
   - Verificar se nao ha espacos ou caracteres extras

2. **Backend nao carregou a API Key**
   - Verificar se o backend foi reiniciado apos modificar o .env
   - Verificar se o arquivo .env esta no diretorio correto

3. **Header Authorization incorreto**
   - Deve ser: `Authorization: Bearer sua-api-key`
   - Verificar se esta usando "Bearer" antes da chave

**Solucao:**
```powershell
# 1. Verificar API Key no .env
cd SaudeNold\backend
Get-Content .env | Select-String "API_KEY"

# 2. Verificar API Key em uso pelo backend
curl http://localhost:8000/debug/api-key-info

# 3. Reiniciar o backend
# Pressione Ctrl+C no terminal do backend e inicie novamente
```

### API Key Nao Encontrada

**Se o arquivo .env nao existe:**

1. **Criar manualmente:**
```powershell
cd SaudeNold\backend
$apiKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
"API_KEY=$apiKey" | Out-File -FilePath ".env" -Encoding UTF8 -Append
```

2. **Ou usar o script de inicializacao:**
```powershell
cd SaudeNold\backend
.\start-backend-local.ps1
```

## Resumo Rapido

```powershell
# Obter API Key do .env
cd SaudeNold\backend
Get-Content .env | Select-String "API_KEY"

# Ou usar endpoint de debug (se backend rodando)
curl http://localhost:8000/debug/api-key-info

# Definir como variavel de ambiente
$env:API_KEY = "sua-api-key-aqui"
```
