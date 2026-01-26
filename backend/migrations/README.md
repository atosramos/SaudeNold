# Scripts de Migração - Sistema Multiempresa

Este diretório contém os scripts de migração para o sistema multiempresa (perfis familiares).

## 📋 Scripts Disponíveis

### 1. `migrate_family_profiles.py` (Raiz do backend)
Migração de schema - cria tabelas e colunas necessárias.

**Uso:**
```bash
cd backend
python migrate_family_profiles.py
python migrate_family_profiles.py --dry-run  # Teste sem alterações
```

### 2. `migrate_existing_users_to_families.py`
Migra usuários existentes para o sistema de famílias.

**Uso:**
```bash
python migrations/migrate_existing_users_to_families.py
python migrations/migrate_existing_users_to_families.py --dry-run
```

**O que faz:**
- Identifica usuários sem `family_id`
- Cria família para cada usuário
- Cria perfil padrão (`family_admin`)
- Atualiza usuário com `family_id` e `account_type`

### 3. `migrate_medical_data_to_profiles.py`
Migra dados médicos para perfis familiares.

**Uso:**
```bash
python migrations/migrate_medical_data_to_profiles.py
python migrations/migrate_medical_data_to_profiles.py --dry-run
```

**O que faz:**
- Associa `medications` ao `profile_id`
- Associa `medication_logs` ao `profile_id`
- Associa `emergency_contacts` ao `profile_id`
- Associa `doctor_visits` ao `profile_id`
- Associa `medical_exams` ao `profile_id`
- Associa `exam_data_points` ao `profile_id`

### 4. `verify_migration.py`
Verifica integridade dos dados após migração.

**Uso:**
```bash
python migrations/verify_migration.py
```

**O que verifica:**
- Todos os usuários têm `family_id`
- Todos os usuários têm perfil
- Todos os dados médicos têm `profile_id`
- Integridade referencial

### 5. `run_all_migrations.py` (Recomendado)
Script master que executa todas as migrações em ordem.

**Uso:**
```bash
python migrations/run_all_migrations.py
python migrations/run_all_migrations.py --dry-run
python migrations/run_all_migrations.py --skip-verification
```

## 🚀 Execução Rápida

Para executar todas as migrações:

```bash
cd backend
python migrations/run_all_migrations.py
```

## 📝 Logs

Cada script cria um arquivo de log:
- `migration_family_profiles.log`
- `migration_users.log`
- `migration_medical_data.log`
- `verify_migration.log`
- `run_all_migrations.log`

## ⚠️ Importante

1. **Sempre faça backup antes de executar migrações em produção**
2. **Teste primeiro em ambiente de staging**
3. **Use `--dry-run` para simular antes de executar**
4. **Execute verificação após migração**

## 📚 Documentação Completa

Veja a documentação completa em: `docs/multiempresa/MIGRACAO.md`

## 🔗 Relacionado

- Issue #34 - Migração de Dados Multiempresa
- `docs/multiempresa/MIGRACAO.md` - Guia completo de migração
