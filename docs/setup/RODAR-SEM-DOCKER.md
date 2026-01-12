# 🚀 Como Rodar o Sistema Sem Docker ou Kubernetes

Este guia mostra como executar o SaudeNold completamente local, sem precisar de Docker ou Kubernetes.

## 📋 Pré-requisitos

### 1. Instalar PostgreSQL Localmente

**Windows:**
- Baixe e instale o PostgreSQL 15+ de: https://www.postgresql.org/download/windows/
- Durante a instalação, anote a senha do usuário `postgres`
- Ou crie um usuário específico para o projeto

**Alternativa rápida (Windows):**
```powershell
# Usando Chocolatey (se tiver instalado)
choco install postgresql15
```

### 2. Instalar Python 3.11+

**Windows:**
- Baixe de: https://www.python.org/downloads/
- Marque a opção "Add Python to PATH" durante a instalação

### 3. Instalar Node.js 18+

**Windows:**
- Baixe de: https://nodejs.org/
- Ou use Chocolatey: `choco install nodejs`

### 4. Instalar Tesseract OCR (para funcionalidade OCR)

**Windows:**
- Baixe de: https://github.com/UB-Mannheim/tesseract/wiki
- Durante a instalação, anote o caminho (geralmente `C:\Program Files\Tesseract-OCR`)
- Adicione ao PATH do sistema

## 🔧 Configuração do Banco de Dados

### 1. Criar Banco de Dados e Usuário

Abra o **pgAdmin** ou o **psql** e execute:

```sql
-- Conectar como superusuário (postgres)
-- Criar usuário
CREATE USER saudenold WITH PASSWORD 'saudenold123';

-- Criar banco de dados
CREATE DATABASE saudenold OWNER saudenold;

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE saudenold TO saudenold;
```

**Ou via linha de comando (PowerShell):**

```powershell
# Conectar ao PostgreSQL (ajuste a senha do postgres)
$env:PGPASSWORD='sua_senha_postgres'
psql -U postgres -c "CREATE USER saudenold WITH PASSWORD 'saudenold123';"
psql -U postgres -c "CREATE DATABASE saudenold OWNER saudenold;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE saudenold TO saudenold;"
```

## 🐍 Configuração do Backend Python

### 1. Criar Ambiente Virtual

```powershell
cd SaudeNold\backend
python -m venv venv

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1
```

**Se der erro de política de execução:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Instalar Dependências

```powershell
# Com ambiente virtual ativado
pip install -r requirements.txt
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/`:

```env
# Banco de Dados
DATABASE_USER=saudenold
DATABASE_PASSWORD=saudenold123
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=saudenold

# Ou use DATABASE_URL completa:
# DATABASE_URL=postgresql://saudenold:saudenold123@localhost:5432/saudenold

# API Key (gerar uma nova ou usar a padrão)
API_KEY=sua_api_key_aqui

# CORS
CORS_ORIGINS=http://localhost:8082,exp://*

# License Secret Key (para sistema de licenças)
LICENSE_SECRET_KEY=sua_chave_secreta_aqui
```

**Gerar API Key e License Secret Key:**

```powershell
python -c "import secrets; print('API_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('LICENSE_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 4. Configurar Tesseract (se necessário)

Se o Tesseract não estiver no PATH, adicione no `.env`:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### 5. Rodar o Backend

```powershell
# Com ambiente virtual ativado
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

O backend estará disponível em: **http://localhost:8000**

- Documentação: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## 📱 Configuração do Frontend (React Native/Expo)

### 1. Instalar Dependências

```powershell
cd SaudeNold
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto `SaudeNold/`:

```env
# Backend URL
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Gemini AI (opcional, para extração de dados de exames)
EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_gemini_aqui
```

### 3. Rodar o App

```powershell
npm start
```

Isso abrirá o Expo Dev Tools. Você pode:
- Pressionar `a` para abrir no Android
- Pressionar `i` para abrir no iOS (Mac)
- Pressionar `w` para abrir no navegador
- Escanear o QR code com o Expo Go no celular

## ✅ Verificação

### 1. Verificar Backend

```powershell
# Testar health check
curl http://localhost:8000/health

# Ou no navegador
# http://localhost:8000/docs
```

### 2. Verificar Banco de Dados

```powershell
# Conectar ao banco
psql -U saudenold -d saudenold -h localhost

# Ver tabelas
\dt

# Sair
\q
```

### 3. Verificar Frontend

- O app deve abrir e tentar sincronizar com o backend
- Se o backend estiver rodando, a sincronização deve funcionar
- Se não estiver, o app funciona apenas com dados locais (AsyncStorage)

## 🔄 Fluxo de Execução Completo

### Terminal 1: Backend
```powershell
cd SaudeNold\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2: Frontend
```powershell
cd SaudeNold
npm start
```

## 🛠️ Scripts Úteis (Opcional)

### Script para Iniciar Backend (PowerShell)

Crie `backend/start-backend.ps1`:

```powershell
# Ativar ambiente virtual e rodar backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Ativando ambiente virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "Iniciando backend na porta 8000..." -ForegroundColor Green
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Script para Iniciar Frontend (PowerShell)

Crie `start-frontend.ps1` na raiz:

```powershell
Write-Host "Iniciando Expo..." -ForegroundColor Green
npm start
```

## ⚠️ Troubleshooting

### Backend não conecta ao banco

1. Verifique se o PostgreSQL está rodando:
   ```powershell
   # Windows
   Get-Service postgresql*
   ```

2. Verifique as credenciais no `.env`

3. Teste a conexão:
   ```powershell
   psql -U saudenold -d saudenold -h localhost
   ```

### Tesseract não encontrado

1. Verifique se está instalado:
   ```powershell
   tesseract --version
   ```

2. Adicione ao PATH ou configure no `.env`:
   ```env
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

### Porta 8000 já em uso

1. Pare o processo que está usando a porta:
   ```powershell
   # Ver o que está usando a porta
   netstat -ano | findstr :8000
   
   # Matar o processo (substitua PID pelo número)
   taskkill /PID <PID> /F
   ```

2. Ou use outra porta no backend:
   ```powershell
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```
   E atualize o `.env` do frontend:
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
   ```

## 📝 Notas Importantes

1. **Dados Locais**: O app funciona offline usando AsyncStorage, mesmo sem backend
2. **Sincronização**: Acontece automaticamente quando o backend está disponível
3. **Desenvolvimento**: O backend com `--reload` recarrega automaticamente ao salvar arquivos
4. **Produção**: Para produção, remova o `--reload` e use um servidor WSGI como gunicorn

## 🎯 Vantagens de Rodar Sem Docker

- ✅ Mais rápido para desenvolvimento (sem overhead de containers)
- ✅ Debug mais fácil (pode usar debugger do Python diretamente)
- ✅ Menos recursos do sistema
- ✅ Mais controle sobre o ambiente
- ✅ Fácil de integrar com IDEs

## 🔄 Migrar de Docker para Local

Se você estava usando Docker e quer migrar:

1. **Exportar dados do Docker** (se necessário):
   ```powershell
   docker-compose exec postgres pg_dump -U saudenold saudenold > backup.sql
   ```

2. **Importar no PostgreSQL local**:
   ```powershell
   psql -U saudenold -d saudenold -h localhost < backup.sql
   ```

3. **Parar Docker**:
   ```powershell
   docker-compose down
   ```

4. **Seguir este guia** para configurar ambiente local
