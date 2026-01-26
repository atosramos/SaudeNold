# Como Corrigir o Erro "ModuleNotFoundError: No module named 'redis'"

## 🔴 Problema

O backend está apresentando o erro:
```
ModuleNotFoundError: No module named 'redis'
```

Isso acontece porque o módulo `redis` não está instalado no ambiente Python onde o backend está rodando.

## ✅ Soluções

### Opção 1: Instalar Dependências Localmente

Se o backend está rodando localmente (não em Docker):

```powershell
cd SaudeNold\backend
pip install -r requirements.txt
```

Ou instalar apenas o redis:
```powershell
pip install redis==5.0.1 bleach==6.1.0 tinycss2==1.5.1
```

### Opção 2: Rebuild do Container Docker

Se o backend está rodando em Docker, é necessário fazer rebuild:

```bash
cd SaudeNold
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Opção 3: Verificar Ambiente Virtual

Se você está usando um ambiente virtual, certifique-se de que está ativado:

```powershell
# Windows
.\venv\Scripts\Activate.ps1

# Depois instalar dependências
pip install -r requirements.txt
```

## 🔍 Verificação

Para verificar se o redis está instalado:

```python
python -c "import redis; print('Redis instalado:', redis.__version__)"
```

Deve retornar: `Redis instalado: 5.0.1`

## 📋 Dependências Necessárias

As seguintes dependências foram adicionadas recentemente:
- `redis==5.0.1` - Para rate limiting e token blacklist
- `bleach==6.1.0` - Para sanitização HTML
- `tinycss2==1.5.1` - Dependência do bleach

Todas estão no arquivo `requirements.txt`.

## ⚠️ Nota Importante

O sistema funciona com **fallback automático** quando Redis não está disponível:
- Rate limiting usa memória em vez de Redis
- Token blacklist retorna False (não bloqueia)
- CSRF tokens são aceitos em modo de teste

Mas o **módulo Python `redis` ainda precisa estar instalado** para o código importar corretamente.
