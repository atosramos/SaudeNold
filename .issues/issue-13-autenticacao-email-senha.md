## Objetivo
Implementar sistema de autenticação com email e senha, incluindo validação de senha forte, hash seguro e verificação de email.

## Contexto Atual
App mobile (Expo/React Native) com funcionamento offline-first e armazenamento local em AsyncStorage. Backend é opcional e pode sincronizar quando disponível. Priorizar fluxo simples e acessível para idosos.

## Tarefas
- [ ] Implementar validação de senha forte no frontend (React Native)
  - [ ] Mínimo 8 caracteres
  - [ ] Pelo menos 1 letra maiúscula
  - [ ] Pelo menos 1 letra minúscula
  - [ ] Pelo menos 1 número
  - [ ] Pelo menos 1 caractere especial (!@#$%^&*)
  - [ ] Indicador visual de força da senha (0-100)
- [ ] Implementar hash de senha no backend (Python/Flask)
  - [ ] Usar bcrypt com rounds=12
  - [ ] Função para hash de senha
  - [ ] Função para verificação de senha
- [ ] Criar endpoint de cadastro (`POST /api/auth/register`)
  - [ ] Validação de email único
  - [ ] Hash da senha antes de salvar
  - [ ] Geração de token de verificação de email
  - [ ] Envio de email de verificação
  - [ ] Criação de usuário com role 'family_admin'
- [ ] Criar endpoint de login (`POST /api/auth/login`)
  - [ ] Verificação de credenciais
  - [ ] Geração de tokens JWT (access e refresh)
  - [ ] Atualização de last_login
  - [ ] Bloquear acesso até email ser verificado
- [ ] Implementar verificação de email
  - [ ] Endpoint para verificar token (`POST /api/auth/verify-email`)
  - [ ] Endpoint para reenviar email de verificação
  - [ ] Marcar email como verificado após confirmação
  - [ ] Tornar verificação obrigatória por dados sensíveis
- [ ] Implementar recuperação de senha
  - [ ] Endpoint para solicitar reset (`POST /api/auth/forgot-password`)
  - [ ] Geração de token de reset
  - [ ] Envio de email com link de reset
  - [ ] Endpoint para resetar senha (`POST /api/auth/reset-password`)

## Arquivos a Criar/Modificar
- `frontend/services/authService.js` - Serviço de autenticação
- `frontend/components/PasswordStrengthIndicator.js` - Componente de força da senha
- `backend/services/auth_service.py` - Serviço de autenticação
- `backend/routes/auth_routes.py` - Rotas de autenticação
- `backend/models/user_model.py` - Modelo de usuário

## Referências
- Especificação técnica: Seção 1.1.1 - Cadastro com Email e Senha
- [bcrypt documentation](https://pypi.org/project/bcrypt/)
- [JWT best practices](https://datatracker.ietf.org/doc/html/rfc8725)

## Prioridade
🔴 Alta (MVP)
