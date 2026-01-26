## Objetivo
Implementar protecao avancada contra ameacas e plano de resposta a incidentes de seguranca.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Proteções devem focar o app e sincronização opcional com backend.

## Tarefas
- [ ] Seguranca da aplicacao
  - [ ] Code obfuscation para dificultar engenharia reversa
  - [ ] Certificate pinning para evitar ataques MITM
  - [ ] Deteccao de root/jailbreak com alerta ao usuario
  - [ ] Protecao contra screen recording em telas sensiveis
  - [ ] Timeout de sessao configuravel (5, 10, 15, 30 min ou nunca)
- [ ] Resposta a incidentes
  - [ ] Plano de resposta a vazamento de dados
  - [ ] Notificacao obrigatoria em ate 72h (LGPD)
  - [ ] Canal para reportar vulnerabilidades (bug bounty)
  - [ ] Equipe 24/7 para incidentes criticos (processo)
- [ ] Educacao do usuario
  - [ ] Dicas de seguranca contextuais no app
  - [ ] Feedback de forca de senha em tempo real
  - [ ] Alertas sobre configuracoes inseguras
  - [ ] Tutorial de seguranca no primeiro uso
  - [ ] Lembretes periodicos para revisar dispositivos conectados

## Arquivos a Criar/Modificar
- `frontend/services/securityService.js` - Controles de seguranca no app
- `frontend/components/SecurityTutorial.js` - Tutorial de seguranca
- `backend/services/security_policy_service.py` - Politicas de seguranca
- `docs/security/INCIDENT-RESPONSE-PLAN.md` - Plano de resposta a incidentes

## Referencias
- Especificacao tecnica: Secao 7.7 - Protecao contra ameacas
- [OWASP MASVS](https://mas.owasp.org/)

## Prioridade
🟡 Media
