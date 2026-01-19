# 🚀 Teste Rápido - Endpoints de Licenças PRO

## Executar Testes

### Opção 1: Script PowerShell (Mais fácil)

```powershell
# Na pasta SaudeNold (raiz do projeto)
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\scripts\testing\test-licenses.ps1
```

### Opção 2: Script Python

```powershell
# Na pasta SaudeNold
cd C:\Users\lucia\Projetos\Saude\SaudeNold\backend

# Configurar
$env:API_URL = "http://localhost:8000"
$env:API_KEY = "sua-api-key"

# Executar
python test_licenses.py
```

## ⚙️ Configurar Backend Primeiro

1. **Gerar LICENSE_SECRET_KEY:**
   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

2. **Adicionar ao backend/.env:**
   ```env
   LICENSE_SECRET_KEY=sua_chave_gerada_aqui
   API_KEY=sua-api-key-aqui
   ```

3. **Iniciar backend:**
   ```powershell
   cd backend
   uvicorn main:app --reload
   ```

## 📝 Caminho Correto dos Arquivos

- Script Python: `SaudeNold\backend\test_licenses.py`
- Script PowerShell: `SaudeNold\scripts\testing\test-licenses.ps1`
- Documentação: `SaudeNold\docs\backend\COMO-TESTAR-LICENSES.md`
