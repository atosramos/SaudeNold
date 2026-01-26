# Como Executar os Testes

## 📍 Localização dos Testes

Os testes estão localizados em:
```
SaudeNold/backend/tests/
```

## ✅ Comando Correto

Execute os testes a partir do diretório `backend`:

```powershell
cd SaudeNold\backend
python -m pytest tests/ -v
```

## 📋 Opções de Execução

### Executar todos os testes:
```powershell
cd SaudeNold\backend
python -m pytest tests/ -v
```

### Executar testes específicos:
```powershell
# Testes de Redis
python -m pytest tests/test_redis_connection.py -v

# Testes de validação
python -m pytest tests/test_validation.py -v

# Testes de criptografia
python -m pytest tests/test_encryption_service.py -v
```

### Executar com mais detalhes:
```powershell
python -m pytest tests/ -v --tb=short
```

### Executar apenas testes que falharam anteriormente:
```powershell
python -m pytest tests/ --lf -v
```

## ⚠️ Erro Comum

Se você executar `python -m pytest tests/` da raiz do projeto (`SaudeNold/`), receberá:
```
ERROR: file or directory not found: tests/
```

**Solução:** Certifique-se de estar no diretório `backend/` antes de executar os testes.

## 🚀 Script Auxiliar

Você também pode usar o script `run_all_tests.py`:

```powershell
cd SaudeNold\backend
python run_all_tests.py
```

Este script executa todos os testes em ordem e exibe um resumo.
