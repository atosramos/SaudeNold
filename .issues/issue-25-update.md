## Objetivo
Implementar sistema de controle de acesso baseado em roles (RBAC) com permissões diferenciadas para cada tipo de usuário e relação familiar.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Permissões devem ser aplicadas localmente e, quando online, sincronizadas com backend opcional.

## Tarefas
- [x] Definir estrutura de permissões
  - [x] Mapear permissões por role (family_admin, adult_member, child, elder_under_care) ✅
  - [x] Permissões: view, edit, delete, share ✅
  - [x] Escopos: own_data, child_data, elder_data, adult_data ✅
  - [x] Definir matriz de permissões completa ✅ `ACCOUNT_PERMISSIONS` em `main.py`
- [x] Implementar sistema de cuidadores (caregivers)
  - [x] Níveis de acesso: 'read_only', 'read_write', 'full' ✅
  - [x] Endpoint para adicionar cuidador (`POST /api/family/caregiver`) ✅
  - [x] Endpoint para remover cuidador (`DELETE /api/family/caregiver/:caregiverId`) ✅
  - [x] Endpoint para atualizar nível de acesso ✅
  - [x] Validar relacionamento familiar antes de conceder acesso ✅
- [ ] Implementar função de verificação de permissões
  - [ ] Função `check_permission(user, action, resource_owner_id)` centralizada
  - [x] Verificar se é próprio dado (own_data) ✅ (implementado nos endpoints)
  - [x] Verificar se é cuidador e nível de acesso ✅ (implementado nos endpoints)
  - [x] Verificar compartilhamento de dados (data_shares) ✅ (implementado nos endpoints)
  - [ ] Retornar boolean indicando permissão (centralizado)
- [ ] Implementar middleware de autorização
  - [ ] Middleware para verificar permissões em rotas
  - [ ] Decorator `@require_permission(action, resource_type)`
  - [ ] Extrair resource_owner_id da requisição
  - [ ] Retornar 403 se sem permissão
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
- ✅ `backend/main.py` - `ACCOUNT_PERMISSIONS` definido e `build_permissions()` implementado
- ✅ `backend/models.py` - Modelo `FamilyCaregiver` implementado
- ✅ `backend/models.py` - Modelo `FamilyDataShare` implementado
- ✅ `backend/tests/test_rbac_permissions.py` - Testes completos de RBAC
- ✅ `docs/multiempresa/ARQUITETURA.md` - Documentação de permissões
- ✅ `docs/multiempresa/SEGURANCA.md` - Documentação de segurança e RBAC
- ❌ `backend/services/permission_service.py` - Serviço de permissões centralizado (pendente)
- ❌ `backend/middleware/authorization_middleware.py` - Middleware de autorização (pendente)
- ❌ `backend/utils/rbac.py` - Constantes e helpers de RBAC (pendente)
- ❌ `frontend/services/permissionService.js` - Serviço de permissões no frontend (pendente)

## Status
🟡 **Implementação Parcial**
- ✅ Estrutura de permissões: 100% implementada
- ✅ Sistema de cuidadores: 100% implementado
- ✅ Compartilhamento de dados: 100% implementado
- ✅ Aplicação em endpoints: 100% implementada
- ❌ Serviço centralizado de permissões: Pendente
- ❌ Middleware de autorização: Pendente
- ✅ Testes: 100% implementados

## Prioridade
🔴 Alta (MVP)

## Referências
- Especificação técnica: Seção 3 - Níveis de Acesso Diferenciados
- [RBAC concepts](https://en.wikipedia.org/wiki/Role-based_access_control)
- Documentação: `docs/multiempresa/ARQUITETURA.md` e `docs/multiempresa/SEGURANCA.md`
