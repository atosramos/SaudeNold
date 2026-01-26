## Objetivo
Implementar autenticação de dois fatores (2FA) usando TOTP (Time-based One-Time Password) para aumentar a segurança das contas de usuários (opcional, porém fortemente recomendado).

## Contexto Atual
App mobile (Expo/React Native) offline-first com dados locais em AsyncStorage. Backend é opcional e sincroniza quando disponível. Garantir fluxo simples para usuários idosos.

## Tarefas
- [ ] Configurar biblioteca TOTP no backend
  - [ ] Instalar `pyotp` e `qrcode`
  - [ ] Implementar função `setup_2fa_for_user()` para gerar secret
  - [ ] Gerar QR Code para configuração no app autenticador
  - [ ] Criptografar e armazenar secret no banco de dados
  - [ ] Gerar códigos de backup (10 códigos)
- [ ] Implementar configuração de 2FA
  - [ ] Endpoint para iniciar setup (`POST /api/user/2fa/setup`)
  - [ ] Retornar QR Code em base64 e secret
  - [ ] Endpoint para verificar e ativar (`POST /api/user/2fa/verify-setup`)
  - [ ] Salvar códigos de backup criptografados
  - [ ] Marcar 2FA como habilitado após verificação
- [ ] Implementar verificação de código 2FA no login
  - [ ] Modificar endpoint de login para solicitar código 2FA quando habilitado
  - [ ] Endpoint para verificar código (`POST /api/auth/verify-2fa`)
  - [ ] Validar código TOTP com janela de 1 minuto
  - [ ] Verificar códigos de backup se TOTP falhar
  - [ ] Remover código de backup usado
- [ ] Implementar gerenciamento de 2FA
  - [ ] Endpoint para desabilitar 2FA (`POST /api/user/2fa/disable`)
  - [ ] Requer senha atual para desabilitar
  - [ ] Endpoint para regenerar códigos de backup
  - [ ] UI para gerenciar 2FA no app
- [ ] Implementar recuperação de acesso
  - [ ] Permitir usar códigos de backup para login
  - [ ] Alertar quando códigos de backup estão sendo usados
  - [ ] Opção de recuperação via email (desabilitar 2FA temporariamente)

## Arquivos a Criar/Modificar
- `backend/services/two_factor_service.py` - Serviço de 2FA
- `backend/routes/auth_routes.py` - Rotas de 2FA
- `backend/routes/user_routes.py` - Rotas de gerenciamento de 2FA
- `frontend/services/twoFactorService.js` - Serviço de 2FA no frontend
- `frontend/components/TwoFactorSetup.js` - Componente de configuração
- `frontend/components/TwoFactorVerify.js` - Componente de verificação

## Referências
- Especificação técnica: Seção 1.1.3 - Autenticação de Dois Fatores (2FA)
- [pyotp documentation](https://pypi.org/project/pyotp/)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)

## Prioridade
🟡 Média
