# Guia de Migração - Sistema Multiempresa (Perfis Familiares)

Este documento descreve o processo completo de migração de dados existentes para o sistema multiempresa (perfis familiares).

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Checklist Pré-Migração](#checklist-pré-migração)
3. [Passo-a-Passo da Migração](#passo-a-passo-da-migração)
4. [Scripts de Migração](#scripts-de-migração)
5. [Verificação Pós-Migração](#verificação-pós-migração)
6. [Procedimento de Rollback](#procedimento-de-rollback)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Pré-requisitos

Antes de iniciar a migração, certifique-se de que:

- ✅ Backend está rodando e acessível
- ✅ Banco de dados PostgreSQL está acessível
- ✅ Backup completo do banco de dados foi criado
- ✅ Variáveis de ambiente estão configuradas (`.env`)
- ✅ Python 3.8+ está instalado
- ✅ Dependências do backend estão instaladas (`pip install -r requirements.txt`)

### Variáveis de Ambiente Necessárias

Certifique-se de que o arquivo `.env` contém:

```env
DATABASE_URL=postgresql://user:password@host:port/database
# ou
DATABASE_USER=saudenold
DATABASE_PASSWORD=saudenold123
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=saudenold

# Opcional: ID do perfil padrão para dados órfãos
DEFAULT_PROFILE_ID=1
```

---

## Checklist Pré-Migração

Antes de executar a migração, complete este checklist:

- [ ] **Backup do banco de dados criado**
  ```bash
  pg_dump -U saudenold -d saudenold > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Backup do AsyncStorage (se aplicável)**
  - No app mobile, exportar dados antes da atualização

- [ ] **Ambiente de staging testado**
  - Migração testada em ambiente de staging primeiro

- [ ] **Janela de manutenção agendada**
  - Sistema pode ficar indisponível durante migração

- [ ] **Logs de migração configurados**
  - Scripts criam logs automaticamente, mas verifique espaço em disco

- [ ] **Notificação aos usuários**
  - Informar sobre manutenção programada

---

## Passo-a-Passo da Migração

### Opção 1: Migração Automática (Recomendada)

Execute o script master que executa todas as migrações em ordem:

```bash
cd backend
python migrations/run_all_migrations.py
```

Este script executa:
1. Migração de schema (tabelas e colunas)
2. Migração de usuários para famílias
3. Migração de dados médicos para perfis
4. Verificação pós-migração

### Opção 2: Migração Manual (Passo a Passo)

#### Passo 1: Migração de Schema

Cria tabelas e colunas necessárias:

```bash
cd backend
python migrate_family_profiles.py
```

**O que faz:**
- Cria tabelas: `families`, `family_profiles`, `family_caregivers`, etc.
- Adiciona colunas: `family_id`, `profile_id`, `account_type`, etc.

**Modo Dry Run (teste):**
```bash
python migrate_family_profiles.py --dry-run
```

#### Passo 2: Migração de Usuários

Cria família e perfil para cada usuário sem família:

```bash
cd backend
python migrations/migrate_existing_users_to_families.py
```

**O que faz:**
- Identifica usuários sem `family_id`
- Cria família para cada usuário
- Cria perfil padrão (`family_admin`) para cada usuário
- Atualiza usuário com `family_id` e `account_type`

**Modo Dry Run:**
```bash
python migrations/migrate_existing_users_to_families.py --dry-run
```

#### Passo 3: Migração de Dados Médicos

Associa dados médicos aos perfis:

```bash
cd backend
python migrations/migrate_medical_data_to_profiles.py
```

**O que faz:**
- Associa `medications` ao `profile_id` do usuário
- Associa `medication_logs` ao `profile_id`
- Associa `emergency_contacts` ao `profile_id`
- Associa `doctor_visits` ao `profile_id`
- Associa `medical_exams` ao `profile_id`
- Associa `exam_data_points` ao `profile_id`

**Modo Dry Run:**
```bash
python migrations/migrate_medical_data_to_profiles.py --dry-run
```

#### Passo 4: Verificação

Verifica integridade dos dados após migração:

```bash
cd backend
python migrations/verify_migration.py
```

**O que verifica:**
- Todos os usuários têm `family_id`
- Todos os usuários têm perfil em `family_profiles`
- Todos os dados médicos têm `profile_id`
- Integridade referencial (famílias, perfis, etc.)

---

## Scripts de Migração

### Scripts Disponíveis

| Script | Descrição | Uso |
|--------|-----------|-----|
| `migrate_family_profiles.py` | Migração de schema | Cria tabelas e colunas |
| `migrations/migrate_existing_users_to_families.py` | Migração de usuários | Cria famílias e perfis |
| `migrations/migrate_medical_data_to_profiles.py` | Migração de dados médicos | Associa dados a perfis |
| `migrations/verify_migration.py` | Verificação pós-migração | Valida integridade |
| `migrations/run_all_migrations.py` | Script master | Executa tudo em ordem |

### Parâmetros Comuns

Todos os scripts de migração suportam:

- `--dry-run`: Simula migração sem fazer alterações
  ```bash
  python script.py --dry-run
  ```

### Logs

Cada script cria um arquivo de log:

- `migration_family_profiles.log`
- `migration_users.log`
- `migration_medical_data.log`
- `verify_migration.log`
- `run_all_migrations.log`

---

## Verificação Pós-Migração

Após executar a migração, execute a verificação:

```bash
python migrations/verify_migration.py
```

### O que é Verificado

1. **Usuários e Famílias**
   - Todos os usuários têm `family_id`
   - Todos os usuários têm perfil em `family_profiles`

2. **Dados Médicos**
   - Todos os registros têm `profile_id`
   - Nenhum dado órfão (sem perfil)

3. **Integridade Referencial**
   - Famílias têm admin válido
   - Perfis têm família válida
   - Relacionamentos corretos

### Interpretando Resultados

- ✅ **OK**: Todos os checks passaram
- ⚠️ **WARNING**: Alguns dados sem `profile_id` (pode ser normal se tabela estava vazia)
- ❌ **ERROR**: Problemas encontrados - verificar relatório

---

## Procedimento de Rollback

Se a migração falhar ou causar problemas, siga estes passos:

### 1. Restaurar Backup do Banco de Dados

```bash
# Parar aplicação
# Restaurar backup
psql -U saudenold -d saudenold < backup_pre_migration_YYYYMMDD_HHMMSS.sql
```

### 2. Verificar Restauração

```bash
# Conectar ao banco e verificar
psql -U saudenold -d saudenold

# Verificar usuários
SELECT id, email, family_id FROM users LIMIT 10;

# Verificar dados médicos
SELECT COUNT(*) FROM medications WHERE profile_id IS NULL;
```

### 3. Re-executar Migração (se necessário)

Após corrigir problemas, re-executar migração:

```bash
python migrations/run_all_migrations.py
```

---

## Troubleshooting

### Problema: Usuários sem família após migração

**Sintoma:**
```
Usuários sem família: 5
```

**Solução:**
1. Verificar logs: `migration_users.log`
2. Re-executar migração de usuários:
   ```bash
   python migrations/migrate_existing_users_to_families.py
   ```

### Problema: Dados médicos sem profile_id

**Sintoma:**
```
medications: 10 registros sem profile_id
```

**Solução:**
1. Verificar se há `DEFAULT_PROFILE_ID` configurado
2. Verificar se perfil padrão existe
3. Re-executar migração de dados médicos:
   ```bash
   python migrations/migrate_medical_data_to_profiles.py
   ```

### Problema: Erro de integridade referencial

**Sintoma:**
```
Famílias sem admin válido: 2
```

**Solução:**
1. Verificar se usuários existem:
   ```sql
   SELECT id, email FROM users WHERE id IN (SELECT admin_user_id FROM families);
   ```
2. Corrigir manualmente ou recriar famílias

### Problema: Migração falha com erro de conexão

**Sintoma:**
```
Error: could not connect to server
```

**Solução:**
1. Verificar `DATABASE_URL` no `.env`
2. Verificar se PostgreSQL está rodando
3. Verificar credenciais de acesso

### Problema: Timeout durante migração

**Sintoma:**
```
Operation timed out
```

**Solução:**
1. Aumentar timeout do banco de dados
2. Executar migração em lotes menores
3. Verificar recursos do servidor (CPU, memória, disco)

---

## FAQ

### P: A migração é reversível?

**R:** Sim, desde que você tenha feito backup antes. Use o procedimento de rollback descrito acima.

### P: Quanto tempo leva a migração?

**R:** Depende do volume de dados:
- Schema: ~1-2 minutos
- Usuários: ~1 minuto por 1000 usuários
- Dados médicos: ~1 minuto por 10.000 registros

### P: Posso executar migração em produção sem downtime?

**R:** Não recomendado. A migração altera estrutura do banco e pode causar locks. Agende janela de manutenção.

### P: O que acontece com dados órfãos?

**R:** Dados sem usuário associado são atribuídos ao `DEFAULT_PROFILE_ID` (se configurado) ou ao primeiro perfil `family_admin` encontrado.

### P: Preciso migrar dados do AsyncStorage também?

**R:** Sim, mas isso é feito automaticamente pelo app na primeira execução após atualização. O script `migrateLocalStorage.js` é executado automaticamente.

### P: Como migrar dados do AsyncStorage manualmente?

**R:** No app, a migração é automática. Se necessário, pode ser forçada:

```javascript
import { runLocalStorageMigration } from './services/migrateLocalStorage';

// Executar migração
const result = await runLocalStorageMigration(profileId);
```

### P: E se eu tiver múltiplos ambientes (dev, staging, prod)?

**R:** Execute migração em cada ambiente separadamente, começando por dev, depois staging, e por último produção.

### P: Posso pular alguma etapa da migração?

**R:** Não. As etapas devem ser executadas em ordem:
1. Schema (obrigatório)
2. Usuários (obrigatório)
3. Dados médicos (obrigatório)
4. Verificação (recomendado)

---

## Migração de Dados Locais (AsyncStorage)

A migração de dados locais no app mobile é automática. Quando o app detecta dados antigos (sem prefixo de perfil), executa automaticamente a migração.

### Como Funciona

1. App detecta dados antigos no AsyncStorage
2. Cria backup automático
3. Migra chaves antigas para estrutura de perfis
4. Valida migração
5. Remove dados antigos (após validação)

### Chaves Migradas

- `medications` → `profile_{id}_medications`
- `medicationLogs` → `profile_{id}_medicationLogs`
- `emergencyContacts` → `profile_{id}_emergencyContacts`
- `doctorVisits` → `profile_{id}_doctorVisits`
- `medicalExams` → `profile_{id}_medicalExams`

### Verificação Manual

Se necessário, verificar migração local:

```javascript
import { validateLocalMigration } from './services/migrateLocalStorage';

const validation = await validateLocalMigration(profileId);
console.log(validation);
```

---

## Suporte

Se encontrar problemas durante a migração:

1. Verificar logs de migração
2. Executar script de verificação
3. Consultar seção de Troubleshooting
4. Abrir issue no repositório com:
   - Logs de migração
   - Resultado da verificação
   - Descrição do problema

---

**Última atualização:** 2026-01-26  
**Versão:** 1.0
