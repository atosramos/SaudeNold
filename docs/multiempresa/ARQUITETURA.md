# Arquitetura do Sistema Multiempresa (Perfis Familiares)

## Visão Geral

O sistema multiempresa (perfis familiares) permite que múltiplos usuários gerenciem dados de saúde de diferentes membros da família em uma única conta, mantendo isolamento completo de dados entre perfis e famílias.

## Conceitos Fundamentais

### 1. Família (Family)
Uma **família** é o agrupamento principal que contém múltiplos perfis. Cada família tem:
- Um administrador (`admin_user_id`)
- Um nome identificador
- Múltiplos perfis associados

### 2. Perfil Familiar (FamilyProfile)
Um **perfil** representa um membro da família e contém:
- Dados pessoais (nome, data de nascimento, gênero, tipo sanguíneo)
- Tipo de conta (`family_admin`, `adult_member`, `child`, `elder_under_care`)
- Permissões específicas
- Dados médicos isolados por perfil

### 3. Usuário (User)
Um **usuário** é a conta de autenticação que:
- Pertence a uma família (`family_id`)
- Tem um tipo de conta (`account_type`)
- Pode ter múltiplos perfis associados (se for admin)

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      SISTEMA MULTIEMPRESA                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│    User      │
│  (Conta)     │
│              │
│ - id         │
│ - email      │
│ - family_id  │◄─────┐
│ - account_type│     │
└──────────────┘      │
                      │
                      │ 1:N
                      │
┌──────────────┐      │
│   Family     │      │
│              │      │
│ - id         │      │
│ - name       │      │
│ - admin_user_id│    │
└──────────────┘      │
       │              │
       │ 1:N          │
       │              │
       ▼              │
┌──────────────┐      │
│FamilyProfile │      │
│              │      │
│ - id         │      │
│ - family_id  │──────┘
│ - name       │
│ - account_type│
│ - permissions│
└──────────────┘
       │
       │ 1:N
       │
       ▼
┌──────────────┐
│  Medication  │
│  (Dados)     │
│              │
│ - id         │
│ - profile_id │◄─── Isolamento por perfil
│ - name       │
│ - dosage     │
└──────────────┘
```

## Relacionamento entre Tabelas

### Hierarquia Principal

```
User (1) ──→ (N) Family
  │
  └─── account_type: family_admin | adult_member

Family (1) ──→ (N) FamilyProfile
  │
  └─── admin_user_id → User.id

FamilyProfile (1) ──→ (N) Dados Médicos
  │
  ├─── Medication (profile_id)
  ├─── MedicationLog (profile_id)
  ├─── EmergencyContact (profile_id)
  ├─── DoctorVisit (profile_id)
  ├─── MedicalExam (profile_id)
  └─── ExamDataPoint (profile_id)
```

### Relacionamentos Auxiliares

```
FamilyProfile (1) ──→ (N) FamilyCaregiver
  │
  └─── profile_id → FamilyProfile.id

FamilyProfile (1) ──→ (N) FamilyDataShare (from_profile_id)
FamilyProfile (1) ──→ (N) FamilyDataShare (to_profile_id)

Family (1) ──→ (N) FamilyInvite
  │
  └─── family_id → Family.id

FamilyProfile (1) ──→ (N) FamilyProfileLink (source_profile_id)
FamilyProfile (1) ──→ (N) FamilyProfileLink (target_profile_id)
```

## Fluxo de Criação de Família e Perfis

### 1. Criação Inicial

```
1. Usuário se registra
   ↓
2. Sistema cria Family automaticamente
   ↓
3. Usuário recebe account_type = "family_admin"
   ↓
4. Sistema cria FamilyProfile padrão
   ↓
5. Usuário pode adicionar mais perfis
```

### 2. Adicionar Novo Perfil

```
1. Usuário (family_admin) solicita criar perfil
   ↓
2. Sistema valida permissões
   ↓
3. Sistema cria FamilyProfile
   ↓
4. Se child/elder: cria FamilyCaregiver automaticamente
   ↓
5. Perfil fica disponível para uso
```

### 3. Sistema de Convites

```
1. Admin cria convite (POST /api/family/invite-adult)
   ↓
2. Sistema gera código único
   ↓
3. Email enviado (se configurado)
   ↓
4. Convidado aceita convite (POST /api/family/accept-invite)
   ↓
5. Sistema cria FamilyProfile para convidado
   ↓
6. Sistema cria FamilyDataShare com permissões
   ↓
7. Convidado pode acessar dados compartilhados
```

## Fluxo de Sincronização Multi-Perfil

### Sincronização por Perfil

```
┌─────────────────────────────────────────┐
│         Dados do Perfil A                │
│                                          │
│  AsyncStorage (Local)                    │
│  profile_1_medications                   │
│  profile_1_medication_logs               │
│  ...                                     │
│                                          │
│  ────────────────►                      │
│                                          │
│  Backend (Servidor)                      │
│  medications WHERE profile_id = 1        │
│  medication_logs WHERE profile_id = 1    │
│  ...                                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Dados do Perfil B                │
│                                          │
│  AsyncStorage (Local)                    │
│  profile_2_medications                   │
│  profile_2_medication_logs               │
│  ...                                     │
│                                          │
│  ────────────────►                      │
│                                          │
│  Backend (Servidor)                      │
│  medications WHERE profile_id = 2        │
│  medication_logs WHERE profile_id = 2    │
│  ...                                     │
└─────────────────────────────────────────┘

⚠️ ISOLAMENTO: Perfil A NUNCA acessa dados do Perfil B
```

### Processo de Sincronização

1. **Frontend (React Native)**
   - Dados salvos localmente com prefixo `profile_{id}_`
   - Sincronização automática quando online
   - Filtro por `profile_id` em todas as queries

2. **Backend (FastAPI)**
   - Middleware valida `X-Profile-Id` header
   - Todas as queries filtram por `profile_id`
   - Validação de acesso antes de operações

3. **Isolamento Garantido**
   - Dados nunca vazam entre perfis
   - Validação em múltiplas camadas
   - Testes automatizados garantem isolamento

## Isolamento de Dados (Como Funciona)

### Camada 1: Frontend (AsyncStorage)

```javascript
// Chaves isoladas por perfil
const keys = {
  medications: `profile_${profileId}_medications`,
  medicationLogs: `profile_${profileId}_medication_logs`,
  // ...
};

// Sempre usa profile_id nas operações
await saveMedication(medication, profileId);
```

### Camada 2: API Requests

```javascript
// Header obrigatório
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Profile-Id': profileId  // CRÍTICO
}
```

### Camada 3: Backend Middleware

```python
# Validação de acesso
def ensure_profile_access(user, db, profile_id):
    # Verifica se perfil pertence à família do usuário
    profile = db.query(FamilyProfile).filter(
        FamilyProfile.id == profile_id,
        FamilyProfile.family_id == user.family_id
    ).first()
    
    if not profile:
        raise HTTPException(403, "Acesso negado")
```

### Camada 4: Database Queries

```python
# Todas as queries filtram por profile_id
medications = db.query(Medication).filter(
    Medication.profile_id == profile_id
).all()
```

## Sistema de Permissões (RBAC)

### Tipos de Conta

#### 1. `family_admin`
- **Pode:** Tudo na família
- **Pode:** Criar/deletar perfis
- **Pode:** Gerenciar convites
- **Pode:** Compartilhar dados
- **Pode:** Editar qualquer perfil da família

#### 2. `adult_member`
- **Pode:** Editar próprio perfil
- **Pode:** Visualizar dados de filhos (se cuidador)
- **Não pode:** Editar perfis de outros adultos
- **Pode:** Criar convites (com licença PRO)

#### 3. `child`
- **Pode:** Visualizar próprio perfil
- **Não pode:** Editar dados sensíveis
- **Não pode:** Acessar dados de outros

#### 4. `elder_under_care`
- **Pode:** Visualizar próprio perfil
- **Cuidadores:** Podem acessar conforme nível
  - `read_only`: Apenas visualização
  - `read_write`: Visualização e edição
  - `full`: Acesso completo

### Matriz de Permissões

| Ação | family_admin | adult_member | child | elder_under_care |
|------|--------------|-------------|-------|------------------|
| Criar perfil | ✅ | ❌ | ❌ | ❌ |
| Editar próprio perfil | ✅ | ✅ | ⚠️ Limitado | ✅ |
| Editar outro perfil | ✅ | ❌ | ❌ | ❌ |
| Deletar perfil | ✅ | ❌ | ❌ | ❌ |
| Criar convite | ✅ | ✅* | ❌ | ❌ |
| Compartilhar dados | ✅ | ❌ | ❌ | ❌ |
| Acessar dados de filhos | ✅ | ✅ (se cuidador) | ❌ | ❌ |

*Requer licença PRO ativa

## Compartilhamento de Dados

### FamilyDataShare

Permite que um perfil compartilhe seus dados com outro perfil da mesma família:

```python
FamilyDataShare(
    family_id=family.id,
    from_profile_id=profile1.id,  # Quem compartilha
    to_profile_id=profile2.id,     # Quem recebe
    permissions={
        "can_view": True,
        "can_edit": False,
        "can_delete": False
    }
)
```

### Níveis de Compartilhamento

1. **View Only** (`can_view: true`)
   - Apenas visualização
   - Sem edição ou exclusão

2. **Read-Write** (`can_view: true, can_edit: true`)
   - Visualização e edição
   - Sem exclusão

3. **Full Access** (`can_view: true, can_edit: true, can_delete: true`)
   - Acesso completo

## Sistema de Cuidadores

### FamilyCaregiver

Permite que um usuário acesse dados de um perfil específico:

```python
FamilyCaregiver(
    profile_id=elder_profile.id,
    caregiver_user_id=user.id,
    access_level="read_write"  # read_only | read_write | full
)
```

### Casos de Uso

- **Criança:** Pais são cuidadores automáticos
- **Idoso:** Filhos/familiares podem ser cuidadores
- **Acesso temporário:** Pode ser revogado a qualquer momento

## Índices e Otimizações

### Índices Críticos

```sql
-- Isolamento por perfil (CRÍTICO)
CREATE INDEX idx_medications_profile_id ON medications(profile_id);
CREATE INDEX idx_medication_logs_profile_id ON medication_logs(profile_id);
-- ... (todos os dados médicos)

-- Isolamento por família
CREATE INDEX idx_family_profiles_family_id ON family_profiles(family_id);
CREATE INDEX idx_family_invites_family_id ON family_invites(family_id);

-- Performance
CREATE INDEX idx_family_profiles_account_type ON family_profiles(account_type);
CREATE INDEX idx_family_caregivers_profile_id ON family_caregivers(profile_id);
```

### Otimizações

1. **Queries sempre filtram por `profile_id`**
2. **Índices em todas as colunas de isolamento**
3. **Validação de acesso antes de queries**
4. **Cache de perfis da família (frontend)**

## Segurança

### Medidas Implementadas

1. **Isolamento de Dados**
   - Filtros obrigatórios em todas as queries
   - Validação de acesso em múltiplas camadas
   - Testes automatizados garantem isolamento

2. **Autenticação e Autorização**
   - JWT obrigatório para todas as requisições
   - Validação de `X-Profile-Id` header
   - Verificação de permissões por tipo de conta

3. **Criptografia**
   - Dados sensíveis podem ser criptografados (zero-knowledge)
   - Chaves de criptografia por perfil
   - Criptografia em trânsito (HTTPS/TLS)

4. **Logs de Auditoria**
   - Todas as operações são logadas
   - Tentativas de acesso não autorizado registradas
   - Rastreabilidade completa

## Conformidade

### LGPD (Brasil)
- Dados isolados por perfil
- Consentimento para compartilhamento
- Direitos do titular implementados

### HIPAA (EUA)
- Isolamento de PHI (Protected Health Information)
- Controles de acesso baseados em permissões
- Logs de auditoria para rastreabilidade

## Referências

- [Modelos de Dados](./MODELOS.md)
- [Documentação de API](./API.md)
- [Guia de Segurança](./SEGURANCA.md)
- [Guia de Migração](./MIGRACAO.md)

---

**Última atualização:** Janeiro 2026
