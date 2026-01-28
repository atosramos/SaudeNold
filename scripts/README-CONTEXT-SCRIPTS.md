# Scripts de Context Engineering

Scripts para gerenciar e validar o sistema de Context Engineering do projeto.

## Scripts Disponíveis

### 1. `validate-context.py`

Valida que os arquivos de contexto estão atualizados e consistentes.

**Uso:**
```bash
python scripts/validate-context.py
```

**O que verifica:**
- ✅ Arquivos obrigatórios existem
- ✅ Datas de atualização (não mais de 30 dias)
- ✅ Seções obrigatórias presentes
- ✅ Referências a outros arquivos válidas

**Exemplo de saída:**
```
🔍 Validando Context Engineering...

Verificando arquivos obrigatórios:
  ✓ PROJECT-OVERVIEW.md existe
  ✓ ARCHITECTURE.md existe
  ...

Verificando datas de atualização:
  ✓ PROJECT-OVERVIEW.md atualizado há 2 dias
  ...

📊 Resumo:
  ✓ Todos os arquivos de contexto estão válidos!
```

---

### 2. `update-current-state.py`

Atualiza automaticamente `CURRENT-STATE.md` com informações do projeto.

**Uso:**
```bash
python scripts/update-current-state.py
```

**O que atualiza:**
- ✅ Data de "Last Updated"
- ✅ Estatísticas de testes
- ✅ Número de endpoints
- ✅ Informações do GitHub (se `gh` CLI disponível)

**Exemplo de saída:**
```
🔄 Atualizando CURRENT-STATE.md...

📊 Coletando informações...
✅ CURRENT-STATE.md atualizado com sucesso!
   - Data atualizada: 2026-01-27
   - Testes encontrados: 150 backend, 20 frontend
   - Endpoints encontrados: 45
```

---

### 3. `search-context.py`

Busca e indexa informações nos arquivos de contexto.

**Uso:**
```bash
# Listar todos os arquivos
python scripts/search-context.py list

# Buscar termo
python scripts/search-context.py search "JWT"

# Mostrar arquivo completo
python scripts/search-context.py show PROJECT-OVERVIEW.md
```

**Comandos:**
- `list` - Lista todos os arquivos de contexto com estatísticas
- `search <query>` - Busca termo em todos os arquivos
- `show <filename>` - Mostra conteúdo completo de um arquivo

**Exemplo:**
```bash
$ python scripts/search-context.py search "profile_id"
🔍 Buscando: 'profile_id'

Encontrado em 4 arquivo(s):

📄 MULTIEMPRESA-CONTEXT.md (12 ocorrências)
   .cursor/context/MULTIEMPRESA-CONTEXT.md

📄 BACKEND-CONTEXT.md (8 ocorrências)
   .cursor/context/BACKEND-CONTEXT.md
...
```

---

### 4. Template para Novos Context Files

Template em `.cursor/context/TEMPLATE-NEW-CONTEXT.md` para criar novos arquivos de contexto.

**Uso:**
```bash
# Copiar template
cp .cursor/context/TEMPLATE-NEW-CONTEXT.md .cursor/context/NOVO-CONTEXT.md

# Editar e preencher
# Atualizar data "Last Updated"
# Adicionar ao .cursorrules se necessário
```

---

## Integração com CI/CD

### GitHub Actions (Exemplo)

```yaml
name: Validate Context

on:
  pull_request:
    paths:
      - '.cursor/context/**'
      - 'scripts/validate-context.py'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: python scripts/validate-context.py
```

### Pre-commit Hook

Adicionar ao `.git/hooks/pre-commit`:

```bash
#!/bin/bash
python scripts/validate-context.py
if [ $? -ne 0 ]; then
    echo "Context validation failed. Please update context files."
    exit 1
fi
```

---

## Workflow Recomendado

### 1. Antes de Commitar
```bash
# Validar contexto
python scripts/validate-context.py

# Atualizar estado atual
python scripts/update-current-state.py
```

### 2. Ao Completar Feature
```bash
# Atualizar CURRENT-STATE.md
python scripts/update-current-state.py

# Validar tudo
python scripts/validate-context.py
```

### 3. Buscar Informações
```bash
# Buscar termo específico
python scripts/search-context.py search "authentication"

# Ver arquivo completo
python scripts/search-context.py show BACKEND-CONTEXT.md
```

---

## Manutenção

### Atualização Mensal
1. Executar `validate-context.py` para verificar datas
2. Atualizar arquivos desatualizados
3. Executar `update-current-state.py` para atualizar estatísticas

### Adicionar Novo Context File
1. Copiar `TEMPLATE-NEW-CONTEXT.md`
2. Preencher com informações específicas
3. Adicionar referência em `.cursorrules`
4. Executar `validate-context.py` para verificar

---

## Troubleshooting

### Erro: "gh CLI not found"
- Instalar GitHub CLI: https://cli.github.com/
- Ou comentar uso de `gh` CLI no script

### Erro: "Encoding error"
- Verificar que arquivos estão em UTF-8
- Converter se necessário: `iconv -f ISO-8859-1 -t UTF-8 file.md > file_utf8.md`

### Erro: "File not found"
- Verificar que está executando do diretório raiz do projeto
- Verificar caminhos relativos nos scripts

---

## Próximos Passos

- [ ] Integrar com GitHub Actions
- [ ] Adicionar mais validações
- [ ] Criar dashboard de contexto
- [ ] Automatizar atualizações periódicas
