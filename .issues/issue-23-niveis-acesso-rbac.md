## Objetivo
Implementar sistema de controle de acesso baseado em roles (RBAC) com permissões diferenciadas para cada tipo de usuário e relação familiar.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Permissões devem ser aplicadas localmente e, quando online, sincronizadas com backend opcional.

## Tarefas
- [ ] Definir estrutura de permissões
  - [ ] Mapear permissões por role (family_admin, adult_member, child, elder_under_care)
  - [ ] Permissões: view, edit, delete, share
  - [ ] Escopos: own_data, child_data, elder_data, adult_data
  - [ ] Definir matriz de permissões completa
- [ ] Implementar sistema de cuidadores (caregivers)
  - [ ] Níveis de acesso: 'read_only', 'read_write', 'full'
  - [ ] Endpoint para adicionar cuidador (`POST /api/family/caregiver`)
  - [ ] Endpoint para remover cuidador (`DELETE /api/family/caregiver/:caregiverId`)
  - [ ] Endpoint para atualizar nível de acesso
  - [ ] Validar relacionamento familiar antes de conceder acesso
- [ ] Implementar função de verificação de permissões
  - [ ] Função `check_permission(user, action, resource_owner_id)`
  - [ ] Verificar se é próprio dado (own_data)
  - [ ] Verificar se é cuidador e nível de acesso
  - [ ] Verificar compartilhamento de dados (data_shares)
  - [ ] Retornar boolean indicando permissão
- [ ] Implementar middleware de autorização
  - [ ] Middleware para verificar permissões em rotas
  - [ ] Decorator `@require_permission(action, resource_type)`
  - [ ] Extrair resource_owner_id da requisição
  - [ ] Retornar 403 se sem permissão
- [ ] Implementar sistema de compartilhamento de dados
  - [ ] Endpoint para compartilhar dados (`POST /api/data/share`)
  - [ ] Escopos: 'all', 'basic', 'emergency_only', 'custom'
  - [ ] Campos customizados para compartilhamento
  - [ ] Expiração de compartilhamentos
  - [ ] Endpoint para revogar compartilhamento
- [ ] Aplicar permissões em endpoints existentes
  - [ ] Verificar permissões em todos os endpoints de dados
  - [ ] Filtrar dados retornados baseado em permissões
  - [ ] Validar permissões antes de editar/deletar

## Arquivos a Criar/Modificar
- `backend/services/permission_service.py` - Serviço de permissões
- `backend/middleware/authorization_middleware.py` - Middleware de autorização
- `backend/routes/family_routes.py` - Rotas de cuidadores
- `backend/routes/data_routes.py` - Rotas de compartilhamento
- `backend/utils/rbac.py` - Constantes e helpers de RBAC
- `frontend/services/permissionService.js` - Serviço de permissões no frontend

## Referências
- Especificação técnica: Seção 3 - Níveis de Acesso Diferenciados
- [RBAC concepts](https://en.wikipedia.org/wiki/Role-based_access_control)

## Prioridade
🔴 Alta (MVP)
