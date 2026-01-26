# Documentação de Testes - Sistema Multiempresa

## Visão Geral

A suite de testes do sistema multiempresa garante isolamento de dados, segurança e conformidade. Todos os testes críticos de isolamento têm **100% de cobertura**.

## Estrutura de Testes

### Arquivos de Teste

```
backend/tests/
├── test_family_models.py          # Testes de modelos (13 testes)
├── test_family_endpoints.py       # Testes de endpoints (23+ testes)
├── test_profile_isolation.py      # Testes críticos de isolamento (11 testes)
├── test_rbac_permissions.py      # Testes de permissões (14+ testes)
├── test_family_sync.py            # Testes de sincronização (múltiplos)
├── test_family_performance.py     # Testes de performance (múltiplos)
├── test_family_security.py        # Testes de segurança (múltiplos)
└── test_migration.py              # Testes de migração (Issue #34)
```

## Como Executar Testes

### Executar Todos os Testes de Multiempresa

```bash
cd backend
python -m pytest tests/test_family_*.py tests/test_profile_isolation.py tests/test_rbac_permissions.py -v
```

### Executar Testes Específicos

```bash
# Testes de isolamento (CRÍTICOS)
python -m pytest tests/test_profile_isolation.py -v

# Testes de modelos
python -m pytest tests/test_family_models.py -v

# Testes de endpoints
python -m pytest tests/test_family_endpoints.py -v

# Testes de permissões
python -m pytest tests/test_rbac_permissions.py -v
```

### Executar com Cobertura

```bash
python -m pytest tests/test_family_*.py --cov=backend --cov-report=html
```

## Testes Críticos de Isolamento

### test_profile_isolation.py

**Cobertura: 100%** ✅

Estes são os testes mais críticos do sistema, garantindo que não há vazamento de dados entre perfis ou famílias.

#### Testes Implementados

1. **test_profile_a_cannot_access_profile_b_data_same_family**
   - Garante que perfis na mesma família não acessam dados uns dos outros

2. **test_profile_a_cannot_access_profile_b_data_different_families**
   - Garante que perfis de famílias diferentes não acessam dados uns dos outros

3. **test_profile_id_required_in_queries**
   - Valida que `profile_id` é obrigatório em todas as queries

4. **test_family_a_cannot_access_family_b_data**
   - Garante isolamento entre famílias

5. **test_family_id_verified**
   - Valida que `family_id` é verificado

6. **test_middleware_blocks_access_without_profile_id**
   - Middleware bloqueia acesso sem `X-Profile-Id`

7. **test_middleware_blocks_access_to_other_family_profile**
   - Middleware bloqueia acesso a perfil de outra família

8. **test_middleware_allows_access_to_own_profile**
   - Middleware permite acesso ao próprio perfil

9. **test_data_filtered_by_profile_id_automatically**
   - Dados são filtrados por `profile_id` automaticamente

10. **test_queries_without_profile_id_return_empty**
    - Queries sem `profile_id` retornam vazio

11. **test_no_data_leakage_between_profiles**
    - Validação que não há vazamento de dados

**Status:** ✅ **11/11 testes passando (100%)**

---

## Testes de Modelos

### test_family_models.py

**Cobertura: 100%** ✅

Testa criação, relacionamentos e validações dos modelos.

#### Testes Implementados

1. **TestFamilyModel**
   - `test_create_family`
   - `test_family_requires_admin_user_id`

2. **TestFamilyProfileModel**
   - `test_create_family_profile`
   - `test_family_profile_account_types`
   - `test_family_profile_requires_family_id`

3. **TestFamilyUserRelationship**
   - `test_user_family_relationship`

4. **TestFamilyProfilesRelationship**
   - `test_family_multiple_profiles`

5. **TestFamilyCaregiverModel**
   - `test_create_caregiver`
   - `test_caregiver_access_levels`

6. **TestFamilyDataShareModel**
   - `test_create_data_share`
   - `test_revoke_data_share`

7. **TestFamilyInviteModel**
   - `test_create_family_invite`
   - `test_invite_status_transitions`

**Status:** ✅ **13/13 testes passando (100%)**

---

## Testes de Endpoints

### test_family_endpoints.py

**Cobertura: 100%** ✅ (13/13 endpoints testados)

Testa todos os endpoints de família.

#### Endpoints Testados

1. ✅ `GET /api/family/profiles`
2. ✅ `GET /api/family/invites`
3. ✅ `DELETE /api/family/profiles/{id}`
4. ✅ `POST /api/family/invite-adult`
5. ✅ `DELETE /api/family/invite/{id}`
6. ✅ `POST /api/family/accept-invite`
7. ✅ `GET /api/family/links`
8. ✅ `POST /api/family/links`
9. ✅ `POST /api/family/links/{id}/accept`
10. ✅ `GET /api/family/data-shares`
11. ✅ `POST /api/family/data-shares`
12. ✅ `DELETE /api/family/data-shares/{id}`

**Status:** ✅ **Todos os endpoints testados**

---

## Testes de Permissões (RBAC)

### test_rbac_permissions.py

Testa o sistema de permissões baseado em roles.

#### Testes Implementados

1. **TestFamilyAdminPermissions**
   - Pode criar perfis
   - Pode deletar perfis
   - Pode gerenciar convites

2. **TestAdultMemberPermissions**
   - Pode editar próprio perfil
   - Não pode editar perfis de outros adultos

3. **TestChildPermissions**
   - Pode visualizar próprio perfil
   - Não pode editar dados sensíveis

4. **TestElderUnderCarePermissions**
   - Pode visualizar próprio perfil

5. **TestCaregiverSystem**
   - Adicionar cuidador
   - Níveis de acesso (read_only, read_write, full)

6. **TestDataSharing**
   - Criar compartilhamento
   - Revogar compartilhamento
   - Escopos de compartilhamento

---

## Testes de Sincronização

### test_family_sync.py

Testa sincronização multi-perfil e offline-first.

#### Testes Implementados

1. **TestProfileDataSync**
   - Dados do perfil A sincronizam apenas para perfil A
   - Dados do perfil B não aparecem no perfil A

2. **TestFamilyProfilesSync**
   - Lista de perfis sincroniza corretamente
   - Novos perfis aparecem após sincronização

3. **TestConflictResolution**
   - Conflito entre dados locais e servidor
   - Estratégia last-write-wins

4. **TestOfflineFirstSync**
   - Dados salvos offline são sincronizados quando online
   - Dados não são perdidos durante sincronização

---

## Testes de Performance

### test_family_performance.py

Testa performance com múltiplos perfis e famílias.

#### Testes Implementados

1. **TestMultipleProfilesPerformance**
   - Performance com múltiplos perfis (10+)
   - Performance com dados de perfil (50+ registros)

2. **TestMultipleFamiliesPerformance**
   - Performance com múltiplas famílias (100+)

3. **TestProfileIdFilterPerformance**
   - Performance de queries com filtros de `profile_id`

4. **TestDatabaseIndexes**
   - Validação de índices em `profile_id` e `family_id`

**Limites de Performance:**
- Listagem de perfis: < 1.0s
- Busca de dados por perfil: < 2.0s
- Queries com filtros: < 1.0s

---

## Testes de Segurança

### test_family_security.py

Testa proteções contra ataques e acesso não autorizado.

#### Testes Implementados

1. **TestUnauthorizedAccess**
   - Tentativa de acesso não autorizado
   - Acesso com token inválido
   - Acesso a perfil de outra família

2. **TestSQLInjection**
   - Proteção contra SQL injection em `profile_id`
   - Proteção contra SQL injection em `family_id`

3. **TestInputValidation**
   - Proteção contra XSS em nome de perfil
   - Sanitização de entrada

4. **TestRateLimiting**
   - Rate limiting em endpoints de família
   - Rate limiting em criação de convites

---

## Testes de Migração

### test_migration.py

Testa scripts de migração (Issue #34).

#### Testes Implementados

1. Teste migração de usuários existentes
2. Teste migração de dados médicos
3. Teste rollback de migração
4. Teste validação pós-migração
5. Teste casos de erro (dados órfãos)

---

## Cobertura de Testes

### Cobertura Atual

| Categoria | Cobertura | Status |
|-----------|-----------|--------|
| **Isolamento** | 100% (11/11) | ✅ CRÍTICO |
| **Modelos** | 100% (13/13) | ✅ |
| **Endpoints** | 100% (13/13) | ✅ |
| **Permissões** | > 80% | ✅ |
| **Sincronização** | > 70% | ✅ |
| **Performance** | Implementado | ✅ |
| **Segurança** | Implementado | ✅ |

---

## Como Adicionar Novos Testes

### Estrutura de um Teste

```python
import pytest
from fastapi import status
from models import User, Family, FamilyProfile

class TestNovoEndpoint:
    """Testes para novo endpoint"""
    
    def test_novo_endpoint_success(self, client, api_key, csrf_token, db_session, test_user, test_profile):
        """Testa novo endpoint com sucesso"""
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.get(
            "/api/family/novo-endpoint",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Verificações adicionais
```

### Fixtures Disponíveis

- `client`: Cliente de teste FastAPI
- `api_key`: API key para testes
- `csrf_token`: Token CSRF válido
- `db_session`: Sessão de banco de dados
- `test_user`: Usuário de teste
- `test_profile`: Perfil de teste

### Boas Práticas

1. **Sempre testar isolamento**
   - Verificar que dados não vazam entre perfis
   - Testar acesso não autorizado

2. **Testar permissões**
   - Verificar que apenas usuários autorizados podem executar ações
   - Testar diferentes tipos de conta

3. **Testar casos de erro**
   - Dados não encontrados (404)
   - Acesso negado (403)
   - Dados inválidos (400)

4. **Usar fixtures**
   - Reutilizar fixtures existentes
   - Criar fixtures específicas quando necessário

---

## Troubleshooting de Testes

### Problema: Testes falhando com erro de CSRF

**Solução:**
```python
# Obter token CSRF válido
csrf_response = client.get(
    "/api/csrf-token",
    headers={"Authorization": f"Bearer {token}"}
)
valid_csrf = csrf_response.json().get("csrf_token")
```

### Problema: Testes falhando com erro de autenticação

**Solução:**
```python
# Criar token JWT válido
from auth import create_access_token
token = create_access_token({
    "sub": str(user.id),
    "email": user.email
})
```

### Problema: Dados não isolados nos testes

**Solução:**
- Sempre incluir `X-Profile-Id` header
- Verificar que queries filtram por `profile_id`
- Usar `ensure_profile_access()` antes de operações

### Problema: Testes lentos

**Solução:**
- Usar `--tb=short` para output mais rápido
- Executar apenas testes específicos durante desenvolvimento
- Usar fixtures para evitar criação repetida de dados

---

## Exemplos de Testes

### Exemplo 1: Teste de Isolamento

```python
def test_profile_isolation(self, client, api_key, db_session):
    """Testa que perfil A não acessa dados do perfil B"""
    # Criar dois perfis
    profile_a = create_profile(...)
    profile_b = create_profile(...)
    
    # Criar dados para perfil B
    medication_b = Medication(profile_id=profile_b.id, ...)
    
    # Tentar acessar com perfil A
    response = client.get(
        "/api/medications",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Profile-Id": str(profile_a.id)
        }
    )
    
    # Verificar que não retorna dados do perfil B
    medications = response.json()
    assert all(m.get("id") != medication_b.id for m in medications)
```

### Exemplo 2: Teste de Permissões

```python
def test_admin_can_delete_profile(self, client, api_key, db_session, test_user):
    """Testa que apenas admin pode deletar perfil"""
    test_user.account_type = "family_admin"
    
    response = client.delete(
        f"/api/family/profiles/{profile.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
```

---

## Referências

- [Arquitetura do Sistema](./ARQUITETURA.md)
- [Documentação de API](./API.md)
- [Guia de Migração](./MIGRACAO.md)
- [Issue #35 - Testes Multiempresa](../../.issues/issue-35-testes-multiempresa.md)

---

**Última atualização:** Janeiro 2026
