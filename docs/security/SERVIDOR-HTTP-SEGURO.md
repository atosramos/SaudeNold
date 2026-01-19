# Servidor HTTP Seguro - Dashboard Analytics

## ⚠️ PROBLEMA CRÍTICO DE SEGURANÇA RESOLVIDO

### O Problema

O servidor HTTP simples do Python (`python -m http.server`) **EXPOE TODOS OS ARQUIVOS** do projeto, incluindo:
- Arquivos sensíveis (`.env`, chaves, senhas)
- Código-fonte completo
- Configurações do sistema
- Histórico do Git (`.git/`)
- Dependências (`node_modules/`)

Isso é um **SUPER FURO DE SEGURANÇA** que permite:
- Acesso não autorizado a credenciais
- Exposição de código-fonte
- Possível exploração de vulnerabilidades
- Vazamento de informações confidenciais

### A Solução

Criado servidor HTTP seguro que:
1. **NÃO lista diretórios** - Bloqueia completamente a listagem
2. **Serve apenas o dashboard HTML** - Apenas `analytics-dashboard.html` é acessível
3. **Bloqueia arquivos sensíveis** - `.env`, `.git`, `node_modules`, etc.
4. **Bloqueia extensões perigosas** - `.key`, `.pem`, `.log`, `.sql`, etc.
5. **Retorna 403 para tudo que não for o dashboard**

## Como Usar

### Opção 1: Script Python (Recomendado)

```powershell
cd SaudeNold
python scripts/utils/serve-dashboard-secure.py
```

### Opção 2: Script PowerShell

```powershell
cd SaudeNold
.\scripts\utils\serve-dashboard-secure.ps1
```

## Acesso

Após iniciar o servidor seguro:
- **URL:** `http://localhost:8080/analytics-dashboard.html`
- **OU:** `http://localhost:8080/` (redireciona para o dashboard)

## Segurança Implementada

### Bloqueios de Diretórios
- `.env` - Variáveis de ambiente
- `.git` - Repositório Git
- `.github` - Configurações GitHub
- `node_modules` - Dependências
- `venv` - Ambiente virtual Python
- `__pycache__` - Cache Python
- `.expo` - Configurações Expo
- `dist` - Builds
- `backend` - Código do backend
- `android` - Código Android
- `k8s` - Configurações Kubernetes
- `.issues` - Issues locais
- `scripts` - Scripts do projeto
- `docs` - Documentação
- `services` - Serviços
- `components` - Componentes
- `hooks` - Hooks React
- `app` - Código da aplicação
- `assets` - Assets

### Bloqueios de Extensões
- `.env` - Variáveis de ambiente
- `.key`, `.pem`, `.p12`, `.pfx` - Chaves criptográficas
- `.log` - Logs
- `.sql`, `.db`, `.sqlite` - Bancos de dados
- `.ps1`, `.sh` - Scripts
- `.md`, `.txt` - Documentação

### Headers de Segurança
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

## ⚠️ IMPORTANTE

**NUNCA use `python -m http.server` em produção ou com arquivos sensíveis!**

Sempre use o servidor seguro fornecido ou configure um servidor web adequado (nginx, Apache, etc.) com:
- Listagem de diretórios desabilitada
- Acesso restrito a arquivos específicos
- Bloqueio de arquivos sensíveis
- HTTPS em produção

## Teste de Segurança

Para verificar que está funcionando:

```powershell
# Deve retornar 403 (Acesso negado)
Invoke-WebRequest -Uri "http://localhost:8080/.env" -ErrorAction SilentlyContinue

# Deve retornar 403 (Acesso negado)
Invoke-WebRequest -Uri "http://localhost:8080/.git" -ErrorAction SilentlyContinue

# Deve retornar 200 (OK) - apenas o dashboard
Invoke-WebRequest -Uri "http://localhost:8080/analytics-dashboard.html"
```

## Status

✅ **CORRIGIDO** - Servidor seguro implementado e documentado
