## Objetivo
Implementar sistema de convites para permitir que adultos se juntem a uma família através de convites por email ou código.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Convites podem ser preparados offline e enviados quando houver conectividade.

## Tarefas
- [ ] Implementar geração de convites
  - [ ] Função `generate_invite_code()` para gerar código seguro
  - [ ] Endpoint `POST /api/family/invite-adult` para criar convite
  - [ ] Campos: código, family_id, inviter_id, invitee_email, status, expires_at
  - [ ] Validação de email do convidado
  - [ ] Verificar se email já está em outra família
  - [ ] Expiração de 7 dias
  - [ ] Gerar QR Code para vinculação presencial
- [ ] Implementar envio de convites por email
  - [ ] Template de email de convite
  - [ ] Incluir nome do convidante
  - [ ] Incluir código de convite
  - [ ] Link direto para aceitar convite (se aplicável)
  - [ ] Função `send_family_invite_email()`
- [ ] Implementar convite via WhatsApp
  - [ ] Gerar link de convite compartilhável
  - [ ] Template de mensagem com código e instruções
- [ ] Implementar aceitação de convites
  - [ ] Endpoint `POST /api/family/accept-invite` para aceitar
  - [ ] Validar código de convite
  - [ ] Verificar se convite não expirou
  - [ ] Verificar se convite não foi aceito anteriormente
  - [ ] Associar usuário à família
  - [ ] Atualizar status do convite para 'accepted'
  - [ ] Definir `account_type: 'adult_member'`
- [ ] Implementar gerenciamento de convites
  - [ ] Endpoint para listar convites pendentes (`GET /api/family/invites`)
  - [ ] Endpoint para cancelar convite (`DELETE /api/family/invite/:inviteId`)
  - [ ] Endpoint para reenviar convite (`POST /api/family/invite/:inviteId/resend`)
  - [ ] UI para gerenciar convites enviados
- [ ] Implementar validações e segurança
  - [ ] Apenas family_admin pode enviar convites
  - [ ] Verificar se usuário já está em uma família
  - [ ] Limitar número de convites pendentes por família
  - [ ] Rate limiting no envio de convites
  - [x] **REQUISITO:** Licença PRO obrigatória para criar convites quando dados estão no servidor
  - [x] Validação de licença PRO ativa antes de criar convite
  - [x] Mensagem de erro clara quando licença PRO não está ativa
  - [x] Logs de segurança para tentativas sem licença PRO

## Arquivos a Criar/Modificar
- `backend/models/family_invite_model.py` - Modelo de convite
- `backend/routes/family_routes.py` - Rotas de convites
- `backend/services/invite_service.py` - Lógica de convites
- `backend/services/email_service.py` - Serviço de email
- `frontend/screens/AcceptInviteScreen.js` - Tela de aceitar convite
- `frontend/screens/ManageInvitesScreen.js` - Tela de gerenciar convites
- `frontend/services/inviteService.js` - Serviço de convites

## Referências
- Especificação técnica: Seção 2.3.2 - Sistema de Convites
- [Python secrets module](https://docs.python.org/3/library/secrets.html)

## Prioridade
🟡 Média
