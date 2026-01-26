## Objetivo
Implementar migração completa de dados existentes para o sistema multiempresa (perfis familiares), garantindo que todos os usuários e dados médicos sejam corretamente associados a famílias e perfis.

## Contexto Atual
- Sistema multiempresa implementado (Issues #19, #20)
- Script básico de migração existe (`migrate_family_profiles.py`)
- Usuários existentes sem `family_id` e `profile_id`
- Dados médicos existentes sem associação a perfis
- Dados locais (AsyncStorage) precisam ser migrados

## Tarefas

### 1. Migração de Usuários Existentes
- [ ] Criar script `migrate_existing_users_to_families.py`
  - [ ] Identificar usuários sem `family_id`
  - [ ] Para cada usuário órfão:
    - [ ] Criar família com nome padrão (ex: "Família de {nome_usuario}")
    - [ ] Definir usuário como `family_admin`
    - [ ] Criar perfil familiar padrão em `family_profiles`
    - [ ] Associar `family_id` ao usuário
    - [ ] Associar `profile_id` ao usuário (via relacionamento)
  - [ ] Validar que todos os usuários têm família e perfil
  - [ ] Gerar relatório de migração

### 2. Migração de Dados Médicos para Perfis
- [ ] Criar script `migrate_medical_data_to_profiles.py`
  - [ ] Para cada tabela de dados médicos:
    - [ ] `medications` - Associar ao `profile_id` do usuário
    - [ ] `medication_logs` - Associar ao `profile_id` do usuário
    - [ ] `emergency_contacts` - Associar ao `profile_id` do usuário
    - [ ] `doctor_visits` - Associar ao `profile_id` do usuário
    - [ ] `medical_exams` - Associar ao `profile_id` do usuário
    - [ ] `exam_data_points` - Associar ao `profile_id` do usuário
  - [ ] Validar que todos os dados foram associados
  - [ ] Tratar casos de dados órfãos (sem usuário)
  - [ ] Gerar relatório de migração

### 3. Melhorar Script de Migração Base
- [ ] Melhorar `migrate_family_profiles.py`
  - [ ] Adicionar validações pré-migração
    - [ ] Verificar se tabelas existem
    - [ ] Verificar se colunas já existem
    - [ ] Verificar integridade dos dados
  - [ ] Adicionar sistema de rollback
    - [ ] Criar backup antes da migração
    - [ ] Implementar função de rollback
    - [ ] Documentar processo de rollback
  - [ ] Adicionar logs detalhados
    - [ ] Log de cada etapa da migração
    - [ ] Log de erros e warnings
    - [ ] Log de estatísticas (quantos registros migrados)
  - [ ] Adicionar verificação pós-migração
    - [ ] Validar integridade referencial
    - [ ] Validar que não há dados órfãos
    - [ ] Validar que todos os usuários têm família

### 4. Script de Verificação
- [ ] Criar script `verify_migration.py`
  - [ ] Verificar que todos os usuários têm `family_id`
  - [ ] Verificar que todos os usuários têm perfil em `family_profiles`
  - [ ] Verificar que todos os dados médicos têm `profile_id`
  - [ ] Verificar integridade referencial
  - [ ] Gerar relatório de verificação
  - [ ] Identificar problemas e sugerir correções

### 5. Migração de Dados Locais (AsyncStorage)
- [ ] Criar script `migrateLocalStorage.js` no frontend
  - [ ] Identificar dados antigos no AsyncStorage
  - [ ] Migrar chaves antigas para estrutura de perfis
    - [ ] Prefixar chaves com `profile_id`
    - [ ] Migrar `medications` → `profile_{id}_medications`
    - [ ] Migrar `medicationLogs` → `profile_{id}_medicationLogs`
    - [ ] Migrar `emergencyContacts` → `profile_{id}_emergencyContacts`
    - [ ] Migrar `doctorVisits` → `profile_{id}_doctorVisits`
    - [ ] Migrar `medicalExams` → `profile_{id}_medicalExams`
  - [ ] Validar migração local antes de sincronizar
  - [ ] Tratar casos de dados órfãos
  - [ ] Manter backup dos dados antigos

### 6. Testes de Migração
- [ ] Criar testes para scripts de migração
  - [ ] Teste migração de usuários
  - [ ] Teste migração de dados médicos
  - [ ] Teste rollback
  - [ ] Teste verificação pós-migração
  - [ ] Teste casos de erro (dados órfãos, etc.)

### 7. Documentação
- [ ] Criar guia de migração (`docs/multiempresa/MIGRACAO.md`)
  - [ ] Pré-requisitos
  - [ ] Passo-a-passo da migração
  - [ ] Checklist pré-migração
  - [ ] Procedimento de rollback
  - [ ] Troubleshooting
  - [ ] Verificação pós-migração

## Arquivos a Criar/Modificar
- `backend/migrations/migrate_existing_users_to_families.py` - Migração de usuários
- `backend/migrations/migrate_medical_data_to_profiles.py` - Migração de dados médicos
- `backend/migrations/verify_migration.py` - Script de verificação
- `backend/migrate_family_profiles.py` - Melhorar script existente
- `services/migrateLocalStorage.js` - Migração de dados locais
- `backend/tests/test_migration.py` - Testes de migração
- `docs/multiempresa/MIGRACAO.md` - Documentação

## Referências
- Issue #19 - Gestão de Perfis Familiares
- Issue #20 - Sistema de Múltiplos Usuários
- `backend/migrate_family_profiles.py` - Script base existente

## Prioridade
🔴 Alta (CRÍTICA - Bloqueia uso em produção)

## Dependências
- Issue #19 ✅ (Implementado)
- Issue #20 ✅ (Implementado)

## Riscos
- **Alto**: Perda de dados durante migração
- **Médio**: Dados órfãos não migrados
- **Médio**: Problemas de integridade referencial

## Mitigações
- Backup completo antes da migração
- Testes extensivos em ambiente de staging
- Script de rollback implementado
- Validações pré e pós-migração
- Logs detalhados de todas as operações
