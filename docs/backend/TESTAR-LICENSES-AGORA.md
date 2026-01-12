# ⚠️ IMPORTANTE: Reiniciar Backend Após Mudanças no .env

## 🔄 O Problema

O backend precisa ser **reiniciado** para carregar novas variáveis de ambiente do arquivo `.env`.

## ✅ Solução

### 1. Parar o Backend Atual
- Pressione `Ctrl+C` no terminal onde o backend está rodando

### 2. Verificar .env
```powershell
cd backend
Get-Content .env | Select-String "API_KEY"
```

### 3. Reiniciar Backend
```powershell
# Se estiver usando uvicorn diretamente
uvicorn main:app --reload

# Ou usar o script
.\start-backend-local.ps1
```

### 4. Testar Novamente
```powershell
$env:API_URL = "http://localhost:8000"
$env:API_KEY = "sua-api-key-do-env"
python backend\test_licenses.py
```

## 🔍 Verificar API_KEY do Backend

Para ver qual API_KEY o backend está usando:

```powershell
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('API_KEY'))"
```

Use essa mesma API_KEY no teste!
