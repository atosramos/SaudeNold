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
- [x] Criar script `migrate_existing_users_to_families.py`
  - [x] Identificar usuários sem `family_id`
  - [x] Para cada usuário órfão:
    - [x] Criar família com nome padrão (ex: "Família de {nome_usuario}")
    - [x] Definir usuário como `family_admin`
    - [x] Criar perfil familiar padrão em `family_profiles`
    - [x] Associar `family_id` ao usuário
    - [x] Associar `profile_id` ao usuário (via relacionamento)
  - [x] Validar que todos os usuários têm família e perfil
  - [x] Gerar relatório de migração

### 2. Migração de Dados Médicos para Perfis
- [x] Criar script `migrate_medical_data_to_profiles.py`
  - [x] Para cada tabela de dados médicos:
    - [x] `medications` - Associar ao `profile_id` do usuário
    - [x] `medication_logs` - Associar ao `profile_id` do usuário
    - [x] `emergency_contacts` - Associar ao `profile_id` do usuário
    - [x] `doctor_visits` - Associar ao `profile_id` do usuário
    - [x] `medical_exams` - Associar ao `profile_id` do usuário
    - [x] `exam_data_points` - Associar ao `profile_id` do usuário
  - [x] Validar que todos os dados foram associados
  - [x] Tratar casos de dados órfãos (sem usuário)
  - [x] Gerar relatório de migração

### 3. Melhorar Script de Migração Base
- [x] Melhorar `migrate_family_profiles.py`
  - [x] Adicionar validações pré-migração
    - [x] Verificar se tabelas existem
    - [x] Verificar se colunas já existem
    - [x] Verificar integridade dos dados
  - [x] Adicionar sistema de rollback
    - [x] Criar backup antes da migração
    - [x] Implementar função de rollback
    - [x] Documentar processo de rollback
  - [x] Adicionar logs detalhados
    - [x] Log de cada etapa da migração
    - [x] Log de erros e warnings
    - [x] Log de estatísticas (quantos registros migrados)
  - [x] Adicionar verificação pós-migração
    - [x] Validar integridade referencial
    - [x] Validar que não há dados órfãos
    - [x] Validar que todos os usuários têm família

### 4. Script de Verificação
- [x] Criar script `verify_migration.py`
  - [x] Verificar que todos os usuários têm `family_id`
  - [x] Verificar que todos os usuários têm perfil em `family_profiles`
  - [x] Verificar que todos os dados médicos têm `profile_id`
  - [x] Verificar integridade referencial
  - [x] Gerar relatório de verificação
  - [x] Identificar problemas e sugerir correções

### 5. Migração de Dados Locais (AsyncStorage)
- [x] Criar script `migrateLocalStorage.js` no frontend
  - [x] Identificar dados antigos no AsyncStorage
  - [x] Migrar chaves antigas para estrutura de perfis
    - [x] Prefixar chaves com `profile_id`
    - [x] Migrar `medications` → `profile_{id}_medications`
    - [x] Migrar `medicationLogs` → `profile_{id}_medicationLogs`
    - [x] Migrar `emergencyContacts` → `profile_{id}_emergencyContacts`
    - [x] Migrar `doctorVisits` → `profile_{id}_doctorVisits`
    - [x] Migrar `medicalExams` → `profile_{id}_medicalExams`
  - [x] Validar migração local antes de sincronizar
  - [x] Tratar casos de dados órfãos
  - [x] Manter backup dos dados antigos

### 6. Testes de Migração
- [x] Criar testes para scripts de migração
  - [x] Teste migração de usuários
  - [x] Teste migração de dados médicos
  - [x] Teste rollback
  - [x] Teste verificação pós-migração
  - [x] Teste casos de erro (dados órfãos, etc.)

### 7. Documentação
- [x] Criar guia de migração (`docs/multiempresa/MIGRACAO.md`)
  - [x] Pré-requisitos
  - [x] Passo-a-passo da migração
  - [x] Checklist pré-migração
  - [x] Procedimento de rollback
  - [x] Troubleshooting
  - [x] Verificação pós-migração

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
