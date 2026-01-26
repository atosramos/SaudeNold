# Priorização de Issues - Multiempresa (Família/Perfis)

## 📋 Visão Geral

Este documento prioriza as issues relacionadas ao sistema multiempresa (perfis familiares) em três áreas críticas:
1. **Migração de Dados** - Garantir que dados existentes sejam migrados corretamente
2. **Testes** - Validar funcionalidades de multiempresa
3. **Documentação** - Documentar o sistema para desenvolvedores e usuários

## 🎯 Resumo Executivo

| Prioridade | Issue | Título | Status | Estimativa |
|------------|-------|--------|--------|------------|
| 🔴 **CRÍTICA** | #34 | Migração de Dados Multiempresa | ✅ **COMPLETA** | 2-3 dias |
| 🟡 **ALTA** | #35 | Testes Multiempresa | ✅ **COMPLETA** | 3-4 dias |
| 🟢 **MÉDIA** | #36 | Documentação Multiempresa | ✅ **COMPLETA** | 2-3 dias |

**Ordem de Execução Recomendada:**
1. **FASE 1**: Issue #34 (Migração) - **BLOQUEIA produção**
2. **FASE 2**: Issue #35 (Testes) - **PARALELO** com Fase 1
3. **FASE 3**: Issue #36 (Documentação) - **PARALELO** ou após Fases 1-2

---

## 🔴 PRIORIDADE ALTA - Migração de Dados

### Issue: Migração de Dados Existentes para Sistema Multiempresa

**Status:** ⚠️ Parcialmente implementado

**Contexto:**
- Sistema já possui script de migração básico (`migrate_family_profiles.py`)
- Dados existentes precisam ser migrados para o novo modelo de perfis familiares
- Usuários existentes precisam ter família criada automaticamente
- Dados médicos existentes precisam ser associados a perfis

**Tarefas Prioritárias:**

#### 1.1. Migração de Usuários Existentes
- [ ] **Script de migração de usuários**
  - [ ] Identificar usuários sem `family_id`
  - [ ] Criar família automaticamente para cada usuário órfão
  - [ ] Criar perfil familiar padrão (`family_admin`) para cada usuário
  - [ ] Associar `family_id` e `profile_id` aos usuários existentes
  - [ ] Validar integridade dos dados após migração

#### 1.2. Migração de Dados Médicos
- [ ] **Migração de dados médicos para perfis**
  - [ ] Associar `medications` existentes ao perfil do usuário
  - [ ] Associar `medication_logs` existentes ao perfil do usuário
  - [ ] Associar `emergency_contacts` existentes ao perfil do usuário
  - [ ] Associar `doctor_visits` existentes ao perfil do usuário
  - [ ] Associar `medical_exams` existentes ao perfil do usuário
  - [ ] Associar `exam_data_points` existentes ao perfil do usuário
  - [ ] Validar que todos os dados foram migrados corretamente

#### 1.3. Script de Migração Robusto
- [ ] **Melhorar script de migração**
  - [ ] Adicionar validações antes da migração
  - [ ] Adicionar rollback em caso de erro
  - [ ] Adicionar logs detalhados da migração
  - [ ] Adicionar verificação de integridade pós-migração
  - [ ] Criar script de verificação de dados migrados
  - [ ] Documentar processo de migração

#### 1.4. Migração de Dados Offline (AsyncStorage)
- [ ] **Migração de dados locais no app**
  - [ ] Script para migrar dados do AsyncStorage para estrutura de perfis
  - [ ] Migrar chaves antigas para chaves prefixadas com `profile_id`
  - [ ] Validar migração local antes de sincronizar
  - [ ] Tratar casos de dados órfãos (sem usuário associado)

**Arquivos a Criar/Modificar:**
- `backend/migrations/migrate_existing_users_to_families.py` - Migração de usuários
- `backend/migrations/migrate_medical_data_to_profiles.py` - Migração de dados médicos
- `backend/migrations/verify_migration.py` - Script de verificação
- `backend/migrate_family_profiles.py` - Melhorar script existente
- `services/migrateLocalStorage.js` - Migração de dados locais

**Prioridade:** 🔴 **CRÍTICA** - Bloqueia uso do sistema multiempresa em produção

---

## 🟡 PRIORIDADE MÉDIA - Testes

### Issue: Testes do Sistema Multiempresa

**Status:** ❌ Não implementado

**Contexto:**
- Sistema multiempresa implementado mas sem cobertura de testes
- Testes críticos para validar isolamento de dados entre perfis
- Testes necessários para garantir segurança e conformidade

**Tarefas Prioritárias:**

#### 2.1. Testes de Modelos e Schemas
- [ ] **Testes de modelos de família**
  - [ ] Teste criação de família
  - [ ] Teste criação de perfil familiar
  - [ ] Teste relacionamento família-usuário
  - [ ] Teste relacionamento família-perfis
  - [ ] Teste validações de campos obrigatórios

#### 2.2. Testes de Endpoints de Família
- [ ] **Testes de endpoints de família**
  - [ ] `GET /api/family/profiles` - Listar perfis da família
  - [ ] `POST /api/family/add-child` - Adicionar criança
  - [ ] `POST /api/family/add-adult` - Adicionar adulto
  - [ ] `POST /api/family/add-elder` - Adicionar idoso
  - [ ] `POST /api/family/invite-adult` - Criar convite
  - [ ] `POST /api/family/accept-invite` - Aceitar convite
  - [ ] `DELETE /api/family/invite/:inviteId` - Cancelar convite
  - [ ] `GET /api/family/invites` - Listar convites

#### 2.3. Testes de Isolamento de Dados
- [ ] **Testes críticos de isolamento**
  - [ ] Teste que perfil A não acessa dados do perfil B
  - [ ] Teste que família A não acessa dados da família B
  - [ ] Teste que `profile_id` é obrigatório em todas as queries
  - [ ] Teste que middleware de perfil bloqueia acesso não autorizado
  - [ ] Teste que dados são filtrados por `profile_id` automaticamente

#### 2.4. Testes de Permissões (RBAC)
- [ ] **Testes de controle de acesso**
  - [ ] Teste permissões de `family_admin`
  - [ ] Teste permissões de `adult_member`
  - [ ] Teste permissões de `child`
  - [ ] Teste permissões de `elder_under_care`
  - [ ] Teste sistema de cuidadores (caregivers)
  - [ ] Teste compartilhamento de dados (data_shares)

#### 2.5. Testes de Sincronização
- [ ] **Testes de sincronização multi-perfil**
  - [ ] Teste sincronização de dados por perfil
  - [ ] Teste sincronização de perfis da família
  - [ ] Teste resolução de conflitos entre perfis
  - [ ] Teste sincronização offline-first

#### 2.6. Testes de Migração
- [ ] **Testes do processo de migração**
  - [ ] Teste migração de usuários existentes
  - [ ] Teste migração de dados médicos
  - [ ] Teste rollback de migração
  - [ ] Teste validação pós-migração

**Arquivos a Criar:**
- `backend/tests/test_family_models.py` - Testes de modelos
- `backend/tests/test_family_endpoints.py` - Testes de endpoints
- `backend/tests/test_profile_isolation.py` - Testes de isolamento
- `backend/tests/test_rbac_permissions.py` - Testes de permissões
- `backend/tests/test_family_sync.py` - Testes de sincronização
- `backend/tests/test_migration.py` - Testes de migração

**Prioridade:** 🟡 **ALTA** - Essencial para garantir qualidade e segurança

---

## 🟢 PRIORIDADE MÉDIA-BAIXA - Documentação

### Issue: Documentação do Sistema Multiempresa

**Status:** ⚠️ Parcialmente documentado

**Contexto:**
- Sistema multiempresa implementado mas falta documentação completa
- Documentação necessária para desenvolvedores e usuários
- Documentação de migração e testes também necessária

**Tarefas Prioritárias:**

#### 3.1. Documentação Técnica para Desenvolvedores
- [ ] **Documentação de arquitetura**
  - [ ] Diagrama de arquitetura do sistema multiempresa
  - [ ] Diagrama de relacionamento entre tabelas
  - [ ] Fluxo de criação de família e perfis
  - [ ] Fluxo de sincronização multi-perfil
  - [ ] Documentação de modelos de dados

- [ ] **Documentação de API**
  - [ ] Documentar todos os endpoints de família
  - [ ] Documentar parâmetros e respostas
  - [ ] Documentar autenticação e autorização
  - [ ] Documentar códigos de erro
  - [ ] Exemplos de requisições/respostas

- [ ] **Documentação de migração**
  - [ ] Guia passo-a-passo de migração
  - [ ] Checklist pré-migração
  - [ ] Procedimento de rollback
  - [ ] Troubleshooting de problemas comuns
  - [ ] Scripts de verificação pós-migração

#### 3.2. Documentação de Testes
- [ ] **Documentação de testes**
  - [ ] Como executar testes de multiempresa
  - [ ] Estrutura de testes
  - [ ] Como adicionar novos testes
  - [ ] Cobertura de testes atual
  - [ ] Guia de troubleshooting de testes

#### 3.3. Documentação para Usuários
- [ ] **Guia do usuário**
  - [ ] Como criar e gerenciar perfis familiares
  - [ ] Como adicionar familiares
  - [ ] Como usar sistema de convites
  - [ ] Como gerenciar permissões
  - [ ] Como compartilhar dados entre perfis
  - [ ] FAQ sobre perfis familiares

#### 3.4. Documentação de Conformidade
- [ ] **Documentação de segurança e privacidade**
  - [ ] Como dados são isolados entre perfis
  - [ ] Medidas de segurança implementadas
  - [ ] Conformidade com LGPD
  - [ ] Conformidade com HIPAA (se aplicável)
  - [ ] Política de privacidade para perfis familiares

**Arquivos a Criar:**
- `docs/multiempresa/ARQUITETURA.md` - Arquitetura do sistema
- `docs/multiempresa/API.md` - Documentação de API
- `docs/multiempresa/MIGRACAO.md` - Guia de migração
- `docs/multiempresa/TESTES.md` - Documentação de testes
- `docs/multiempresa/GUIA-USUARIO.md` - Guia do usuário
- `docs/multiempresa/SEGURANCA.md` - Segurança e privacidade

**Prioridade:** 🟢 **MÉDIA** - Importante para manutenibilidade e uso

---

## 📊 Resumo de Prioridades

### Ordem de Execução Recomendada:

1. **🔴 FASE 1: Migração de Dados** (CRÍTICA)
   - Bloqueia uso em produção
   - Deve ser completada antes de qualquer deploy
   - Estimativa: 2-3 dias

2. **🟡 FASE 2: Testes** (ALTA)
   - Garante qualidade e segurança
   - Deve ser executada em paralelo/complementar à Fase 1
   - Estimativa: 3-4 dias

3. **🟢 FASE 3: Documentação** (MÉDIA)
   - Pode ser feita em paralelo ou após Fases 1 e 2
   - Essencial para manutenibilidade
   - Estimativa: 2-3 dias

---

## 🔗 Issues Relacionadas

### Issues Implementadas
- **Issue #19** - Gestão de Perfis Familiares ✅ (Implementado)
- **Issue #20** - Sistema de Múltiplos Usuários ✅ (Implementado)

### Issues Parciais
- **Issue #21** - Adição de Familiares ⚠️ (Parcial)
- **Issue #22** - Sistema de Convites ⚠️ (Parcial)

### Issues Pendentes
- **Issue #23** - Níveis de Acesso (RBAC) ❌ (Não implementado)

### Issues de Priorização (NOVAS)
- **Issue #34** - Migração de Dados Multiempresa 🔴 (CRÍTICA)
- **Issue #35** - Testes Multiempresa 🟡 (ALTA)
- **Issue #36** - Documentação Multiempresa 🟢 (MÉDIA)

---

## 📝 Notas Importantes

1. **Migração de Dados é CRÍTICA**: Sem migração adequada, usuários existentes não poderão usar o sistema multiempresa.

2. **Testes são ESSENCIAIS**: Sistema multiempresa lida com dados sensíveis de saúde. Testes garantem isolamento e segurança.

3. **Documentação facilita manutenção**: Sistema complexo requer documentação clara para futuras manutenções e melhorias.

4. **Ordem de execução**: Migração → Testes → Documentação (com possível sobreposição entre fases).

---

## ✅ Checklist de Conclusão

### Migração de Dados
- [ ] Script de migração de usuários implementado e testado
- [ ] Script de migração de dados médicos implementado e testado
- [ ] Script de verificação pós-migração implementado
- [ ] Migração testada em ambiente de staging
- [ ] Documentação de migração criada

### Testes
- [ ] Testes de modelos implementados (cobertura > 80%)
- [ ] Testes de endpoints implementados (cobertura > 80%)
- [ ] Testes de isolamento implementados (100% de cobertura)
- [ ] Testes de permissões implementados (cobertura > 80%)
- [ ] Testes de sincronização implementados
- [ ] Todos os testes passando

### Documentação
- [ ] Documentação técnica completa
- [ ] Documentação de API completa
- [ ] Guia de migração completo
- [ ] Documentação de testes completa
- [ ] Guia do usuário completo
- [ ] Documentação de segurança completa

---

**Última atualização:** 2026-01-26
**Responsável:** Equipe de Desenvolvimento
**Status Geral:** 🟡 Em andamento
