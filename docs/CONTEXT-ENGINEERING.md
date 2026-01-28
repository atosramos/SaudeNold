# Context Engineering - Guia de Uso

**Data de Criação:** 2026-01-27

## O que é Context Engineering?

Context Engineering é uma prática sistemática de organizar e estruturar informações sobre o projeto para facilitar:
- **Compreensão rápida** do projeto por novos desenvolvedores
- **Assistência eficiente** de ferramentas de IA
- **Tomada de decisões** consistente
- **Redução de contexto** necessário para trabalhar no projeto

## Estrutura Implementada

### Arquivos de Contexto

```
.cursor/
└── context/
    ├── README.md                    # Guia de uso
    ├── PROJECT-OVERVIEW.md          # Visão geral do projeto
    ├── ARCHITECTURE.md              # Arquitetura do sistema
    ├── BACKEND-CONTEXT.md           # Contexto do backend
    ├── FRONTEND-CONTEXT.md          # Contexto do frontend
    ├── MULTIEMPRESA-CONTEXT.md      # Sistema multi-tenant
    └── CURRENT-STATE.md             # Estado atual

.cursorrules                         # Regras para AI assistants
```

## Como Usar

### Para Desenvolvedores

#### 1. Onboarding
1. Leia `PROJECT-OVERVIEW.md` para entender o projeto
2. Leia `ARCHITECTURE.md` para entender a arquitetura
3. Leia o contexto relevante à sua área:
   - Backend → `BACKEND-CONTEXT.md`
   - Frontend → `FRONTEND-CONTEXT.md`
   - Multi-tenant → `MULTIEMPRESA-CONTEXT.md`
4. Verifique `CURRENT-STATE.md` para ver o que está implementado

#### 2. Durante o Desenvolvimento
- Consulte o contexto relevante antes de fazer mudanças
- Atualize o contexto quando completar features
- Use os padrões documentados nos arquivos de contexto

### Para AI Assistants

O arquivo `.cursorrules` instrui os assistentes a:
1. Ler `PROJECT-OVERVIEW.md` primeiro
2. Ler `CURRENT-STATE.md` para entender o estado atual
3. Ler o contexto relevante baseado na tarefa
4. Seguir os padrões e convenções documentados

## Benefícios

### 1. Redução de Context Switching
- Toda informação importante em um lugar
- Não precisa procurar em múltiplos arquivos
- Contexto atualizado e confiável

### 2. Onboarding Mais Rápido
- Novos desenvolvedores entendem o projeto rapidamente
- Documentação estruturada e completa
- Exemplos de código e padrões

### 3. Decisões Mais Consistentes
- Padrões documentados
- Arquitetura clara
- Boas práticas estabelecidas

### 4. Melhor Assistência de IA
- IA entende melhor o projeto
- Sugestões mais relevantes
- Menos erros de contexto

## Manutenção

### Quando Atualizar

- ✅ Após completar features maiores
- ✅ Após mudanças arquiteturais
- ✅ Após adicionar novas tecnologias
- ✅ Quando onboarding novos membros
- ✅ Revisão mensal (recomendado)

### Processo de Atualização

1. **Identificar** qual arquivo precisa de atualização
2. **Atualizar** as seções relevantes
3. **Atualizar** a data "Last Updated"
4. **Commitar** com mensagem descritiva

### Exemplo de Atualização

```bash
# Após completar uma feature
git add .cursor/context/CURRENT-STATE.md
git commit -m "docs: Atualiza CURRENT-STATE.md - Feature X completa"
```

## Estrutura dos Arquivos

### PROJECT-OVERVIEW.md
- **Propósito**: Visão geral do projeto
- **Conteúdo**: O que é, propósito, usuários, status, métricas
- **Público**: Todos

### ARCHITECTURE.md
- **Propósito**: Arquitetura do sistema
- **Conteúdo**: Diagramas, fluxos, segurança, deployment
- **Público**: Desenvolvedores, arquitetos

### BACKEND-CONTEXT.md
- **Propósito**: Detalhes do backend
- **Conteúdo**: Stack, modelos, endpoints, padrões, testes
- **Público**: Desenvolvedores backend

### FRONTEND-CONTEXT.md
- **Propósito**: Detalhes do frontend
- **Conteúdo**: Stack, componentes, serviços, padrões, UI/UX
- **Público**: Desenvolvedores frontend

### MULTIEMPRESA-CONTEXT.md
- **Propósito**: Sistema multi-tenant
- **Conteúdo**: Isolamento, permissões, migração, testes
- **Público**: Todos os desenvolvedores

### CURRENT-STATE.md
- **Propósito**: Estado atual da implementação
- **Conteúdo**: Features completas, parciais, issues, prioridades
- **Público**: Todos

## Integração com Outras Ferramentas

### Cursor IDE
- `.cursorrules` é lido automaticamente
- Context files são referenciados nas regras
- AI assistants usam o contexto automaticamente

### GitHub
- Context files são versionados
- Histórico de mudanças visível
- Pull requests podem referenciar contexto

### Documentação
- Context files complementam `docs/`
- Referências cruzadas entre context e docs
- Context é mais técnico, docs são mais descritivos

## Boas Práticas

### 1. Seja Específico
- Inclua exemplos de código
- Documente padrões reais
- Mostre como fazer, não apenas o que fazer

### 2. Mantenha Atualizado
- Atualize quando o código muda
- Revise regularmente
- Remova informações obsoletas

### 3. Organize Logicamente
- Agrupe informações relacionadas
- Use seções claras
- Mantenha estrutura consistente

### 4. Referencie Outros Docs
- Link para documentação relacionada
- Referencie issues do GitHub
- Conecte context files entre si

### 5. Version Control
- Commite mudanças de contexto
- Use mensagens descritivas
- Revise mudanças em PRs

## Exemplos de Uso

### Exemplo 1: Adicionar Novo Endpoint

1. **Consultar** `BACKEND-CONTEXT.md` para padrões
2. **Seguir** o padrão documentado
3. **Atualizar** `CURRENT-STATE.md` após completar

### Exemplo 2: Implementar Nova Feature

1. **Ler** `PROJECT-OVERVIEW.md` para entender propósito
2. **Ler** `ARCHITECTURE.md` para entender design
3. **Ler** contexto relevante (backend/frontend)
4. **Implementar** seguindo padrões
5. **Atualizar** context files

### Exemplo 3: Onboarding Novo Desenvolvedor

1. **Apresentar** estrutura de context files
2. **Guiar** leitura dos arquivos principais
3. **Explicar** processo de atualização
4. **Demonstrar** uso prático

## Métricas de Sucesso

- ✅ Redução no tempo de onboarding
- ✅ Menos perguntas sobre arquitetura
- ✅ Decisões mais consistentes
- ✅ Melhor assistência de IA
- ✅ Context files atualizados regularmente

## Próximos Passos

- [ ] Criar script de validação de contexto
- [ ] Automatizar atualização de CURRENT-STATE.md
- [ ] Adicionar mais exemplos de código
- [ ] Criar templates para novos context files
- [ ] Integrar com CI/CD para validação

## Referências

- [Context Engineering Best Practices](https://cursor.sh/docs/context)
- [Documentation as Code](https://www.writethedocs.org/guide/docs-as-code/)
- Arquivos de contexto em `.cursor/context/`
- Regras em `.cursorrules`
