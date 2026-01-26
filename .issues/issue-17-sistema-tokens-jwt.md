## Objetivo
Implementar sistema completo de tokens JWT com access tokens de curta duração e refresh tokens de longa duração, incluindo renovação automática.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Backend é opcional e pode ser usado apenas para sincronização. Tokens devem considerar modo offline e reconexão segura.

## Tarefas
- [ ] Implementar geração de tokens no backend
  - [ ] Função `generate_access_token()` - token de 15 a 30 minutos (configurável)
  - [ ] Função `generate_refresh_token()` - token de 30 dias
  - [ ] Incluir user_id, email, role no payload
  - [ ] Gerar token_id único para refresh tokens
  - [ ] Armazenar refresh tokens no banco de dados
  - [ ] Campos: token_id, user_id, created_at, expires_at, revoked
- [ ] Implementar renovação de tokens
  - [ ] Endpoint `/api/auth/refresh` para renovar access token
  - [ ] Validar refresh token
  - [ ] Verificar se token não foi revogado
  - [ ] Verificar se token não expirou
  - [ ] Gerar novo access token
  - [ ] Opcionalmente gerar novo refresh token (rotacionar)
- [ ] Implementar gerenciamento de tokens no frontend
  - [ ] Classe `TokenManager` para gerenciar tokens
  - [ ] Armazenar tokens no SecureStore (React Native)
  - [ ] Implementar renovação automática antes da expiração
  - [ ] Agendar renovação em 13 minutos (antes dos 15)
  - [ ] Interceptar requisições para adicionar token
  - [ ] Tratar erro 401 e tentar renovar token
  - [ ] Logout automático se refresh falhar
- [ ] Implementar revogação de tokens
  - [ ] Endpoint para revogar refresh token (`POST /api/auth/revoke`)
  - [ ] Endpoint para revogar todos os tokens do usuário (`POST /api/auth/revoke-all`)
  - [ ] Marcar tokens como revoked no banco
  - [ ] Limpar tokens revogados periodicamente (cron job)
- [ ] Implementar blacklist de tokens (opcional, para logout imediato)
  - [ ] Armazenar tokens revogados em cache (Redis)
  - [ ] Verificar blacklist em middleware de autenticação
  - [ ] TTL igual ao tempo de expiração do token

## Arquivos a Criar/Modificar
- `backend/services/jwt_service.py` - Serviço de geração e validação de tokens
- `backend/routes/auth_routes.py` - Rotas de refresh e revogação
- `backend/middleware/auth_middleware.py` - Middleware de autenticação
- `backend/models/refresh_token_model.py` - Modelo de refresh token
- `frontend/services/tokenManager.js` - Gerenciador de tokens
- `frontend/services/apiClient.js` - Cliente HTTP com interceptors

## Variáveis de Ambiente
- `JWT_SECRET_KEY` - Chave secreta para assinar tokens
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Tempo de expiração (padrão: 15; faixa recomendada 15-30)
- `REFRESH_TOKEN_EXPIRE_DAYS` - Tempo de expiração (padrão: 30)

## Referências
- Especificação técnica: Seção 1.2 - Sistema de Tokens JWT
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [PyJWT documentation](https://pyjwt.readthedocs.io/)

## Prioridade
🔴 Alta (MVP)
