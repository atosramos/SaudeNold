## Objetivo
Implementar sistema de múltiplos usuários com tela de seleção de perfil, autenticação por perfil e isolamento completo de dados.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Seleção de perfil e armazenamento segregado devem funcionar sem backend.

## Tarefas
- [x] Criar tela de seleção de perfil
  - [x] Componente `ProfileSelectionScreen`
  - [x] Exibir avatares e nomes dos perfis
  - [x] Indicador visual para perfis protegidos (PIN/biometria)
  - [x] Botão para adicionar novo familiar
  - [x] Layout em grid responsivo
  - [x] Limite de 8 a 10 perfis por família
- [x] Implementar carregamento de perfis
  - [x] Função `loadProfiles()` para carregar do AsyncStorage
  - [x] Função `syncProfilesWithServer()` para sincronizar
  - [x] Cache local de perfis
  - [x] Atualizar cache quando perfis mudam
- [x] Implementar autenticação por perfil
  - [x] Função `authenticateProfile()` para verificar PIN/biometria
  - [x] Solicitar autenticação para perfis adultos e admin
  - [x] Permitir acesso simplificado para perfis de crianças (configurável pelos pais)
  - [x] Integrar com biometria do dispositivo
  - [x] Integrar com PIN do perfil
- [x] Implementar proteção por contexto na troca de perfis
  - [x] Exigir biometria/PIN ao alternar para perfil adulto diferente
  - [x] Permitir troca sem autenticação para perfis infantis (se habilitado)
  - [x] Re-autenticação obrigatória para ações sensíveis (exames, medicações)
  - [x] Timeout automático após inatividade (configurável: 5-15 min)
- [x] Implementar troca de perfil
  - [x] Função `switchToProfile()` para mudar perfil ativo
  - [x] Atualizar `ProfileStorageManager` com novo perfil
  - [x] Limpar dados do perfil anterior da memória
  - [x] Carregar dados do novo perfil
  - [x] Atualizar contexto de autenticação
- [x] Implementar isolamento de dados
  - [x] Garantir que dados sejam prefixados com profile_id
  - [x] Validar que requisições usam profile_id correto
  - [x] Middleware no backend para verificar acesso ao perfil
  - [x] Prevenir acesso cruzado entre perfis

## Notas de Implementação

### Timeout Configurável (5-15 min)
- ✅ Implementado em `services/profileAuth.js` com funções `getProfileAuthTimeout()` e `setProfileAuthTimeout()`
- ✅ UI de configuração adicionada em `app/settings.js` com opções de 5, 10 e 15 minutos
- ✅ `useProfileAuthGuard` modificado para usar timeout configurado automaticamente
- ✅ Timeout padrão: 10 minutos (pode ser alterado nas configurações)

### Acesso Simplificado (allow_quick_access)
- ✅ Campo `allow_quick_access` implementado no backend (`FamilyProfile` model)
- ✅ Lógica implementada em `app/profile-selection.js` para permitir acesso sem autenticação quando:
  - `account_type === CHILD` OU
  - `allow_quick_access === true` (configurável pelos pais)
- ✅ Permite que pais configurem acesso rápido para perfis de crianças ou outros membros da família

## Arquivos a Criar/Modificar
- `frontend/screens/ProfileSelectionScreen.js` - Tela de seleção
- `frontend/components/ProfileCard.js` - Card de perfil
- `frontend/services/profileService.js` - Serviço de perfis
- `frontend/services/profileStorageManager.js` - Gerenciador de storage
- `backend/middleware/profile_middleware.py` - Middleware de validação de perfil
- `backend/routes/family_routes.py` - Endpoints de perfis

## Referências
- Especificação técnica: Seção 2.2 - Sistema de Múltiplos Usuários
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

## Prioridade
🔴 Alta (MVP)
