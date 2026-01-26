## Objetivo
Implementar login social usando OAuth 2.0 para Google Sign-In, Apple Sign-In e Facebook Login, permitindo autenticação rápida e segura sem necessidade de senha.

## Contexto Atual
App mobile (Expo/React Native) com funcionamento offline-first e armazenamento local em AsyncStorage. Backend é opcional e pode sincronizar quando disponível. Priorizar UX simples e acessível.

## Tarefas
- [ ] Configurar Google Sign-In
  - [ ] Instalar `@react-native-google-signin/google-signin`
  - [ ] Configurar Web Client ID no app
  - [ ] Implementar função `signInWithGoogle()` no frontend
  - [ ] Criar endpoint backend `/api/auth/google` para validar token
  - [ ] Validar token do Google usando `google.oauth2.id_token`
  - [ ] Criar ou atualizar usuário com dados do Google
  - [ ] Gerar tokens JWT após autenticação bem-sucedida
- [ ] Configurar Apple Sign-In
  - [ ] Instalar `@invertase/react-native-apple-authentication`
  - [ ] Configurar Apple Developer Account
  - [ ] Implementar função `signInWithApple()` no frontend
  - [ ] Criar endpoint backend `/api/auth/apple` para validar token
  - [ ] Validar token da Apple (JWT verification)
  - [ ] Criar ou atualizar usuário com dados da Apple
  - [ ] Gerar tokens JWT após autenticação bem-sucedida
- [ ] Configurar Facebook Login
  - [ ] Instalar `react-native-fbsdk-next`
  - [ ] Configurar App ID e Client Token
  - [ ] Implementar função `signInWithFacebook()` no frontend
  - [ ] Criar endpoint backend `/api/auth/facebook` para validar token
  - [ ] Validar token do Facebook via Graph API
  - [ ] Criar ou atualizar usuário com dados do Facebook
  - [ ] Gerar tokens JWT após autenticação bem-sucedida
- [ ] Implementar vinculação de contas sociais
  - [ ] Permitir vincular conta social a conta existente (email/senha)
  - [ ] Endpoint para vincular conta (`POST /api/user/link-social`)
  - [ ] Verificar se email já existe antes de criar novo usuário
  - [ ] UI para gerenciar contas vinculadas
- [ ] Tratamento de erros
  - [ ] Erro quando conta social já está vinculada a outro usuário
  - [ ] Erro quando token é inválido ou expirado
  - [ ] Feedback visual adequado no frontend

## Arquivos a Criar/Modificar
- `frontend/services/socialAuthService.js` - Serviço de autenticação social
- `frontend/components/SocialLoginButtons.js` - Botões de login social
- `backend/services/social_auth_service.py` - Validação de tokens sociais
- `backend/routes/auth_routes.py` - Rotas de OAuth
- `backend/models/user_model.py` - Adicionar campos para IDs sociais

## Variáveis de Ambiente Necessárias
- `GOOGLE_CLIENT_ID` - Client ID do Google OAuth
- `APPLE_CLIENT_ID` - Client ID do Apple Sign-In
- `GOOGLE_CLIENT_SECRET` - Client Secret do Google (se necessário)
- `FACEBOOK_APP_ID` - App ID do Facebook
- `FACEBOOK_CLIENT_TOKEN` - Client Token do Facebook

## Referências
- Especificação técnica: Seção 1.1.2 - Login Social (OAuth 2.0)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [React Native Apple Authentication](https://github.com/invertase/react-native-apple-authentication)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

## Prioridade
🟡 Média
