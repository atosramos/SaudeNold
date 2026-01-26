## Objetivo
Implementar sistema de gestão de perfis familiares, permitindo que múltiplos membros da família usem o aplicativo com perfis separados e dados isolados.

## Contexto Atual
App mobile (Expo/React Native) offline-first com dados locais em AsyncStorage. Multi-perfis devem funcionar offline e sincronizar quando backend estiver disponível.

## Tarefas
- [x] Criar modelo de dados para família
  - [x] Schema `Family` com campos: _id, name, admin_user_id, members, created_at
  - [x] Schema `User` com campos: family_id, account_type, created_by, permissions
  - [x] Relacionamento entre usuários e família
  - [x] Índices para otimizar consultas
- [x] Implementar criação de família
  - [x] Criar família automaticamente ao registrar primeiro usuário
  - [x] Definir usuário como `family_admin`
  - [x] Associar `family_id` ao usuário
- [x] Implementar estrutura hierárquica de perfis
  - [x] Tipos de conta: `family_admin`, `adult_member`, `child`, `elder_under_care`
  - [x] Definir perfis dependentes (filhos, idosos sob cuidado)
  - [x] Definir perfis vinculados (adultos com consentimento)
  - [x] Sistema de permissões por tipo de conta
  - [x] Relacionamento de cuidadores (caregivers)
  - [x] Sistema de compartilhamento de dados (data_shares)
- [x] Implementar storage separado por perfil
  - [x] Classe `ProfileStorageManager` no frontend
  - [x] Prefixar chaves do AsyncStorage com profile_id
  - [x] Métodos: `setActiveProfile()`, `getProfileKey()`, `setItem()`, `getItem()`
  - [x] Método `clearProfileData()` para limpar dados do perfil
  - [x] Cache local segregado por usuário (sem compartilhamento de dados)
  - [x] Token de sessão isolado por perfil no Keychain/Keystore
  - [x] Chaves de criptografia separadas por perfil
- [x] Implementar sincronização de perfis
  - [x] Endpoint para listar perfis da família (`GET /api/family/profiles`)
  - [x] Sincronizar perfis locais com servidor
  - [x] Cache local de perfis
  - [x] Atualizar cache quando perfis mudam
  - [x] Sincronização em background para manter perfis atualizados

## Arquivos a Criar/Modificar
- `backend/models/family_model.py` - Modelo de família
- `backend/models/user_model.py` - Atualizar com campos de família
- `backend/routes/family_routes.py` - Rotas de gestão de família
- `frontend/services/profileStorageManager.js` - Gerenciador de storage por perfil
- `frontend/services/familyService.js` - Serviço de família
- `frontend/stores/familyStore.js` - Store de perfis (se usar Redux/MobX)

## Referências
- Especificação técnica: Seção 2.1 - Estrutura Hierárquica
- [MongoDB relationships](https://www.mongodb.com/docs/manual/tutorial/model-referenced-one-to-many-relationships-between-documents/)

## Prioridade
🔴 Alta (MVP)
