## Objetivo
Implementar sistema de controle de acesso baseado em roles (RBAC) com permissões diferenciadas para cada tipo de usuário e relação familiar.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Permissões devem ser aplicadas localmente e, quando online, sincronizadas com backend opcional.

## Tarefas
- [x] Definir estrutura de permissões
  - [x] Mapear permissões por role (family_admin, adult_member, child, elder_under_care) ✅
  - [x] Permissões: view, edit, delete, share ✅
  - [x] Escopos: own_data, child_data, elder_data, adult_data ✅
  - [x] Definir matriz de permissões completa ✅ `ACCOUNT_PERMISSIONS` em `utils/rbac.py`
- [x] Implementar sistema de cuidadores (caregivers)
  - [x] Níveis de acesso: 'read_only', 'read_write', 'full' ✅
  - [x] Endpoint para adicionar cuidador (`POST /api/family/caregiver`) ✅
  - [x] Endpoint para remover cuidador (`DELETE /api/family/caregiver/:caregiverId`) ✅
  - [x] Endpoint para atualizar nível de acesso ✅
  - [x] Validar relacionamento familiar antes de conceder acesso ✅
- [x] Implementar função de verificação de permissões ✅
  - [x] Função `check_permission(user, action, resource_owner_id)` centralizada ✅
  - [x] Verificar se é próprio dado (own_data) ✅
  - [x] Verificar se é cuidador e nível de acesso ✅
  - [x] Verificar compartilhamento de dados (data_shares) ✅
  - [x] Retornar boolean indicando permissão (centralizado) ✅
- [x] Implementar middleware de autorização ✅
  - [x] Middleware para verificar permissões em rotas ✅
  - [x] Decorator `@require_permission(action, resource_type)` ✅
  - [x] Extrair resource_owner_id da requisição ✅
  - [x] Retornar 403 se sem permissão ✅
- [x] Implementar sistema de compartilhamento de dados
  - [x] Endpoint para compartilhar dados (`POST /api/family/data-shares`) ✅
  - [x] Escopos: 'all', 'basic', 'emergency_only', 'custom' ✅
  - [x] Campos customizados para compartilhamento ✅
  - [x] Expiração de compartilhamentos ✅
  - [x] Endpoint para revogar compartilhamento (`DELETE /api/family/data-shares/{id}`) ✅
- [x] Aplicar permissões em endpoints existentes
  - [x] Verificar permissões em todos os endpoints de dados ✅
  - [x] Filtrar dados retornados baseado em permissões ✅
  - [x] Validar permissões antes de editar/deletar ✅

## Arquivos Criados/Modificados
- ✅ `backend/main.py` - `ACCOUNT_PERMISSIONS` movido para `utils/rbac.py`, integração com serviços
- ✅ `backend/models.py` - Modelo `FamilyCaregiver` implementado
- ✅ `backend/models.py` - Modelo `FamilyDataShare` implementado
- ✅ `backend/utils/rbac.py` - Constantes e helpers de RBAC ✅ **NOVO**
- ✅ `backend/services/permission_service.py` - Serviço de permissões centralizado ✅ **NOVO**
- ✅ `backend/middleware/authorization_middleware.py` - Middleware de autorização ✅ **NOVO**
- ✅ `services/permissionService.js` - Serviço de permissões no frontend ✅ **NOVO**
- ✅ `backend/tests/test_rbac_permissions.py` - Testes completos de RBAC
- ✅ `docs/multiempresa/ARQUITETURA.md` - Documentação de permissões
- ✅ `docs/multiempresa/SEGURANCA.md` - Documentação de segurança e RBAC

## Status
✅ **Implementação Completa**

- ✅ Estrutura de permissões: 100% implementada
- ✅ Sistema de cuidadores: 100% implementado
- ✅ Compartilhamento de dados: 100% implementado
- ✅ Aplicação em endpoints: 100% implementada
- ✅ Serviço centralizado de permissões: 100% implementado ✅
- ✅ Middleware de autorização: 100% implementado ✅
- ✅ Constantes e helpers RBAC: 100% implementados ✅
- ✅ Serviço frontend: 100% implementado ✅
- ✅ Testes: 100% implementados

## Detalhes da Implementação

### Serviço Centralizado (`backend/services/permission_service.py`)
- Função `check_permission()` que verifica:
  1. Se usuário é family_admin (acesso total)
  2. Se é próprio dado (own_data)
  3. Se é cuidador com nível de acesso adequado
  4. Se há compartilhamento de dados (FamilyDataShare)
  5. Se pode visualizar dados da família (read-only)

### Middleware (`backend/middleware/authorization_middleware.py`)
- Decorator `@require_permission(action, resource_type)`
- Extrai `profile_id` automaticamente de:
  - Header `X-Profile-Id`
  - Path parameters (`profile_id`, `resource_id`)
  - Custom extractor function
- Decorators de conveniência:
  - `@require_view_permission()`
  - `@require_edit_permission()`
  - `@require_delete_permission()`

### Constantes RBAC (`backend/utils/rbac.py`)
- Account types, access levels, actions, scopes
- Matriz de permissões `ACCOUNT_PERMISSIONS`
- Funções helper: `has_permission()`, `can_perform_action()`, etc.

### Frontend (`services/permissionService.js`)
- Serviço offline-first
- Sincroniza permissões com backend quando online
- Funções: `hasPermission()`, `canPerformActionOnProfile()`, etc.

## Prioridade
🔴 Alta (MVP) - ✅ **COMPLETA**

## Referências
- Especificação técnica: Seção 3 - Níveis de Acesso Diferenciados
- [RBAC concepts](https://en.wikipedia.org/wiki/Role-based_access_control)
- Documentação: `docs/multiempresa/ARQUITETURA.md` e `docs/multiempresa/SEGURANCA.md`
- Documentação de finalização: `.issues/issue-25-finalizacao.md`
