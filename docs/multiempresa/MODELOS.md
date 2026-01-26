# Modelos de Dados - Sistema Multiempresa

## Visão Geral

Este documento descreve os modelos de dados do sistema multiempresa (perfis familiares), incluindo estrutura, relacionamentos e índices.

## Modelos Principais

### Family

Representa uma família (agrupamento de perfis).

**Tabela:** `families`

**Campos:**
```python
id: Integer (PK, auto-increment)
name: String(255) (NOT NULL)
admin_user_id: Integer (NOT NULL, indexado)
created_at: DateTime (timezone, default: now())
updated_at: DateTime (timezone, nullable)
```

**Relacionamentos:**
- `1:N` com `User` (via `admin_user_id`)
- `1:N` com `FamilyProfile`
- `1:N` com `FamilyInvite`
- `1:N` com `FamilyProfileLink`
- `1:N` com `FamilyDataShare`

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (admin_user_id)`

**Exemplo:**
```python
family = Family(
    name="Família Silva",
    admin_user_id=1
)
```

---

### FamilyProfile

Representa um perfil de membro da família.

**Tabela:** `family_profiles`

**Campos:**
```python
id: Integer (PK, auto-increment)
family_id: Integer (NOT NULL, indexado)
name: String(255) (NOT NULL)
account_type: String(50) (NOT NULL, indexado)
birth_date: DateTime (timezone, nullable)
gender: String(50) (nullable)
blood_type: String(10) (nullable)
created_by: Integer (indexado, nullable)
permissions: JSON (nullable)
allow_quick_access: Boolean (default: False)
created_at: DateTime (timezone, default: now())
updated_at: DateTime (timezone, nullable)
```

**Tipos de Conta (`account_type`):**
- `family_admin`: Administrador da família
- `adult_member`: Membro adulto
- `child`: Criança (< 18 anos)
- `elder_under_care`: Idoso sob cuidados

**Relacionamentos:**
- `N:1` com `Family` (via `family_id`)
- `1:N` com dados médicos (via `profile_id`)
- `1:N` com `FamilyCaregiver` (via `profile_id`)
- `1:N` com `FamilyDataShare` (como origem ou destino)
- `1:N` com `FamilyProfileLink` (como origem ou destino)

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (family_id)`
- `INDEX (account_type)`
- `INDEX (created_by)`

**Exemplo:**
```python
profile = FamilyProfile(
    family_id=1,
    name="João Silva",
    account_type="family_admin",
    birth_date=datetime(1980, 1, 15),
    gender="Masculino",
    blood_type="O+",
    created_by=1,
    permissions={"can_manage_profiles": True},
    allow_quick_access=False
)
```

---

### FamilyCaregiver

Representa um cuidador de um perfil (criança ou idoso).

**Tabela:** `family_caregivers`

**Campos:**
```python
id: Integer (PK, auto-increment)
profile_id: Integer (NOT NULL, indexado)
caregiver_user_id: Integer (NOT NULL, indexado)
access_level: String(50) (default: "full")
created_at: DateTime (timezone, default: now())
```

**Níveis de Acesso (`access_level`):**
- `read_only`: Apenas visualização
- `read_write`: Visualização e edição
- `full`: Acesso completo

**Relacionamentos:**
- `N:1` com `FamilyProfile` (via `profile_id`)
- `N:1` com `User` (via `caregiver_user_id`)

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (profile_id)`
- `INDEX (caregiver_user_id)`

**Exemplo:**
```python
caregiver = FamilyCaregiver(
    profile_id=2,  # Perfil da criança/idoso
    caregiver_user_id=1,  # Usuário cuidador
    access_level="read_write"
)
```

---

### FamilyInvite

Representa um convite para entrar na família.

**Tabela:** `family_invites`

**Campos:**
```python
id: Integer (PK, auto-increment)
family_id: Integer (NOT NULL, indexado)
inviter_user_id: Integer (NOT NULL, indexado)
invitee_email: String(255) (indexado, nullable)
invite_code: String(64) (UNIQUE, indexado)
status: String(20) (default: "pending", indexado)
expires_at: DateTime (timezone, indexado, nullable)
accepted_at: DateTime (timezone, nullable)
accepted_by_user_id: Integer (indexado, nullable)
permissions: JSON (nullable)
created_at: DateTime (timezone, default: now())
```

**Status possíveis:**
- `pending`: Aguardando aceitação
- `accepted`: Aceito
- `cancelled`: Cancelado
- `expired`: Expirado

**Relacionamentos:**
- `N:1` com `Family` (via `family_id`)
- `N:1` com `User` (via `inviter_user_id` e `accepted_by_user_id`)

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (family_id)`
- `INDEX (invitee_email)`
- `UNIQUE INDEX (invite_code)`
- `INDEX (status)`
- `INDEX (expires_at)`
- `INDEX (accepted_by_user_id)`

**Exemplo:**
```python
invite = FamilyInvite(
    family_id=1,
    inviter_user_id=1,
    invitee_email="convidado@example.com",
    invite_code="ABC123XYZ",
    status="pending",
    expires_at=datetime.now() + timedelta(days=7),
    permissions={"can_view": True, "can_edit": False}
)
```

---

### FamilyDataShare

Representa compartilhamento de dados entre perfis.

**Tabela:** `family_data_shares`

**Campos:**
```python
id: Integer (PK, auto-increment)
family_id: Integer (NOT NULL, indexado)
from_profile_id: Integer (NOT NULL, indexado)
to_profile_id: Integer (NOT NULL, indexado)
permissions: JSON (nullable)
created_at: DateTime (timezone, default: now())
revoked_at: DateTime (timezone, nullable)
```

**Relacionamentos:**
- `N:1` com `Family` (via `family_id`)
- `N:1` com `FamilyProfile` (via `from_profile_id` - quem compartilha)
- `N:1` com `FamilyProfile` (via `to_profile_id` - quem recebe)

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (family_id)`
- `INDEX (from_profile_id)`
- `INDEX (to_profile_id)`

**Exemplo:**
```python
data_share = FamilyDataShare(
    family_id=1,
    from_profile_id=1,  # Perfil que compartilha
    to_profile_id=2,     # Perfil que recebe
    permissions={
        "can_view": True,
        "can_edit": False,
        "can_delete": False
    },
    revoked_at=None
)
```

---

### FamilyProfileLink

Representa um vínculo entre dois perfis.

**Tabela:** `family_profile_links`

**Campos:**
```python
id: Integer (PK, auto-increment)
family_id: Integer (NOT NULL, indexado)
source_profile_id: Integer (NOT NULL, indexado)
target_profile_id: Integer (NOT NULL, indexado)
status: String(20) (default: "pending", indexado)
created_at: DateTime (timezone, default: now())
approved_at: DateTime (timezone, nullable)
```

**Status possíveis:**
- `pending`: Aguardando aprovação
- `accepted`: Aceito
- `rejected`: Rejeitado

**Relacionamentos:**
- `N:1` com `Family` (via `family_id`)
- `N:1` com `FamilyProfile` (via `source_profile_id`)
- `N:1` com `FamilyProfile` (via `target_profile_id`)

**Índices:**
- `PRIMARY KEY (id)`
- `INDEX (family_id)`
- `INDEX (source_profile_id)`
- `INDEX (target_profile_id)`
- `INDEX (status)`

**Exemplo:**
```python
link = FamilyProfileLink(
    family_id=1,
    source_profile_id=1,  # Perfil origem
    target_profile_id=2,  # Perfil destino
    status="pending"
)
```

---

## Modelos de Dados Médicos

Todos os dados médicos têm isolamento por `profile_id`:

### Medication
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
name: String
dosage: String
schedules: JSON
# ...
```

### MedicationLog
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
medication_id: Integer
# ...
```

### EmergencyContact
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
name: String
phone: String
# ...
```

### DoctorVisit
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
doctor_name: String
date: DateTime
# ...
```

### MedicalExam
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
name: String
date: DateTime
# ...
```

### ExamDataPoint
```python
id: Integer (PK)
profile_id: Integer (NOT NULL, indexado)  # ISOLAMENTO
exam_id: Integer
value: Float
# ...
```

---

## Relacionamentos entre Modelos

### Diagrama de Relacionamentos

```
User (1) ──→ (N) Family
  │              │
  │              │ 1:N
  │              ▼
  │         FamilyProfile
  │              │
  │              │ 1:N
  │              ▼
  │         Dados Médicos
  │         (profile_id)
  │
  └─── account_type
       family_id

Family (1) ──→ (N) FamilyProfile
  │              │
  │              │ 1:N
  │              ▼
  │         FamilyCaregiver
  │
  │ 1:N
  ▼
FamilyInvite

FamilyProfile (1) ──→ (N) FamilyDataShare (from_profile_id)
FamilyProfile (1) ──→ (N) FamilyDataShare (to_profile_id)

FamilyProfile (1) ──→ (N) FamilyProfileLink (source_profile_id)
FamilyProfile (1) ──→ (N) FamilyProfileLink (target_profile_id)
```

---

## Índices e Otimizações

### Índices Críticos para Isolamento

```sql
-- Isolamento por perfil (CRÍTICO)
CREATE INDEX idx_medications_profile_id ON medications(profile_id);
CREATE INDEX idx_medication_logs_profile_id ON medication_logs(profile_id);
CREATE INDEX idx_emergency_contacts_profile_id ON emergency_contacts(profile_id);
CREATE INDEX idx_doctor_visits_profile_id ON doctor_visits(profile_id);
CREATE INDEX idx_medical_exams_profile_id ON medical_exams(profile_id);
CREATE INDEX idx_exam_data_points_profile_id ON exam_data_points(profile_id);

-- Isolamento por família
CREATE INDEX idx_family_profiles_family_id ON family_profiles(family_id);
CREATE INDEX idx_family_invites_family_id ON family_invites(family_id);
CREATE INDEX idx_family_data_shares_family_id ON family_data_shares(family_id);
CREATE INDEX idx_family_profile_links_family_id ON family_profile_links(family_id);
```

### Índices para Performance

```sql
-- Busca por tipo de conta
CREATE INDEX idx_family_profiles_account_type ON family_profiles(account_type);

-- Busca de cuidadores
CREATE INDEX idx_family_caregivers_profile_id ON family_caregivers(profile_id);
CREATE INDEX idx_family_caregivers_user_id ON family_caregivers(caregiver_user_id);

-- Busca de convites
CREATE INDEX idx_family_invites_status ON family_invites(status);
CREATE INDEX idx_family_invites_expires_at ON family_invites(expires_at);

-- Busca de compartilhamentos
CREATE INDEX idx_family_data_shares_from_profile ON family_data_shares(from_profile_id);
CREATE INDEX idx_family_data_shares_to_profile ON family_data_shares(to_profile_id);
```

---

## Constraints e Validações

### Constraints de Integridade

```sql
-- Foreign Keys (implícitas via SQLAlchemy)
-- FamilyProfile.family_id → Family.id
-- FamilyCaregiver.profile_id → FamilyProfile.id
-- FamilyInvite.family_id → Family.id
-- FamilyDataShare.family_id → Family.id
-- FamilyDataShare.from_profile_id → FamilyProfile.id
-- FamilyDataShare.to_profile_id → FamilyProfile.id
```

### Validações de Negócio

1. **FamilyProfile**
   - `family_id` obrigatório
   - `account_type` deve ser um dos valores válidos
   - `name` não pode ser vazio

2. **FamilyInvite**
   - `invite_code` único
   - `status` deve ser um dos valores válidos
   - `expires_at` deve ser futuro (quando criado)

3. **FamilyDataShare**
   - `from_profile_id` e `to_profile_id` devem ser diferentes
   - Ambos devem pertencer à mesma família
   - `revoked_at` NULL significa ativo

4. **FamilyProfileLink**
   - `source_profile_id` e `target_profile_id` devem ser diferentes
   - Ambos devem pertencer à mesma família

---

## Queries Comuns

### Buscar Perfis de uma Família

```python
profiles = db.query(FamilyProfile).filter(
    FamilyProfile.family_id == family_id
).all()
```

### Buscar Dados Médicos de um Perfil

```python
medications = db.query(Medication).filter(
    Medication.profile_id == profile_id
).all()
```

### Buscar Cuidadores de um Perfil

```python
caregivers = db.query(FamilyCaregiver).filter(
    FamilyCaregiver.profile_id == profile_id
).all()
```

### Buscar Compartilhamentos Ativos

```python
shares = db.query(FamilyDataShare).filter(
    FamilyDataShare.family_id == family_id,
    FamilyDataShare.revoked_at.is_(None)
).all()
```

### Buscar Convites Pendentes

```python
invites = db.query(FamilyInvite).filter(
    FamilyInvite.family_id == family_id,
    FamilyInvite.status == "pending",
    FamilyInvite.expires_at > datetime.now()
).all()
```

---

## Referências

- [Arquitetura do Sistema](./ARQUITETURA.md)
- [Documentação de API](./API.md)
- [Guia de Migração](./MIGRACAO.md)

---

**Última atualização:** Janeiro 2026
