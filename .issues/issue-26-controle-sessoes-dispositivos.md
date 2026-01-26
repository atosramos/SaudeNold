## Objetivo
Implementar controle avançado de sessões e dispositivos, com detecção de logins suspeitos, notificações de novos acessos e logout remoto.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Sessões devem considerar funcionamento local e sincronização quando online.

## Tarefas
- [ ] Notificação de novo login
  - [ ] Fingerprinting de dispositivo (modelo, SO, localização aproximada)
  - [ ] Enviar push e email com detalhes do acesso
  - [ ] Ação de bloquear dispositivo diretamente na notificação
  - [ ] Expiração automática de confiança após 90 dias de inatividade
- [ ] Gerenciamento de dispositivos confiáveis
  - [ ] Lista de dispositivos confiáveis nas configurações
  - [ ] Marcar/remover dispositivo como confiável
  - [ ] Revogar confiança imediatamente
- [ ] Gestão de sessões ativas
  - [ ] Listar sessões: dispositivo, localização, ultima atividade
  - [ ] Logout seletivo por dispositivo
  - [ ] Logout global (desconectar todos os outros dispositivos)
  - [ ] Invalidação imediata de tokens no servidor
  - [ ] Notificar dispositivos desconectados
  - [ ] Histórico de logins dos ultimos 90 dias
- [ ] Detecção de comportamento suspeito
  - [ ] Alertas para tentativas de login falhadas repetidas
  - [ ] Bloqueio temporario apos 5 tentativas incorretas (15 min)
  - [ ] Detecao de logins simultaneos em locais distantes
  - [ ] Alerta para download em massa de documentos

## Arquivos a Criar/Modificar
- `backend/models/session_model.py` - Modelo de sessao/dispositivo
- `backend/routes/session_routes.py` - Rotas de sessao
- `backend/services/session_service.py` - Logica de gestao de sessoes
- `backend/services/notification_service.py` - Notificacoes de login
- `frontend/screens/SessionsScreen.js` - Tela de sessoes ativas
- `frontend/services/sessionService.js` - Servico de sessao

## Referencias
- Especificacao tecnica: Secao 7.1 - Deteccao e controle de acesso

## Prioridade
🔴 Alta (MVP)
