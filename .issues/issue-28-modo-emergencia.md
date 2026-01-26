## Objetivo
Implementar modo de emergencia para acesso rapido a informacoes criticas de saude sem desbloquear o aparelho.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Modo emergencia deve funcionar totalmente offline.

## Tarefas
- [ ] Implementar Emergency PIN
  - [ ] PIN numerico de 6 digitos configuravel
  - [ ] Acesso a partir da tela de bloqueio
  - [ ] Fluxo separado de autenticacao padrao
- [ ] Definir informacoes exibidas
  - [ ] Tipo sanguineo e fator RH
  - [ ] Alergias criticas
  - [ ] Condicoes cronicas e medicamentos continuos
  - [ ] Contatos de emergencia
  - [ ] Plano de saude e numero da carteirinha
  - [ ] Diretivas antecipadas (quando houver)
- [ ] Recursos especiais
  - [ ] QR Code para acesso rapido por paramedicos
  - [ ] Exibir apenas iniciais para preservar privacidade
  - [ ] Log de acesso quando modo emergencia for ativado
  - [ ] Notificar contatos de emergencia ao ativar
  - [ ] Opcao de compartilhar localizacao em tempo real
- [ ] Configuracoes de privacidade
  - [ ] Usuario escolhe quais dados ficam visiveis
  - [ ] Permitir desabilitar modo emergencia
  - [ ] Alerta visual de modo emergencia ativo

## Arquivos a Criar/Modificar
- `backend/models/emergency_profile_model.py` - Modelo de emergencia
- `backend/routes/emergency_routes.py` - Rotas de emergencia
- `backend/services/emergency_service.py` - Logica de emergencia
- `frontend/screens/EmergencyModeScreen.js` - Tela de emergencia
- `frontend/screens/EmergencySettingsScreen.js` - Configuracoes de emergencia

## Referencias
- Especificacao tecnica: Secao 7.3 - Modo de emergencia

## Prioridade
🟡 Media
